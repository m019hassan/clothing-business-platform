# Error Handling Strategy

## Error categories
- business errors: invalid workflow state, stock not available, payment verification pending, or rule violation
- validation errors: invalid input or missing required data
- authorization errors: insufficient permission for an action
- infrastructure errors: database, storage, provider, or connectivity issues
- unexpected errors: unhandled exceptions or unknown failures

## Principles
- Errors should be classified clearly so the system can respond appropriately.
- Business errors should be surfaced in a user-friendly way without exposing too much internals.
- Developers should receive enough diagnostic detail to fix issues quickly.
- Sensitive failures should be logged without leaking secrets.

## Propagation rules
The application layer should translate lower-level failures into meaningful results or domain errors. Presentation should not need to understand the internal cause of a failure beyond the outcome it should show to the user.
