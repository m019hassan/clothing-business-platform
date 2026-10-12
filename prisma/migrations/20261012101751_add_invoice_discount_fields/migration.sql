-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "originalUnitPrice" DECIMAL(12,2);
