const { nip19 } = require('nostr-tools')

function hexToNpub(hexPubkey) {
  return nip19.npubEncode(hexPubkey)
}

function npubToHex(npub) {
  try {
    const { type, data } = nip19.decode(npub)
    if (type !== 'npub') {
      throw new Error('Not an npub format')
    }
    return data
  } catch (err) {
    throw new Error(`Invalid npub format: ${err.message}`)
  }
}

function validateNostrKey(key) {
  if (key.startsWith('npub')) {
    try {
      npubToHex(key)
      return true
    } catch (err) {
      return false
    }
  }
  return /^[0-9a-f]{64}$/.test(key)
}

function normalizeNostrKey(key) {
  if (key.startsWith('npub')) {
    return npubToHex(key)
  }
  if (validateNostrKey(key)) {
    return key
  }
  throw new Error('Invalid Nostr key format')
}

module.exports = {
  hexToNpub,
  npubToHex,
  validateNostrKey,
  normalizeNostrKey
} 