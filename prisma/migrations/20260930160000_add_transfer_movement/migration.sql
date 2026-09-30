-- Moving stock between warehouses writes a pair of TRANSFER movements.
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER';
