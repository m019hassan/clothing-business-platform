# Business Entities

## User
- Purpose: Represents a person who can access the platform in a business capacity.
- Business Responsibility: Authenticates into the system, performs assigned work, and acts within approved authority.
- Lifecycle: Created, assigned roles, activated, updated, disabled, or removed from active access.
- Important Business Behaviors: Can be granted or restricted by role, can request actions, and can be held accountable for business activity.
- Related Entities: Role, Permission, Employee, Customer, Manager.

## Role
- Purpose: Groups permissions into a business responsibility profile.
- Business Responsibility: Defines what a person may do within the business workflows.
- Lifecycle: Defined, revised, assigned, and retired as business needs change.
- Important Business Behaviors: Can be assigned to users, can be changed over time, and should enforce least-privilege access.
- Related Entities: Permission, User, Employee, Manager.

## Permission
- Purpose: Represents a specific business capability or approval right.
- Business Responsibility: Governs whether a user may perform a sensitive or privileged action.
- Lifecycle: Created, granted, revoked, or updated as policies evolve.
- Important Business Behaviors: Can be bundled into roles and used to control access to high-trust actions.
- Related Entities: Role, User, Order, Payment, Inventory.

## Customer
- Purpose: Represents a person or organization buying from the business.
- Business Responsibility: Places orders, receives updates, and participates in sales and service interactions.
- Lifecycle: Registered, engaged, serviced, and retained over time.
- Important Business Behaviors: Can place orders, receive notifications, and be associated with payment and shipment activity.
- Related Entities: Order, Payment, Shipment, Notification.

## Employee
- Purpose: Represents a staff member who operates the business process.
- Business Responsibility: Performs daily business operations such as fulfillment, inventory checks, or customer support.
- Lifecycle: Hired, assigned responsibilities, updated, and separated from active duties.
- Important Business Behaviors: May act under a role, may approve exceptions, and may be accountable for operational outcomes.
- Related Entities: User, Role, Manager, Order, Inventory.

## Manager
- Purpose: Represents a supervisory role within the business.
- Business Responsibility: Oversees operations, approves sensitive actions, and ensures business rules are followed.
- Lifecycle: Assigned authority, maintains oversight, and may lose authority over time.
- Important Business Behaviors: Can approve inventory adjustments, payment disputes, and other high-trust business actions.
- Related Entities: Employee, Role, Permission, Order, Payment, Inventory.

## Product
- Purpose: Represents a sellable item offered by the business.
- Business Responsibility: Defines what the business offers to customers and how it is represented in the catalog.
- Lifecycle: Created, published, updated, discontinued, or archived.
- Important Business Behaviors: May belong to categories, may have variants, and may be affected by pricing or inventory availability.
- Related Entities: Category, Brand, Product Variant, Inventory Item, Order Item.

## Product Variant
- Purpose: Represents a specific version of a product such as a size or color.
- Business Responsibility: Distinguishes offering variations while staying part of the same product family.
- Lifecycle: Introduced, maintained, and retired as the product evolves.
- Important Business Behaviors: Has its own business identity, may have its own availability, and may appear in orders.
- Related Entities: Product, SKU, Inventory Item, Order Item.

## Category
- Purpose: Groups products into a business-relevant classification.
- Business Responsibility: Organizes catalog content for browsing, merchandising, and reporting.
- Lifecycle: Created, updated, merged, or retired.
- Important Business Behaviors: Can contain many products and may be used for promotional organization.
- Related Entities: Product, Brand, Promotion.

## Brand
- Purpose: Represents the commercial identity of a product line or manufacturer.
- Business Responsibility: Helps the business group and describe products consistently.
- Lifecycle: Established, updated, or discontinued.
- Important Business Behaviors: Can be associated with multiple products and used in reporting and merchandising.
- Related Entities: Product, Category.

## Warehouse
- Purpose: Represents a physical or logical place where stock is stored.
- Business Responsibility: Holds inventory and supports stock movement across operational locations.
- Lifecycle: Established, maintained, and closed when no longer used.
- Important Business Behaviors: Can receive, transfer, and dispatch stock and can be referenced in inventory events.
- Related Entities: Inventory Item, Stock Movement, Shipment.

## Inventory Item
- Purpose: Represents stock belonging to a specific product variant and location.
- Business Responsibility: Tracks the business’s available supply and its location-specific state.
- Lifecycle: Created, replenished, reserved, adjusted, consumed, or retired.
- Important Business Behaviors: Can be reserved for orders, adjusted due to returns or damage, and used in production planning.
- Related Entities: Product Variant, Warehouse, Stock Movement, Order Item, Finished Product.

## Raw Material
- Purpose: Represents a basic input used in production.
- Business Responsibility: Supports the factory in producing goods that can become inventory.
- Lifecycle: Purchased, stored, used, and replenished.
- Important Business Behaviors: May be consumed in production and may be tracked for planning and availability.
- Related Entities: Finished Product, Factory, Stock Movement.

## Finished Product
- Purpose: Represents a good that has completed the production process.
- Business Responsibility: Becomes available inventory for sale or distribution after production completes.
- Lifecycle: Produced, inspected, stored, and released into inventory.
- Important Business Behaviors: May be linked to production activity and may enter stock at a warehouse.
- Related Entities: Raw Material, Inventory Item, Factory, Order Item.

## Stock Movement
- Purpose: Represents a business event where inventory changes location, form, or status.
- Business Responsibility: Records the movement or adjustment of stock in a meaningful way.
- Lifecycle: Created when a movement or adjustment occurs and completed when the event is resolved.
- Important Business Behaviors: Can represent receipt, transfer, reservation, consumption, return, or damage.
- Related Entities: Inventory Item, Warehouse, Order, Factory.

## Order
- Purpose: Represents a customer purchase request accepted by the business.
- Business Responsibility: Coordinates the business process of selling, fulfilling, and completing a purchase.
- Lifecycle: Placed, confirmed, fulfilled, canceled, returned, or completed.
- Important Business Behaviors: Contains order items, may be associated with payments and shipments, and must respect business rules around cancellations and approvals.
- Related Entities: Customer, Order Item, Payment, Shipment, Notification.

## Order Item
- Purpose: Represents a specific requested line within an order.
- Business Responsibility: Captures what the customer requested and the business must fulfill.
- Lifecycle: Added to an order, adjusted, fulfilled, canceled, or returned.
- Important Business Behaviors: May depend on stock availability, pricing, and product variant details.
- Related Entities: Order, Product Variant, Inventory Item, Discount.

## Payment
- Purpose: Represents the financial transaction connected to an order.
- Business Responsibility: Confirms the financial commitment, tracks payment state, and supports dispute handling.
- Lifecycle: Initiated, verified, completed, disputed, refunded, or failed.
- Important Business Behaviors: Must be checked against business rules and may require approval or proof.
- Related Entities: Order, Customer, Payment Proof, Notification.

## Payment Proof
- Purpose: Represents evidence that supports a payment claim or verification.
- Business Responsibility: Provides business confirmation for payment methods that require proof.
- Lifecycle: Submitted, reviewed, accepted, or rejected.
- Important Business Behaviors: Supports approval workflows and dispute resolution.
- Related Entities: Payment, Manager.

## Shipment
- Purpose: Represents the business delivery activity associated with an order.
- Business Responsibility: Tracks the handoff or delivery of goods to the intended destination.
- Lifecycle: Prepared, dispatched, in transit, delivered, or failed.
- Important Business Behaviors: May be associated with shipping addresses, order completion, and customer communication.
- Related Entities: Order, Warehouse, Customer, Notification.

## Discount
- Purpose: Represents a pricing reduction applied to a product, order, or promotion.
- Business Responsibility: Supports sales strategy and customer value while maintaining pricing rules.
- Lifecycle: Defined, applied, expired, or removed.
- Important Business Behaviors: May be limited by promotion rules or stacking restrictions.
- Related Entities: Promotion, Order Item, Product.

## Coupon
- Purpose: Represents a redeemable code that grants a discount.
- Business Responsibility: Enables controlled promotional offers and customer engagement.
- Lifecycle: Issued, claimed, used, expired, or invalidated.
- Important Business Behaviors: May have validity limits and redemption conditions.
- Related Entities: Discount, Promotion, Customer.

## Promotion
- Purpose: Represents a structured sales or marketing activity.
- Business Responsibility: Coordinates a business offer around products, timing, and discounts.
- Lifecycle: Planned, active, expired, or closed.
- Important Business Behaviors: May include coupons and discount conditions and may affect multiple products or orders.
- Related Entities: Discount, Coupon, Product, Customer.

## Notification
- Purpose: Represents an important message sent to people about business events.
- Business Responsibility: Keeps staff and customers informed about changes that require attention.
- Lifecycle: Created, delivered, acknowledged, or dismissed.
- Important Business Behaviors: May be triggered by stock changes, order updates, payments, or approvals.
- Related Entities: Order, Payment, Inventory Item, Customer, Employee.

## AI Command
- Purpose: Represents a request made to the AI assistant for business support.
- Business Responsibility: Captures the intent behind an assisted action and keeps it within approved business boundaries.
- Lifecycle: Submitted, reviewed, executed, or rejected.
- Important Business Behaviors: Must respect permissions and approval governance.
- Related Entities: AI Action, User, Permission, Notification.

## AI Action
- Purpose: Represents the business step taken by the AI assistant in response to an approved request.
- Business Responsibility: Supports business work while remaining accountable and observable.
- Lifecycle: Proposed, approved, executed, and reviewed.
- Related Entities: AI Command, User, Notification.
