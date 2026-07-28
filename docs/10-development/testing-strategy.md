# Testing Strategy

## Test levels
- Unit tests for validation and simple business rules
- Integration tests for order, payment, and inventory flows
- End-to-end tests for critical user journeys

## Priority areas
- Inventory reservation and release
- Bank transfer verification flow
- Order cancellation and return flow
- Permission enforcement
- AI tool execution and approval workflow

## Test principles
- Prefer testing real behavior over mocks where possible.
- Include failure cases for permission denial and invalid state transitions.
