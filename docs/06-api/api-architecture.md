# API Architecture

## API style
The MVP will use Next.js route handlers and server actions where appropriate. The API layer should expose domain-oriented endpoints instead of exposing database tables directly.

## API layers
- Route handlers for HTTP endpoints
- Application services for business logic
- Repository or data-access layer for persistence
- Validation and permission middleware

## Principles
- Keep business logic out of route handlers.
- Use consistent request and response DTOs.
- Validate input before side effects.
- Return explicit errors for permission and validation failures.

## Future evolution
The API surface should be designed so it can later be consumed by a mobile app or external integrations without rewriting the domain logic.
