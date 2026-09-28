-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "fileKey" VARCHAR(200) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByAccountId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_payment_proof_payment" ON "PaymentProof"("paymentId");

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_uploadedByAccountId_fkey" FOREIGN KEY ("uploadedByAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

