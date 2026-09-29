-- Counter-sale returns: how many units of each sold line have come back.
ALTER TABLE "OrderItem" ADD COLUMN "returnedQuantity" INTEGER NOT NULL DEFAULT 0;
