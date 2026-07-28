# Domain Services

## Inventory Allocation Service
- Purpose: Determine which available stock can support a business request.
- Responsibilities: Evaluate stock availability, consider reserved stock, and support customer-facing and internal fulfillment decisions.
- Inputs: Product, variant, requested quantity, relevant warehouse or location, and current stock state.
- Outputs: Allocation decision, available quantity, and any limitation or exception that affects fulfillment.
- Business Rules involved: Reserved stock cannot be treated as available for new sales, available stock cannot be negative, and fulfillment decisions must reflect current stock commitments.
- Related Aggregates: Inventory Aggregate, Order Aggregate.

## Inventory Reservation Service
- Purpose: Secure stock for pending orders or other business commitments.
- Responsibilities: Reserve stock for a future business need and ensure reservation stays within available supply.
- Inputs: Order item, requested quantity, and relevant stock context.
- Outputs: Reservation outcome and updated stock commitment state.
- Business Rules involved: A reservation cannot exceed available stock, and reserved stock must be released or confirmed when the underlying order is resolved.
- Related Aggregates: Inventory Aggregate, Order Aggregate.

## Payment Verification Service
- Purpose: Confirm that a payment method meets the business expectation for trust and approval.
- Responsibilities: Review payment evidence, validate payment status, and decide whether the business can proceed with fulfillment.
- Inputs: Payment, payment method details, and supporting proof where required.
- Outputs: Verified, pending, disputed, or rejected payment decision.
- Business Rules involved: Bank transfer payments require verification before fulfillment, disputes must be escalated, and verification outcomes must remain visible to the business.
- Related Aggregates: Payment Aggregate, Order Aggregate.

## Discount Calculation Service
- Purpose: Determine the pricing impact of discounts and promotions on an order or product.
- Responsibilities: Evaluate applicable discounts, promotional rules, and restrictions on combination.
- Inputs: Order context, product context, customer context, and promotion or coupon details.
- Outputs: Applicable discount amount or pricing adjustment.
- Business Rules involved: Discounts cannot be combined unless explicitly allowed, coupons have validity limits, and totals cannot be reduced below zero.
- Related Aggregates: Product Aggregate, Order Aggregate.

## Order Pricing Service
- Purpose: Establish the business price for an order or order item.
- Responsibilities: Combine base price, applicable promotions, discounts, and any pricing exceptions.
- Inputs: Order item details, product pricing context, discount rules, and customer context.
- Outputs: Final price for the order item or order.
- Business Rules involved: Product pricing must remain consistent across channels, promotions must expire appropriately, and pricing must reflect the approved discount rules.
- Related Aggregates: Product Aggregate, Order Aggregate.

## Shipping Cost Calculation Service
- Purpose: Determine the business shipping cost for an order.
- Responsibilities: Evaluate shipping context, destination, and policy rules to calculate the applicable shipping cost.
- Inputs: Order, shipment destination, shipping rules, and order details.
- Outputs: Shipping cost and shipping decision.
- Business Rules involved: Shipping rules must remain consistent with business policy and should not override approved fulfillment conditions.
- Related Aggregates: Order Aggregate, Shipment-related business context.

## Notification Dispatch Service
- Purpose: Ensure that important business events reach the intended audience.
- Responsibilities: Identify recipients, select the appropriate notification channel, and dispatch relevant communications.
- Inputs: Business event, audience, urgency, and channel preferences.
- Outputs: Notification sent or queued for delivery according to business policy.
- Business Rules involved: Critical notifications cannot be disabled, notification history must remain available, and customers and staff must receive the required updates for key events.
- Related Aggregates: Notification Aggregate, Order Aggregate, Payment Aggregate, Inventory Aggregate.

## AI Command Execution Service
- Purpose: Coordinate approved AI assistance for business support.
- Responsibilities: Evaluate the requested action, confirm approval and permission, and determine whether the AI assistant may proceed.
- Inputs: AI command, business context, user authority, and permission context.
- Outputs: Approved action, rejected action, or request for review.
- Business Rules involved: AI actions require permission, must be traceable, and must not bypass restricted business rules.
- Related Aggregates: AI Assistance Aggregate, User Aggregate.

## Stock Availability Service
- Purpose: Provide a clear business view of whether stock can support a transaction.
- Responsibilities: Combine currently available stock with reservation status and business commitments to determine a usable quantity.
- Inputs: Product or variant, location, and quantity requested.
- Outputs: Availability decision and the quantity the business can confidently promise.
- Business Rules involved: Available stock must reflect reserved stock, and stock cannot be treated as available when it is already committed.
- Related Aggregates: Inventory Aggregate, Order Aggregate.

## Factory Production Planning Service
- Purpose: Coordinate the business planning of production work.
- Responsibilities: Determine production needs, align raw materials with finished product goals, and connect planned production to inventory availability.
- Inputs: Product demand, production context, raw material state, and target output.
- Outputs: Production plan and expected contribution to inventory.
- Business Rules involved: Production should only increase finished goods when the production process is complete, and raw materials must not be consumed beyond the business’s available supply.
- Related Aggregates: Factory Aggregate, Inventory Aggregate, Product Aggregate.
