# Architecture Rules

## Core rule
The project should remain a modular monolith during the MVP and preserve clear boundaries for future growth.

## Architectural expectations
- Separate domain modules by responsibility.
- Keep business logic in shared application services rather than in UI components.
- Favor explicit interfaces over hidden coupling.
- Avoid circular dependencies.
- Keep the design understandable to both humans and AI agents.

## Why these rules matter
They keep the system maintainable, reviewable, and suitable for gradual evolution without requiring a rewrite.
