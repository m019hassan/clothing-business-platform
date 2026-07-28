# Security Requirements

## MVP security requirements
- Enforce authentication for protected routes and API actions.
- Enforce authorization at the application service layer.
- Encrypt sensitive data at rest and in transit.
- Protect payment proof files and audit logs.
- Rate limit authentication and sensitive operations.
- Keep secrets in environment-based secret storage.

## Risks to plan for
- Unauthorized access to admin functionality
- Inventory overselling due to race conditions
- Fraudulent bank transfer proof uploads
- AI prompt injection and unsafe tool execution
- Accidental deletion or modification of critical records

## Controls
- Permission checks
- Transaction boundaries
- Audit logs
- Idempotency for critical operations
- Approval workflow for high-risk actions
