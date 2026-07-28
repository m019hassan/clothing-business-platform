# Business Requirements

## Functional requirements
### Identity and access
- Users must authenticate securely.
- Roles and permissions must support business operations and approvals.
- Administrators must be able to assign roles and override permissions when needed.

### Catalog and products
- The system must support products, categories, variants, sizes, colors, and images.
- Product pricing and status must be managed centrally.

### Inventory
- Inventory must be location-based and support stock movements.
- Store sales and ecommerce sales must share the same inventory ledger.
- The system must support reservation, adjustment, and return flows.

### Orders and sales
- Customers must be able to place orders from the storefront.
- Orders must track status and history.
- Orders must support cancellations, returns, and refunds.

### Payments
- The platform must support cash on delivery and bank transfer payment verification.
- Bank transfer payments must move through a pending verification state.
- Payment status must remain independent from order status.

### Shipping
- Orders must support shipping addresses, delivery fees, and shipment states.
- The system must allow manual delivery handling or future shipping-provider integration.

### Notifications
- The system must notify staff and customers about key events.
- Notification preferences must be configurable.

## Non-functional requirements
- The system must be auditable.
- The system must preserve transactional consistency for inventory and payments.
- The system must be secure by default.
- The MVP must stay practical and avoid overengineering.
