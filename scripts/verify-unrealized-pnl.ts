import { PnLCalculator } from "../services/pnl-calculator.service";
import { TradeRecord } from "../types";

// Helper to create mock trade with defaults
function createMockTrade(overrides: Partial<TradeRecord>): TradeRecord {
    return {
        id: "mock-id",
        timestamp: new Date(),
        symbol: "SOL/USDC",
        side: "buy",
        entryPrice: 0,
        exitPrice: 0,
        quantity: 0,
        value: 0,
        tradeType: "perp",
        discriminator: 19,
        logType: "perpFillOrder",
        transactionHash: "mock-hash",
        clientId: "mock-client",
        orderId: "mock-order",
        fees: { maker: 0, taker: 0, total: 0 },
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: "open",
        ...overrides
    };
}

// Mock trades
const mockTrades: TradeRecord[] = [
    // Open Long SOL Position
    createMockTrade({
        id: "1",
        timestamp: new Date("2024-01-01T10:00:00Z"),
        symbol: "SOL/USDC",
        side: "buy",
        entryPrice: 100,
        quantity: 10,
        value: 1000,
    }),
    // Partial Close
    createMockTrade({
        id: "2",
        timestamp: new Date("2024-01-01T11:00:00Z"),
        symbol: "SOL/USDC",
        side: "sell",
        entryPrice: 110,
        quantity: 5, // closing 5
        value: 550,
    }),
    // Open Short BONK
    createMockTrade({
        id: "3",
        timestamp: new Date("2024-01-01T12:00:00Z"),
        symbol: "BONK/USDC",
        side: "sell",
        entryPrice: 0.00001,
        quantity: 1000000,
        value: 10,
    })
];

// Mock Prices
const mockPrices = new Map<string, number>();
mockPrices.set("SOL", 120); // SOL price up, remaining 5 SOL long should have profit
mockPrices.set("BONK", 0.000008); // BONK price down, short should have profit

async function runTest() {
    console.log("🧪 Testing Unrealized PnL Calculation...");

    const calculator = new PnLCalculator(mockTrades);

    // 1. Check Open Positions
    console.log("\n1. Checking Open Positions...");
    const openPositions = calculator.getOpenPositions();

    const solPositions = openPositions.get("SOL/USDC");
    const bonkPositions = openPositions.get("BONK/USDC");

    console.log(`   SOL Positions: ${solPositions?.length} (Expected 1)`);
    console.log(`   SOL Remaining Qty: ${solPositions?.[0]?.remainingQty} (Expected 5)`);

    console.log(`   BONK Positions: ${bonkPositions?.length} (Expected 1)`);
    console.log(`   BONK Remaining Qty: ${bonkPositions?.[0]?.remainingQty} (Expected 1000000)`);

    if (solPositions?.[0]?.remainingQty !== 5) throw new Error("SOL qty mismatch");
    if (bonkPositions?.[0]?.remainingQty !== 1000000) throw new Error("BONK qty mismatch");

    // 2. Check Unrealized PnL
    console.log("\n2. Checking Unrealized PnL...");
    const unrealized = calculator.calculateUnrealizedPnL(mockPrices);

    console.log("   Unrealized Details:");
    unrealized.positions.forEach(p => {
        console.log(`   - ${p.symbol}: ${p.direction.toUpperCase()} ${p.size} @ $${p.entryPrice} -> $${p.currentPrice} | PnL: $${p.pnl.toFixed(4)}`);
    });

    // Expected SOL PnL: (120 - 100) * 5 = +100
    // Expected BONK PnL: (0.00001 - 0.000008) * 1000000 = 0.000002 * 1000000 = +2
    // Total: +102

    const expectedTotal = 102;
    console.log(`\n   Total Unrealized PnL: $${unrealized.totalUnrealizedPnL.toFixed(2)} (Expected $${expectedTotal})`);

    if (Math.abs(unrealized.totalUnrealizedPnL - expectedTotal) > 0.01) {
        throw new Error(`PnL mismatch. Got ${unrealized.totalUnrealizedPnL}, expected ${expectedTotal}`);
    }

    console.log("\n✅ Verification Passed!");
}

runTest().catch(error => {
    console.error("Test failed:", error);
    process.exit(1);
});
