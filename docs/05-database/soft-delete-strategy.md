# Soft Delete Strategy

## Business objects that may support soft delete
Objects that represent business records with a meaningful lifecycle, such as catalog entries, order-related records, or administrative records, may support soft delete when the system needs to preserve history without making the data immediately unavailable.

## Objects that must never be deleted
Certain reference and audit-critical objects should never be removed in a destructive way. These include records that preserve financial or operational accountability and records that are required to maintain referential integrity across the platform.

## Archiving philosophy
The platform should treat archival as a business lifecycle state rather than a shortcut for data cleanup. Archived records should remain understandable and recoverable when needed, but they should be clearly separated from active business activity.

## Recovery expectations
Soft-deleted records should be recoverable where business rules and governance allow. The recovery process should be deliberate and should preserve the meaning of the data rather than simply restoring it without review.
