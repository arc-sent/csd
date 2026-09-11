-- AlterTable
ALTER TABLE "levels" ADD COLUMN     "enPassant" TEXT,
ADD COLUMN     "fullmoveNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "halfmoveClock" INTEGER NOT NULL DEFAULT 0;
