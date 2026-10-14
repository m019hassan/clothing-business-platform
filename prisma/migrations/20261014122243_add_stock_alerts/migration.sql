-- CreateEnum
CREATE TYPE "StockAlertStatus" AS ENUM ('PENDING', 'NOTIFIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "contact" VARCHAR(120) NOT NULL,
    "status" "StockAlertStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAlert_variantId_status_idx" ON "StockAlert"("variantId", "status");

-- CreateIndex
CREATE INDEX "StockAlert_status_createdAt_idx" ON "StockAlert"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockAlert_variantId_contact_key" ON "StockAlert"("variantId", "contact");

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
