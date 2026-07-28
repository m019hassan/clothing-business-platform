# Relationships

## Core relationships
- User many-to-many Role
- User one-to-many PermissionOverride
- Product one-to-many ProductVariant
- Product many-to-many Category
- ProductVariant one-to-many InventoryBalance
- InventoryBalance one-to-many StockMovement
- Order one-to-many OrderItem
- Order one-to-one Payment
- Order one-to-one Shipment
- Order one-to-many Return
- Refund belongs to Payment and Order
- AuditLog targets many entity types
- AIAction references User or external channel context

## Cardinality notes
- A product can have zero or many variants.
- A variant can be part of many orders, but each order item references one variant.
- Inventory balance is stored per warehouse and variant combination.
- A payment belongs to one order in the MVP.
