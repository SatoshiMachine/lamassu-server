const _ = require('lodash/fp')
const WebSocket = require('ws')
const { getPublicKey, getEventHash, signEvent } = require('nostr-tools')
const notices = require('./notices')
const config = require('./config')

function createNostrEvent(privateKey, recipientPubkey, content) {
  const event = {
    kind: 4, // encrypted direct message
    pubkey: getPublicKey(privateKey),
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPubkey]],
    content: content
  }

  event.id = getEventHash(event)
  event.sig = signEvent(event, privateKey)
  return event
}

async function publishToRelay(relay, event) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relay)
    
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error(`Timeout connecting to relay: ${relay}`))
    }, 5000)

    ws.on('open', () => {
      ws.send(JSON.stringify(['EVENT', event]))
    })

    ws.on('message', (data) => {
      const msg = JSON.parse(data)
      if (msg[0] === 'OK' && msg[1] === event.id) {
        clearTimeout(timeout)
        ws.close()
        resolve()
      }
    })

    ws.on('error', (error) => {
      clearTimeout(timeout)
      ws.close()
      reject(new Error(`Failed to connect to relay ${relay}: ${error.message}`))
    })
  })
}

async function publishToRelays(relays, event) {
  const results = await Promise.allSettled(
    relays.map(relay => publishToRelay(relay, event))
  )

  const successful = results.filter(r => r.status === 'fulfilled').length
  if (successful === 0) {
    throw new Error('Failed to publish to any relay')
  }

  return successful
}

function createMessage(event, recipient, content) {
  return notices.getNotice(event)
    .then(notice => {
      if (!notice) return null

      const messageTemplate = notice.message
      const contentKeys = _.keys(content)
      const messageContent = _.reduce(
        (acc, it) => _.replace(`#${it}`, content[it], acc),
        messageTemplate,
        contentKeys
      )
      
      return messageContent
    })
}

async function sendMessage(settings, rec) {
  const { privateKey, relays } = config.getConfig(settings)
  const event = createNostrEvent(privateKey, rec.nostr.pubkey, rec.nostr.body)
  return publishToRelays(relays, event)
}

function sendSecurityCode(settings, recipient, code, timestamp) {
  return createMessage('security_code', recipient, { code, timestamp })
    .then(messageContent => {
      if (!messageContent) throw new Error('Failed to create Nostr security code message')
      return sendMessage(settings, {
        nostr: {
          pubkey: recipient,
          body: messageContent
        }
      })
    })
    .then(() => code)
}

module.exports = {
  sendMessage,
  sendSecurityCode
} 