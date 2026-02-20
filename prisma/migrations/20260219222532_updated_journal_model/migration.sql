/*
  Warnings:

  - A unique constraint covering the columns `[tradeId]` on the table `Journal` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "aiInsights" JSONB,
ADD COLUMN     "magicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "riskScore" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Journal_tradeId_key" ON "Journal"("tradeId");

-- CreateIndex
CREATE INDEX "Journal_owner_idx" ON "Journal"("owner");

-- CreateIndex
CREATE INDEX "Journal_tradeId_idx" ON "Journal"("tradeId");
