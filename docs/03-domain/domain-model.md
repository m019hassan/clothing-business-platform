# Domain Model

## Core domain concepts
- User: authenticated person with roles and permissions
- Role: named collection of permissions
- Permission: atomic authorization capability
- Customer: external buyer or storefront contact
- Product: sellable item in the catalog
- ProductVariant: specific version of a product with attributes such as size or color
- Category: product grouping
- Warehouse: physical or logical location for stock
- InventoryBalance: current stock quantity at a location for a given SKU or product variant
- StockMovement: immutable record of inventory changes
- Reservation: temporary hold against stock for an order or cart
- Order: customer purchase request
- OrderItem: line item within an order
- Payment: financial transaction associated with an order
- Shipment: delivery fulfillment record
- Return: reverse fulfillment event
- Refund: financial reversal event
- ProductionOrder: planned manufacturing activity for a future phase

## Key relationships
- A user has one or more roles.
- A user may have direct permission overrides.
- A product belongs to one or more categories and may have many variants.
- A product variant has an inventory balance at each warehouse.
- An order contains many order items and one payment record in the MVP.
- A payment belongs to one order and may transition through multiple verification states.
- A shipment belongs to one order and may have status transitions.
- A return and refund relate to order items and payment state.

## Important business rules
- Inventory is never treated as a single product-level field.
- Stock movements are append-only and immutable once posted.
- Available stock is derived from on-hand stock minus reserved stock.
- Payment status and order status are separate concepts.
- Sensitive actions must be logged and require appropriate permission.
