# Conceptual Data Model

## Identity
- Purpose: To define who can act in the business platform and under what authority.
- Main Business Objects: User, Employee, Manager, Customer, Role, Permission.
- Business Responsibilities: Manage access, define authority, support approvals, and preserve accountability.
- Information Produced: Access decisions, role assignments, approval authority, and identity-related changes.
- Information Consumed: Order actions, payment approvals, inventory adjustments, AI requests, and reporting context.

## Catalog
- Purpose: To define the business offer and the way products are organized for sale.
- Main Business Objects: Product, Product Variant, Category, Brand, SKU, Promotion, Discount.
- Business Responsibilities: Maintain product meaning, support merchandising, and define the commercial offer.
- Information Produced: Product definitions, variant information, pricing context, and promotion eligibility.
- Information Consumed: Orders, inventory availability, factory planning, and reporting.

## Inventory
- Purpose: To represent the stock the business holds and the way it changes over time.
- Main Business Objects: Inventory, Stock, Reserved Stock, Available Stock, Warehouse, Stock Movement.
- Business Responsibilities: Track what is available, what is reserved, and what moves between locations or states.
- Information Produced: Stock position, reservation status, adjustment history, and availability information.
- Information Consumed: Orders, factory planning, reporting, and fulfillment decisions.

## Factory
- Purpose: To coordinate the production side of the business.
- Main Business Objects: Raw Material, Production Activity, Finished Product.
- Business Responsibilities: Convert materials into finished goods and connect production with inventory availability.
- Information Produced: Production progress, finished goods readiness, and material usage information.
- Information Consumed: Inventory state, product definitions, and reporting.

## Sales
- Purpose: To manage the business process of turning customer demand into orders.
- Main Business Objects: Order, Order Item, Customer, Shipment.
- Business Responsibilities: Capture purchase intent, maintain order lifecycle, and coordinate fulfillment.
- Information Produced: Order history, fulfillment status, and customer-facing business outcomes.
- Information Consumed: Catalog information, inventory availability, payment state, shipping context, and notifications.

## Payments
- Purpose: To represent the financial side of an accepted sale.
- Main Business Objects: Payment, Payment Proof, Discount, Promotion.
- Business Responsibilities: Track payment state, verify trust, and support dispute handling.
- Information Produced: Payment status, verification results, and payment-related history.
- Information Consumed: Orders, reporting, and customer communications.

## Shipping
- Purpose: To manage the movement of goods from the business to the customer or another destination.
- Main Business Objects: Shipment, Delivery State, Shipping Address.
- Business Responsibilities: Track handoff, delivery status, and fulfillment completion.
- Information Produced: Shipment progress, delivery outcomes, and fulfillment history.
- Information Consumed: Orders, inventory movement, and notifications.

## Notifications
- Purpose: To keep people informed about important business events.
- Main Business Objects: Notification, Notification Channel, Notification Preference.
- Business Responsibilities: Deliver timely communication for orders, payments, inventory events, and approvals.
- Information Produced: Customer and staff communications and alert history.
- Information Consumed: Order updates, payment changes, inventory changes, and AI activity.

## AI
- Purpose: To support approved business assistance in a governed way.
- Main Business Objects: AI Command, AI Action, Approval Context.
- Business Responsibilities: Interpret requests, support business tasks, and remain accountable to permission and approval rules.
- Information Produced: AI request outcomes, assisted actions, and review history.
- Information Consumed: Identity authority, order context, inventory context, and notification events.

## Reporting
- Purpose: To provide a business view of operational and financial performance.
- Main Business Objects: Report, Summary, Exception View.
- Business Responsibilities: Aggregate business information for review, analysis, and decision-making.
- Information Produced: Business insight, operational summaries, and performance views.
- Information Consumed: Catalog, inventory, order, payment, shipping, and factory data.

## Audit
- Purpose: To preserve a trustworthy record of important business changes.
- Main Business Objects: Audit Entry, Change Record, Approval Record.
- Business Responsibilities: Record what changed, when it changed, and under whose authority.
- Information Produced: Audit history and evidence of business decisions.
- Information Consumed: Identity, payments, inventory, orders, factory, AI, and notification events.
