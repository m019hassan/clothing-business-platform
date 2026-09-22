# Roles and Permissions

## Permission model
Permissions are atomic capability codes stored in the database (`permission.code`).
They are never hard-coded as role names.

Assignment chain:
`EmployeeProfile` -> `EmployeeRole` -> `Role` -> `RolePermission` -> `Permission`

Only ACTIVE roles and ACTIVE permissions count when a session's permissions are
resolved (`modules/auth/application/authorization.ts`).

Customer accounts have **no permissions at all**: customer access is ownership-based
(a customer may only read/modify their own cart, orders and notifications).

Distributor accounts (point of sale) hold no permissions either: their access is
decided by the account type plus the branch on their profile, so a new permission is
not needed to open or close that surface.

## Canonical permission codes
The naming authority is `modules/auth/application/permissions.ts` (`PERMISSIONS`).

| Area | Codes |
| --- | --- |
| products | `products.view`, `products.create`, `products.update`, `products.delete` |
| inventory | `inventory.view`, `inventory.adjust` |
| orders | `orders.view`, `orders.create`, `orders.cancel`, `orders.manage` |
| customers | `customers.view`, `customers.create`, `customers.update` |
| employees | `employees.view`, `employees.create`, `employees.update` |
| roles | `roles.view`, `roles.create`, `roles.update`, `roles.delete` |
| shipping | `shipping.manage` |
| branches | `branches.view`, `branches.manage` |
| users | `users.view`, `users.manage` |
| payments | `payments.view`, `payments.verify`, `payments.approve`, `payments.reject` |

New codes must be added to that constant first. A code that exists only in the
database but not in the constant is a documentation bug.

## Order permission scope
- `orders.cancel` covers staff-side order cancellation. A customer cancelling their
  own order is authorized by ownership, not by this permission, and is limited to
  24 hours after order creation.
- `orders.manage` is reserved for staff operational order state transitions once
  they are approved in the order state machine; it does not bypass the state
  machine and does not replace `orders.cancel`.

## Enforcement
- Service layer: `simulatePaymentOutcome` requires `payments.verify` for employee
  actors (customers act on their own orders), and `updateOrderStatus` requires
  `orders.cancel` for staff-side cancellation. These are the service-level checks
  today.
- Staff screens without an API surface (inventory, payments, employees, roles,
  reports) gate access inside the server component with `getCurrentPermissions()`
  before any data is read, and render an "access denied" panel instead.
- `hasPermission(code)` shapes server-side reads; `modules/auth/components/can.tsx`
  (`<Can permission="...">`) shapes component-level UI.

## Roles
Roles are data, not code. Development seeds such as "Finance Officer",
"Inventory Officer" or "Order Manager" are examples. No role name is referenced in
application code, so renaming or adding roles requires no code change.

Role permissions are editable from `/roles` by accounts holding `roles.update`
(`PUT /api/roles/:id/permissions`); the page falls back to a read-only matrix
without that permission. **System roles are locked**: the `ADMIN` role is
maintained by `npm run make-admin`, so the API refuses to edit it (409) and an
administrator cannot strip their own access by accident.

## Not implemented (do not rely on)
- **Direct permission overrides**: earlier revisions of this document mention them;
  no code path or model exists.
- **`shipping.view`, `notifications.manage`, `roles.manage`**: these codes do not
  exist in code or in the database. Role management uses
  `roles.view/create/update/delete`. (`shipping.manage` was added with the delivery
  phase F2, and `branches.*` / `users.*` with the branches phase I1 — all three are
  implemented now.)
- **`audit.*` permissions**: audit logging is not implemented yet
  (see `docs/04-security/audit-logging.md`).
