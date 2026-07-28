# Database Design

## Overview
The system uses a relational database centered on PostgreSQL. The data model is designed to support transactional integrity, auditability, and future extensibility.

## Core entities
- users
- roles
- permissions
- user_roles
- user_permission_overrides
- customers
- products
- product_categories
- product_variants
- warehouses
- inventory_balances
- stock_movements
- reservations
- orders
- order_items
- payments
- shipments
- returns
- refunds
- notifications
- audit_logs
- ai_actions
- ai_tool_invocations

## Important design notes
- Inventory balances should be derived and reconciled from stock movements rather than stored as a single mutable value without history.
- Payment status and order status are separate fields.
- Soft deletion should be used for core business records such as products, categories, and users where appropriate.
- Audit logs should be append-only.

## Required indexes
- product slug and SKU lookups
- order status and customer lookups
- payment status and order id lookups
- inventory balance lookups by warehouse and variant
- audit log queries by target and timestamp

## Unique constraints
- Unique user email
- Unique role name
- Unique permission key
- Unique SKU per active variant
- Unique slug per active product

## Status and state transitions
Relevant state machines are documented in the domain files and should be enforced in the application layer.
