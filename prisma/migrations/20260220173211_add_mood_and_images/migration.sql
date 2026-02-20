-- AlterTable
ALTER TABLE "Journal" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mood" TEXT;
