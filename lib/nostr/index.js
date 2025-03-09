const ph = require('../plugin-helper')
const _ = require('lodash/fp')
const notices = require('./notices')

function getPlugin(settings) {
  const plugin = ph.load(ph.SMS, 'nostr')
  const account = settings.accounts.nostr
  return { plugin, account }
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
      
      return {
        nostr: {
          pubkey: recipient,
          body: messageContent
        }
      }
    })
}

function sendMessage(settings, rec) {
  return Promise.resolve()
    .then(() => {
      const { plugin, account } = getPlugin(settings)
      return plugin.sendMessage(account, rec)
    })
}

function sendSecurityCode(settings, recipient, code, timestamp) {
  return createMessage('security_code', recipient, { code, timestamp })
    .then(rec => {
      if (!rec) throw new Error('Failed to create Nostr security code message')
      return sendMessage(settings, rec)
    })
    .then(() => code)
}

module.exports = {
  sendMessage,
  sendSecurityCode
} 