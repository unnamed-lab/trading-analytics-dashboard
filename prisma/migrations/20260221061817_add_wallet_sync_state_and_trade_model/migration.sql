-- CreateTable
CREATE TABLE "WalletSyncState" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "lastSignature" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "section" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "orderType" TEXT,
    "instrument" TEXT,
    "clientId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "makerFee" DOUBLE PRECISION DEFAULT 0,
    "takerFee" DOUBLE PRECISION DEFAULT 0,
    "totalFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rebates" DOUBLE PRECISION DEFAULT 0,
    "fundingFee" DOUBLE PRECISION DEFAULT 0,
    "socializedLoss" DOUBLE PRECISION DEFAULT 0,
    "pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnlPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'breakeven',
    "notes" TEXT,
    "tradeType" TEXT,
    "fundingPayments" DOUBLE PRECISION,
    "logType" TEXT,
    "discriminator" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletSyncState_owner_key" ON "WalletSyncState"("owner");

-- CreateIndex
CREATE INDEX "WalletSyncState_owner_idx" ON "WalletSyncState"("owner");

-- CreateIndex
CREATE INDEX "Trade_owner_idx" ON "Trade"("owner");

-- CreateIndex
CREATE INDEX "Trade_owner_timestamp_idx" ON "Trade"("owner", "timestamp" DESC);
