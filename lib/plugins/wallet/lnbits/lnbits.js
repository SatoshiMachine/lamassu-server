const _ = require('lodash/fp')
const axios = require('axios')
const { utils: coinUtils } = require('@lamassu/coins')

const NAME = 'LN'
const SUPPORTED_COINS = ['LN']

const BN = require('../../../bn')

// ANCHOR: LNbits API Client Setup
function request(method, endpoint, data = null, apiKey = null, isAdmin = false) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey || ''
  }

  return axios({
    method,
    url: endpoint,
    headers,
    data
  })
    .then(r => {
      if (r.error) throw r.error
      return r.data
    })
    .catch(err => {
      throw new Error(err)
    })
}

function checkCryptoCode(cryptoCode) {
  if (!SUPPORTED_COINS.includes(cryptoCode)) {
    return Promise.reject(new Error('Unsupported crypto: ' + cryptoCode))
  }
  return Promise.resolve()
}
// ANCHOR_END: LNbits API Client Setup

// ANCHOR: Sell Lightning Flow (Customer Sends)
/**
 * @section Sell Lightning Flow
 * @description Customer sells Lightning, ATM receives payment
 * Flow:
 * 1. Create invoice for specified fiat amount
 * 2. Customer pays invoice
 * 3. Monitor payment status
 * 4. Dispense fiat on confirmation
 */
function createInvoice(account, cryptoAtoms, memo = 'ATM Lightning Sale') {
  const data = {
    out: false,
    amount: cryptoAtoms.toNumber(),
    memo: memo,
    unit: 'sat'
  }

  return request('POST', `${account.endpoint}/api/v1/payments`, data, account.apiSecret)
    .then(response => {
      return {
        paymentRequest: response.payment_request,
        paymentHash: response.payment_hash
      }
    })
}

function getInvoiceStatus(account, paymentHash) {
  return request('GET', `${account.endpoint}/api/v1/payments/${paymentHash}`, null, account.apiSecret)
    .then(response => {
      return {
        paid: response.paid,
        preimage: response.preimage,
        status: response.status
      }
    })
}

function newAddress(account, info, tx, settings, operatorId) {
  const { cryptoAtoms, cryptoCode } = tx
  return checkCryptoCode(cryptoCode)
    .then(() => createInvoice(account, cryptoAtoms))
    .then(result => result.paymentRequest)
}
// ANCHOR_END: Sell Lightning Flow (Customer Sends)

// ANCHOR: Buy Lightning Flow (Customer Receives)
/**
 * @section Buy Lightning Flow
 * @description Customer buys Lightning, ATM creates withdraw link
 * Flow:
 * 1. Customer inputs fiat amount
 * 2. Create withdraw link for amount
 * 3. Customer scans and withdraws
 * 4. Webhook confirms completion
 */
function createWithdrawLink(account, cryptoAtoms, webhookUrl) {
  const data = {
    title: 'ATM Lightning Purchase',
    min_withdrawable: cryptoAtoms.toNumber(),
    max_withdrawable: cryptoAtoms.toNumber(),
    uses: 1,
    wait_time: 1,
    is_unique: true,
    webhook_url: webhookUrl,
    webhook_headers: JSON.stringify({
      'Content-Type': 'application/json',
      'X-API-KEY': account.webhookSecret
    })
  }

  return request('POST', `${account.endpoint}/withdraw/api/v1/links`, data, account.adminKey, true)
    .then(response => {
      return {
        id: response.id,
        lnurl: response.lnurl
      }
    })
}

function sendCoins(account, tx, settings, operatorId) {
  const { toAddress, cryptoAtoms, cryptoCode } = tx
  return checkCryptoCode(cryptoCode)
    .then(() => {
      // For buying flow, we create a withdraw link
      return createWithdrawLink(
        account, 
        cryptoAtoms,
        `${settings.callbackBaseUrl}/webhook/lnbits/${tx.id}`
      )
    })
    .then(result => {
      return {
        withdrawId: result.id,
        lnurl: result.lnurl
      }
    })
}
// ANCHOR_END: Buy Lightning Flow (Customer Receives)

// ANCHOR: Transaction Status Handling
/**
 * @section Transaction Status
 * @description Handles status checks for both buy and sell flows
 */
function getStatus(account, tx, requested, settings, operatorId) {
  const { toAddress, cryptoAtoms, cryptoCode } = tx

  return checkCryptoCode(cryptoCode)
    .then(() => {
      // For sell flow, check payment status
      if (tx.paymentHash) {
        return getInvoiceStatus(account, tx.paymentHash)
          .then(status => {
            if (status.paid) {
              return { receivedCryptoAtoms: cryptoAtoms, status: 'confirmed' }
            }
            return { receivedCryptoAtoms: BN(0), status: 'notSeen' }
          })
      }
      
      // For buy flow, check webhook status
      if (tx.withdrawId) {
        // Status will be updated via webhook
        return { receivedCryptoAtoms: BN(0), status: tx.status || 'notSeen' }
      }

      return { receivedCryptoAtoms: BN(0), status: 'notSeen' }
    })
}

function balance(account, cryptoCode, settings, operatorId) {
  return checkCryptoCode(cryptoCode)
    .then(() => request('GET', `${account.endpoint}/api/v1/wallet`, null, account.adminKey, true))
    .then(wallet => {
      return new BN(wallet.balance)
    })
}
// ANCHOR_END: Transaction Status Handling

module.exports = {
  NAME,
  balance,
  sendCoins,
  newAddress,
  getStatus,
  createWithdrawLink,
  createInvoice,
  getInvoiceStatus
} 