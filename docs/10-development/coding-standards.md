# Coding Standards

## General standards
- Prefer strong typing and explicit interfaces.
- Keep modules focused and avoid cross-cutting shortcuts.
- Use descriptive names and avoid hidden side effects.
- Favor small, composable services over large utility classes.

## Naming conventions
- Use descriptive, business-aligned names for modules, folders, and symbols.
- Prefer camelCase for variables and functions.
- Prefer PascalCase for React components and TypeScript types.
- Use UPPER_SNAKE_CASE for environment variables and shared constants.

## Folder conventions
- Keep the modular monolith structure intact.
- Place feature-oriented code inside the relevant module folder under modules/.
- Keep shared reusable code under shared/.
- Keep application entry points under app/.

## File naming
- Use lowercase names for most files.
- Use kebab-case for multi-word file names when appropriate.
- Use index.ts for barrel files where a folder exposes a central export.
- Keep file names meaningful and aligned with the module responsibility.

## TypeScript conventions
- Prefer explicit types for shared contracts and public module interfaces.
- Avoid using any unless there is no safer alternative.
- Keep types close to the code that uses them when practical.
- Favor small, composable types over large, loosely structured ones.

## React component conventions
- Keep components focused on presentation or composition.
- Prefer simple props interfaces and avoid hidden side effects.
- Keep UI concerns separate from business logic.
- Do not place feature logic directly inside shared UI components.

## Import conventions
- Group imports by external dependencies first, then local modules.
- Prefer path aliases such as @/modules and @/shared where appropriate.
- Avoid deep relative imports when a shared alias can express the intent clearly.

## Module boundaries
- Keep business logic inside the relevant module.
- Avoid importing from sibling modules unless there is a clearly documented shared dependency.
- Keep cross-module coupling limited and intentional.

## Error handling philosophy
- Handle errors at the boundary where the failure is understood.
- Preserve meaningful error context for future debugging and review.
- Do not swallow errors silently.

## Logging philosophy
- Logging should support review, troubleshooting, and operational awareness.
- Keep logs meaningful and concise.
- Avoid logging sensitive business or user data by default.

## Security standards
- Never bypass authorization checks.
- Never expose raw database access from UI or AI code.
- Validate every input that reaches the business layer.

## Testing standards
- Test business rules and state transitions explicitly.
- Test inventory reservations and payment approval flows carefully.
- Prefer integration tests for core flows.

## Documentation expectations
- Update documentation when architecture, naming, or workflow expectations change.
- Keep module README files meaningful and lightweight.
- Use business language first, and technical detail only where needed.
