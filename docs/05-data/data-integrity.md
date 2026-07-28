# Data Integrity

## Transactional integrity
- Inventory reservation and order confirmation should happen in a single transaction where possible.
- Payment approval and order update should be coordinated carefully.
- Stock movement posting should not be partial or silent.

## Soft deletion
- Products, categories, and users may use soft deletion where business history is important.
- Hard deletion should be avoided for audit-related records.

## Validation rules
- Price cannot be negative.
- Stock movement quantity should be non-zero.
- Payment proof should be required for verification-based payment flows.
- Order state changes should follow the documented state machine.

## Audit requirements
- Every sensitive change should create an audit log entry.
- Deletions should be represented as state changes where possible rather than destructive operations.
