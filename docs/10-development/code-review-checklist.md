# Code Review Checklist

## Scope and intent
- Confirm the change matches the agreed task or issue.
- Ensure the implementation remains aligned with the product and architecture documents.
- Check that the work is narrow and avoids unrelated scope.

## Correctness
- Verify the change satisfies the stated requirement.
- Confirm business rules and invariants are preserved.
- Check for obvious edge cases or missing error handling.

## Structure and maintainability
- Ensure the change follows the documented module boundaries.
- Confirm naming and folder conventions are respected.
- Check that new code does not introduce unnecessary complexity.

## Quality and testing
- Review whether the change includes adequate validation or testing coverage.
- Confirm that critical flows such as inventory, payments, and order handling are considered.
- Check for regression risks in shared or cross-module code.

## Documentation and communication
- Ensure the change is explained clearly in the summary.
- Confirm that documentation is updated when the architecture or workflow changes.
- Flag any unresolved risks or follow-up work.
