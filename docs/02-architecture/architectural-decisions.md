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
