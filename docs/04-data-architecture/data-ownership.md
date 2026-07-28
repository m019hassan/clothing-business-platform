# Data Ownership

## Why ownership matters
Clear ownership is essential because business data must remain understandable, trustworthy, and governed. When each domain is accountable for its own information, the business can resolve questions about meaning, quality, and authority more easily. Ownership also helps preserve the single source of truth and supports consistent decision-making as the platform grows.

## Catalog owns
- Owned Data: Products, product variants, categories, brands, pricing context, promotions, and discounts.
- Responsible Module: Catalog.
- Allowed Updates: Product creation, product updates, catalog organization, and promotion or discount changes.
- Read Access: Orders, inventory, reporting, and sales workflows may read this data.
- Cross-domain Dependencies: Depends on identity for approval authority and on inventory for stock-related visibility.

## Inventory owns
- Owned Data: Stock, reserved stock, available stock, stock movements, and warehouse context.
- Responsible Module: Inventory.
- Allowed Updates: Stock adjustments, reservations, transfers, and inventory state changes.
- Read Access: Orders, factory planning, reporting, and sales workflows may read this data.
- Cross-domain Dependencies: Depends on catalog for product meaning and on orders for reservation context.

## Orders owns
- Owned Data: Orders, order items, order status, order history, and fulfillment expectations.
- Responsible Module: Sales.
- Allowed Updates: Order creation, status changes, cancellation, return handling, and fulfillment progress.
- Read Access: Payments, shipping, notifications, reporting, and customer support may read this data.
- Cross-domain Dependencies: Depends on catalog, inventory, payments, and shipping for business context.

## Payments owns
- Owned Data: Payments, payment proofs, payment status, and payment-related approvals.
- Responsible Module: Payments.
- Allowed Updates: Payment initiation, verification, dispute handling, and resolution.
- Read Access: Orders, reporting, finance review, and customer communication may read this data.
- Cross-domain Dependencies: Depends on orders for the related sales context and on identity for authority.

## Factory owns
- Owned Data: Raw materials, production activity, finished goods, and production readiness.
- Responsible Module: Factory.
- Allowed Updates: Production planning, material consumption, production completion, and finished goods status changes.
- Read Access: Inventory, reporting, and product planning may read this data.
- Cross-domain Dependencies: Depends on catalog for product understanding and on inventory for stock availability.

## Identity owns
- Owned Data: Users, employees, managers, customers, roles, permissions, and access authority.
- Responsible Module: Identity.
- Allowed Updates: User creation, role assignment, permission changes, activation, and deactivation.
- Read Access: Orders, payments, factory, AI, reporting, and audit may read this data for approval and accountability purposes.
- Cross-domain Dependencies: Supports payments, inventory, orders, and AI through authority and approval context.

## Shipping owns
- Owned Data: Shipments, delivery state, shipment progress, and fulfillment handoff information.
- Responsible Module: Shipping.
- Allowed Updates: Shipment creation, delivery updates, and completion status changes.
- Read Access: Orders, notifications, and reporting may read this data.
- Cross-domain Dependencies: Depends on orders for the related sales context and on inventory for stock movement context.

## Notifications owns
- Owned Data: Notifications, alert history, delivery preferences, and communication outcomes.
- Responsible Module: Notifications.
- Allowed Updates: Create notifications, update status, and manage communication preferences.
- Read Access: Staff, customers, and operational workflows may read this data.
- Cross-domain Dependencies: Depends on orders, payments, inventory, factory, and AI for the business events that trigger notifications.

## AI owns
- Owned Data: AI commands, AI actions, approval context, and AI-related history.
- Responsible Module: AI.
- Allowed Updates: Receive and process approved AI requests, record AI actions, and maintain review context.
- Read Access: Identity, notifications, reporting, and business operations may read this data.
- Cross-domain Dependencies: Depends on identity for permission context and on other business domains for task context.

## Reporting owns
- Owned Data: Reports, summaries, and business views derived from operational data.
- Responsible Module: Reporting.
- Allowed Updates: Update report definitions, refresh business views, and maintain reporting scope.
- Read Access: Managers, administrators, and business stakeholders may read this data.
- Cross-domain Dependencies: Depends on catalog, inventory, orders, payments, shipping, factory, and audit data for content.

## Audit owns
- Owned Data: Audit entries, change records, and approval records.
- Responsible Module: Audit.
- Allowed Updates: Record significant business changes and preserve review history.
- Read Access: Identity, payments, inventory, orders, factory, AI, and management workflows may read this data.
- Cross-domain Dependencies: Depends on all business domains for the events and changes it records.
