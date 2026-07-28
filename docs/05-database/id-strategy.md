# ID Strategy

## UUID policy
The platform should prefer UUIDs for technical identifiers in the database layer. UUIDs provide strong uniqueness across distributed or modular environments and are a practical default for systems that may grow beyond a single deployment boundary.

## Why UUID is preferred
UUIDs reduce the risk of collisions, make it easier to support integration scenarios, and keep identifiers less dependent on a single database sequence. They also fit well with a future-oriented architecture that may evolve toward more distributed or service-oriented patterns.

## Human-readable identifiers
Business-facing identifiers such as SKU values, order numbers, invoice numbers, and similar references should remain separate from technical database identifiers. These business identifiers should be designed around the needs of the business and the user experience rather than the storage layer.

## Separation of technical and business identifiers
The platform should keep a clear distinction between technical IDs that support storage and relationships and business identifiers that support user understanding and operational workflows. This separation improves clarity and helps avoid coupling business logic to database internals.
