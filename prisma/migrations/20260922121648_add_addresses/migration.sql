-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "addressId" UUID,
ADD COLUMN     "deliveryAddress" JSONB;

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "customerProfileId" UUID NOT NULL,
    "label" VARCHAR(50),
    "recipientName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "line1" VARCHAR(200) NOT NULL,
    "line2" VARCHAR(200),
    "city" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100),
    "postalCode" VARCHAR(20),
    "country" VARCHAR(2) NOT NULL DEFAULT 'SA',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_address_customer" ON "Address"("customerProfileId");

-- CreateIndex
CREATE INDEX "idx_address_customer_default" ON "Address"("customerProfileId", "isDefault");

-- CreateIndex
CREATE INDEX "idx_order_address" ON "Order"("addressId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

