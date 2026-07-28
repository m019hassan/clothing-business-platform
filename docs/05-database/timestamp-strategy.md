# Timestamp Strategy

## created_at
Every record that represents an entity should carry a created_at timestamp. This supports traceability and makes it easier to understand when a business object entered the system.

## updated_at
Every mutable business record should carry an updated_at timestamp. This helps identify recent changes and supports auditability and operational review.

## deleted_at
Records that may be soft deleted should carry a deleted_at timestamp. This allows the platform to preserve historical context while avoiding immediate removal of data that may still be relevant to audits or recovery.

## archived_at (future)
An archived_at timestamp may be introduced later for objects that need a lifecycle distinction between active, archived, and removed states. This is useful when business workflows need a more explicit retention model without deleting the data.

## Business purpose
Timestamps should be treated as business-relevant metadata because they support accountability, lifecycle visibility, and informed operational decisions. They should not be added casually; each timestamp should have a clear reason for existing.
