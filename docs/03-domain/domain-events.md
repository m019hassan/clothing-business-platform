# Domain Events

## Customer Registered
- Description: A new customer becomes known to the business.
- Trigger: A customer account or customer relationship is created.
- Business Meaning: The business can now engage with the customer in sales and service workflows.
- Possible Consumers: Order workflows, notification workflows, and customer support processes.

## Product Created
- Description: A new product is introduced to the catalog.
- Trigger: A new product offering is created by the business.
- Business Meaning: The product becomes available for selling, stock planning, and reporting.
- Possible Consumers: Inventory planning, ordering, pricing, and merchandising.

## Product Updated
- Description: A product’s business information changes.
- Trigger: Business changes such as pricing, status, or catalog information are applied.
- Business Meaning: The business must ensure downstream processes reflect the updated product state.
- Possible Consumers: Sales, inventory, order management, and reporting.

## Inventory Received
- Description: Stock enters the business from a replenishment or production source.
- Trigger: Goods are received into a warehouse or location.
- Business Meaning: Inventory availability increases and may support future sales or production.
- Possible Consumers: Inventory management, reporting, and factory planning.

## Inventory Adjusted
- Description: Stock quantity or condition changes for a business reason.
- Trigger: An adjustment such as return to stock, damage, or recount occurs.
- Business Meaning: The business must reflect the corrected quantity or condition in its stock view.
- Possible Consumers: Inventory management, approvals, and reporting.

## Inventory Reserved
- Description: Stock is set aside for a pending business commitment.
- Trigger: An order or other pending business need is created.
- Business Meaning: The business protects against overselling and keeps availability accurate.
- Possible Consumers: Order workflows, inventory visibility, and fulfillment planning.

## Inventory Released
- Description: Reserved stock is returned to available stock.
- Trigger: An order is cancelled, changed, or resolved in a way that no longer requires the reservation.
- Business Meaning: The business restores availability for future use.
- Possible Consumers: Inventory management and order resolution workflows.

## Order Created
- Description: A new order is accepted by the business.
- Trigger: A customer request is turned into an order.
- Business Meaning: The business begins the process of fulfillment, payment review, and customer communication.
- Possible Consumers: Inventory reservation, payment handling, notification, and fulfillment operations.

## Order Confirmed
- Description: An order reaches a confirmed business state.
- Trigger: The business accepts and commits to the order.
- Business Meaning: The order becomes actionable for fulfillment and financial tracking.
- Possible Consumers: Fulfillment, inventory, payments, and reporting.

## Order Cancelled
- Description: An order is cancelled under business rules.
- Trigger: The customer or business cancels the order within permitted conditions.
- Business Meaning: The order moves out of active fulfillment and stock commitments may need to be released.
- Possible Consumers: Inventory management, payment handling, and notifications.

## Order Paid
- Description: A payment is completed for an order.
- Trigger: A payment reaches a successful business state.
- Business Meaning: The business can proceed with order fulfillment or other post-payment actions.
- Possible Consumers: Fulfillment, shipment, and reporting.

## Payment Verified
- Description: A payment is confirmed through the approved verification process.
- Trigger: The business accepts proof or other required evidence for the payment.
- Business Meaning: The business can rely on the payment as a trusted financial commitment.
- Possible Consumers: Order fulfillment, dispute handling, and reporting.

## Shipment Created
- Description: A shipment is established for an order.
- Trigger: Goods are prepared for delivery or handoff.
- Business Meaning: The business marks the order as moving toward completion.
- Possible Consumers: Fulfillment, customer communication, and reporting.

## Shipment Delivered
- Description: A shipment reaches its destination.
- Trigger: Delivery or handoff is completed.
- Business Meaning: The order reaches its final delivery stage and the business can close the fulfillment process.
- Possible Consumers: Customer notifications, order history, and reporting.

## Discount Activated
- Description: A discount or promotion becomes active for business use.
- Trigger: A promotion is started or a coupon becomes eligible.
- Business Meaning: The business can apply the offer to eligible orders or products.
- Possible Consumers: Pricing, order workflows, and promotions management.

## Notification Sent
- Description: A notification is dispatched to a person or group.
- Trigger: A business event requires communication.
- Business Meaning: The relevant audience becomes informed about the event.
- Possible Consumers: Staff, customers, and operational workflows.

## AI Command Received
- Description: A request is made to the AI assistant for business support.
- Trigger: A user or workflow submits an AI request.
- Business Meaning: The business has an approved or pending assisted action to review.
- Possible Consumers: AI approval workflows, permissions review, and business operations.

## AI Action Executed
- Description: An approved AI action is completed.
- Trigger: The AI assistant performs an approved business action.
- Business Meaning: The business receives the result of the assisted work in a controlled and accountable way.
- Possible Consumers: Notifications, operational teams, and audit review.

## Factory Production Started
- Description: The business begins a production effort for goods.
- Trigger: Production planning is initiated.
- Business Meaning: The business commits materials and effort to create finished goods.
- Possible Consumers: Factory operations, inventory planning, and reporting.

## Factory Production Completed
- Description: A production effort reaches its finished state.
- Trigger: Production is completed and the output is ready for business use.
- Business Meaning: Finished goods become available to support inventory and sales.
- Possible Consumers: Inventory management, sales, and reporting.
