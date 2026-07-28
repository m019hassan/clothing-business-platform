# Business Invariants

## Inventory
- Available stock can never be negative.
- Reserved stock cannot exceed total stock.
- Inventory adjustments must remain traceable to a business reason.
- Inventory must remain associated with the appropriate business location or context.

## Orders
- Every order must belong to exactly one customer.
- An order cannot be shipped before payment verification when the payment method requires verification.
- A cancelled order cannot be shipped.
- An order must reflect a consistent lifecycle from creation through completion or cancellation.

## Payments
- Every payment belongs to exactly one order.
- Bank transfer payments require verification before the business treats them as accepted.
- Payment proofs cannot be treated as invalid once they have been approved.
- Payment status must remain distinct from order status.

## Products
- Every product variant must have a unique SKU.
- Archived products cannot be purchased.
- Product pricing must remain consistent across the business’s sales channels.
- A product cannot be represented in a way that conflicts with its current business status.

## Discounts and Promotions
- Discounts cannot reduce the total below zero.
- A coupon must not remain valid after its expiry conditions are met.
- Discounts cannot be combined unless the business explicitly allows it.
- Promotions must end when their business validity period ends.

## Users and Access
- Every user must have at least one role.
- Permissions are derived from the roles assigned to a user.
- Sensitive business actions require appropriate authority.
- Access changes must remain auditable.

## Factory and Production
- Raw materials cannot become negative.
- Finished products can only increase after production completion.
- Production output must be linked to the relevant business product context.
- Production cannot bypass approved business controls.

## AI Assistance
- Every AI action must be traceable to an approved request.
- AI cannot execute restricted actions without the necessary permission.
- AI assistance must remain within the business rules that govern the relevant workflow.
- AI-assisted actions must remain visible and reviewable.

## Notifications
- Critical notifications cannot be disabled.
- Notification history must remain available for business review.
- Notifications must reflect meaningful business events.
- Important customer and staff updates must not be omitted when business policy requires them.
