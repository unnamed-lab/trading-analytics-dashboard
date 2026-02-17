/* eslint-disable @typescript-eslint/no-explicit-any */
import { TradeRecord, TradeStats } from "@/types";
import { PnLCalculator } from "@/services/pnl-calculator.service";
import { LogType } from "@deriverse/kit";

export class TradeAnalyticsCalculator {
  private trades: TradeRecord[];

  constructor(trades: TradeRecord[]) {
    // Accept trades that are already PnL-calculated (discriminator already set)
    // but still filter to PnL-relevant events for analytics so fees / deposits
    // don't distort per-trade metrics.
    this.trades = trades
      .filter((t) => this.isTradeForPnL(t))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private isTradeForPnL(trade: TradeRecord): boolean {
    const pnlRelevantLogs: number[] = [
      LogType.spotFillOrder,
      LogType.perpFillOrder,
      LogType.swapOrder,
      LogType.perpFunding,
      LogType.perpSocLoss,
      LogType.spotFees,
      LogType.perpFees,
    ];
    return pnlRelevantLogs.includes(trade.discriminator as number);
  }

  // ── win rate ─────────────────────────────────────────────────────────────

  calculateWinRate(): number {
    const fills = this.trades.filter(
      (t) =>
        t.discriminator === LogType.spotFillOrder ||
        t.discriminator === LogType.perpFillOrder,
    );
    const wins = fills.filter((t) => t.pnl > 0).length;
    return fills.length > 0 ? (wins / fills.length) * 100 : 0;
  }

  // ── directional bias ─────────────────────────────────────────────────────

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

  // ── average trade duration ───────────────────────────────────────────────

  calculateAvgTradeDuration(): number {
    const filledTrades = this.trades.filter(
      (t) =>
        t.discriminator === LogType.spotFillOrder ||
        t.discriminator === LogType.perpFillOrder,
    );
    if (!filledTrades.length) return 0;
    return (
      filledTrades.reduce((sum, t) => sum + (t.duration || 0), 0) /
      filledTrades.length
    );
  }

  // ── extremes ─────────────────────────────────────────────────────────────

  calculateExtremes(): { largestGain: number; largestLoss: number } {
    const pnls = this.trades.map((t) => t.pnl);
    return {
      largestGain: pnls.length ? Math.max(...pnls, 0) : 0,
      largestLoss: pnls.length ? Math.min(...pnls, 0) : 0,
    };
  }

  // ── average win / loss ───────────────────────────────────────────────────

  calculateAvgWinLoss(): { avgWin: number; avgLoss: number } {
    const wins = this.trades.filter((t) => t.pnl > 0);
    const losses = this.trades.filter((t) => t.pnl < 0);
    const avgWin = wins.length
      ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length
      : 0;
    const avgLoss = losses.length
      ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
      : 0;
    return { avgWin, avgLoss };
  }

  // ── profit factor ────────────────────────────────────────────────────────

  calculateProfitFactor(): number {
    const grossProfit = this.trades
      .filter((t) => t.pnl > 0)
      .reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(
      this.trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0),
    );
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
  }

  // ── drawdown ─────────────────────────────────────────────────────────────

  calculateDrawdown(): { maxDrawdown: number; currentDrawdown: number } {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativePnl = 0;

    for (const trade of this.trades) {
      cumulativePnl += trade.pnl;
      if (cumulativePnl > peak) peak = cumulativePnl;
      const dd = peak - cumulativePnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return { maxDrawdown, currentDrawdown: peak - cumulativePnl };
  }

  // ── net PnL (using PnLCalculator so fees are applied) ───────────────────

  calculateNetPnL(): number {
    const summary = new PnLCalculator(this.trades).calculatePnLSummary();
    return summary.netPnL;
  }

  // ── symbol performance ───────────────────────────────────────────────────

  calculateSymbolPerformance(): Map<string, any> {
    const performance = new Map<string, any>();

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

    for (const [, stats] of performance) {
      stats.winRate = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
    }

    return performance;
  }

  // ── timeframe analysis ───────────────────────────────────────────────────

  analyzeByTimeframe(
    period: "daily" | "weekly" | "monthly",
  ): Map<string, number> {
    const pnlByPeriod = new Map<string, number>();

    for (const trade of this.trades) {
      let key: string;
      if (period === "daily") {
        key = trade.timestamp.toISOString().split("T")[0];
      } else if (period === "weekly") {
        key = `${trade.timestamp.getFullYear()}-W${this.getWeekNumber(trade.timestamp)}`;
      } else {
        key = `${trade.timestamp.getFullYear()}-${trade.timestamp.getMonth() + 1}`;
      }
      pnlByPeriod.set(key, (pnlByPeriod.get(key) || 0) + trade.pnl);
    }

    return pnlByPeriod;
  }

  // ── order type performance ───────────────────────────────────────────────

  analyzeOrderTypePerformance(): Record<string, any> {
    const stats: Record<
      string,
      {
        count: number;
        pnl: number;
        wins: number;
        losses: number;
        winRate?: number;
      }
    > = {
      market: { count: 0, pnl: 0, wins: 0, losses: 0 },
      limit: { count: 0, pnl: 0, wins: 0, losses: 0 },
      unknown: { count: 0, pnl: 0, wins: 0, losses: 0 },
    };

    for (const trade of this.trades) {
      const type =
        (trade.orderType as string) in stats
          ? (trade.orderType as string)
          : "unknown";
      stats[type].count++;
      stats[type].pnl += trade.pnl;
      if (trade.pnl > 0) stats[type].wins++;
      if (trade.pnl < 0) stats[type].losses++;
    }

    for (const data of Object.values(stats)) {
      data.winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
    }

    return stats;
  }

  // ── session analysis ─────────────────────────────────────────────────────

  analyzeBySession(): Map<string, TradeStats> {
    const sessions: Record<string, { start: number; end: number }> = {
      asia: { start: 0, end: 8 },
      london: { start: 8, end: 16 },
      ny: { start: 16, end: 24 },
    };

    const sessionStats = new Map<string, TradeStats>();

    for (const trade of this.trades) {
      const hour = trade.timestamp.getUTCHours();

      for (const [session, range] of Object.entries(sessions)) {
        if (hour >= range.start && hour < range.end) {
          if (!sessionStats.has(session)) {
            sessionStats.set(session, {
              count: 0,
              pnl: 0,
              wins: 0,
              losses: 0,
            });
          }
          const stats = sessionStats.get(session)!;
          stats.count++;
          stats.pnl += trade.pnl;
          if (trade.pnl > 0) stats.wins++;
          if (trade.pnl < 0) stats.losses++;
          break;
        }
      }
    }

    return sessionStats;
  }

  // ── fee analysis ─────────────────────────────────────────────────────────

  analyzeFees(): any {
    const totalFees = this.trades.reduce((s, t) => s + (t.fees?.total || 0), 0);
    const totalRebates = this.trades.reduce(
      (s, t) => s + (t.fees?.rebates || 0),
      0,
    );
    const fundingPayments = this.trades.reduce(
      (s, t) => s + (t.fundingPayments || 0),
      0,
    );

    return {
      totalFees,
      totalRebates,
      netFees: totalFees - totalRebates,
      fundingPayments,
      feeBreakdown: {
        spot: this.trades
          .filter((t) => t.tradeType === "spot")
          .reduce((s, t) => s + (t.fees?.total || 0), 0),
        perp: this.trades
          .filter((t) => t.tradeType === "perp")
          .reduce((s, t) => s + (t.fees?.total || 0), 0),
      },
    };
  }

  // ── full report ──────────────────────────────────────────────────────────

  generateFullReport(): any {
    const winRate = this.calculateWinRate();
    const bias = this.calculateDirectionalBias();
    const extremes = this.calculateExtremes();
    const avgWinLoss = this.calculateAvgWinLoss();
    const drawdown = this.calculateDrawdown();

    return {
      summary: {
        totalTrades: this.trades.length,
        totalPnl: this.trades.reduce((s, t) => s + t.pnl, 0),
        totalVolume: this.trades.reduce((s, t) => s + (t.value || 0), 0),
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
          .reduce((s, t) => s + (t.value || 0), 0),
        shortVolume: this.trades
          .filter((t) => t.side === "short" || t.side === "sell")
          .reduce((s, t) => s + (t.value || 0), 0),
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

  // ── utility ──────────────────────────────────────────────────────────────

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
