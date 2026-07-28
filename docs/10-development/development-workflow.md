# Development Workflow

## Working approach
The project should start with a lean implementation plan that follows the architecture and product docs.

## Workflow
1. Review the architecture and domain documents.
2. Implement the smallest change that satisfies the requirement.
3. Add or update tests for business behavior.
4. Validate permissions, audit logging, and data integrity.
5. Update documentation if the design changes.

## Delivery discipline
- Do not bypass the service layer.
- Do not implement a feature outside the documented MVP scope without a documented decision.
- Keep module boundaries intact.
