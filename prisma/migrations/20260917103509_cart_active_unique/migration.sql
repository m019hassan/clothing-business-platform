-- Enforce at most one ACTIVE cart per customer while allowing unlimited CONVERTED/ABANDONED carts.
-- A partial unique index is required because the previous UNIQUE (customerProfileId, status)
-- allowed only one cart per status per customer, which blocked a customer's second order.
-- Created before dropping the previous constraint so no window exists without protection.
CREATE UNIQUE INDEX "uq_cart_customer_active" ON "Cart"("customerProfileId") WHERE "status" = 'ACTIVE';

-- DropIndex
DROP INDEX "uq_cart_customer_status";

-- CreateIndex
CREATE INDEX "idx_cart_customer" ON "Cart"("customerProfileId");
