# System Architecture

## Architectural style
The system will begin as a modular monolith deployed as a single Next.js application with a shared database and shared domain modules. The core design goal is to keep the business logic cohesive while isolating concerns through module boundaries.

## High-level layers
1. Presentation layer
   - Next.js App Router pages and server components
   - Admin UI and storefront UI
2. Application layer
   - Domain services for catalog, inventory, orders, payments, shipping, and identity
3. Infrastructure layer
   - Prisma ORM, PostgreSQL, object storage adapters, notification providers, authentication providers
4. Cross-cutting concerns
   - Logging, audit, permissions, validation, background job hooks, and AI gateway integration

## Runtime view
- Users interact through the web app.
- The application layer performs validation and business rules.
- Transactions are committed through Prisma to PostgreSQL.
- Events and notifications are emitted to internal queues or background workers when needed.
- AI interactions go through the AI gateway, which calls business services and permission checks rather than accessing the database directly.
- File uploads such as payment proofs and product images should be stored through a dedicated object-storage layer rather than directly inside PostgreSQL.

## Design principles
- Business rules live in application services, not UI components.
- Modules should depend on shared abstractions rather than each other directly where possible.
- The system should be deployable as one application now and split later if required.

## Scalability approach
The modular monolith can later be decomposed into separate services for payments, inventory, or AI integrations without changing the domain model entirely. The initial architecture should therefore define clear boundaries and stable interfaces.
