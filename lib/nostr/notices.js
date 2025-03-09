const NOTICES = {
  security_code: {
    message: 'Your cryptomat code: #code [#timestamp]',
    description: 'Security code for verification'
  },
  cash_ready: {
    message: 'Your cash is waiting! Go to the Cryptomat and press Redeem within 24 hours. [#timestamp]',
    description: 'Cash is ready for pickup'
  }
}

function getNotice(event) {
  const notice = NOTICES[event]
  if (!notice) return null
  return Promise.resolve(notice)
}

module.exports = {
  getNotice,
  NOTICES
} 