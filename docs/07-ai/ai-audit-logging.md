# AI Audit Logging

## What to log
- Incoming user message metadata
- Tool selection and arguments
- Permission evaluation results
- Approval events
- Execution outcomes
- Errors and retries

## Log requirements
- Logs must be immutable enough to support incident review.
- The AI system must record both successful and failed actions.
- Sensitive details should be redacted where appropriate.

## Security goals
Audit logging ensures the AI system remains observable and accountable.
