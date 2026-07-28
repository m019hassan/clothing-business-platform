# Business Aggregates

## Order Aggregate
- Aggregate Name: Order Aggregate
- Root Entity: Order
- Included Entities: Order Item, Payment, Shipment, Customer, Notification
- Business Responsibilities: Maintains the integrity of a customer purchase from placement through completion, cancellation, or return.
- Business Rules enforced inside the aggregate: An order must reflect a consistent lifecycle, payment and shipment status must be understood in relation to the order, and cancellations or returns must follow approved business rules.

## Product Aggregate
- Aggregate Name: Product Aggregate
- Root Entity: Product
- Included Entities: Product Variant, Category, Brand, Discount, Promotion
- Business Responsibilities: Keeps the catalog coherent and ensures that product offerings are described consistently for selling and reporting.
- Business Rules enforced inside the aggregate: A product must have a clear business identity, variants must belong to the same product family, and promotional or pricing changes must be understood within the product context.

## Inventory Aggregate
- Aggregate Name: Inventory Aggregate
- Root Entity: Inventory Item
- Included Entities: Warehouse, Stock Movement, Product Variant, Finished Product, Raw Material
- Business Responsibilities: Maintains the business view of available and reserved stock across locations and operations.
- Business Rules enforced inside the aggregate: Reserved stock cannot be treated as freely available, stock changes must be traceable, and adjustments must respect approval and location rules.

## User Aggregate
- Aggregate Name: User Aggregate
- Root Entity: User
- Included Entities: Role, Permission, Employee, Manager
- Business Responsibilities: Ensures that business authority is assigned and enforced consistently for people using the platform.
- Business Rules enforced inside the aggregate: Access must follow role-based rules, sensitive actions require proper authority, and changes to access should remain auditable.

## Payment Aggregate
- Aggregate Name: Payment Aggregate
- Root Entity: Payment
- Included Entities: Payment Proof, Order, Customer, Notification
- Business Responsibilities: Keeps the financial state of a sale coherent and reviewable.
- Business Rules enforced inside the aggregate: Payment status must remain distinct from order status, proof may be required for certain flows, and disputes must follow business escalation rules.

## Factory Aggregate
- Aggregate Name: Factory Aggregate
- Root Entity: Finished Product
- Included Entities: Raw Material, Stock Movement, Inventory Item
- Business Responsibilities: Connects production activity to the business inventory and product availability model.
- Business Rules enforced inside the aggregate: Production should lead to a clear finished state, materials should be consumed consistently, and output should become available for business use only when the production process is complete.

## Notification Aggregate
- Aggregate Name: Notification Aggregate
- Root Entity: Notification
- Included Entities: Customer, Employee, Order, Payment, Inventory Item
- Business Responsibilities: Ensures that important business events reach the right audience in a timely and accountable way.
- Business Rules enforced inside the aggregate: Notifications should reflect meaningful business events and be aligned with the policy and urgency rules of the business.

## AI Assistance Aggregate
- Aggregate Name: AI Assistance Aggregate
- Root Entity: AI Command
- Included Entities: AI Action, User, Permission, Notification
- Business Responsibilities: Governs approved AI-assisted business support while preserving accountability and policy boundaries.
- Business Rules enforced inside the aggregate: AI actions must remain within approved permissions, support the business process, and be traceable to an explicit request.
