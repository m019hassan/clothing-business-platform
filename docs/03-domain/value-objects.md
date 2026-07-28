# Value Objects

## Money
- Purpose: Represents a monetary amount used in pricing, payments, discounts, and financial decisions.
- Validation Rules: Must be expressed in a consistent currency context and should be interpreted according to business rules for pricing and settlement.
- Why it is a Value Object instead of an Entity: Its meaning comes from the value itself rather than from identity or lifecycle.

## Address
- Purpose: Represents the location associated with a shipment, warehouse, or business contact.
- Validation Rules: Must be meaningful for the business context, including the relevant address components needed for delivery or operations.
- Why it is a Value Object instead of an Entity: An address is descriptive and does not require its own separate identity or lifecycle.

## Phone Number
- Purpose: Represents a contact number for customers, employees, or business partners.
- Validation Rules: Must be a valid business contact number format and be appropriate for the intended use.
- Why it is a Value Object instead of an Entity: It is a simple attribute of a person or organization rather than a thing with its own business identity.

## Email
- Purpose: Represents an electronic address used for communication and account-related business activity.
- Validation Rules: Must be in a recognizable and usable form for business communication.
- Why it is a Value Object instead of an Entity: It is a descriptive contact detail rather than a stand-alone business entity.

## SKU
- Purpose: Represents the business identifier for a product variant in catalog, stock, and order contexts.
- Validation Rules: Must be unique within the business’s product vocabulary and clearly identify the intended variant.
- Why it is a Value Object instead of an Entity: It is a label that identifies a business concept rather than a thing that evolves independently.

## Barcode
- Purpose: Represents a scannable identifier associated with a product or item.
- Validation Rules: Must be readable and consistent with the product’s business identification rules.
- Why it is a Value Object instead of an Entity: It functions as a reference form rather than a business actor with its own lifecycle.

## Quantity
- Purpose: Represents a measured amount of stock, material, or other countable business substance.
- Validation Rules: Must be meaningful for the business context and should not be negative in normal business use.
- Why it is a Value Object instead of an Entity: It expresses a measurable amount rather than a business object with separate behavior.

## Measurement
- Purpose: Represents a size or extent used for business understanding, such as product dimensions or production scale.
- Validation Rules: Must be expressed consistently and be appropriate to the relevant business context.
- Why it is a Value Object instead of an Entity: It is descriptive data rather than a distinct entity.

## Dimensions
- Purpose: Represents product size information used for catalog or fulfillment decisions.
- Validation Rules: Must be consistent, understandable, and fit the intended business use.
- Why it is a Value Object instead of an Entity: It is a structured measurement rather than a separate business actor.

## Weight
- Purpose: Represents the weight associated with a product, shipment, or material.
- Validation Rules: Must be stated in a consistent unit and remain meaningful for the relevant business decision.
- Why it is a Value Object instead of an Entity: It is a measurable property rather than an independent entity.

## Color
- Purpose: Represents a visual characteristic of a product or variant.
- Validation Rules: Must be expressed in a business-recognized form so the catalog remains understandable.
- Why it is a Value Object instead of an Entity: It is a descriptive characteristic rather than a stand-alone domain object.

## Size
- Purpose: Represents a size classification for a product or variant.
- Validation Rules: Must be consistent with the business’s product vocabulary and catalog standards.
- Why it is a Value Object instead of an Entity: It is a classification value rather than an entity with its own lifecycle.

## Bank Transfer Reference
- Purpose: Represents the reference information associated with a bank transfer payment.
- Validation Rules: Must be clear and sufficiently specific for payment verification and reconciliation.
- Why it is a Value Object instead of an Entity: It is a payment-related attribute rather than a full business object.

## Payment Status
- Purpose: Represents the current business state of a payment.
- Validation Rules: Must be drawn from the business-approved payment lifecycle and used consistently across the domain.
- Why it is a Value Object instead of an Entity: It is a state description rather than a thing with its own identity.

## Order Status
- Purpose: Represents the current business state of an order.
- Validation Rules: Must reflect the order lifecycle and support business communication and reporting.
- Why it is a Value Object instead of an Entity: It describes the condition of an order rather than representing a separate entity.

## Shipment Status
- Purpose: Represents the current business state of a shipment.
- Validation Rules: Must reflect the delivery lifecycle and remain understandable for staff and customers.
- Why it is a Value Object instead of an Entity: It is a state value attached to a shipment rather than a domain entity.

## Notification Channel
- Purpose: Represents the way a notification is delivered, such as email or in-app communication.
- Validation Rules: Must be a supported and approved business channel.
- Why it is a Value Object instead of an Entity: It is a delivery characteristic rather than a business object with its own lifecycle.

## Discount Percentage
- Purpose: Represents the percentage value of a discount or promotional offer.
- Validation Rules: Must be expressed consistently and within the business rules for discounts.
- Why it is a Value Object instead of an Entity: It is a measurable pricing concept rather than a standalone entity.
