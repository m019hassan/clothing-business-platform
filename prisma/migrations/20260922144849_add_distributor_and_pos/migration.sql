-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'POS');

-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'DISTRIBUTOR';

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CASH';

-- AlterTable
ALTER TABLE "CustomerProfile" ADD COLUMN     "branchId" UUID,
ADD COLUMN     "isWalkIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "branchId" UUID,
ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "soldByAccountId" UUID;

-- CreateTable
CREATE TABLE "DistributorProfile" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "distributorCode" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistributorProfile_accountId_key" ON "DistributorProfile"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorProfile_distributorCode_key" ON "DistributorProfile"("distributorCode");

-- CreateIndex
CREATE INDEX "idx_distributor_branch" ON "DistributorProfile"("branchId");

-- CreateIndex
CREATE INDEX "idx_customer_profile_walkin" ON "CustomerProfile"("branchId", "isWalkIn");

-- CreateIndex
CREATE INDEX "idx_order_branch" ON "Order"("branchId");

-- CreateIndex
CREATE INDEX "idx_order_channel" ON "Order"("channel");

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorProfile" ADD CONSTRAINT "DistributorProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorProfile" ADD CONSTRAINT "DistributorProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_soldByAccountId_fkey" FOREIGN KEY ("soldByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

