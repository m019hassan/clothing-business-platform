# Endpoints

Legend: **Implemented** = exists under `app/api/**` (or as a Server Action) and is
backed by the service layer. **GAP** = planned in earlier design notes but not
implemented; do not call it.

## Authentication
Implemented as **Server Actions** (`modules/auth/application/actions.ts`), not REST endpoints:
- `signInAction(identifier, password)` — verifies credentials and sets the `clothing-session` HTTP-only cookie.
- `signOutAction()` — clears the session.

GAP: there are no REST `/api/auth/*` endpoints (login, logout, forgot-password), and no password-reset flow.

## Account
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/account/preferences` | authenticated | `{ preferences }` |
| PUT | `/api/account/preferences` | authenticated | `{ preferences }` |
| GET | `/api/account/profile` | customer | `{ profile }` |
| PUT | `/api/account/profile` | customer | `{ profile }` |

The profile endpoints are self-service and ownership-based (customer accounts
only; employees receive 403 because their details are administrator-managed).
Editable fields: `firstName`, `lastName`, `gender` (`MALE`/`FEMALE`/`OTHER`),
`birthDate` (`YYYY-MM-DD`, not in the future, after 1899). Empty values clear the
optional fields; `customerCode` and the classification are read-only.

## Notifications
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/notifications?limit=&offset=` | authenticated, own rows only | `{ notifications, unreadCount, pagination: { limit, offset, total } }` |
| POST | `/api/notifications/:id/read` | owner (other accounts get 404) | `{ notification }` |
| POST | `/api/notifications/read-all` | own rows only | `{ updated }` |
| GET | `/api/notification-preferences` | authenticated | `{ preferences }` |
| PUT | `/api/notification-preferences` | authenticated | `{ preference }` |

Notification types are `ORDER`, `PAYMENT`, `DELIVERY` and `INVENTORY`. In-app notifications are
created by the order, payment and delivery flows, and **the stored per-type
preference is enforced centrally**: when `inApp` is false for a type, the
notification is not written at all (unset means on). The delivery flow notifies the
customer on every fulfilment status change (`Delivery for <order> is shipped`, with
the carrier and tracking number in the body); metadata-only edits stay silent.

Notifications are also addressed **to the staff who own the event**: a confirmed
order of a branch and every status change of its delivery notify the branch's
employees whose active roles grant `shipping.manage` (the actor is skipped), and a
counter sale that leaves stock low or out at the branch notifies the employees
holding `inventory.view` with the affected SKUs. Recipients are resolved from the
branch and the permission rows, so changing a role changes the audience without a
code change, and each recipient's own preference still applies.

## Catalog
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/products?limit=&offset=&q=&category=&sort=` | public | `{ products, total }` (public view) |
| GET | `/api/products/:id` | public | `{ product }` (public view) |
| POST | `/api/products` | `products.create` | `{ product }` (management view, 201) |
| PUT | `/api/products/:id` | `products.update` | `{ product }` (management view) |
| DELETE | `/api/products/:id` | `products.delete` | `{ product }` archived |
| POST | `/api/products/:id/variants` | `products.update` | `{ product }` (201) |
| PUT | `/api/products/:id/variants/:variantId` | `products.update` | `{ product }` |
| DELETE | `/api/products/:id/variants/:variantId` | `products.update` | `{ product }` (variant archived) |

Pagination: `limit` is 1-100 (default 50), `offset` is >= 0. Listing returns only
sellable products (`status = ACTIVE`, not soft-deleted, at least one ACTIVE
variant); `total` counts exactly the same filtered set, so `total` and paging stay
consistent.

Filters (all optional, additive): `q` searches name/slug (1-100 chars, case
insensitive), `category` filters by category slug, `sort` accepts `name`
(default), `name_desc`, `price`, `price_desc`, `newest`. Unknown values are
rejected with 400 instead of being ignored silently.

`status` (`DRAFT` / `ACTIVE` / `ARCHIVED`) switches the listing to the staff
management view of exactly that status, which is how draft and archived products
stay reachable. It requires `products.view`; without it the request is rejected
with 403, so drafts can never leak through the public route.

Write rules: only `SAR` is accepted as currency, `slug`/`sku` must be unique
(duplicates -> 409), a category id must exist and be active (-> 404), and unknown
payload fields are rejected (-> 400). `DELETE` archives (`status = ARCHIVED`),
which hides the row from the public catalog while keeping order history intact.

The public `GET` returns the catalog view (active variants, availability) while the
write routes return the management view for every variant, including counters — the
same shape the inventory screen reads.

## Categories
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/categories` | public | `{ categories }` (active only) |
| GET | `/api/categories?includeInactive=1` | `products.view` | `{ categories }` (includes inactive) |
| POST | `/api/categories` | `products.create` | `{ category }` (201) |
| PUT | `/api/categories/:id` | `products.update` | `{ category }` |

Category writes are gated by the catalog permissions (`products.*`) because the
permission set has no `categories.*` codes. Deactivating a category
(`isActive = false`) hides it from the public list and from catalog filters while
keeping its products intact.

## Inventory (staff)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| POST | `/api/inventory/adjustments` | `inventory.adjust` | `{ adjustment }` (201) |
| GET | `/api/inventory/movements?limit=&offset=&variantId=` | `inventory.view` | `{ movements, pagination }` |

`POST /api/inventory/adjustments` takes `{ variantId, quantityChange, reason?,
warehouseId? }` where `quantityChange` is a non-zero whole number (max 100000 in
absolute value, default warehouse = the first active one). The adjustment is
rejected with 409 when it would leave less on-hand stock than the quantity
currently reserved, and it creates the inventory row when the variant has none.

Every balance change is appended to the `StockMovement` ledger in the same
transaction: `RESERVATION` / `RELEASE` (cart add, update, remove), `CONSUMPTION`
when an approved payment consumes stock, `RELEASE` when a rejected payment hands
the reservation back, and `ADJUSTMENT` for manual corrections. `INTAKE` is
reserved for a future receiving flow. Each row stores the signed on-hand change,
the resulting on-hand and reserved quantities, the reason, the acting account and
the related order when there is one.

## Account addresses (customer)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/account/addresses` | customer | `{ addresses }` (default first) |
| POST | `/api/account/addresses` | customer | `{ address }` (201) |
| PUT | `/api/account/addresses/:id` | owner | `{ address }` |
| DELETE | `/api/account/addresses/:id` | owner | `{ deleted: true, wasDefault }` |

Fields: `recipientName`, `phone`, `line1`, `city` (required), `label`, `line2`,
`region`, `postalCode`, `country` (ISO-2, default `SA`) and `isDefault`. The first
address becomes the default automatically, and setting `isDefault: true` clears
the previous default. `DELETE` is a soft delete (the row is kept for auditing) and
ownership is enforced on every route (foreign ids -> 404).

Orders can carry a delivery address: `POST /api/orders` accepts an optional
`{ addressId }`, and the order stores **both** the id and an immutable snapshot
(`deliveryAddress`), so later edits or deletion of the address never rewrite where
an order was shipped. `GET /api/orders/:id` returns `addressId` and the snapshot.

## Accounts (admin)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/users?limit=&offset=&type=&status=&q=` | `users.view` | `{ users, pagination }` |
| GET | `/api/users/:id` | `users.view` | `{ user }` (detail incl. lockout state) |
| POST | `/api/users` | `users.manage` | `{ user }` (201) |
| PUT | `/api/users/:id` | `users.manage` | `{ user }` |
| POST | `/api/users/:id/password` | `users.manage` | `{ passwordReset: true, sessionsRevoked }` |

`POST` creates a `CUSTOMER` or `EMPLOYEE` account (the distributor type arrives
with phase I4) with a hashed password (8+ characters), a generated profile code,
an optional classification/department, an optional branch and optional roles.
`PUT` renames, changes email/phone, sets the status (`ACTIVE`/`SUSPENDED`/
`ARCHIVED` — reactivating also clears a login lockout), replaces employee roles and
assigns or detaches the branch; an admin cannot change the status of their own
account. The password route re-hashes and **revokes every session** of the target.
Duplicate email/phone -> 409, unknown roles or branches -> 404, unknown fields -> 400.

Bootstrap the first administrator with `npm run make-admin` (see
`docs/10-development/development-workflow.md`); it builds an `ADMIN` role from
every code in `modules/auth/application/permissions.ts`.

## Roles (staff)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/roles` | `roles.view` | `{ roles, catalog }` (codes per role + every active permission grouped by module) |
| POST | `/api/roles` | `roles.create` | `{ role }` (empty role; grant permissions from the matrix) |
| PUT | `/api/roles/:id` | `roles.update` | `{ role }` (`name`, `description`, `isActive`; system roles are refused) |
| DELETE | `/api/roles/:id` | `roles.delete` | `{ ok: true }` (only a role nobody holds; system roles are refused) |
| PUT | `/api/roles/:id/permissions` | `roles.update` | `{ role }` |

Replaces the permission set of a role (`{ permissionCodes: [...] }`, an empty array
clears it). Unknown codes -> 404 instead of being ignored, **system roles (the
ADMIN role built by `npm run make-admin`) -> 409** so an administrator cannot lock
everyone out, unknown role -> 404 and every change is written to the audit log
(`ROLE_PERMISSIONS_UPDATED`). Employees holding the role pick the change up on
their next request because permissions are resolved per request.

The `/roles` screen renders this as a checkbox matrix when the signed-in account
holds `roles.update`, and stays read-only otherwise.

## Branches (staff)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/branches?includeInactive=1` | `branches.view` | `{ branches }` (each with its warehouses) |
| GET | `/api/branches/:id` | `branches.view` | `{ branch }` |
| POST | `/api/branches` | `branches.manage` | `{ branch }` (201) |
| PUT | `/api/branches/:id` | `branches.manage` | `{ branch }` |

Fields: `code` (unique, uppercase letters/digits/dash/underscore), `name`,
`phone`, `address`, `city`, `isActive` and `warehouseIds` (the full assignment set
for the branch — the update replaces it, detaching the warehouses left out). A
branch owns one or more warehouses (`Branch 1-* Warehouse`); today the factory
warehouse serves the branches, and giving a branch its own warehouse is how stock
becomes branch-specific. Duplicate codes -> 409, unknown warehouses -> 404.

## Point of sale (distributor accounts)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/pos/catalog` | distributor account | `{ catalog }` (branch stock + prices) |
| POST | `/api/pos/sales` | distributor account | `{ receipt }` (201) |
| GET | `/api/pos/dashboard` | distributor account | `{ dashboard }` (own sales + branch picture) |

Access is by **account type**, not by permission: the distributor profile carries the
branch, and any other account type is rejected with 403. The catalog aggregates the
branch's warehouses (a branch without its own warehouse uses the active central one)
and only lists active products with active variants.

`POST /api/pos/sales` takes `{ items: [{ variantId, quantity }] }` (max 20 lines,
quantities 1-999, repeated variants merged) and completes the sale in one
transaction: the order is created `CONFIRMED` with `channel = POS`, the branch and
the selling account, the buyer is the branch's **walk-in customer** (created on
first use), a `CASH` payment is recorded as `APPROVED`, the branch stock is
decremented and a `CONSUMPTION` ledger row is written with the reason
"POS sale at <branch>". Insufficient stock -> 409, unknown or inactive products ->
404, malformed payloads -> 400, and an audit row (`POS_SALE`) is written.

`GET /api/pos/dashboard` returns the signed-in distributor's own counter sales for
**today** and the **current month** (orders, units and revenue; day/month
boundaries are computed in the account's timezone, never the server clock), the
branch stock picture (tracked items, units on hand, units available, low stock and
out of stock counts using the documented below-10 threshold), the five most urgent
shortages and the five best sellers of the branch over the last 30 days by units
sold.

## Deliveries (staff)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/deliveries?limit=&offset=&status=` | `shipping.manage` | `{ deliveries, pagination }` |
| GET | `/api/deliveries/:id` | `shipping.manage` | `{ delivery }` |
| PUT | `/api/deliveries/:id` | `shipping.manage` | `{ delivery }` |

A fulfilment record is created automatically (status `PENDING`) inside the
transaction that confirms an order, so a paid order always has a delivery row;
`PUT` accepts `{ status?, carrier?, trackingNumber?, notes? }`.

State machine: `PENDING -> PROCESSING -> READY -> SHIPPED -> DELIVERED`, and any
non-terminal state may move to `CANCELLED` (which also happens automatically when
the order itself is cancelled). Invalid jumps are rejected with 409, `SHIPPED`
requires a carrier and a tracking number (400 without them), `dispatchedAt` /
`deliveredAt` are stamped automatically, and every status change is written to the
audit log (`entity = "Delivery"`). `DELIVERED` is terminal and a `CANCELLED`
delivery can no longer be edited.

Customers see their delivery through the order view (`delivery` on
`GET /api/orders/:id` and on the order page); there is no customer-facing delivery
endpoint.

## Customers (staff)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/customers?limit=&offset=&q=` | `customers.view` | `{ customers, pagination: { limit, offset, total } }` |
| GET | `/api/customers/:id` | `customers.view` | `{ customer }` |

`q` searches first/last name, customer code, email and phone (1-100 chars, case
insensitive except the phone substring). The detail view includes the profile
fields and the ten most recent orders. Both routes are read-only (customer
administration is not implemented yet) and never expose `passwordHash`.

## Cart (customer accounts only)
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/cart` | customer | `{ cart }` |
| POST | `/api/cart/items` | customer | `{ cart }` (201) |
| PATCH | `/api/cart/items/:id` | owner of the item | `{ cart }` |
| DELETE | `/api/cart/items/:id` | owner of the item | `{ removed: true, cart }` |

`POST /api/cart/items` takes `{ variantId, quantity }`; `PATCH` takes `{ quantity }`.
Adding/updating reserves stock (409 when the request exceeds availability, 400 for
invalid quantities, 404 for unknown items).

## Orders
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/orders?limit=&offset=` | customer only (own orders; staff get 403) | `{ orders, pagination: { limit, offset, total } }` |
| POST | `/api/orders` | customer | `{ order }` (201) |

`POST /api/orders` takes an optional `{ addressId, paymentMethod }`. The payment
method is chosen by the customer and stored on the payment record created with the
order: `CASH_ON_DELIVERY` (default) or `BANK_TRANSFER`; anything else, including the
staff-side `MANUAL_TRANSFER_VERIFICATION` and the counter `CASH`, is rejected with
400. The order page explains the next step per method (pay the courier, or transfer
and wait for the store to confirm).
| GET | `/api/orders/:id` | owner customer or permitted staff | `{ order }` |
| PUT | `/api/orders/:id/status` | owner customer, or staff with the matching permission | `{ order }` |

`PUT /api/orders/:id/status` takes `{ status }` and is validated against the order
state machine. Customer actors may only move their own order DRAFT -> PENDING_PAYMENT
or DRAFT -> CANCELLED (cancellation is limited to 24 hours). Staff-side cancellation
requires `orders.cancel`; the other staff transitions are not implemented yet
(no documented permission), so they return 403.

## Payments
| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/payments` | `payments.view` | `{ rows, pagination }` |
| POST | `/api/payments/:id/verify` | `payments.verify` | payment view |
| POST | `/api/payments/:id/approve` | `payments.approve` | `{ order, payment }` |
| POST | `/api/payments/:id/reject` | `payments.reject` | `{ order, payment }` |
| POST | `/api/orders/:id/payment-simulation` | order owner, or staff with `payments.verify` | `{ order, payment }` |
| GET | `/api/orders/:id/refund` | any authenticated account | `{ refunds }` |
| POST | `/api/orders/:id/refund` | `payments.refund` | `{ order, refund }` |
| GET | `/api/payments/:id/proof` | the order's customer, or staff with `payments.view` | the stored file |
| POST | `/api/payments/:id/proof` | the order's customer, or staff with `payments.view` | `{ proof }` |

A payment record is created as PENDING automatically when an order is created; there
is no separate "create payment" endpoint.

**Staff decision flow.** `GET /api/payments` returns the queue of orders still
awaiting a payment decision (order status `PENDING_PAYMENT`) with the settlable
payment of each row, including its `paymentId`. Each decision endpoint takes no body
and acts on the payment itself:

| From | Decision | To | Order effect |
| --- | --- | --- | --- |
| PENDING | `verify` | PENDING_VERIFICATION | none (the transfer was received and checked) |
| PENDING, PENDING_VERIFICATION | `approve` | APPROVED | CONFIRMED, stock consumed, delivery created |
| PENDING, PENDING_VERIFICATION | `reject` | REJECTED | CANCELLED, reserved stock released |

A decision on a payment whose order is no longer `PENDING_PAYMENT`, or a second
`verify` after verification, is rejected with 409. Every decision writes an
`AuditLog` row (`PAYMENT_VERIFIED`, `PAYMENT_APPROVED`, `PAYMENT_REJECTED`) and the
customer is notified with the same titles the simulation uses.

**Receipts.** `POST /api/payments/:id/proof` accepts `multipart/form-data` with a
`file` field (PDF, JPEG, PNG or WebP, up to 5 MB) and stores it through
`src/lib/storage` (`UPLOAD_DIR`, default `.data/uploads`, git-ignored). A receipt is
accepted only for a bank transfer that still awaits a decision (PENDING or
PENDING_VERIFICATION on a PENDING_PAYMENT order); every upload writes a
`PAYMENT_PROOF_UPLOADED` audit row. `GET /api/payments/:id/proof` streams the newest
receipt back to the order's customer or to staff holding `payments.view`. The
customer's order page offers the upload control and the payments queue links to the
receipt when one exists.

**Refunds.** `POST /api/orders/:id/refund` records a refund as a separate
financial event for an order whose payment was collected (status CONFIRMED,
SHIPPED or DELIVERED and an APPROVED payment). Body: optional `{ reason }`
(500 characters). The refund row stores the collected amount and currency, the
payment and the order both move to `REFUNDED`, an `AuditLog` row
(`ORDER_REFUNDED`) is written and the customer is notified. **Stock is not
restocked**: a physical return is inspected and recorded separately, so this
action cannot invent inventory that was never received back. A second refund of
the same order is rejected with 409.

**Simulation.** `POST /api/orders/:id/payment-simulation` remains available for
local lifecycle testing: body `{ outcome: "success" | "failure" }`. Success ->
payment APPROVED, order CONFIRMED, stock consumed. Failure -> payment REJECTED,
order CANCELLED, reserved stock released. It shares one code path with the staff
endpoints, so a simulated outcome and a real decision can never diverge.

## Removing accounts

`DELETE /api/users/:id` never destroys history. An account that appears in orders,
audit rows, counter sales, refunds, notifications or addresses is **archived**
(`deletedAt` set, status ARCHIVED): every list filters it out and its records stay
intact. An account with no history at all - a typo, for example - is deleted
outright. Deleting your own account is refused, and so is removing the last active
administrator. Employee fields (`jobTitle`, `departmentId`, `roleIds`) are updated
through `PUT /api/users/:id`.

## Clothing products

A product carries the fabric in `material`, and creation accepts the size/colour rows
directly:

```json
{
  "name": "ترنج اولادي", "basePrice": "200.00", "material": "قطن", "categoryId": "…",
  "variants": [
    { "size": "10", "color": "أحمر", "quantity": 100, "priceOverride": "200.00" },
    { "size": "12", "color": "بامبي", "quantity": 60,  "priceOverride": "150.00" }
  ]
}
```

`quantity` is opening stock: it is written through the ledger as an ADJUSTMENT
("Opening stock") inside the same transaction, in the account's branch warehouse, so
stock never exists without a movement behind it. A row may omit the quantity and be
topped up later, and `quantity` is refused on updates - later stock goes through the
inventory screen. SKUs are generated per row when they are not typed.

## Catalog identifiers

Product and category **slugs are optional**. When one is omitted (or blank) the
service generates it: a Latin name becomes its slug (`Linen Shirt` -> `linen-shirt`)
and a name with nothing a slug can hold - Arabic names, for example - falls back to
`product-<6 hex>` / `category-<6 hex>`, retrying if the token is taken. A duplicate
that the user typed is answered with 409 and names the value. Variant **SKUs are
optional in the same way** (`VAR-<6 hex>`), while a typed SKU keeps its own clash
message.

## GAP summary (documented previously, not implemented)
- `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`
- `GET/POST/PUT /api/users*` (employee data is read through the app routes, not a REST API)
- `GET /api/categories`
- `GET /api/inventory/balances`, `POST /api/inventory/reservations`, `POST /api/inventory/releases`
- `POST /api/payments/:id/proof` (receipt upload: pending a file storage decision)
- `GET /api/shipping`, `PUT /api/shipping/:id/status`
- `PUT /api/notifications/preferences` (the implemented path is `/api/notification-preferences`)
- `POST /api/orders/:id/cancel` (superseded by `PUT /api/orders/:id/status` with `CANCELLED`)
