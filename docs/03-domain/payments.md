# Payments

## Payment concepts
Payments represent the financial handling of an order. They are separate from the order lifecycle and may have their own state machine.

## Payment methods
- cash_on_delivery
- bank_transfer
- manual_transfer_verification
- online_gateway

## Payment states
- pending
- authorized
- pending_verification
- approved
- rejected
- refunded
- failed
- cancelled

## Implemented payment lifecycle (current slice)
- A payment record is created with the order in state pending, with the order's authoritative amount and currency.
- pending -> approved when the payment succeeds: the order moves from pending_payment to confirmed.
- pending -> rejected when the payment fails or is rejected: the order moves from pending_payment to cancelled.
- pending -> cancelled when the order is cancelled before a payment outcome is recorded.
- Confirming the order consumes the inventory reservation; a rejected or cancelled payment releases it.
- An internal simulation endpoint (POST /api/orders/:id/payment-simulation with outcome success or failure) exercises this lifecycle for testing. It is an application simulation, not a payment provider integration; the documented proof upload plus payments.verify / payments.reject flow replaces it in a later slice.

## Payment lifecycle rules
- The payment state is independent from the order state.
- Bank transfer payments should remain in pending_verification until a staff member approves or rejects them.
- Refunds should be represented as a separate financial event from cancellation and should not automatically imply the order is fully refunded.

## Bank transfer workflow
1. Customer creates an order and selects bank transfer.
2. The system creates a payment record with state pending_verification.
3. The customer uploads proof of payment.
4. Staff reviews the proof.
5. Staff approves or rejects the payment.
6. The system updates the payment and order state appropriately.
7. Notifications are sent to the relevant parties.

## Rules
- Payment approval must be independent from order fulfillment.
- Proof of payment must be stored with metadata and review history.
- Refunds should be treated as a separate event from order cancellation.

## Security considerations
- Payment proof files must be stored securely.
- Review actions must be logged and permission-controlled.
