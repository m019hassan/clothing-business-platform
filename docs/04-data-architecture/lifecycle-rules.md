# Lifecycle Rules

## Orders
- Orders cannot move directly from Draft to Shipped.
- Cancelled orders cannot be reopened.
- Completed orders become read-only.
- Orders cannot be shipped before payment verification when the payment method requires it.
- Orders may be cancelled within the permitted business window and require the appropriate approval when the order is already being prepared.

## Payments
- Approved payments cannot return to Pending.
- Rejected payments may be resubmitted.
- Cash on Delivery skips payment verification under the business rules for that method.
- Payments in dispute cannot be treated as completed until resolved.
- Payment proof remains meaningful after approval and should not be treated as disposable business information.

## Inventory
- Reserved stock cannot become available without reservation release.
- Inventory adjustments require authorization.
- Inventory movements must remain traceable to a business reason.
- Inventory cannot be treated as available when it is reserved for an order or another active commitment.

## Products
- Archived products cannot receive new orders.
- Draft products are invisible to customers.
- Discontinued products may remain visible for historical context but should not be treated as active offers.
- Product status changes must remain consistent with the business offer and catalog expectations.

## Discounts
- Expired discounts cannot be reactivated.
- Future discounts activate automatically on their start date.
- Discounts cannot be combined unless the business allows it.
- Discounts must not reduce the total below zero.

## AI Commands
- Failed commands may be retried.
- Executed commands cannot be modified.
- Restricted commands require elevated permissions.
- AI commands must remain traceable to the business request that initiated them.

## Notifications
- Failed notifications may be retried.
- Delivered notifications remain immutable.
- Critical notifications cannot be disabled.
- Notifications must remain connected to the business event that triggered them.

## Factory
- Production cannot start without required raw materials.
- Production completion increases finished goods inventory.
- Blocked production must be resolved or cancelled before it can proceed.
- Production output must remain tied to the intended product context.
