-- CreateEnum
CREATE TYPE "StockRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StockRequest" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "requestedByAccountId" UUID NOT NULL,
    "status" "StockRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" VARCHAR(300),
    "fulfilledByAccountId" UUID,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRequestItem" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "StockRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockRequest_branchId_status_idx" ON "StockRequest"("branchId", "status");

-- CreateIndex
CREATE INDEX "StockRequest_status_createdAt_idx" ON "StockRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockRequestItem_requestId_idx" ON "StockRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "StockRequestItem_variantId_idx" ON "StockRequestItem"("variantId");

-- AddForeignKey
ALTER TABLE "StockRequest" ADD CONSTRAINT "StockRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRequestItem" ADD CONSTRAINT "StockRequestItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
