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
- `GET /api/inventory/balances`, `POST /api/inventory/adjustments`, `POST /api/inventory/reservations`, `POST /api/inventory/releases`
- `GET /api/payments`, `POST /api/payments/:id/verify`, `POST /api/payments/:id/reject`, `POST /api/payments/:id/proof`
- `GET /api/shipping`, `PUT /api/shipping/:id/status`
- `PUT /api/notifications/preferences` (the implemented path is `/api/notification-preferences`)
- `POST /api/orders/:id/cancel` (superseded by `PUT /api/orders/:id/status` with `CANCELLED`)
