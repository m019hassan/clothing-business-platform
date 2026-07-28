# Prisma Foundation

## Purpose of Prisma
Prisma provides a consistent ORM foundation for the platform’s future database work. It is being initialized now so that future modules can build on a shared and predictable data-access approach.

## Folder structure
- prisma/schema.prisma: the Prisma schema entry point for generator and datasource configuration.
- prisma/README.md: guidance for future Prisma usage and conventions.

## Workflow overview
Future Prisma work should stay focused on a clear sequence: define the schema, review the model design, and apply changes through the project’s migration workflow. This repository is intentionally keeping the initial setup minimal so that the foundation remains simple and extensible.

## Relationship with PostgreSQL
Prisma is being configured to work with PostgreSQL as the relational database engine. The database connection is provided through the shared DATABASE_URL environment variable so the configuration stays externalized and portable.

## Relationship with future modules
Future modules should use Prisma as the shared database access layer rather than introducing ad hoc database logic. This keeps the system consistent and makes it easier to reason about data access as the platform grows.

## How future models should be organized
Future models should be added only when they are needed for a specific module or domain concern. The initial setup deliberately avoids business models so that the foundation remains neutral and reusable.

## Migration philosophy
Migration work should remain disciplined and reviewable. Changes should be introduced in a way that preserves clarity, supports future evolution, and avoids unnecessary coupling to application-specific concerns.

## General best practices
- Keep the schema simple at first.
- Avoid introducing business models before the domain and data architecture are clear.
- Keep database configuration externalized.
- Prefer explicit, reviewable changes over ad hoc updates.
