# Dependency Rules

## Allowed dependencies
- Presentation may depend on Application and Shared.
- Application may depend on Domain, Shared, and Infrastructure abstractions.
- Domain may depend on Shared only.
- Infrastructure may depend on Domain interfaces and Shared.
- AI may depend on Application services and Shared, but not directly on repositories or persistence internals.

## Forbidden dependencies
- UI should not depend directly on infrastructure or persistence concepts.
- Domain should not depend on presentation, HTTP, UI frameworks, or concrete external services.
- One business module should not directly depend on another module's internal implementation details unless a stable public interface exists.
- Modules should not create circular dependencies by reaching back into each other through broad shared services.
- The AI module should not bypass permission checks or directly modify state outside the application layer.

## Cross-module communication
Cross-module communication should happen through:
- application services
- shared contracts and DTOs
- explicit domain events where appropriate
- adapter boundaries for external systems

## Shared kernel usage
Shared should contain reusable abstractions such as types, errors, results, validation helpers, constants, and configuration abstractions. Shared should not contain business logic for specific modules.

## Infrastructure access
Infrastructure concerns such as databases, storage, email, or external providers should be accessed through adapters and interfaces. Domain modules should not know which provider is in use.

## Example dependency patterns
- Orders may call Inventory application services to reserve stock.
- Payments may publish a payment verification event that other modules can react to.
- Notifications may subscribe to domain events but should not own inventory decisions.

## Prevention of circular dependencies
When a dependency feels necessary in both directions, the architecture should favor a shared application service or an event-based coordination pattern rather than a direct bidirectional module dependency.
