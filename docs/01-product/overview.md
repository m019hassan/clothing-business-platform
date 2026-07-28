# Product Overview

## Business context
The platform supports a small clothing manufacturing business that combines production, inventory, wholesale or retail sales, and ecommerce. The product must start as a practical tool for daily operations and grow without forcing a rewrite.

## Business goals
- Centralize product, inventory, order, payment, and customer information.
- Support both physical-store and online sales through the same core inventory and product model.
- Provide role-based administration with approval workflows for sensitive operations.
- Keep the initial implementation simple enough for a small team to operate.

## Constraints
- The business is currently small, so the MVP should remain lean.
- The architecture must support future scaling and potential service extraction.
- The home server is for backup and recovery, not primary production hosting.

## Assumptions
- The business will maintain a single primary transactional database in production.
- The initial system will be a web-based application with admin and storefront experiences.
- The first integration priorities are payment verification and inventory consistency rather than advanced analytics.

## Success criteria
- Staff can manage products, stock, orders, payments, and customers from one system.
- Inventory is protected from overselling.
- Sensitive actions are auditable and permission-controlled.
- Future AI automation can reuse the same business logic safely.
