# Architectural Decisions

## ADR-001: Why Next.js Full-Stack
### Context
The business needs a web application that can serve both storefront and admin workflows with minimal setup.

### Decision
Use Next.js with TypeScript and React for the initial implementation.

### Alternatives considered
- Separate frontend and backend applications
- Traditional server-rendered PHP or Django app

### Reasoning
Next.js provides a coherent full-stack experience, supports App Router, and keeps the MVP lean while leaving room for API routes and future server actions.

### Consequences
The codebase will be easier to evolve, but the team must keep server and client concerns clearly separated.

## ADR-002: Why Modular Monolith
### Context
The business is small and should not pay the overhead of microservices before the system becomes complex.

### Decision
Build a modular monolith with clear module boundaries.

### Alternatives considered
- Microservices from day one
- A tightly coupled single-package application

### Reasoning
A modular monolith reduces operational complexity while still supporting future extraction.

### Consequences
The initial deployment is simpler, but the team must maintain module boundaries carefully.

## ADR-003: Why PostgreSQL
### Context
The platform needs robust transactional support for inventory, orders, payments, and audit events.

### Decision
Use PostgreSQL as the primary relational database.

### Alternatives considered
- MySQL
- NoSQL document databases

### Reasoning
PostgreSQL offers strong relational integrity, good support for transactions, and mature tooling.

### Consequences
The system will need careful schema design, but the data model will be reliable and extensible.

## ADR-004: Why Prisma
### Context
The team needs a comfortable developer experience for schema changes and typed data access.

### Decision
Use Prisma ORM.

### Alternatives considered
- Raw SQL
- TypeORM

### Reasoning
Prisma helps maintain type safety and makes the later transition to more sophisticated data access patterns easier.

### Consequences
The project becomes easier to develop, but the team must manage migrations carefully.

## ADR-005: Why not microservices initially
### Context
The business is small and the platform should avoid unnecessary complexity.

### Decision
Do not introduce microservices in the MVP.

### Alternatives considered
- Separate services for inventory, payments, and AI
- Event-driven architecture from the start

### Reasoning
The operating overhead and coordination complexity would outweigh the benefits at the current scale.

### Consequences
The architecture must remain modular and service-friendly for a future split.

## ADR-006: Why AI cannot access the database directly
### Context
AI actions must be safe, auditable, and permission-controlled.

### Decision
The AI gateway may invoke business services and tools, but it must never directly access the database.

### Alternatives considered
- Allowing the model to query the database directly
- Letting the AI bypass the application layer

### Reasoning
Direct access would create security, authorization, and data integrity risks.

### Consequences
All AI actions must flow through the same validation, permission, and audit layers as human actions.

## ADR-007: Why inventory uses stock movements
### Context
The business needs accurate stock tracking for sales, returns, adjustments, and production.

### Decision
Represent inventory as location-based balances plus stock movements rather than a single simple quantity field.

### Alternatives considered
- A single product stock property
- Per-channel-only quantities

### Reasoning
This supports reconciliation, auditing, and future complexity such as reservations and production consumption.

### Consequences
The data model is slightly more complex, but it is much safer and more extensible.

## ADR-008: Why order and payment statuses are separate
### Context
Orders can have payment states that do not match the order state, especially for bank transfer verification.

### Decision
Treat order status and payment status as separate concepts.

### Alternatives considered
- Using a single status field for both
- Embedding payment status in the order state machine

### Reasoning
This avoids conflating fulfillment with financial processing and supports clearer workflows.

### Consequences
The implementation must track both states independently and keep them synchronized carefully.

## ADR-009: Cloud production vs home backup server
### Context
Production services need reliability and security, while the home server is intended for backups and recovery.

### Decision
Use cloud infrastructure for production and a home server or NAS only for backup and disaster recovery purposes.

### Alternatives considered
- Hosting production on a home server
- Treating the home server as a primary production system

### Reasoning
A home server is practical for backup copies but is not a safe primary production environment for a business-critical platform.

### Consequences
The deployment plan must support cloud production, encrypted backup copies, and recovery procedures.

## ADR-010: Why product variants are modeled explicitly
### Context
The clothing business needs a catalog that can represent products with multiple sizes, colors, and sellable combinations without losing clarity.

### Decision
Model products as a parent catalog item and represent each sellable variation as an explicit product variant with its own SKU and inventory identity.

### Alternatives considered
- A single product record with size and color stored as free-form tags
- Separate product records for every size-color combination

### Reasoning
Explicit variants and SKUs make inventory, pricing, and order line handling precise and scalable. They also align with the business reality that each size-color combination can have its own stock profile.

### Consequences
The data model is more structured, but it creates a cleaner foundation for later promotions, bundles, and warehouse-level stock control.

## ADR-011: Why inventory uses stock movements and reservations
### Context
The platform needs to prevent overselling while supporting orders, returns, payments, and manual adjustments.

### Decision
Track inventory through location-based balances plus immutable stock movements and reservations rather than a single mutable count.

### Alternatives considered
- A single stock field per variant
- Per-channel-only inventory without reservation support

### Reasoning
This provides clean auditability, reconciliation, and a safer path for future production, transfer, and multi-location workflows.

### Consequences
The inventory model is more complex, but it is materially safer and easier to reason about than a one-field stock snapshot.

## ADR-012: Why payment and order states remain independent
### Context
Bank transfer verification and other payment workflows can leave an order in a different state from its payment state.

### Decision
Keep payment state and order state as separate concepts in the domain model and application logic.

### Alternatives considered
- A single status field shared by payments and orders
- Embedding payment verification into the order state machine only

### Reasoning
This avoids conflating fulfillment with financial processing and makes approval and reconciliation workflows more explicit.

### Consequences
The implementation must synchronize both states carefully and surface them independently in the UI and APIs.

## ADR-013: Why the architecture uses a modular monolith instead of microservices
### Context
The business is still small and the team should not carry the operational cost of distributed services before the system truly requires them.

### Decision
Use a modular monolith as the initial architecture and keep the internal boundaries clear enough for future extraction.

### Alternatives considered
- Microservices from the first release
- A single tightly-coupled application with no module boundaries

### Reasoning
A modular monolith keeps development and operations simple while still preserving a path to future service extraction.

### Consequences
The team must preserve module boundaries carefully and avoid turning the monolith into an unstructured codebase.

## ADR-014: Why AI uses application services rather than direct access
### Context
The business needs AI assistance without compromising security, permissions, or business consistency.

### Decision
AI workflows should call application services and use the same approval and permission model as human users.

### Alternatives considered
- Direct database access from AI flows
- AI bypassing the application layer completely

### Reasoning
This keeps the AI operationally safe, auditable, and aligned with business rules.

### Consequences
AI features will be slightly more structured, but the system stays secure and easier to reason about.

## ADR-015: Why adapters isolate external integrations
### Context
Payments, shipping, messaging, storage, and AI providers will change over time and must not leak through the business modules.

### Decision
All external integrations must be wrapped in adapter boundaries and translated into domain-facing contracts.

### Alternatives considered
- Letting domain modules depend directly on provider SDKs
- Embedding integration logic in UI code

### Reasoning
This keeps the business model stable and reduces the ripple effect of provider changes.

### Consequences
The architecture becomes slightly more abstract, but the system is easier to evolve and test.
