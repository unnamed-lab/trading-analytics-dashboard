import { PnLCalculator } from '@/services/pnl-calculator.service';
import type { TradeRecord } from '@/types';

describe('PnLCalculator FIFO matching', () => {
  it('matches buys then sells using FIFO and accounts for fees', () => {
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
        discriminator: 11,
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
        discriminator: 11,
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

    // Manual expected calculation:
    // Match 2 units with t1 (buy@100) and 0.5 units with t2 (buy@110)
    // Entry pnl: (120-100)*2 + (120-110)*0.5 = 40 + 5 = 45
    // Entry fees allocated: t1 fee=1 allocated fully to 2 units -> 1.0
    // t2 fee=0.5 allocated pro-rata to 0.5/1 -> 0.25
    // Exit fees allocated: exit fee 1.5 allocated to matched qty 2.5 -> 1.5 total
    // Total fees for matched qty = 1.0 (t1) + 0.25 (t2 portion) + 1.5 (exit) = 2.75
    // Expected pnl = 45 - 2.75 = 42.25

    expect(exit!.pnl).toBeCloseTo(42.25, 6);
  });
});
