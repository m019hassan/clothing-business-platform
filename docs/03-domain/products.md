# Products

## Product model
A product represents the catalog item concept. Product variants represent the sellable units that can differ by size, color, or other attributes.

## Product fields
- id
- name
- slug
- description
- status
- base price
- currency
- category ids
- created by
- updated by
- created at
- updated at
- deleted at (soft delete)

## Variant fields
- id
- product id
- sku
- size
- color
- price override
- barcode
- status
- created at
- updated at

## Constraints
- SKU should be unique per active variant.
- Product slug should be unique.
- A product without variants should be treated as invalid for sale in the MVP.

## Validation rules
- Price cannot be negative.
- Variant status must be consistent with product status.
- Images should be stored as references to object storage in later phases.

## Notes
The initial model should support simple catalog operations and later expansion to bundles, collections, and promotions. Size and color should be modeled as explicit variant attributes rather than as separate product records, because each combination can have its own SKU, pricing, and inventory behavior.

## Variant modeling recommendation
- A product is the parent catalog concept.
- A product variant is the sellable unit that carries SKU, price, size, color, and inventory identity.
- Size and color should be treated as variant attributes that are selected during variant creation rather than as free-form tags on the product.
- This approach keeps the data model consistent for catalog browsing, inventory, and order fulfillment.
