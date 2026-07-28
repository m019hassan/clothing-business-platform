# Clothing Business Platform — Project Foundation

## Project overview
This repository is being prepared as a long-lived, AI-friendly software project for a small clothing business platform. The current stage is Sprint 0 - Project Foundation, where the focus is on documentation, project structure, and shared operating principles rather than implementation.

## Documentation map
- Project foundation: [PROJECT_MANIFEST.md](../PROJECT_MANIFEST.md)
- Product and planning: [docs/01-product/overview.md](01-product/overview.md), [docs/01-product/business-requirements.md](01-product/business-requirements.md), [docs/01-product/user-personas.md](01-product/user-personas.md), [docs/01-product/mvp-scope.md](01-product/mvp-scope.md), [docs/01-product/assumptions-and-risks.md](01-product/assumptions-and-risks.md)
- Architecture: [docs/02-architecture/system-architecture.md](02-architecture/system-architecture.md), [docs/02-architecture/technology-stack.md](02-architecture/technology-stack.md), [docs/02-architecture/modular-architecture.md](02-architecture/modular-architecture.md), [docs/02-architecture/folder-structure.md](02-architecture/folder-structure.md), [docs/02-architecture/architectural-decisions.md](02-architecture/architectural-decisions.md)
- Domain: [docs/03-domain/domain-model.md](03-domain/domain-model.md), [docs/03-domain/products.md](03-domain/products.md), [docs/03-domain/inventory.md](03-domain/inventory.md), [docs/03-domain/orders.md](03-domain/orders.md), [docs/03-domain/payments.md](03-domain/payments.md), [docs/03-domain/shipping.md](03-domain/shipping.md), [docs/03-domain/factory.md](03-domain/factory.md), [docs/03-domain/notifications.md](03-domain/notifications.md), [docs/03-domain/state-machines.md](03-domain/state-machines.md)
- Security: [docs/04-security/authentication.md](04-security/authentication.md), [docs/04-security/authorization.md](04-security/authorization.md), [docs/04-security/roles-and-permissions.md](04-security/roles-and-permissions.md), [docs/04-security/audit-logging.md](04-security/audit-logging.md), [docs/04-security/security-requirements.md](04-security/security-requirements.md)
- Data: [docs/05-data/database-design.md](05-data/database-design.md), [docs/05-data/entities.md](05-data/entities.md), [docs/05-data/relationships.md](05-data/relationships.md), [docs/05-data/data-integrity.md](05-data/data-integrity.md)
- API: [docs/06-api/api-architecture.md](06-api/api-architecture.md), [docs/06-api/endpoints.md](06-api/endpoints.md), [docs/06-api/error-handling.md](06-api/error-handling.md)
- AI: [docs/07-ai/ai-architecture.md](07-ai/ai-architecture.md), [docs/07-ai/ai-tools.md](07-ai/ai-tools.md), [docs/07-ai/ai-permissions.md](07-ai/ai-permissions.md), [docs/07-ai/ai-approval-workflow.md](07-ai/ai-approval-workflow.md), [docs/07-ai/ai-audit-logging.md](07-ai/ai-audit-logging.md)
- Infrastructure: [docs/09-infrastructure/environments.md](09-infrastructure/environments.md), [docs/09-infrastructure/deployment.md](09-infrastructure/deployment.md), [docs/09-infrastructure/cloud.md](09-infrastructure/cloud.md), [docs/09-infrastructure/backup-strategy.md](09-infrastructure/backup-strategy.md), [docs/09-infrastructure/disaster-recovery.md](09-infrastructure/disaster-recovery.md)
- Development: [docs/10-development/development-workflow.md](10-development/development-workflow.md), [docs/10-development/coding-standards.md](10-development/coding-standards.md), [docs/10-development/testing-strategy.md](10-development/testing-strategy.md), [docs/10-development/git-workflow.md](10-development/git-workflow.md), [docs/10-development/ai-coding-guidelines.md](10-development/ai-coding-guidelines.md)

## Current phase
Sprint 0 - Project Foundation. This stage is documentation and project-structure preparation only.

## MVP summary
The MVP focuses on a practical foundation for catalog management, inventory, orders, payments, shipping, notifications, and role-based administration for a small clothing business.

## Architecture summary
The intended architecture is a modular monolith in Next.js with TypeScript, PostgreSQL, Prisma, and clear domain boundaries. The design should remain simple for the MVP while supporting future growth.

## Development workflow
- Read [PROJECT_MANIFEST.md](../PROJECT_MANIFEST.md) before starting work.
- Read the relevant documentation before changing architecture or business behavior.
- Use the checklists under [.ai/checklists](../.ai/checklists/README.md) for review and quality control.
- Keep documentation updated when the project direction changes.

## Documentation rules
- Treat this documentation as the single source of truth.
- Keep terminology and naming consistent.
- Prefer explanation over shorthand.
- Keep the project understandable to both humans and AI agents.

## Open questions
- Placeholder: to be filled as requirements become clearer.

## Architecture decisions
- Placeholder: ADRs will be added as decisions are made.

## Future roadmap summary
- Establish the project foundation and documentation structure.
- Clarify business, architecture, and security requirements.
- Prepare the system for implementation in a controlled and auditable way.

## How AI agents should use this documentation
1. Read [PROJECT_MANIFEST.md](../PROJECT_MANIFEST.md) first.
2. Read [docs/README.md](README.md) and the relevant domain or architecture documents.
3. Review any related architecture decisions before implementing changes.
4. Check the existing implementation before modifying it.
5. Explain intended changes before implementing them.
6. Keep the MVP simple and avoid unnecessary complexity.
