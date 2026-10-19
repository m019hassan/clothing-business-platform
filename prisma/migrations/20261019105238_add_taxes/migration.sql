-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxPercent" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaxSetting" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "ratePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "inclusive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSetting_pkey" PRIMARY KEY ("id")
);
