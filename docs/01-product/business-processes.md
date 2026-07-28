# Business Processes

This document describes the main business workflows that the platform must support. The focus is on the business steps, outcomes, and controls rather than the implementation details.

## Product creation
A new product or product variant is introduced when the business decides to offer a new item. The business must confirm the product description, pricing, category, and stock approach before the item becomes available for sale.

## Inventory receiving
When stock arrives from a supplier or production output is completed, the business needs to record what has been received, where it is stored, and whether it is ready for sale or use.

## Inventory adjustment
Inventory may need to be adjusted for damage, loss, recounting, or correction. These changes must be visible to the business and should not be treated as ordinary sales activity.

## Manufacturing
When production is planned, the business needs a clear view of what should be produced, what is currently in progress, and what has been completed. Manufacturing is connected to inventory and order fulfillment.

## Store sale
A sale made in the physical store should create an order, deduct stock, record payment, and support any needed return or refund handling.

## Online sale
An online order follows the same business logic as a store sale, but with a stronger focus on customer communication, payment verification, and shipment coordination.

## Order fulfillment
Once an order is confirmed, the business must prepare the items for delivery or pickup. This includes verifying the stock, packing or preparing the item, and updating the order status.

## Payment verification
Cash on delivery and bank transfer payments require a clear business process for confirmation. The business needs to know whether payment is pending, verified, rejected, or not applicable.

## Shipping
The business must be able to manage shipping details, delivery status, and any issues that arise during delivery.

## Returns and refunds
When a customer returns an item, the business must update inventory, record the return reason, and decide whether the refund should be processed or the item resold.

## Notifications
Important events such as order confirmation, payment verification, low stock, or approval requests should be communicated to the right people at the right time.

## Discount management
Promotions and discounts may be used to support sales, clear inventory, or reward customers. These must be managed in a controlled way and should not create confusion around pricing.

## Inventory counting
The business may need periodic counts to verify that physical stock matches system records. These counts should support correction and reconciliation.

## Employee management
The business must be able to assign employees to roles and control which activities they can perform.

## Role and permission management
The platform should support the business in defining who can approve payments, manage inventory, create products, or access financial information.
