const ph = require('../plugin-helper')

function getPlugin(settings) {
  const plugin = ph.load(ph.SMS, 'nostr')
  const account = settings.accounts.nostr
  return { plugin, account }
}

function sendMessage(settings, rec) {
  return Promise.resolve()
    .then(() => {
      const { plugin, account } = getPlugin(settings)
      return plugin.sendMessage(account, rec)
    })
}

module.exports = {
  sendMessage
} 