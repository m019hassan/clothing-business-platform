# Logging Strategy

## Logging categories
- application logs: technical events and operational flow
- audit logs: sensitive actions and changes that need traceability
- business logs: important business events such as order updates or inventory changes
- security logs: authentication events, permission checks, and suspicious activity
- error logs: failures and unexpected conditions
- AI logs: AI requests, approvals, tool usage, and safety-related outcomes
- integration logs: external provider requests and responses

## Log levels
- debug: fine-grained technical detail for troubleshooting
- info: normal operational events
- warn: degraded or suspicious but recoverable conditions
- error: failed operations and unexpected exceptions

## Retention philosophy
Logs should be retained long enough to support operations, security review, and business traceability without creating unnecessary storage pressure. The retention policy should be practical and aligned with business needs.
