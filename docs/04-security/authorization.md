# Authorization

## Authorization model
The system must support a layered authorization model:
- Users
- Roles
- Permissions
- Direct overrides

## Enforcement rules
- Every sensitive action should check permission at the service layer.
- UI should reflect the same capability model, but service-level enforcement is the authoritative rule.
- The authorization layer must be reusable by the AI system.

## Authorization design
- Permissions are checked using a stable permission key format such as products.view or payments.verify.
- Access decisions should be evaluated from a central authorization service.
- The permission system should allow future expansion without changing the architecture.
