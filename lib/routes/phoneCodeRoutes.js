const express = require('express')
const router = express.Router()
const semver = require('semver')
const _ = require('lodash/fp')

const compliance = require('../compliance')
const complianceTriggers = require('../compliance-triggers')
const configManager = require('../new-config-manager')
const { get, add, getById, update } = require('../customers')
const httpError = require('../route-helpers').httpError
const plugins = require('../plugins')
const Tx = require('../tx')
const respond = require('../respond')
const loyalty = require('../loyalty')
const nostrUtils = require('../nostr/utils')

function addOrUpdateCustomer (req) {
  const customerData = req.body
  const machineVersion = req.query.version
  const triggers = configManager.getTriggers(req.settings.config)
  const compatTriggers = complianceTriggers.getBackwardsCompatibleTriggers(triggers)
  const maxDaysThreshold = complianceTriggers.maxDaysThreshold(triggers)

  return get(customerData.phone)
    .then(customer => {
      if (customer) return customer

      return add(req.body)
    })
    .then(customer => getById(customer.id))
    .then(customer => {
      // BACKWARDS_COMPATIBILITY 7.5
      // machines before 7.5 expect customer with sanctions result
      const isOlderMachineVersion = !machineVersion || semver.lt(machineVersion, '7.5.0-beta.0')
      const shouldRunOfacCompat = !compatTriggers.sanctions && isOlderMachineVersion
      if (!shouldRunOfacCompat) return customer

      return compliance.validationPatch(req.deviceId, !!compatTriggers.sanctions, customer)
        .then(patch => {
          if (_.isEmpty(patch)) return customer
          return update(customer.id, patch)
        })
    })
    .then(customer => {
      return Tx.customerHistory(customer.id, maxDaysThreshold)
        .then(result => {
          customer.txHistory = result
          return customer
        })
    })
    .then(customer => {
      return loyalty.getCustomerActiveIndividualDiscount(customer.id)
        .then(discount => ({ ...customer, discount }))
    })
}

function validateNostrPubkey(pubkey) {
  // Validate Nostr public key format (hex string of 64 chars)
  if (!/^[0-9a-f]{64}$/.test(pubkey)) {
    throw httpError('Invalid Nostr public key format', 400)
  }
}

function getCustomerWithPhoneCode (req, res, next) {
  const pi = plugins(req.settings, req.deviceId)
  const recipient = req.body.phone || req.body.nostrPubkey

  if (!recipient) {
    throw httpError('Either phone number or Nostr public key is required', 400)
  }

  // If it's a Nostr public key, validate it
  if (req.body.nostrPubkey) {
    try {
      req.body.nostrPubkey = nostrUtils.normalizeNostrKey(req.body.nostrPubkey)
    } catch (err) {
      throw httpError('Invalid Nostr public key format', 400)
    }
  }

  return pi.getPhoneCode(recipient)
    .then(code => {
      return addOrUpdateCustomer(req)
        .then(customer => respond(req, res, { code, customer }))
    })
    .catch(err => {
      if (err.name === 'BadNumberError') throw httpError('Bad number', 401)
      if (err.name === 'NostrError') throw httpError('Nostr error', 401)
      throw err
    })
    .catch(next)
}

// New endpoint for scanning Nostr QR code
function scanNostrQR(req, res, next) {
  const pi = plugins(req.settings, req.deviceId)
  const scannedData = req.body.qrData

  // Extract pubkey from QR code data
  // QR code format could be something like: nostr:npub1... or just the hex pubkey
  let pubkey
  try {
    if (scannedData.startsWith('nostr:')) {
      // Extract pubkey from nostr: URL format
      pubkey = scannedData.split(':')[1]
    } else {
      pubkey = scannedData
    }

    // This will handle both npub and hex formats
    pubkey = nostrUtils.normalizeNostrKey(pubkey)
  } catch (err) {
    throw httpError('Invalid QR code format', 400)
  }

  // Reuse existing flow with extracted pubkey
  req.body.nostrPubkey = pubkey
  return getCustomerWithPhoneCode(req, res, next)
}

router.post('/', getCustomerWithPhoneCode)
router.post('/scan-nostr', scanNostrQR)

module.exports = router
