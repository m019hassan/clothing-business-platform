# AI Architecture

## Architecture overview
The AI system is an external-facing layer that interacts with the platform through a secure gateway. It does not access the database directly.

## Components
- AI Gateway: receives messages from channels such as Telegram, WhatsApp, email, or future clients.
- AI Agent: interprets user intent and chooses tools.
- Tool Registry: exposes approved business capabilities.
- Tool Permission Layer: validates whether the requested action is allowed for the authenticated user or system context.
- Business Service Layer: performs the actual work via application services.
- Audit and Approval Layer: records actions and requires approval for sensitive operations.

## Execution flow
User -> External Channel -> AI Gateway -> AI Agent -> Tool Calling -> Permission Check -> Business Service -> Database

## Design principles
- The AI system should be additive and incremental.
- The AI may only perform actions through the same business logic used by human users.
- The AI must not bypass permissions or validation.

## Safety measures
- Tool allowlists
- Prompt injection protection
- Idempotency keys for repeated actions
- Retry handling with backoff
- External message verification for inbound channels
