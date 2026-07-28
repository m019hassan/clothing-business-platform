# System Architecture

## Architectural style
The system will begin as a modular monolith deployed as a single Next.js application with a shared database and a clear internal module structure. The design goal is to keep the business logic cohesive while isolating technical concerns through explicit boundaries.

## High-level layers
1. Presentation layer
   - Next.js App Router pages and server components
   - Admin and storefront interfaces
2. Application layer
   - Use cases for catalog, inventory, orders, payments, shipping, authentication, and reporting
3. Domain layer
   - Core business rules for products, stock, orders, payments, fulfillment, roles, and permissions
4. Infrastructure layer
   - Persistence, storage, external integrations, logging, security enforcement, and configuration access
5. Shared layer
   - Common types, errors, contracts, validation utilities, and cross-cutting abstractions

## Runtime view
- Users interact through the web application.
- Application services coordinate and enforce business behavior.
- Domain rules remain focused on business meaning and invariants.
- Infrastructure adapters connect to PostgreSQL, storage, notifications, payments, shipping, and other external systems.
- AI interactions go through the AI module and application services rather than accessing data directly.
- File uploads such as payment proofs and product images should be handled through a storage abstraction rather than embedded directly in business logic.

## Main modules
- Auth
- Users
- Roles and Permissions
- Products and Categories
- Inventory and Warehouses
- Customers
- Orders
- Payments
- Shipping
- Notifications
- Factory
- Reports
- Discounts
- AI
- Integrations
- Settings
- Audit

## Design principles
- Business rules live in the domain and application layers, not in UI or infrastructure code.
- Modules should depend on explicit services and contracts rather than on each other’s implementation details.
- The system should be deployable as one application now and evolve into more independent services later if required.

## Scalability approach
The modular monolith can later be decomposed into separate services for payments, inventory, AI, or reporting if the business grows. The initial architecture should therefore define stable boundaries and clear module ownership from the start.
