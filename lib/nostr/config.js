const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']

function getConfig(settings) {
  const config = settings.config.nostr || {}
  const account = settings.accounts.nostr || {}

  if (!account.privateKey) {
    throw new Error('Nostr private key not configured')
  }

  return {
    privateKey: account.privateKey,
    relays: account.relays || config.relays || DEFAULT_RELAYS
  }
}

module.exports = {
  getConfig,
  DEFAULT_RELAYS
} 