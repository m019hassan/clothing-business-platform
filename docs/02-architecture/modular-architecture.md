# Modular Architecture

## Module boundaries
The application will be organized around the following modules:
- identity
- catalog
- inventory
- orders
- payments
- shipping
- notifications
- ai
- shared

## Shared module responsibilities
The shared module holds cross-cutting capabilities such as:
- auth helpers
- permission checks
- validation
- audit logging
- event types
- common DTOs and domain types

## Module coupling rules
- Modules should communicate through application services and explicit interfaces.
- The UI layer should not bypass application services.
- The AI layer should call application services rather than repositories directly.
- Cross-module references should be minimized and stable.

## Why this structure works
This keeps the initial application understandable while allowing later extraction of independent services if the business grows.
