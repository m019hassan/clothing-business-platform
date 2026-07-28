# Error Handling

## Error strategy
Errors should be typed and explicit. The API should return structured errors for validation, permission, conflict, and not-found cases.

## Error categories
- ValidationError
- AuthorizationError
- ConflictError
- NotFoundError
- ExternalDependencyError
- InternalError

## Response conventions
- Use stable error codes.
- Include human-readable messages.
- Avoid leaking sensitive internal details.
- Log unexpected failures with correlation ids.
