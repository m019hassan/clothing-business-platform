# Scalability Strategy

## Current architecture
The initial architecture is a modular monolith deployed as a single application. This is appropriate for the MVP and for early growth.

## Expected growth
Growth will likely come through more products, more orders, more users, more integrations, and more reporting needs. The architecture should support this incrementally rather than requiring a large rewrite.

## Scaling approach
- start with a single deployment and clear module boundaries
- use vertical scaling for early growth where appropriate
- keep the system ready for later extraction of high-load modules such as payments, inventory, or AI integration if required
- avoid premature decomposition into services

## Future extraction guidance
If a module becomes a clear bottleneck or requires independent scaling or ownership, it can be extracted later while preserving the business contracts that already exist.
