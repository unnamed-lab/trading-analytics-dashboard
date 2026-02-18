import { PnLCalculator } from '@/services/pnl-calculator.service';
import type { TradeRecord } from '@/types';

describe('PnLCalculator FIFO matching', () => {
  it('matches perp buys then sells using FIFO and calculates Gross P&L (discriminator 19)', () => {
    const trades: TradeRecord[] = [
      {
        id: 't1',
        timestamp: new Date('2026-02-10T10:00:00Z'),
        symbol: 'BTC-USD',
        side: 'buy',
        entryPrice: 100,
        exitPrice: 100,
        quantity: 2,
        fees: { maker: 0, taker: 0, total: 1 },
        transactionHash: 'h1',
        clientId: 'c1',
        orderId: 'o1',
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: 'open',
        discriminator: 19,
      },
      {
        id: 't2',
        timestamp: new Date('2026-02-10T11:00:00Z'),
        symbol: 'BTC-USD',
        side: 'buy',
        entryPrice: 110,
        exitPrice: 110,
        quantity: 1,
        fees: { maker: 0, taker: 0, total: 0.5 },
        transactionHash: 'h2',
        clientId: 'c2',
        orderId: 'o2',
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: 'open',
        discriminator: 19,
      },
      {
        id: 't3',
        timestamp: new Date('2026-02-10T12:00:00Z'),
        symbol: 'BTC-USD',
        side: 'sell',
        entryPrice: 120,
        exitPrice: 120,
        quantity: 2.5,
        fees: { maker: 0, taker: 0, total: 1.5 },
        transactionHash: 'h3',
        clientId: 'c3',
        orderId: 'o3',
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: 'close',
        discriminator: 19,
      },
    ];

    const calc = new PnLCalculator(trades);
    const detailed = calc.calculatePnL();

    // find exit trade
    const exit = detailed.find((t) => t.id === 't3');
    expect(exit).toBeDefined();

    // Manual expected calculation (Gross P&L):
    // Match 2 units with t1 (buy@100) and 0.5 units with t2 (buy@110)
    // Gross pnl: (120-100)*2 + (120-110)*0.5 = 40 + 5 = 45
    // Fees are NOT subtracted from the individual trade's P&L anymore to match Deriverse site.

    expect(exit!.pnl).toBeCloseTo(45, 6);

    // Verify summary matches Realized P&L and Total Result logic
    const summary = calc.calculatePnLSummary();
    expect(summary.totalPnL).toBeCloseTo(45, 6); // Realized P&L
    expect(summary.totalFees).toBe(3); // 1 + 0.5 + 1.5
    expect(summary.netPnL).toBeCloseTo(42, 6); // 45 - 3 = 42
  });

  it('passes through non-perp trades with 0 PnL', () => {
    const trades: TradeRecord[] = [
      {
        id: 's1',
        timestamp: new Date('2026-02-10T10:00:00Z'),
        symbol: 'BTC-USD',
        side: 'buy',
        entryPrice: 100,
        exitPrice: 100,
        quantity: 2,
        fees: { maker: 0, taker: 0, total: 1 },
        transactionHash: 'h1',
        clientId: 'c1',
        orderId: 'o1',
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: 'open',
        discriminator: 11,
      },
    ];

    const calc = new PnLCalculator(trades);
    const result = calc.calculatePnL();

    expect(result[0].id).toBe('s1');
    expect(result[0].pnl).toBe(0);
  });

  it('aligns with Deriverse reference data from screenshots', () => {
    // Reference values from screenshot:
    // Realized P&L: -17.0885
    // Funding: 0.005035
    // Fees: -0.613334 (total fees incurred)
    // Total Result: -17.6968

    // We'll mock a set of trades that would lead to -17.0885 Gross P&L
    const trades: TradeRecord[] = [
      {
        id: 'entry',
        timestamp: new Date('2026-02-10T10:00:00Z'),
        symbol: 'SOL/USDC',
        side: 'buy',
        entryPrice: 100,
        exitPrice: 100,
        quantity: 1,
        fees: { maker: 0, taker: 0, total: 0.3 },
        transactionHash: 'h1',
        clientId: 'c1',
        orderId: 'o1',
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: 'open',
        discriminator: 19,
      },
      {
        id: 'exit',
        timestamp: new Date('2026-02-10T11:00:00Z'),
        symbol: 'SOL/USDC',
        side: 'sell',
        entryPrice: 82.9115, // 100 - 17.0885
        exitPrice: 82.9115,
        quantity: 1,
        fees: { maker: 0, taker: 0, total: 0.313334 },
        transactionHash: 'h2',
        clientId: 'c2',
        orderId: 'o2',
        pnl: 0,
        pnlPercentage: 0,
        duration: 0,
        status: 'close',
        discriminator: 19,
        fundingPayments: 0.005035, // Add funding
      },
    ];

    const calc = new PnLCalculator(trades);
    const summary = calc.calculatePnLSummary();

    expect(summary.totalPnL).toBeCloseTo(-17.0885, 4); // Realized P&L
    expect(summary.totalFees).toBeCloseTo(0.613334, 6); // Fees
    expect(summary.totalFunding).toBeCloseTo(0.005035, 6); // Funding
    expect(summary.netPnL).toBeCloseTo(-17.6968, 4); // Total Result
  });
});
