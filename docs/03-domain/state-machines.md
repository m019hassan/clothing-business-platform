# State Machines

## Order state machine
### Valid states
- draft
- pending_payment
- confirmed
- processing
- ready_to_ship
- shipped
- delivered
- cancelled
- returned
- refunded

### Allowed transitions
- draft -> pending_payment
- pending_payment -> confirmed
- pending_payment -> cancelled
- confirmed -> processing
- processing -> ready_to_ship
- ready_to_ship -> shipped
- shipped -> delivered
- confirmed -> cancelled
- shipped -> returned
- delivered -> returned
- returned -> refunded

### Triggering actors
- Customer may create or cancel their own order within policy limits.
- Staff may update the order state.
- Administrators may override in exceptional cases.

### Side effects
- Confirming an order reserves inventory.
- Cancellation releases reservation.
- Returns may restock inventory and trigger refund logic.

### Notifications
- New order
- Order confirmed
- Order cancelled
- Order shipped
- Order delivered

## Payment state machine
### Valid states
- pending
- authorized
- pending_verification
- approved
- rejected
- refunded
- failed
- cancelled

### Allowed transitions
- pending -> pending_verification
- pending_verification -> approved
- pending_verification -> rejected
- approved -> refunded
- pending -> failed
- pending -> cancelled

### Triggering actors
- Customer creates the payment flow.
- Staff verifies bank transfer proof.
- Administrators can override sensitive payment decisions.

### Side effects
- Approval may unlock fulfillment.
- Rejection may keep the order in a pending or cancelled state depending on policy.
- Refunds should be tracked as an independent financial event.

### Notifications
- Payment pending verification
- Payment approved
- Payment rejected

## Shipment state machine
### Valid states
- pending
- packed
- shipped
- out_for_delivery
- delivered
- failed
- cancelled
- returned

### Allowed transitions
- pending -> packed
- packed -> shipped
- shipped -> out_for_delivery
- out_for_delivery -> delivered
- pending -> cancelled
- packed -> cancelled
- shipped -> failed
- delivered -> returned

### Triggering actors
- Staff or fulfillment handlers update shipment state.

### Side effects
- Shipment updates should be reflected in order history.
- Delivery may trigger customer notifications.

## Return state machine
### Valid states
- requested
- approved
- in_progress
- completed
- rejected

### Allowed transitions
- requested -> approved
- requested -> rejected
- approved -> in_progress
- in_progress -> completed

### Side effects
- Returns may create refund records and restock inventory.

## Refund state machine
### Valid states
- pending
- processing
- completed
- failed
- cancelled

### Allowed transitions
- pending -> processing
- processing -> completed
- pending -> cancelled
- processing -> failed

### Side effects
- Refund completion should update payment state and financial records.

## Production order state machine
### Valid states
- planned
- queued
- in_progress
- completed
- cancelled

### Allowed transitions
- planned -> queued
- queued -> in_progress
- in_progress -> completed
- planned -> cancelled
- queued -> cancelled

### Triggering actors
- Factory supervisor or operations manager.

### Side effects
- Production completion may increase finished-good inventory balances in a future phase.
