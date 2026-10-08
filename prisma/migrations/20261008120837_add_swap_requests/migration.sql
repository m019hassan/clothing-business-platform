-- CreateEnum
CREATE TYPE "SwapStage" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'SHIPPED', 'RECEIVED');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "currency" SET DEFAULT 'EGP';

-- CreateTable
CREATE TABLE "SwapRequest" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "branchId" UUID,
    "quantity" INTEGER NOT NULL,
    "reason" VARCHAR(300),
    "stage" "SwapStage" NOT NULL DEFAULT 'REQUESTED',
    "restockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_swap_request_order" ON "SwapRequest"("orderId");

-- CreateIndex
CREATE INDEX "idx_swap_request_stage" ON "SwapRequest"("stage");

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
