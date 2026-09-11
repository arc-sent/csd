-- AlterTable
ALTER TABLE "levels" DROP COLUMN "price";

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0;
