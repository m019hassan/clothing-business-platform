# Endpoints

## Identity
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password
- GET /api/users/me
- GET /api/users
- POST /api/users
- PUT /api/users/:id

## Catalog
- GET /api/products
- GET /api/products/:id
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id
- GET /api/categories

## Inventory
- GET /api/inventory/balances
- POST /api/inventory/adjustments
- POST /api/inventory/reservations
- POST /api/inventory/releases

## Orders
- GET /api/orders
- POST /api/orders
- GET /api/orders/:id
- PUT /api/orders/:id/status
- POST /api/orders/:id/cancel

## Payments
- GET /api/payments
- POST /api/payments/:id/verify
- POST /api/payments/:id/reject
- POST /api/payments/:id/proof

## Shipping
- GET /api/shipping
- PUT /api/shipping/:id/status

## Notifications
- GET /api/notifications
- PUT /api/notifications/preferences
