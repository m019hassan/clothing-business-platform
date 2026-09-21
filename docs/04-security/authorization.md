# Authorization

## Authorization model
Implemented model (details in `docs/04-security/roles-and-permissions.md`):
- Employee accounts, with roles assigned through `EmployeeRole`
- Roles: reusable bundles of permission codes, stored as data
- Permissions: atomic codes, stored as data
- Direct overrides: **not implemented** (documented as a future option only)
- Customer accounts: no permissions; ownership rules apply instead

## Enforcement rules
- Every sensitive action checks permission at the service layer (`requirePermission`; `hasPermission` for read shaping).
- UI should reflect the same capability model, but service-level enforcement is the authoritative rule.
- The authorization layer must be reusable by the AI system.

## Authorization design
- Permissions are checked using a stable permission key format such as products.view or payments.verify.
- Access decisions should be evaluated from a central authorization service.
- The permission system should allow future expansion without changing the architecture.
