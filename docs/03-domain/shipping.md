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
- out_for_delivery
- delivered
- failed
- cancelled
- returned

## Lifecycle notes
- A shipment begins as pending once an order is ready for fulfillment.
- Staff can mark it packed and then shipped.
- Out-for-delivery is a useful intermediate state for local delivery and carrier handoff.
- Delivery, failure, cancellation, and return events should all be logged and reflected in the order and notification history.

## Design note
The architecture should allow future integration with external shipping providers while keeping manual handling available in the MVP.
