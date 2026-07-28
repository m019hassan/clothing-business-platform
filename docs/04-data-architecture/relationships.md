# Conceptual Relationships

## Customer places Orders
- Relationship description: A customer initiates one or more orders.
- Business meaning: Orders represent the business relationship between the customer and the company in commercial terms.
- Lifecycle dependency: An order depends on the customer being known to the business and remains connected to that customer throughout the order lifecycle.

## Order contains Order Items
- Relationship description: An order is composed of one or more order items.
- Business meaning: Order items capture the specific products or variants requested by the customer.
- Lifecycle dependency: The order item lifecycle depends on the order lifecycle and changes as the order changes.

## Order references Products
- Relationship description: An order item refers to the product or variant being requested.
- Business meaning: The business can understand what was sold and how it was represented in the catalog.
- Lifecycle dependency: The relationship remains meaningful across order creation, fulfillment, and historical review.

## Payment belongs to Order
- Relationship description: A payment is associated with a specific order.
- Business meaning: The financial commitment of the sale is tied to the order that created it.
- Lifecycle dependency: Payment state and order state are linked through the business lifecycle of the sale.

## Shipment fulfills Order
- Relationship description: A shipment is created to fulfill an order.
- Business meaning: The business uses shipment as the operational expression of fulfillment.
- Lifecycle dependency: Shipment progress depends on the order reaching a fulfillment-ready state.

## Inventory stores Products
- Relationship description: Inventory represents the stock held for products and variants.
- Business meaning: The business uses inventory to understand what is available for sale or use.
- Lifecycle dependency: Inventory changes as products are received, reserved, adjusted, or consumed.

## Factory consumes Raw Materials
- Relationship description: Production uses raw materials to create finished goods.
- Business meaning: The business connects production inputs to the goods it eventually sells.
- Lifecycle dependency: Production depends on raw materials being available and on the business approving the production activity.

## Factory produces Finished Products
- Relationship description: Production results in finished products that can enter inventory.
- Business meaning: Factory output becomes part of the business’s sellable or distributable supply.
- Lifecycle dependency: Finished products depend on production completion before they can be treated as available inventory.

## AI executes Commands
- Relationship description: AI actions are taken in response to approved AI commands.
- Business meaning: The business can use AI support while preserving accountability and approval boundaries.
- Lifecycle dependency: AI actions depend on the command being valid, approved, and within the relevant business context.

## Notifications reference Business Events
- Relationship description: Notifications are connected to events such as orders, payments, inventory changes, or approvals.
- Business meaning: The business communicates the state of important activity to staff and customers.
- Lifecycle dependency: Notifications depend on the underlying business event being meaningful and traceable.

## Audit records Business Changes
- Relationship description: Audit entries capture important changes made across the platform.
- Business meaning: The business preserves a trustworthy record of what changed and under what authority.
- Lifecycle dependency: Audit records depend on the business event or action that triggered the change.

## Identity authorizes Business Actions
- Relationship description: Identity and permissions govern who may act in the platform.
- Business meaning: The business ensures authority is clear and controlled.
- Lifecycle dependency: Permission and role context remain relevant for the full lifecycle of orders, payments, inventory changes, and AI activities.
