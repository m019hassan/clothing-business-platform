-- CreateEnum
CREATE TYPE "InvoiceDiscountType" AS ENUM ('PERCENT', 'AMOUNT');

-- AlterTable
ALTER TABLE "DistributorProfile" ADD COLUMN "canDiscount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discountCode" VARCHAR(40),
ADD COLUMN "discountPercent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "invoiceDiscountType" "InvoiceDiscountType",
ADD COLUMN "invoiceDiscountValue" DECIMAL(12,2),
ADD COLUMN "invoiceDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "DistributorProfile_discountCode_key" ON "DistributorProfile"("discountCode");
