# Bounded Contexts

## 1. Identity and Access
- Purpose: define who is allowed to act in the platform.
- Responsibilities: authentication, user identity, roles, permissions, and approval authority.
- What belongs inside: user accounts, access rules, role definitions, and sensitive action governance.
- What does not belong inside: product catalog rules, payment processing decisions, and inventory movement workflows.
- Main interactions: works with Orders, Inventory, Payments, and Reports to enforce business authority and approval.

## 2. Catalog and Merchandising
- Purpose: define the products the business offers and how they are organized.
- Responsibilities: products, categories, product variants, pricing context, and product lifecycle information.
- What belongs inside: product definitions, category structure, variant differences, and business-facing product information.
- What does not belong inside: warehouse stock movement rules, payment disputes, or order fulfillment decisions.
- Main interactions: provides product truth to Orders, Inventory, and the AI Assistant.

## 3. Inventory and Stock Management
- Purpose: govern the business availability of goods across locations and processes.
- Responsibilities: stock levels, stock movements, reservations, available stock, and inventory adjustments.
- What belongs inside: stock position, reservation logic, location-based availability, and inventory events.
- What does not belong inside: pricing rules, customer identity, or order approval authority.
- Main interactions: receives product information from Catalog and supports Orders, Factory, and Reports.

## 4. Commerce and Orders
- Purpose: manage the business process of turning customer demand into confirmed orders.
- Responsibilities: customer orders, order items, order status, cancellations, returns, and fulfillment coordination.
- What belongs inside: order lifecycle, customer purchase intent, fulfillment expectations, and order history.
- What does not belong inside: payment settlement decisions, factory production planning, or identity administration.
- Main interactions: depends on Catalog, Inventory, Payments, and Notifications.

## 5. Finance and Payments
- Purpose: manage the financial side of sales and related business activity.
- Responsibilities: payment records, payment status, disputes, refunds, and financial confirmation.
- What belongs inside: payment state, financial approval concerns, and payment-related communications.
- What does not belong inside: product composition, warehouse operations, or user access control.
- Main interactions: connects with Orders and Notifications and may influence approval and reporting.

## 6. Factory and Production
- Purpose: manage the production side of the business.
- Responsibilities: raw materials, production planning, finished products, and production coordination.
- What belongs inside: production activities, material expectations, product readiness, and manufacturing status.
- What does not belong inside: customer purchase flow, identity management, or direct payment settlement.
- Main interactions: contributes to Inventory and depends on Catalog for product understanding.

## 7. Communication and Notifications
- Purpose: keep people informed about important business events.
- Responsibilities: notifications, alerts, customer updates, and business event communication.
- What belongs inside: communication events, message timing, and recipient awareness.
- What does not belong inside: business rules for inventory, pricing, or approval authority.
- Main interactions: receives events from Orders, Payments, Inventory, and Factory.

## 8. Insights and Reporting
- Purpose: provide a clear view of business health and operational performance.
- Responsibilities: performance summaries, operational reports, exception visibility, and management reporting.
- What belongs inside: business reporting, performance interpretation, and management insight.
- What does not belong inside: operational execution, identity administration, or payment settlement.
- Main interactions: uses information from Orders, Inventory, Payments, and Factory.

## 9. Intelligence and Assistance
- Purpose: support business users through approved AI-assisted workflows.
- Responsibilities: interpreting requests, suggesting actions, and helping users perform business tasks safely.
- What belongs inside: AI commands, AI actions, approved business assistance, and guidance within policy.
- What does not belong inside: bypassing permissions, overriding approval rules, or replacing accountable business decisions.
- Main interactions: depends on business context from Catalog, Orders, Inventory, and Permissions.
