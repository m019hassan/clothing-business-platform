# Orders

## Order lifecycle
Orders represent customer purchase requests and should be treated independently from payments and shipments.

## Order states
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

## Allowed transitions
- draft -> pending_payment
- draft -> cancelled
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

## Side effects
- The cart reserves inventory, and order creation preserves that reservation.
- The reservation remains held while the order is in draft or pending_payment.
- Cancelling an order releases its reservation exactly once.
- A pending payment is created with the order; payment success moves the order from pending_payment to confirmed and consumes the reservation, and payment failure or rejection cancels the order and releases it.
- Returning an order may create a refund event or restock inventory depending on policy.

## Roles
- Customer can create and view their own orders.
- Customer (owner) can move their own draft order to pending_payment and cancel their own order within 24 hours of placement.
- Staff can create, update, and manage orders; staff cancellation uses orders.cancel.
- Administrators can override order state where allowed.

## Notes
Order status and payment status must remain separate and should not be represented by a single field.
