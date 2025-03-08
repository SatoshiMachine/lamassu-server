const db = require('../db')
const logger = require('../logger')

async function handleWithdrawCompletion(req) {
  const { txId } = req.params
  const { payment_hash, payment_request } = req.body

  try {
    // Update transaction status to confirmed
    await db.none(
      'UPDATE transactions SET status = $1, completed = NOW() WHERE id = $2',
      ['confirmed', txId]
    )

    logger.info(`LNbits withdraw completed for transaction ${txId}`)
    return { success: true }
  } catch (error) {
    logger.error(`Error processing LNbits webhook for transaction ${txId}: ${error}`)
    throw error
  }
}

module.exports = {
  handleWithdrawCompletion
} 