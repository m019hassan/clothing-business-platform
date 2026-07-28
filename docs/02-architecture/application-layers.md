# Application Layers

## Runtime composition
The system will be composed of four main runtime concerns:
1. Presentation
2. Application services
3. Domain model and rules
4. Infrastructure adapters and persistence

## Application service responsibilities
Application services should be the main entry point for use cases. They should gather inputs, apply rules, and coordinate modules. They should also be the point where authorization checks, validation, audit, and transactional boundaries are enforced.

## Use case examples
- Place order
- Confirm payment
- Reserve stock
- Release stock after cancellation
- Create shipment
- Verify return request
- Notify customer of order status

## Why this layer matters
This layer creates a clear boundary between user interactions and the business core. It makes the system easier to test and easier to evolve as new channels or automation features are introduced.

## Interface style
Application services should expose clear operations rather than exposing repository or persistence details. Their contracts should describe business capabilities rather than implementation mechanics.
