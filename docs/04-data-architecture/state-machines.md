# State Machines

## Order
- Initial State: Draft
- Valid States: Draft, Pending Payment, Payment Verification, Confirmed, Preparing, Ready to Ship, Shipped, Delivered, Completed, Cancelled
- Allowed Transitions:
  - Draft → Pending Payment
  - Draft → Cancelled
  - Pending Payment → Payment Verification
  - Pending Payment → Cancelled
  - Payment Verification → Confirmed
  - Payment Verification → Cancelled
  - Confirmed → Preparing
  - Confirmed → Cancelled
  - Preparing → Ready to Ship
  - Preparing → Cancelled
  - Ready to Ship → Shipped
  - Shipped → Delivered
  - Delivered → Completed
- Invalid Transitions:
  - Draft → Shipped
  - Confirmed → Payment Verification
  - Cancelled → Confirmed
  - Completed → Cancelled
- Terminal States: Cancelled, Completed
- Exceptional States: Payment Verification may be required for non-cash payment methods; manager approval may be required for cancellation during preparation.

## Payment
- Initial State: Pending
- Valid States: Pending, Verified, Approved, Rejected, Disputed, Refunded, Completed, Failed
- Allowed Transitions:
  - Pending → Verified
  - Pending → Rejected
  - Pending → Failed
  - Verified → Approved
  - Verified → Disputed
  - Approved → Completed
  - Approved → Refunded
  - Disputed → Approved
  - Disputed → Refunded
- Invalid Transitions:
  - Approved → Pending
  - Completed → Pending
  - Rejected → Approved
- Terminal States: Completed, Rejected, Failed, Refunded
- Exceptional States: Cash on Delivery may skip verification and move directly to Approved or Pending Fulfillment depending on business policy.

## Shipment
- Initial State: Not Created
- Valid States: Not Created, Prepared, In Transit, Delivered, Failed, Cancelled
- Allowed Transitions:
  - Not Created → Prepared
  - Prepared → In Transit
  - In Transit → Delivered
  - Prepared → Cancelled
  - In Transit → Failed
- Invalid Transitions:
  - Not Created → Delivered
  - Delivered → In Transit
  - Cancelled → Prepared
- Terminal States: Delivered, Failed, Cancelled
- Exceptional States: A shipment may be delayed or held pending business approval.

## Inventory Reservation
- Initial State: None
- Valid States: None, Reserved, Released, Consumed, Expired
- Allowed Transitions:
  - None → Reserved
  - Reserved → Released
  - Reserved → Consumed
  - Reserved → Expired
- Invalid Transitions:
  - Released → Reserved
  - Consumed → Reserved
  - None → Consumed
- Terminal States: Released, Consumed, Expired
- Exceptional States: A reservation may remain pending until the underlying order is resolved.

## Product
- Initial State: Draft
- Valid States: Draft, Active, Archived, Discontinued
- Allowed Transitions:
  - Draft → Active
  - Draft → Archived
  - Active → Archived
  - Active → Discontinued
  - Archived → Discontinued
- Invalid Transitions:
  - Archived → Active
  - Discontinued → Active
  - Draft → Discontinued
- Terminal States: Archived, Discontinued
- Exceptional States: A product may remain in draft while pricing or catalog details are being finalized.

## Discount
- Initial State: Draft
- Valid States: Draft, Scheduled, Active, Expired, Cancelled
- Allowed Transitions:
  - Draft → Scheduled
  - Scheduled → Active
  - Active → Expired
  - Active → Cancelled
  - Scheduled → Cancelled
- Invalid Transitions:
  - Expired → Active
  - Cancelled → Active
  - Active → Scheduled
- Terminal States: Expired, Cancelled
- Exceptional States: A future discount may become active automatically on its start date.

## AI Command
- Initial State: Submitted
- Valid States: Submitted, Approved, Executing, Executed, Failed, Rejected
- Allowed Transitions:
  - Submitted → Approved
  - Submitted → Rejected
  - Approved → Executing
  - Executing → Executed
  - Executing → Failed
- Invalid Transitions:
  - Rejected → Approved
  - Executed → Executing
  - Failed → Executed
- Terminal States: Executed, Rejected, Failed
- Exceptional States: Restricted commands may require elevated approval before execution.

## Notification
- Initial State: Pending
- Valid States: Pending, Sent, Delivered, Failed, Dismissed
- Allowed Transitions:
  - Pending → Sent
  - Pending → Failed
  - Sent → Delivered
  - Sent → Failed
  - Delivered → Dismissed
- Invalid Transitions:
  - Delivered → Pending
  - Failed → Sent
  - Dismissed → Sent
- Terminal States: Delivered, Failed, Dismissed
- Exceptional States: Critical notifications may require re-sending if the first attempt fails.

## Factory Production Order
- Initial State: Planned
- Valid States: Planned, Ready, In Progress, Completed, Cancelled, Blocked
- Allowed Transitions:
  - Planned → Ready
  - Planned → Cancelled
  - Ready → In Progress
  - In Progress → Completed
  - In Progress → Blocked
  - Blocked → Ready
- Invalid Transitions:
  - Completed → In Progress
  - Cancelled → Ready
  - Ready → Planned
- Terminal States: Completed, Cancelled
- Exceptional States: Production may be blocked when required raw materials are not available.
