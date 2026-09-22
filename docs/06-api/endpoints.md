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
| POST | `/api/orders/:id/payment-simulation` | order owner, or staff with `payments.verify` | `{ order, payment }` |

Body: `{ outcome: "success" | "failure" }`. Success -> payment APPROVED, order
CONFIRMED, stock consumed. Failure -> payment REJECTED, order CANCELLED, reserved
stock released.

A payment record is created as PENDING automatically when an order is created; there
is no separate "create payment" endpoint.

## GAP summary (documented previously, not implemented)
- `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`
- `GET/POST/PUT /api/users*` (employee data is read through the app routes, not a REST API)
- `GET /api/categories`
- `GET /api/inventory/balances`, `POST /api/inventory/reservations`, `POST /api/inventory/releases`
- `GET /api/payments`, `POST /api/payments/:id/verify`, `POST /api/payments/:id/reject`, `POST /api/payments/:id/proof`
- `GET /api/shipping`, `PUT /api/shipping/:id/status`
- `PUT /api/notifications/preferences` (the implemented path is `/api/notification-preferences`)
- `POST /api/orders/:id/cancel` (superseded by `PUT /api/orders/:id/status` with `CANCELLED`)
