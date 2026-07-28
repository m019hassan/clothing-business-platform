# AI Permissions

## Permission model for AI
AI tools must be evaluated with the same authorization system as human users. The AI system should not have unrestricted access to business operations.

## Permission flow
1. The AI agent identifies the requested tool.
2. The gateway resolves the user or system context.
3. The permission layer checks whether the context may execute the tool.
4. If the tool is high-risk or sensitive, approval is required.

## Rules
- Read-only tools require read permissions.
- Low-risk tools require create or update permissions.
- High-risk tools require explicit approval and elevated permissions.
- Sensitive tools require human confirmation.

## Guardrails
- The AI should never receive direct database credentials.
- Tool execution should be limited to the approved registry.
- All tool responses should be logged for audit.
