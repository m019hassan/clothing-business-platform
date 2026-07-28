# Business Rules

This document outlines the core business rules governing operations for the clothing retail platform. These rules define acceptable behaviors, constraints, and decision criteria for key business processes, ensuring consistency and alignment with business goals.

## Core Business Rules

### 1. Inventory Management Rules
- **Stock Reservation**: Items in pending orders or carts are not available for new sales until order resolution.
- **Adjustment Approval**: Inventory adjustments (damage, returns, recounts) require manager approval if exceeding 5 pieces or $50 value.
- **Location Tracking**: All inventory movements must be recorded with source/destination warehouse identifiers.

### 2. Order & Payment Rules
- **Order Cancellation**: Orders can only be canceled within 24 hours of placement. Post-payment cancellations require refund processing.
- **Payment Verification**: Bank transfers require documented proof (bank slip, screenshot) before order fulfillment.
- **Dispute Resolution**: Payment disputes must be escalated to owner/admin within 3 business days.

### 3. Discount & Promotion Rules
- **Coupon Validity**: Coupons expire 30 days from issuance or when claimed 100 times (whichever comes first).
- **Promotion Expiry**: Seasonal promotions must end 7 days after last purchase using the offer.
- **Stacking Restrictions**: Discounts cannot be combined unless explicitly stated (e.g., "20% off + 10% loyalty discount").

### 4. Role & Permission Rules
- **Least Privilege**: Staff access is limited to role-defined actions (e.g., cashiers cannot modify inventory).
- **Admin Authority**: Only owners/managers can approve payment disputes, inventory adjustments, or role changes.
- **Audit Trail**: All permission changes and role assignments must be documented with timestamps.

### 5. Notification Rules
- **Mandatory Alerts**: System must trigger alerts for: low stock (<10 units), payment failures, and order status changes.
- **Customer Communication**: Return status updates must be sent within 24 hours of receipt confirmation.

### 6. Sales Channel Rules
- **Channel Consistency**: Product pricing must match across online store and physical store displays.
- **In-Store Sales**: Cash on delivery requires signed receipts and manual inventory deduction at register.

## Rule Exceptions

Exceptions to standard rules must be explicitly documented with reason and approval:
- Emergency inventory transfers (e.g., between warehouses).
- Payment acceptance of alternative methods (e.g., Venmo) during exceptional circumstances.