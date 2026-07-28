# AI Tools

## Tool categories
### Read-only tools
- listProducts
- getInventorySummary
- getOrdersToday
- getSalesReport

### Low-risk tools
- createProductDraft
- createDiscount
- updateProductPrice
- addCustomerNote

### High-risk tools
- changeOrderStatus
- cancelOrder
- approvePayment
- rejectPayment

### Sensitive tools
- deleteProduct
- changePaymentSettings
- issueRefund
- changeBankAccountDetails

## Tool registry requirements
- Each tool must declare its risk level.
- Each tool must declare required permissions.
- Each tool must validate its arguments before execution.
- Each tool must return structured results and emit audit logs.
