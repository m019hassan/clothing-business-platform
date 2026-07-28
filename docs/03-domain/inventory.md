# Inventory

## Inventory design principles
Inventory must be modeled as a location-based ledger. A product is not simply assigned a stock count; stock is tracked at warehouses or logical locations, with all changes recorded as stock movements.

## Core entities
- Warehouse: location where inventory is stored
- InventoryBalance: quantity of a SKU or variant at a warehouse
- StockMovement: immutable movement entry for increases, decreases, adjustments, reservations, and releases
- Reservation: temporary hold against available inventory
- Adjustment: manual correction or damage event

## Stock concepts
- On-hand stock: current physical quantity at the location
- Reserved stock: quantity temporarily held for pending orders or carts
- Available stock: on-hand minus reserved

## Movement types
- Purchase receipt
- Production output
- Sale reduction
- Return to stock
- Damage or loss
- Manual adjustment
- Reservation release

## Rules
- Inventory updates must be transactional.
- An order can only be confirmed if available stock exists.
- Reservations should expire or be released if the order is abandoned.
- Inventory should be shared across ecommerce and store channels.
- Payment failure, cancellation, and returns must release or adjust reservations and stock accordingly.

## Inventory lifecycle
1. Stock is received into a warehouse as an inbound movement.
2. Inventory balances are updated and recorded in stock movements.
3. An order creates a reservation against available stock.
4. Payment confirmation or order confirmation converts the reservation into a committed sale.
5. Cancellation, payment failure, or return events release or reverse the movement as appropriate.
6. Manual adjustments, damages, and production output are recorded as separate movements.

## MVP scope
- Warehouses for store and online fulfillment
- Inventory balances and stock movement history
- Basic reservation support
- Low stock and out-of-stock alerts

## Future scope
- Multi-warehouse routing
- Batch tracking
- Serial tracking
- Production consumption
