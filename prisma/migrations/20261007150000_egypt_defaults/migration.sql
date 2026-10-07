-- Egypt is the market now: the pound is the currency, Cairo the timezone, EG the country.
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'EGP';
ALTER TABLE "Account" ALTER COLUMN "timezone" SET DEFAULT 'Africa/Cairo';
ALTER TABLE "Address" ALTER COLUMN "country" SET DEFAULT 'EG';

-- Move the trial data over with the defaults.
UPDATE "Product" SET "currency" = 'EGP' WHERE "currency" = 'SAR';
UPDATE "Order" SET "currency" = 'EGP' WHERE "currency" = 'SAR';
UPDATE "Payment" SET "currency" = 'EGP' WHERE "currency" = 'SAR';
UPDATE "Refund" SET "currency" = 'EGP' WHERE "currency" = 'SAR';
UPDATE "Account" SET "timezone" = 'Africa/Cairo' WHERE "timezone" = 'Asia/Riyadh';
UPDATE "Address" SET "country" = 'EG' WHERE "country" = 'SA';
