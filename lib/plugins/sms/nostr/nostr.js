const { getPublicKey, getEventHash, signEvent } = require('nostr-tools')
const WebSocket = require('ws')

const NAME = 'Nostr'

function createEvent(pubkey, content) {
  const event = {
    kind: 4, // encrypted direct message
    pubkey: pubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: content
  }
  
  event.id = getEventHash(event)
  return event
}

function sendMessage(account, rec) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://relay.damus.io') // Example relay, should be configurable
    
    ws.on('open', () => {
      const recipientPubkey = rec.nostr.pubkey // Public key to send to
      const content = rec.nostr.body
      
      const event = createEvent(recipientPubkey, content)
      
      // Sign the event with our private key
      event.sig = signEvent(event, account.privateKey)
      
      // Publish event to relay
      ws.send(JSON.stringify(['EVENT', event]))
      
      // Wait for confirmation
      ws.on('message', (data) => {
        const msg = JSON.parse(data)
        if (msg[0] === 'OK' && msg[1] === event.id) {
          ws.close()
          resolve()
        }
      })
      
      // Handle errors
      ws.on('error', (error) => {
        ws.close()
        reject(new Error(`Nostr error: ${error.message}`))
      })
      
      // Set timeout
      setTimeout(() => {
        ws.close()
        reject(new Error('Nostr timeout: No confirmation received'))
      }, 10000)
    })
  })
}

module.exports = {
  NAME,
  sendMessage
} 