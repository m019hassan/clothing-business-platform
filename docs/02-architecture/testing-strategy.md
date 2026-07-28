# Testing Strategy

## High-level approach
Testing should support the architecture by validating business behavior, module boundaries, and integration safety. The goal is confidence without excessive complexity.

## Unit testing
Unit tests should cover domain rules, validation logic, and isolated application behaviors. These tests should focus on the business rule itself rather than the surrounding UI or infrastructure.

## Module testing
Module tests should verify that a module behaves correctly when exercised through its public application service boundaries.

## Integration testing
Integration tests should validate that modules work correctly with their persistence and adapter boundaries. They are especially important for inventory, payments, and order workflows.

## End-to-end testing
End-to-end tests should cover realistic business journeys such as placing an order, verifying payment, updating inventory, and shipping an order.

## Business rule testing
Business rule tests should directly capture critical behaviors such as stock reservation, payment verification, and order state transitions.

## Future contract testing
If services are extracted later, contract testing should be introduced to preserve the boundaries between services and the existing modular monolith.
