-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "aiAnalyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pnl" DOUBLE PRECISION,
ADD COLUMN     "pnlPercentage" DOUBLE PRECISION,
ADD COLUMN     "side" TEXT,
ADD COLUMN     "symbol" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tradeTimestamp" TIMESTAMP(3),
ADD COLUMN     "transactionHash" TEXT;
