# Coding Guidelines

## Architecture-related rules
- Keep business logic inside the appropriate domain or application layer.
- Do not place business rules directly in UI components or route handlers.
- Make dependencies explicit through interfaces and contracts.
- Prefer small, focused modules over large, mixed-purpose ones.
- Avoid duplicating business rules across modules.
- Use validation and authorization checks at the application boundary.
- Keep infrastructure access behind adapters.
- Preserve a clear distinction between shared abstractions and module-specific business logic.
