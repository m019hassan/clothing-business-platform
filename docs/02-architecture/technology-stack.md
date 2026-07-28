# Technology Stack

## Core stack
- Next.js for UI, server-side rendering, and API routes
- TypeScript for type safety
- React and App Router for the application structure
- Tailwind CSS and shadcn/ui for the UI foundation
- PostgreSQL as the transactional database
- Prisma ORM for schema management and data access

## Why these choices
- Next.js fits the requirement for a full-stack app with a modern React ecosystem.
- TypeScript reduces runtime errors and improves maintainability.
- PostgreSQL is a strong fit for transactional inventory and order data.
- Prisma accelerates development while keeping schema evolution manageable.

## Deferred / optional additions
- Redis for caching and temporary reservations
- Background job processing for notifications and order processing
- Object storage for media and attachments
- Docker for local and cloud consistency
- Cloud deployment services for production
- External gateways for payments and shipping

## Selection guidance
Additional technologies should only be introduced when they solve a clear, justified need and can be postponed until after the MVP if possible.
