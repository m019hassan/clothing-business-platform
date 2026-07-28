# Coding Standards

## General standards
- Prefer strong typing and explicit interfaces.
- Keep modules focused and avoid cross-cutting shortcuts.
- Use descriptive names and avoid hidden side effects.
- Favor small, composable services over large utility classes.

## Security standards
- Never bypass authorization checks.
- Never expose raw database access from UI or AI code.
- Validate every input that reaches the business layer.

## Testing standards
- Test business rules and state transitions explicitly.
- Test inventory reservations and payment approval flows carefully.
- Prefer integration tests for core flows.
