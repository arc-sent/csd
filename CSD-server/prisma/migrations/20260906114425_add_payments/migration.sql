-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "yookassaId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "email" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_yookassaId_key" ON "payments"("yookassaId");

-- CreateIndex
CREATE INDEX "payments_assignmentId_idx" ON "payments"("assignmentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
