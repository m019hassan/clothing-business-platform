# Shipping

## Shipping model
The platform should support delivery orders, shipping addresses, shipping fees, and shipping status.

## Core fields
- order id
- shipment number
- carrier or manual handler
- tracking number
- shipping address
- shipping fee
- status
- shipped at
- delivered at

## Shipping states
- pending
- packed
- shipped
- delivered
- failed
- cancelled

## Design note
The architecture should allow future integration with external shipping providers while keeping manual handling available in the MVP.
