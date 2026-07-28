# Operational Data Guidelines

## Naming conventions
Business data should use clear and stable names that reflect the business meaning of the information. Names should be understandable to staff, managers, and reviewers without requiring technical explanation. Core business terms such as Product, Order, Payment, Inventory, Shipment, Discount, AI Command, and Notification should be used consistently.

## Data ownership responsibilities
Each business domain should remain responsible for the meaning, quality, and business rules of its own data. Ownership should be clear enough that questions about status, accuracy, or business interpretation can be resolved without confusion. The owner of a business record is responsible for its correct business use and for preserving its historical integrity.

## Sensitive data classification
Business data should be classified according to the level of sensitivity it carries. Financial records, payment proofs, permission data, employee records, and customer attachments should be treated as sensitive. Inventory and order information should be handled carefully because they affect customer commitments and operational trust.

## Retention principles
Data should be retained as long as it remains valuable to the business. Retention should support operational continuity, reporting, customer service, financial review, audit, and dispute resolution. Important historical records should generally be preserved rather than deleted casually.

## Archiving policy
When data is no longer active, it should be archived rather than discarded unless there is a clear and approved business reason to remove it. Archived records should remain accessible for business review and should preserve the relationship between the record and its historical context.

## Recovery expectations
Operational data should be recoverable in a way that supports business continuity. Recovery should preserve not only the latest state of records, but also the business understanding of what happened before the disruption.

## Data consistency expectations
The business should expect that related records remain coherent across domains. Product information, inventory information, order records, payment records, and shipment records should not conflict in ways that confuse staff or customers. Consistency is essential to protect trust in daily operations.

## Audit expectations
Significant business actions should be auditable. The business should be able to review who acted, what changed, and why the action was taken. Audit expectations should apply especially to approvals, financial actions, permission changes, and AI-assisted work.

## AI generated content policy
AI-generated content should be treated as business content that requires review, approval, and traceability where appropriate. It should support business work without weakening governance, and its origin should remain understandable to the business. AI content should not be treated as an informal or unreviewable source of truth.

## Reporting data policy
Reporting should rely on business data that is accurate, current, and clearly owned. Reports should reflect the business’s official meaning of key concepts such as product status, inventory availability, order state, payment status, and employee authority. Reporting should preserve the distinction between current operational truth and historical context.
