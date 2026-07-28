# Module Boundaries

## Core module responsibilities

### Auth
Owns authentication flows, session handling, sign-in and sign-out processes, and authentication-related validation. It should not contain product or inventory business logic.

### Users
Owns the user lifecycle, profile and account basics, and user-level settings. It should coordinate with Roles and Permissions for access decisions.

### Roles and Permissions
Owns the business concept of role assignment and permission enforcement. It should define the policy model, but application services in other modules should decide when a permission is required.

### Products and Categories
Owns product definitions, catalog structure, and product variant concepts. It should define the business rules for product availability, status, and catalog relationships.

### Inventory and Warehouses
Owns stock balance, stock movement, reservation, and warehouse logic. This module should be the authoritative owner of inventory state and inventory rules.

### Customers
Owns customer records, profile information, and customer-facing behavior. It should not directly own payment or shipping business decisions.

### Orders
Owns order lifecycle, order state transitions, and order composition. It should coordinate with Inventory, Payments, Shipping, and Notifications but should remain the owner of order semantics.

### Payments
Owns payment intent, verification, settlement status, and payment-related exceptions. It should remain independent from order presentation or shipping fulfillment.

### Shipping
Owns shipment lifecycle, delivery workflow, and related business states. It should coordinate with Orders but should not own product catalog rules.

### Notifications
Owns notification intent, template selection, and communication dispatch. It should not contain inventory or payment business rules.

### Factory
Owns production planning and manufacturing coordination where needed. It should interact with inventory and orders but should not govern customer experience or payments.

### Reports
Owns reporting and operational summary behavior. It should consume data from other modules without owning core business logic.

### Discounts
Owns promotion and discount rules. It should coordinate with Products and Orders but should not replace the order lifecycle owner.

### AI
Owns AI interaction orchestration, prompt handling, tool boundary enforcement, and permission-aware task execution. It should not bypass the modules that own business rules.

### Integrations
Owns external adapter logic for payment providers, shipping providers, email, messaging, storage, and future ERP connectors. It should translate external concerns into domain-facing contracts.

### Settings
Owns configuration values, business toggles, and long-lived operational settings that affect multiple modules.

### Audit
Owns audit trail handling and secure event recording. It should not decide business outcomes on its own.

## Ownership rules
- Each business concept should have one primary owner.
- Other modules may depend on that owner through public services.
- No module should own the same concept in a conflicting way.

## Forbidden access
- Domain modules should not access infrastructure concerns directly unless through an adapter interface.
- UI and presentation concerns should not contain business rules.
- The AI module should not bypass module ownership by directly modifying inventory or order state.
