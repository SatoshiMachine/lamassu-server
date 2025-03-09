const { getConfig } = require('../../../nostr/config')
const { sendMessage: sendNostrMessage } = require('../../../nostr')

const NAME = 'Nostr'

function sendMessage (account, rec) {
  const config = getConfig(account)
  const text = rec.sms.body
  const to = rec.sms.toNumber || account.toNumber

  return sendNostrMessage(config, {
    to,
    text
  }).catch(err => {
    throw new Error(`Nostr error: ${err.message}`)
  })
}

module.exports = {
  NAME,
  sendMessage
