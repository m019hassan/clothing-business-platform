# Roles and Permissions

## Permission model
Permissions are atomic capabilities grouped into domain areas.

## Naming convention
- products.view
- products.create
- products.update
- products.delete
- inventory.view
- inventory.adjust
- orders.view
- orders.create
- orders.cancel
- payments.view
- payments.approve
- payments.reject
- payments.verify
- shipping.view
- shipping.manage
- users.view
- users.manage
- roles.manage
- notifications.manage

## Role model
Roles are reusable bundles of permissions. Examples:
- admin
- manager
- staff
- cashier
- customer

## Override model
Users may receive direct permission overrides in addition to role-based permissions.

## Governance
- New permissions should be added in a documented way.
- High-risk permissions should require explicit review and logging.
- Sensitive actions should not be approved by role alone; they should be checked against the service authorization layer.
