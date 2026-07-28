# Audit Logging

## Purpose
Audit logging provides traceability for security-sensitive and business-critical operations.

## What should be logged
- Authentication events
- Role and permission assignment changes
- Product changes
- Inventory adjustments
- Order state transitions
- Payment approval and rejection
- Refund and return actions
- AI tool invocations and approvals

## Log contents
- actor id
- action
- target type and id
- previous state
- new state
- timestamp
- ip address or request id when available
- result

## Retention
Audit logs should be retained longer than normal operational logs and should not be deleted casually.

## Security note
Audit logs are part of the system of record for sensitive actions and must be protected from tampering.
