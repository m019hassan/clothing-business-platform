# Clothing Business Platform

This repository is being prepared as a modular monolith foundation for a small clothing business platform. The current Sprint 1 task establishes the initial project structure only. No business logic, API, database, authentication, or feature implementation has been added.

## Project Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Modular monolith architecture

## Current Structure
- app/: default Next.js App Router entry points
- modules/: placeholder modules for auth, users, products, inventory, orders, payments, notifications, factory, reports, and ai
- shared/: reusable shared resources planned for future implementation
- components/, hooks/, providers/, config/, constants/, lib/, types/, styles/: supporting folders for future application structure
- src/: project-local documentation and future source organization

## Notes
- The structure is intentionally placeholder-based.
- Future implementation work should keep module boundaries explicit and avoid circular dependencies.
- This task does not introduce business features, database models, or authentication flows.

## Getting Started
Run the development server with:

```bash
npm run dev
```

Open http://localhost:3000 to view the default Next.js app shell.
