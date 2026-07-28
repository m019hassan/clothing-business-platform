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
- Confirming an order may reserve inventory.
- Cancelling an order should release reserved stock.
- Returning an order may create a refund event or restock inventory depending on policy.

## Roles
- Customer can create and view their own orders.
- Staff can create, update, and manage orders.
- Administrators can override order state where allowed.

## Notes
Order status and payment status must remain separate and should not be represented by a single field.
