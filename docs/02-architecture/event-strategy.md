# Event Strategy

## When to use events
Events are useful when one module needs to react to an important business change without becoming tightly coupled to another module. They are especially appropriate for notifications, audit trails, downstream workflow actions, and asynchronous follow-up actions.

## When not to use events
Events should not be used when a synchronous operation is simpler and more explicit. For example, the order placement workflow should not rely on distributed event choreography for the core transactional decision.

## Examples of sensible events
- Order Created
- Payment Verified
- Inventory Reserved
- Inventory Released
- Shipment Delivered
- Notification Requested

## Guidance
Events should remain simple and business-oriented. The system should avoid event-heavy patterns during the MVP unless there is a clear operational reason. Internal domain events should improve clarity and flexibility, not introduce unnecessary complexity.
