# Lightning Network Integration Comparison: Galoy vs LNbits

This document compares the implementation of Lightning Network transactions in our ATM system using two different backends: Galoy and LNbits.

## Overview

Both implementations handle two primary flows:
1. Buying Lightning (Customer receives Lightning)
2. Selling Lightning (Customer sends Lightning)

## Selling Lightning Flow (Customer sends Lightning)

In this flow, the customer wants to sell their Lightning Network bitcoin in exchange for fiat currency from the ATM.

### Galoy Implementation
```javascript
// Using GraphQL mutations
const createInvoice = {
  'operationName': 'lnInvoiceCreate',
  'query': `mutation lnInvoiceCreate($input: LnInvoiceCreateInput!) {
    lnInvoiceCreate(input: $input) {
      invoice {
        paymentRequest
      }
    }
  }`
}
```

1. Customer specifies fiat amount they want to receive
2. ATM creates invoice using Galoy's GraphQL API
3. Customer scans and pays invoice
4. ATM monitors payment status via GraphQL queries
5. Once confirmed, ATM dispenses fiat

### LNbits Implementation
```javascript
// Using REST API
const data = {
  out: false,
  amount: cryptoAtoms.toNumber(),
  memo: memo,
  unit: 'sat'
}
// POST to /api/v1/payments
```

1. Customer specifies fiat amount they want to receive
2. ATM creates invoice using LNbits REST API
3. Customer scans and pays invoice
4. ATM monitors payment status via REST endpoint
5. Once confirmed, ATM dispenses fiat

**Key Differences:**
- Galoy uses GraphQL while LNbits uses REST
- LNbits has simpler API structure with direct endpoints
- Both achieve same end result with similar flow
- LNbits provides more detailed payment status information

## Buying Lightning Flow (Customer receives Lightning)

This flow handles customers wanting to buy Lightning Network bitcoin by inserting fiat into the ATM.

### Galoy Implementation
```javascript
// Using empty invoice approach
function sendFundsLN(walletId, invoice, cryptoAtoms) {
  const sendLnNoAmount = {
    'operationName': 'lnNoAmountInvoicePaymentSend',
    // ... GraphQL mutation
  }
}
```

1. Customer clicks "Buy LN"
2. ATM requests empty invoice from customer
3. Customer provides empty invoice
4. Customer inserts fiat
5. ATM sends payment to customer's invoice
6. Transaction completes when payment confirms

**Pros:**
- Direct payment to customer's node
- No intermediary steps

**Cons:**
- Requires customer to generate invoice
- More complex UX
- Customer needs to understand empty invoices

### LNbits Implementation
```javascript
// Using LNURL-withdraw
function createWithdrawLink(account, cryptoAtoms, webhookUrl) {
  const data = {
    title: 'ATM Lightning Purchase',
    min_withdrawable: cryptoAtoms.toNumber(),
    max_withdrawable: cryptoAtoms.toNumber(),
    uses: 1,
    wait_time: 1,
    is_unique: true,
    webhook_url: webhookUrl
  }
}
```

1. Customer clicks "Buy LN"
2. Customer inserts fiat
3. ATM creates LNURL-withdraw link
4. Customer scans LNURL QR code
5. Customer's wallet claims funds via LNURL-withdraw
6. LNbits webhook notifies ATM of completion

**Pros:**
- Better UX - single QR code scan
- No need for empty invoices
- Works with any LNURL-withdraw compatible wallet
- Webhook-based completion tracking
- Customer can claim funds later if needed

**Cons:**
- Requires webhook setup
- Slightly more complex server-side implementation

## Technical Implementation Details

### LNbits Specific Features

1. **Webhook Handling:**
```javascript
async function handleWithdrawCompletion(req) {
  const { txId } = req.params
  const { payment_hash, payment_request } = req.body
  // Update transaction status
}
```

2. **Status Tracking:**
```javascript
function getStatus(account, tx, requested, settings, operatorId) {
  // Different handling for buy vs sell flows
  if (tx.paymentHash) {
    // Sell flow - check payment status
  }
  if (tx.withdrawId) {
    // Buy flow - check webhook status
  }
}
```

### API Authentication

**LNbits requires two types of keys:**
1. `apiSecret`: For invoice operations
2. `adminKey`: For withdraw link creation and wallet management

**Galoy uses:**
1. Single API key with GraphQL endpoint

## Configuration Requirements

### LNbits Setup
```javascript
{
  endpoint: "https://lnbits.instance.com",
  apiSecret: "invoice/read key",
  adminKey: "admin key for withdraw",
  webhookSecret: "webhook authentication"
}
```

### Galoy Setup
```javascript
{
  endpoint: "https://galoy.instance.com/graphql",
  apiSecret: "api key"
}
```

## Error Handling

Both implementations include comprehensive error handling:

1. **Network Errors:**
   - Connection failures
   - Timeout handling
   - API errors

2. **Payment Errors:**
   - Invalid amounts
   - Insufficient funds
   - Failed payments

3. **Status Monitoring:**
   - Payment timeouts
   - Invalid status responses
   - Webhook failures

## Recommendations

1. **For New Implementations:**
   - LNbits approach provides better UX
   - LNURL-withdraw is more widely supported
   - Webhook-based completion is more reliable

2. **For Existing Galoy Users:**
   - Current implementation is stable
   - Consider migrating to LNURL-withdraw if UX is priority

3. **Security Considerations:**
   - Both implementations are secure
   - LNbits requires more key management
   - Webhook endpoints need proper security 