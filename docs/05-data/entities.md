# Entities

## User
- id
- email
- password hash
- name
- status
- role ids
- direct permission overrides
- created at
- updated at
- deleted at

## Role
- id
- name
- description
- permission ids

## Permission
- id
- key
- description
- category

## Customer
- id
- name
- email
- phone
- address
- status
- created at

## Product
- id
- name
- slug
- description
- status
- base price
- currency
- category ids

## ProductVariant
- id
- product id
- sku
- size
- color
- price override
- barcode
- status

## Warehouse
- id
- name
- type
- location
- active

## InventoryBalance
- id
- warehouse id
- variant id
- on hand quantity
- reserved quantity
- available quantity

## StockMovement
- id
- warehouse id
- variant id
- movement type
- quantity
- reference type
- reference id
- reason
- created by
- created at

## Order
- id
- customer id
- status
- payment status
- shipping address
- total amount
- currency
- created at

## OrderItem
- id
- order id
- variant id
- quantity
- unit price
- discount amount

## Payment
- id
- order id
- method
- status
- amount
- proof file reference
- approved by
- approved at

## Shipment
- id
- order id
- carrier
- tracking number
- status
- shipping address
- fee

## Return
- id
- order id
- reason
- status

## Refund
- id
- order id
- payment id
- amount
- status

## AIAction
- id
- actor type
- actor id
- action type
- tool name
- status
- request id
- created at
