# Orders

## Order lifecycle
Orders represent customer purchase requests and should be treated independently from payments and shipments.

## Order states
- draft
- pending_payment
- confirmed
- processing
- shipped
- delivered
- cancelled
- returned

## Allowed transitions
- draft -> pending_payment
- pending_payment -> confirmed
- pending_payment -> cancelled
- confirmed -> processing
- processing -> shipped
- shipped -> delivered
- confirmed -> cancelled
- shipped -> returned
- delivered -> returned

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
