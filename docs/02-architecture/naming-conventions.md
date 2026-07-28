# Naming Conventions

## Folders
- use lowercase, descriptive names
- use singular names for modules and concepts where possible
- group technical concerns into shared, infrastructure, config, and tests folders

## Files
- use descriptive names that match the contained concept
- prefer names that describe capability or responsibility rather than implementation details
- use consistent suffixes for interfaces, services, adapters, and tests where helpful

## Modules
- use business-oriented names such as orders, inventory, payments, shipping, and notifications
- avoid names that are purely technical or vague

## Services and use cases
- use action-oriented names such as PlaceOrder, VerifyPayment, ReserveInventory, or CreateShipment
- keep names consistent with the business workflow they support

## Events
- use past-tense or business-event names such as OrderCreated, PaymentVerified, InventoryReserved, and ShipmentDelivered

## Permissions
- use consistent verb-noun naming such as manageProducts, approvePayments, editInventory, or viewReports

## Environment variables and configuration keys
- use uppercase with underscores where appropriate
- keep names explicit and environment-agnostic where possible
