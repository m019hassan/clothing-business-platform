# Clothing Business Platform — Architecture and Planning

## Project overview
This repository is being prepared for a practical, scalable business management platform for a small clothing manufacturing business with factory operations, inventory, a retail store, and an ecommerce channel. The initial delivery is a modular monolith implemented in Next.js with TypeScript, PostgreSQL, and Prisma. The design favors a simple MVP first while keeping the architecture extensible for later modules, integrations, and AI automation.

## Documentation map
- Product: [docs/01-product/overview.md](01-product/overview.md), [docs/01-product/business-requirements.md](01-product/business-requirements.md), [docs/01-product/user-personas.md](01-product/user-personas.md), [docs/01-product/mvp-scope.md](01-product/mvp-scope.md), [docs/01-product/assumptions-and-risks.md](01-product/assumptions-and-risks.md)
- Architecture: [docs/02-architecture/system-architecture.md](02-architecture/system-architecture.md), [docs/02-architecture/technology-stack.md](02-architecture/technology-stack.md), [docs/02-architecture/modular-architecture.md](02-architecture/modular-architecture.md), [docs/02-architecture/folder-structure.md](02-architecture/folder-structure.md), [docs/02-architecture/architectural-decisions.md](02-architecture/architectural-decisions.md)
- Domain: [docs/03-domain/domain-model.md](03-domain/domain-model.md), [docs/03-domain/products.md](03-domain/products.md), [docs/03-domain/inventory.md](03-domain/inventory.md), [docs/03-domain/orders.md](03-domain/orders.md), [docs/03-domain/payments.md](03-domain/payments.md), [docs/03-domain/shipping.md](03-domain/shipping.md), [docs/03-domain/factory.md](03-domain/factory.md), [docs/03-domain/notifications.md](03-domain/notifications.md), [docs/03-domain/state-machines.md](03-domain/state-machines.md)
- Security: [docs/04-security/authentication.md](04-security/authentication.md), [docs/04-security/authorization.md](04-security/authorization.md), [docs/04-security/roles-and-permissions.md](04-security/roles-and-permissions.md), [docs/04-security/audit-logging.md](04-security/audit-logging.md), [docs/04-security/security-requirements.md](04-security/security-requirements.md)
- Data: [docs/05-data/database-design.md](05-data/database-design.md), [docs/05-data/entities.md](05-data/entities.md), [docs/05-data/relationships.md](05-data/relationships.md), [docs/05-data/data-integrity.md](05-data/data-integrity.md)
- API: [docs/06-api/api-architecture.md](06-api/api-architecture.md), [docs/06-api/endpoints.md](06-api/endpoints.md), [docs/06-api/error-handling.md](06-api/error-handling.md)
- AI: [docs/07-ai/ai-architecture.md](07-ai/ai-architecture.md), [docs/07-ai/ai-tools.md](07-ai/ai-tools.md), [docs/07-ai/ai-permissions.md](07-ai/ai-permissions.md), [docs/07-ai/ai-approval-workflow.md](07-ai/ai-approval-workflow.md), [docs/07-ai/ai-audit-logging.md](07-ai/ai-audit-logging.md)
- Integrations: [docs/08-integrations/payment-gateways.md](08-integrations/payment-gateways.md), [docs/08-integrations/shipping-providers.md](08-integrations/shipping-providers.md), [docs/08-integrations/telegram.md](08-integrations/telegram.md), [docs/08-integrations/whatsapp.md](08-integrations/whatsapp.md), [docs/08-integrations/email.md](08-integrations/email.md)
- Infrastructure: [docs/09-infrastructure/environments.md](09-infrastructure/environments.md), [docs/09-infrastructure/deployment.md](09-infrastructure/deployment.md), [docs/09-infrastructure/cloud.md](09-infrastructure/cloud.md), [docs/09-infrastructure/backup-strategy.md](09-infrastructure/backup-strategy.md), [docs/09-infrastructure/disaster-recovery.md](09-infrastructure/disaster-recovery.md)
- Development: [docs/10-development/development-workflow.md](10-development/development-workflow.md), [docs/10-development/coding-standards.md](10-development/coding-standards.md), [docs/10-development/testing-strategy.md](10-development/testing-strategy.md), [docs/10-development/git-workflow.md](10-development/git-workflow.md), [docs/10-development/ai-coding-guidelines.md](10-development/ai-coding-guidelines.md)

## Current project phase
Phase 0.5 — architecture and planning. The implementation has not started; this documentation is the source of truth for future coding work.

## MVP scope
### MVP
- Authentication, users, roles, and permissions
- Product catalog with categories and variants
- Inventory with warehouses, stock movements, and reservation support
- Customer accounts, cart, checkout, and orders
- Payments for cash on delivery and bank transfer verification
- Shipping and delivery handling
- Basic admin dashboard and notifications

### Phase 2
- Advanced reporting, promotions, and discounts
- Factory production planning and BOM support
- Additional payment providers
- Shipping provider integrations

### Future
- AI assistant automation, WhatsApp and Telegram workflows, mobile app, deeper manufacturing ERP features

## Architecture summary
The platform is designed as a modular monolith with clear domain modules: identity, catalog, inventory, orders, payments, shipping, notifications, and AI. Next.js handles the UI and API routes, while PostgreSQL and Prisma provide persistent storage. Business logic is centralized in application services so the AI layer can invoke the same rules and permissions as human users without direct database access.

## Important decisions
- Use a modular monolith rather than microservices for the MVP.
- Use PostgreSQL as the system of record for transactional data.
- Use Prisma as the primary ORM for predictable schema evolution.
- Keep AI actions behind an explicit gateway and permission layer.
- Treat inventory as a location-based ledger rather than a simple stock counter.
- Keep order status and payment status separate.

## Open questions
- Which payment gateway, if any, will be used in production beyond manual bank transfer verification?
- Will the initial deployment use a managed PostgreSQL service or self-hosted PostgreSQL?
- What is the expected sales volume and order throughput for the first year?
- How much factory-level traceability is required before BOM and production planning are introduced?
- Which team members will own admin operations and approval workflows initially?

## Architecture decisions required
- Payment provider strategy for online payments.
- Warehouse and inventory ownership model for store and ecommerce channels.
- Approval model for sensitive payments, refunds, and product deletion.
- Production readiness for backups, monitoring, and incident response.

## Future roadmap
1. Deliver the MVP foundation and admin workflows.
2. Introduce inventory reservations, order lifecycle automation, and notifications.
3. Add factory production tracking and enhanced reporting.
4. Add AI tooling and external channel integrations incrementally.

## How to use these docs
- Read this file before starting any implementation task.
- Read the relevant domain, architecture, and security documentation before changing behavior.
- If a proposed implementation conflicts with these documents, stop and document the conflict.

## AI Coding Agent Rules
1. Read [docs/README.md](README.md) before starting any task.
2. Read all documentation relevant to the requested feature.
3. Do not change architecture silently.
4. Do not introduce new dependencies without justification.
5. Do not bypass existing business logic.
6. Do not access the database directly from AI tools.
7. Respect authentication and authorization.
8. Update documentation when architecture or business rules change.
9. If implementation conflicts with documentation, stop and explain the conflict.
10. Prefer extending existing modules over creating duplicate functionality.
11. Do not implement future features unless explicitly requested.
12. Keep the MVP simple.
13. Before modifying an existing module, inspect its current implementation and relevant documentation.
14. For database changes, explain migration impact and data integrity implications.
15. For security-sensitive changes, explicitly identify security implications.
