-- AlterTable
ALTER TABLE "stages" ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "stageId" TEXT;

-- CreateIndex
CREATE INDEX "payments_stageId_idx" ON "payments"("stageId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
