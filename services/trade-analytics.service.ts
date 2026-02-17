/* eslint-disable @typescript-eslint/no-explicit-any */
import { TradeRecord, TradeStats } from '@/types'
import { PnLCalculator } from '@/services/pnl-calculator.service'
import { LogType } from '@deriverse/kit';

export class TradeAnalyticsCalculator {
  private trades: TradeRecord[];

  constructor(trades: TradeRecord[]) {
    this.trades = trades
      .filter((t) => this.isTradeForPnL(t))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Filter function to identify PnL-relevant trades
  private isTradeForPnL(trade: TradeRecord): boolean {
    const pnlRelevantLogs = [
      LogType.spotFillOrder,
      LogType.perpFillOrder,
      LogType.swapOrder,
      LogType.perpFunding,
      LogType.perpSocLoss,
      LogType.spotFees,
      LogType.perpFees,
    ];

    return pnlRelevantLogs.includes(trade.discriminator as LogType);
  }

  // Calculate win rate
  calculateWinRate(): number {
    const winningTrades = this.trades.filter((t) => t.pnl > 0).length;
    const totalTrades = this.trades.filter(
      (t) =>
        t.discriminator === LogType.spotFillOrder ||
        t.discriminator === LogType.perpFillOrder,
    ).length;

    return totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  }

  // Calculate directional bias
  calculateDirectionalBias(): { long: number; short: number; ratio: number } {
    const longTrades = this.trades.filter(
      (t) => t.side === "long" || t.side === "buy",
    ).length;

    const shortTrades = this.trades.filter(
      (t) => t.side === "short" || t.side === "sell",
    ).length;

    return {
      long: longTrades,
      short: shortTrades,
      ratio: shortTrades > 0 ? longTrades / shortTrades : longTrades,
    };
  }

  // Calculate average trade duration
  calculateAvgTradeDuration(): number {
    const filledTrades = this.trades.filter(
      (t) =>
        t.discriminator === LogType.spotFillOrder ||
        t.discriminator === LogType.perpFillOrder,
    );

    if (filledTrades.length === 0) return 0;

    const totalDuration = filledTrades.reduce(
      (sum, t) => sum + (t.duration || 0),
      0,
    );

    return totalDuration / filledTrades.length;
  }

  // Calculate largest gain/loss
  calculateExtremes(): { largestGain: number; largestLoss: number } {
    const pnls = this.trades.map((t) => t.pnl);

    return {
      largestGain: Math.max(...pnls, 0),
      largestLoss: Math.min(...pnls, 0),
    };
  }

  // Calculate average win/loss
  calculateAvgWinLoss(): { avgWin: number; avgLoss: number } {
    const wins = this.trades.filter((t) => t.pnl > 0);
    const losses = this.trades.filter((t) => t.pnl < 0);

    const avgWin =
      wins.length > 0
        ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
        : 0;

    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length)
        : 0;

    return { avgWin, avgLoss };
  }

  // Calculate profit factor
  calculateProfitFactor(): number {
    const grossProfit = this.trades
      .filter((t) => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);

    const grossLoss = Math.abs(
      this.trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0),
    );

    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
  }

  // Calculate drawdown
  calculateDrawdown(): { maxDrawdown: number; currentDrawdown: number } {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativePnl = 0;

    for (const trade of this.trades) {
      cumulativePnl += trade.pnl;

      if (cumulativePnl > peak) {
        peak = cumulativePnl;
      }

      const drawdown = peak - cumulativePnl;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const currentDrawdown = peak - cumulativePnl;

    return { maxDrawdown, currentDrawdown };
  }

  calculatePnLFromFills(): number {
    const fills = this.trades.filter(
      (t) => t.discriminator === 11 || t.discriminator === 19,
    );

    // Group by symbol
    const bySymbol: Map<string, TradeRecord[]> = new Map();

    for (const fill of fills) {
      if (!bySymbol.has(fill.symbol)) {
        bySymbol.set(fill.symbol, []);
      }
      bySymbol.get(fill.symbol)!.push(fill);
    }

    let totalPnL = 0;

    // Calculate PnL for each symbol using FIFO
    for (const [symbol, symbolFills] of bySymbol) {
      const sorted = symbolFills.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      const openPositions: Array<{ price: number; qty: number }> = [];

      for (const fill of sorted) {
        const isBuy = fill.side === "buy" || fill.side === "long";
        const qty = fill.quantity;
        const price = fill.entryPrice;

        if (isBuy) {
          // Add to open positions
          openPositions.push({ price, qty });
        } else {
          // Match with open positions (FIFO)
          let remainingQty = qty;
          while (remainingQty > 0 && openPositions.length > 0) {
            const position = openPositions[0];
            const matchedQty = Math.min(position.qty, remainingQty);

            // Calculate PnL
            const pnl = (price - position.price) * matchedQty;
            totalPnL += pnl;

            position.qty -= matchedQty;
            remainingQty -= matchedQty;

            if (position.qty <= 0) {
              openPositions.shift();
            }
          }
        }
      }
    }

    return totalPnL;
  }

  // Include fees in PnL
  calculateNetPnL(): number {
    // Use PnLCalculator to get per-trade PnL (which includes proportional fees)
    const pnlCalc = new PnLCalculator(this.trades);
    const detailed = pnlCalc.calculatePnL();
    const totalPnL = detailed.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // Add any funding payments that were not captured in fills
    const totalFunding = this.trades.reduce(
      (sum, t) => sum + (t.fundingPayments || 0),
      0,
    );

    return totalPnL + totalFunding;
  }

  // Symbol-specific performance
  calculateSymbolPerformance(): Map<string, any> {
    const performance = new Map();

    for (const trade of this.trades) {
      if (!performance.has(trade.symbol)) {
        performance.set(trade.symbol, {
          pnl: 0,
          trades: 0,
          wins: 0,
          losses: 0,
          volume: 0,
        });
      }

      const stats = performance.get(trade.symbol);
      stats.pnl += trade.pnl;
      stats.trades++;
      stats.volume += trade.value || 0;

      if (trade.pnl > 0) stats.wins++;
      if (trade.pnl < 0) stats.losses++;
    }

    // Calculate win rate for each symbol
    for (const [symbol, stats] of performance) {
      stats.winRate = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
    }

    return performance;
  }

  // Time-based analysis
  analyzeByTimeframe(
    period: "daily" | "weekly" | "monthly",
  ): Map<string, number> {
    const pnlByPeriod = new Map();

    for (const trade of this.trades) {
      let key: string;

      if (period === "daily") {
        key = trade.timestamp.toISOString().split("T")[0];
      } else if (period === "weekly") {
        const week = this.getWeekNumber(trade.timestamp);
        key = `${trade.timestamp.getFullYear()}-W${week}`;
      } else {
        key = `${trade.timestamp.getFullYear()}-${trade.timestamp.getMonth() + 1}`;
      }

      pnlByPeriod.set(key, (pnlByPeriod.get(key) || 0) + trade.pnl);
    }

    return pnlByPeriod;
  }

  // Order type performance
  analyzeOrderTypePerformance(): any {
    const stats = {
      market: { count: 0, pnl: 0, wins: 0, losses: 0 },
      limit: { count: 0, pnl: 0, wins: 0, losses: 0 },
      unknown: { count: 0, pnl: 0, wins: 0, losses: 0 },
    };

    for (const trade of this.trades) {
      const type = trade.orderType as keyof typeof stats;
      if (stats[type]) {
        stats[type].count++;
        stats[type].pnl += trade.pnl;
        if (trade.pnl > 0) stats[type].wins++;
        if (trade.pnl < 0) stats[type].losses++;
      }
    }

    // Add win rates
    for (const [type, data] of Object.entries(stats)) {
      (data as any).winRate =
        data.count > 0 ? (data.wins / data.count) * 100 : 0;
    }

    return stats;
  }

  // Session analysis (for crypto, we can use UTC hours)
  analyzeBySession(): Map<string, TradeStats> {
    const sessions = new Map([
      ["asia", { start: 0, end: 8 }], // 00:00-08:00 UTC
      ["london", { start: 8, end: 16 }], // 08:00-16:00 UTC
      ["ny", { start: 16, end: 24 }], // 16:00-24:00 UTC
    ]);

    const sessionStats = new Map();

    for (const trade of this.trades) {
      const hour = trade.timestamp.getUTCHours();

      for (const [session, range] of sessions) {
        if (hour >= range.start && hour < range.end) {
          if (!sessionStats.has(session)) {
            sessionStats.set(session, {
              trades: 0,
              pnl: 0,
              wins: 0,
              losses: 0,
            });
          }

          const stats = sessionStats.get(session);
          stats.trades++;
          stats.pnl += trade.pnl;
          if (trade.pnl > 0) stats.wins++;
          if (trade.pnl < 0) stats.losses++;
          break;
        }
      }
    }

    return sessionStats;
  }

  // Fee analysis
  analyzeFees(): any {
    return {
      totalFees: this.trades.reduce((sum, t) => sum + t.fees.total, 0),
      totalRebates: this.trades.reduce(
        (sum, t) => sum + (t.fees.rebates || 0),
        0,
      ),
      netFees:
        this.trades.reduce((sum, t) => sum + t.fees.total, 0) -
        this.trades.reduce((sum, t) => sum + (t.fees.rebates || 0), 0),
      fundingPayments: this.trades
        .filter((t) => t.fees?.funding)
        .reduce((sum, t) => sum + (t.fees?.funding || 0), 0),
      feeBreakdown: {
        spot: this.trades
          .filter((t) => t.tradeType === "spot")
          .reduce((sum, t) => sum + t.fees.total, 0),
        perp: this.trades
          .filter((t) => t.tradeType === "perp")
          .reduce((sum, t) => sum + t.fees.total, 0),
      },
    };
  }

  // Comprehensive analytics report
  generateFullReport(): any {
    const winRate = this.calculateWinRate();
    const bias = this.calculateDirectionalBias();
    const extremes = this.calculateExtremes();
    const avgWinLoss = this.calculateAvgWinLoss();
    const drawdown = this.calculateDrawdown();

    return {
      summary: {
        totalTrades: this.trades.length,
        totalPnl: this.trades.reduce((sum, t) => sum + t.pnl, 0),
        totalVolume: this.trades.reduce((sum, t) => sum + (t.value || 0), 0),
        winRate,
        profitFactor: this.calculateProfitFactor(),
        ...avgWinLoss,
        ...extremes,
        ...drawdown,
      },
      directional: {
        ...bias,
        longVolume: this.trades
          .filter((t) => t.side === "long" || t.side === "buy")
          .reduce((sum, t) => sum + (t.value || 0), 0),
        shortVolume: this.trades
          .filter((t) => t.side === "short" || t.side === "sell")
          .reduce((sum, t) => sum + (t.value || 0), 0),
      },
      timing: {
        avgDuration: this.calculateAvgTradeDuration(),
        sessionAnalysis: Object.fromEntries(this.analyzeBySession()),
        dailyPnl: Object.fromEntries(this.analyzeByTimeframe("daily")),
        monthlyPnl: Object.fromEntries(this.analyzeByTimeframe("monthly")),
      },
      symbols: Object.fromEntries(this.calculateSymbolPerformance()),
      orderTypes: this.analyzeOrderTypePerformance(),
      fees: this.analyzeFees(),
    };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7,
      )
    );
  }
}
