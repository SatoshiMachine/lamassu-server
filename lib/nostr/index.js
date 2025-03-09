const ph = require('../plugin-helper')
const smsNotices = require('../sms-notices')
const _ = require('lodash/fp')

function getPlugin(settings) {
  const plugin = ph.load(ph.SMS, 'nostr')
  const account = settings.accounts.nostr
  return { plugin, account }
}

function createMessage(event, recipient, content) {
  return smsNotices.getSMSNotice(event)
    .then(msg => {
      if (!_.isNil(msg)) {
        const messageTemplate = msg.message
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
  return createMessage('sms_code', recipient, { code, timestamp })
    .then(rec => sendMessage(settings, rec))
    .then(() => code)
}

module.exports = {
  sendMessage,
  sendSecurityCode
} 