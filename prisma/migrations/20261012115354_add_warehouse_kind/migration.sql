-- CreateEnum
CREATE TYPE "WarehouseKind" AS ENUM ('STORE', 'STORAGE');

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "kind" "WarehouseKind" NOT NULL DEFAULT 'STORAGE';
