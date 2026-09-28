-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "paymentId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "reason" TEXT,
    "refundedByAccountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_refund_order" ON "Refund"("orderId");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_refundedByAccountId_fkey" FOREIGN KEY ("refundedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

