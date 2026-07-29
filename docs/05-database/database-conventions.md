# Database Conventions

Version: 1.0
Status: Approved
Owner: Architecture Team

---

# Purpose

This document defines the global database conventions that every table, relationship, migration, and future module must follow.

These conventions are mandatory across the entire project.

---

# Primary Keys

- Every table uses UUID as the primary key.
- Primary key column name is always `id`.
- IDs are technical identifiers only.
- Business identifiers (Order Number, SKU, Invoice Number) are stored separately.

Example:

id

---

# Naming Convention

Tables

- Singular
- PascalCase

Examples

User

Role

Permission

Product

Order

InventoryMovement

Columns

- camelCase

Examples

createdAt

updatedAt

deletedAt

displayName

isActive

Foreign Keys

Use the referenced entity name followed by Id.

Examples

userId

roleId

productId

orderId

Indexes

idx_<table>_<column>

Examples

idx_user_email

idx_order_status

Unique Constraints

uq_<table>_<column>

Examples

uq_user_email

uq_permission_name

Foreign Keys

fk_<table>_<reference>

Examples

fk_order_customer

fk_inventory_product

---

# Timestamp Convention

Every business table should include:

createdAt

updatedAt

Optional:

deletedAt

archivedAt

All timestamps are stored in UTC.

---

# Soft Delete

Never permanently delete business data unless legally required.

Preferred strategy:

deletedAt

Avoid:

isDeleted

---

# Active Status

Use:

isActive

Avoid:

status = Active/Inactive

unless multiple business states are required.

---

# Business Identifiers

Technical IDs and business identifiers are separate.

Examples

id (UUID)

orderNumber

invoiceNumber

sku

barcode

---

# Relationships

Always use explicit foreign keys.

Never store duplicated business information.

Prefer normalized relationships.

---

# Audit Fields

Future support:

createdBy

updatedBy

deletedBy

These fields reference User.

---

# Enums

Use enums only when values are stable.

Examples

OrderStatus

PaymentStatus

NotificationType

Avoid enums for frequently changing business data.

---

# Money

Never use floating-point types.

Money must always use Decimal.

---

# Text

Short values

String

Long descriptions

Text

---

# Migration Strategy

Never edit an executed migration.

Create a new migration for every schema change.

---

# Performance

Create indexes only when justified.

Avoid premature optimization.

---

# Future Scalability

The database should support:

- Multiple warehouses
- Multiple stores
- Multiple factories
- Mobile applications
- AI services
- Reporting
- Public API

without redesigning the schema.

---

# Rule

Every new database table must comply with this document.