import prisma from "@/lib/prisma";
import { TradeRecord } from "@/types";

export class TradeDBService {
    /**
     * Get the last signature synced for a wallet
     */
    static async getLastSignature(owner: string): Promise<string | null> {
        const state = await prisma.walletSyncState.findUnique({
            where: { owner },
        });
        return state?.lastSignature || null;
    }

    /**
     * Update the last signature synced for a wallet
     */
    static async updateLastSignature(owner: string, lastSignature: string) {
        await prisma.walletSyncState.upsert({
            where: { owner },
            update: { lastSignature },
            create: { owner, lastSignature },
        });
    }

    /**
     * Upsert a list of parsed trades into the database
     */
    static async upsertTrades(owner: string, trades: TradeRecord[]) {
        if (!trades.length) return 0;

        let upsertedCount = 0;

        // Build the upsert operations
        const operations = trades.map((trade) => {
            const id = trade.id;
            upsertedCount++;

            return prisma.trade.upsert({
                where: { id },
                update: {
                    // If already exists, we might want to update dynamic fields (like PnL)
                    pnl: trade.pnl,
                    pnlPercentage: trade.pnlPercentage,
                    status: trade.status,
                },
                create: {
                    id,
                    owner,
                    timestamp: trade.timestamp,
                    section: trade.section,
                    symbol: trade.symbol,
                    side: trade.side,
                    entryPrice: trade.entryPrice,
                    exitPrice: trade.exitPrice,
                    quantity: trade.quantity,
                    amount: trade.amount,
                    value: trade.value,
                    orderType: trade.orderType,
                    instrument: trade.instrument,
                    clientId: trade.clientId,
                    orderId: trade.orderId,
                    transactionHash: trade.transactionHash,

                    makerFee: trade.fees.maker,
                    takerFee: trade.fees.taker,
                    totalFee: trade.fees.total,
                    rebates: trade.fees.rebates,
                    fundingFee: trade.fees.funding,
                    socializedLossFee: trade.fees.socializedLoss,

                    pnl: trade.pnl,
                    pnlPercentage: trade.pnlPercentage,
                    duration: trade.duration,
                    status: trade.status,

                    notes: trade.notes,
                    tradeType: trade.tradeType,
                    fundingPayments: trade.fundingPayments,
                    logType: trade.logType,
                    discriminator: trade.discriminator,
                },
            });
        });

        // Execute all upserts in a transaction block
        // Using simple loop in transaction to avoid batch size limits if large
        await prisma.$transaction(operations);

        return upsertedCount;
    }

    /**
     * Get all cached trades for a wallet
     */
    static async getTrades(owner: string): Promise<TradeRecord[]> {
        const dbTrades = await prisma.trade.findMany({
            where: { owner },
            orderBy: { timestamp: "desc" },
        });

        return dbTrades.map((t) => ({
            id: t.id,
            timestamp: t.timestamp,
            section: t.section || undefined,
            symbol: t.symbol,
            side: t.side as TradeRecord["side"],
            entryPrice: t.entryPrice,
            exitPrice: t.exitPrice,
            quantity: t.quantity,
            amount: t.amount || undefined,
            value: t.value || undefined,
            orderType: t.orderType as TradeRecord["orderType"],
            instrument: t.instrument || undefined,
            clientId: t.clientId,
            orderId: t.orderId,
            transactionHash: t.transactionHash,

            fees: {
                maker: t.makerFee || 0,
                taker: t.takerFee || 0,
                total: t.totalFee,
                rebates: t.rebates || 0,
                funding: t.fundingFee || 0,
                socializedLoss: t.socializedLossFee || 0,
            },

            pnl: t.pnl,
            pnlPercentage: t.pnlPercentage,
            duration: t.duration,
            status: t.status as TradeRecord["status"],

            notes: t.notes || undefined,
            tradeType: t.tradeType as TradeRecord["tradeType"],
            fundingPayments: t.fundingPayments || undefined,
            logType: t.logType || undefined,
            discriminator: t.discriminator || undefined,
        }));
    }
}
