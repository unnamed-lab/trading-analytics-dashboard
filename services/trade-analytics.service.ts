import { TradeRecord, FinancialDetails } from "@/types";
import { PnLCalculator } from "./pnl-calculator.service";

export class TradeAnalyticsCalculator {
  private trades: TradeRecord[];
  private pnlCalculatedTrades: TradeRecord[];
  private financials: FinancialDetails | null;

  constructor(trades: TradeRecord[], financials?: FinancialDetails) {
    this.trades = trades.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    this.financials = financials || null;

    // Calculate PnL for fill trades
    const calculator = new PnLCalculator(trades);
    this.pnlCalculatedTrades = calculator.calculatePnL();
  }

  /**
   * Get trades with proper PnL calculation
   */
  getTradesWithPnL(): TradeRecord[] {
    return this.pnlCalculatedTrades;
  }

  /**
   * Calculate core metrics (aligned with the library's CoreMetrics)
   */
  calculateCoreMetrics(currentPrices?: Map<string, number>) {
    const trades = this.pnlCalculatedTrades;

    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalVolume = trades.reduce(
      (sum, t) => sum + t.entryPrice * t.quantity,
      0,
    );

    // Use extracted financials if available, otherwise fallback to trade aggregation
    const totalFees = this.financials
      ? this.financials.totalFees
      : trades.reduce((sum, t) => sum + (t.fees?.total || 0), 0);

    const totalFunding = this.financials
      ? this.financials.totalFundingReceived - this.financials.totalFundingPaid
      : trades.reduce((sum, t) => sum + (t.fundingPayments || 0), 0);

    const winningTrades = trades.filter((t) => t.pnl > 1e-12).length;
    const losingTrades = trades.filter((t) => t.pnl < -1e-12).length;
    const winRate =
      trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    // Calculate Unrealized PnL if prices are provided
    let unrealizedPnl = 0;
    let unrealizedPositions: any[] = [];

    if (currentPrices) {
      const calculator = new PnLCalculator(this.trades);
      const result = calculator.calculateUnrealizedPnL(currentPrices);
      unrealizedPnl = result.totalUnrealizedPnL;
      unrealizedPositions = result.positions;
    }

    return {
      totalPnL,
      totalVolume,
      totalFees,
      totalFunding,
      netPnL: totalPnL - totalFees + totalFunding,
      netDeposits: this.financials?.netDeposits || 0,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate,
      realizedPnl: totalPnL,
      unrealizedPnl,
      unrealizedPositions,
    };
  }

  /**
   * Calculate long/short ratio
   */
  calculateLongShortRatio() {
    const longTrades = this.pnlCalculatedTrades.filter(
      (t) => t.side === "long" || t.side === "buy",
    ).length;

    const shortTrades = this.pnlCalculatedTrades.filter(
      (t) => t.side === "short" || t.side === "sell",
    ).length;

    const longVolume = this.pnlCalculatedTrades
      .filter((t) => t.side === "long" || t.side === "buy")
      .reduce((sum, t) => sum + t.entryPrice * t.quantity, 0);

    const shortVolume = this.pnlCalculatedTrades
      .filter((t) => t.side === "short" || t.side === "sell")
      .reduce((sum, t) => sum + t.entryPrice * t.quantity, 0);

    const ratio = shortTrades > 0 ? longTrades / shortTrades : longTrades;

    let bias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
    if (ratio > 1.2) bias = "BULLISH";
    else if (ratio < 0.8) bias = "BEARISH";

    return {
      longTrades,
      shortTrades,
      longVolume,
      shortVolume,
      ratio,
      bias,
    };
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics() {
    const trades = this.pnlCalculatedTrades;
    const pnls = trades.map((t) => t.pnl);

    const wins = trades.filter((t) => t.pnl > 1e-12);
    const losses = trades.filter((t) => t.pnl < -1e-12);

    const largestGain = pnls.length > 0 ? Math.max(...pnls, 0) : 0;
    const largestLoss = pnls.length > 0 ? Math.min(...pnls, 0) : 0;

    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const profitFactor =
      totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    return {
      largestGain,
      largestLoss,
      avgWin,
      avgLoss,
      profitFactor,
    };
  }

  /**
   * Calculate drawdown
   */
  calculateDrawdown() {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    const drawdownSeries: Array<{
      timestamp: number;
      drawdown: number;
      peak: number;
    }> = [];

    for (const trade of this.pnlCalculatedTrades) {
      cumulative += (trade.pnl || 0);

      if (cumulative > peak) {
        peak = cumulative;
      }

      const currentDrawdown = peak - cumulative;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }

      drawdownSeries.push({
        timestamp: trade.timestamp.getTime(),
        drawdown: -currentDrawdown,
        peak,
      });
    }

    return {
      maxDrawdown,
      currentDrawdown: peak - cumulative,
      drawdownSeries,
    };
  }

  /**
   * Generate time series PnL data
   */
  generatePnLTimeSeries() {
    if (this.financials && this.financials.dailySummaryArray) {
      let cumulative = 0;

      // We need to combine trade PnL with daily fees/funding
      // First get daily trade PnL
      const dailyTradePnL = new Map<string, number>();
      this.pnlCalculatedTrades.forEach(t => {
        const date = t.timestamp.toISOString().split('T')[0];
        dailyTradePnL.set(date, (dailyTradePnL.get(date) || 0) + (t.pnl || 0));
      });

      return this.financials.dailySummaryArray.map(day => {
        const tradePnL = dailyTradePnL.get(day.date) || 0;
        const netDailyPnL = tradePnL - day.fees + day.funding;
        cumulative += netDailyPnL;

        return {
          timestamp: new Date(day.date).getTime(),
          date: day.date,
          cumulativePnL: cumulative,
          tradePnL: netDailyPnL,
        };
      });
    }

    let cumulative = 0;
    return this.pnlCalculatedTrades.map((trade) => {
      cumulative += (trade.pnl || 0);

      return {
        timestamp: trade.timestamp.getTime(),
        date: trade.timestamp.toLocaleDateString(),
        cumulativePnL: cumulative,
        tradePnL: trade.pnl,
      };
    });
  }

  /**
   * Calculate session performance
   */
  calculateSessionPerformance() {
    const sessionMap = new Map<string, TradeRecord[]>();

    this.pnlCalculatedTrades.forEach((trade) => {
      const date = trade.timestamp.toISOString().split("T")[0];
      if (!sessionMap.has(date)) {
        sessionMap.set(date, []);
      }
      sessionMap.get(date)!.push(trade);
    });

    const sessionData = Array.from(sessionMap.entries()).map(
      ([date, dayTrades]) => {
        const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const wins = dayTrades.filter((t) => t.pnl > 1e-12).length;
        const winRate = (wins / dayTrades.length) * 100;

        return {
          date,
          trades: dayTrades.length,
          pnl,
          winRate,
        };
      },
    );

    const profitableSessions = sessionData.filter((s) => s.pnl > 0).length;
    const totalPnL = sessionData.reduce((sum, s) => sum + s.pnl, 0);

    const sortedByPnL = [...sessionData].sort((a, b) => b.pnl - a.pnl);

    return {
      totalSessions: sessionData.length,
      profitableSessions,
      losingSessions: sessionData.length - profitableSessions,
      avgPnLPerSession:
        sessionData.length > 0 ? totalPnL / sessionData.length : 0,
      bestSession: sortedByPnL[0] || null,
      worstSession: sortedByPnL[sortedByPnL.length - 1] || null,
      sessionData,
    };
  }

  /**
   * Calculate fee composition
   */
  calculateFeeComposition() {
    let spotFees = 0;
    let perpFees = 0;
    let totalFees = 0;

    if (this.financials) {
      spotFees = this.financials.feeBreakdown.spotFees;
      perpFees = this.financials.feeBreakdown.perpFees;
      totalFees = this.financials.totalFees;
    } else {
      spotFees = this.trades
        .filter((t) => t.tradeType === "spot")
        .reduce((sum, t) => sum + Math.abs(t.fees?.total || 0), 0);

      perpFees = this.trades
        .filter((t) => t.tradeType === "perp")
        .reduce((sum, t) => sum + Math.abs(t.fees?.total || 0), 0);

      totalFees = spotFees + perpFees;
    }

    const feesBySymbol = new Map<string, number>();

    this.trades.forEach((trade) => {
      const current = feesBySymbol.get(trade.symbol) || 0;
      feesBySymbol.set(
        trade.symbol,
        current + Math.abs(trade.fees?.total || 0),
      );
    });

    const feesBySymbolArray = Array.from(feesBySymbol.entries())
      .map(([symbol, fees]) => ({
        symbol,
        fees,
        percentage: totalFees > 0 ? (fees / totalFees) * 100 : 0,
      }))
      .sort((a, b) => b.fees - a.fees);

    return {
      spotFees,
      perpFees,
      totalFees,
      feesBySymbol: feesBySymbolArray,
      breakdown: this.financials?.feeBreakdown || null,
    };
  }

  /**
   * Calculate hourly performance for Heat Map
   */
  calculateHourlyPerformance() {
    const hourlyMap = new Map<number, TradeRecord[]>();
    // Initialize 0-23 hours
    for (let i = 0; i < 24; i++) hourlyMap.set(i, []);

    this.pnlCalculatedTrades.forEach((trade) => {
      const hour = trade.timestamp.getHours();
      hourlyMap.get(hour)?.push(trade);
    });

    return Array.from(hourlyMap.entries()).map(([hour, trades]) => {
      const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wins = trades.filter((t) => t.pnl > 1e-12).length;
      return {
        hour,
        trades: trades.length,
        pnl,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        volume: trades.reduce((sum, t) => sum + (t.value || 0), 0)
      };
    }).sort((a, b) => a.hour - b.hour);
  }

  /**
   * Calculate day of week performance for Heat Map
   */
  calculateDayOfWeekPerformance() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayMap = new Map<number, TradeRecord[]>();
    for (let i = 0; i < 7; i++) dayMap.set(i, []);

    this.pnlCalculatedTrades.forEach((trade) => {
      const day = trade.timestamp.getDay();
      dayMap.get(day)?.push(trade);
    });

    return Array.from(dayMap.entries()).map(([dayIndex, trades]) => {
      const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wins = trades.filter((t) => t.pnl > 1e-12).length;
      return {
        day: days[dayIndex],
        dayIndex,
        trades: trades.length,
        pnl,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
      };
    }).sort((a, b) => a.dayIndex - b.dayIndex);
  }

  /**
   * Calculate order type performance
   */
  calculateOrderTypePerformance() {
    const typeMap = new Map<string, TradeRecord[]>();

    this.pnlCalculatedTrades.forEach((trade) => {
      const type = trade.orderType || "unknown";
      if (!typeMap.has(type)) typeMap.set(type, []);
      typeMap.get(type)?.push(trade);
    });

    return Array.from(typeMap.entries()).map(([type, trades]) => {
      const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wins = trades.filter((t) => t.pnl > 1e-12).length;
      return {
        type,
        count: trades.length,
        pnl,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        volume: trades.reduce((sum, t) => sum + (t.value || 0), 0)
      };
    });
  }

  /**
   * Calculate symbol performance (Focus Mode)
   */
  calculateSymbolPerformance() {
    const symbolMap = new Map<string, TradeRecord[]>();

    this.pnlCalculatedTrades.forEach((trade) => {
      if (!symbolMap.has(trade.symbol)) symbolMap.set(trade.symbol, []);
      symbolMap.get(trade.symbol)?.push(trade);
    });

    return Array.from(symbolMap.entries()).map(([symbol, trades]) => {
      const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wins = trades.filter((t) => t.pnl > 1e-12).length;
      return {
        symbol,
        trades: trades.length,
        pnl,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        volume: trades.reduce((sum, t) => sum + (t.value || 0), 0)
      };
    }).sort((a, b) => b.volume - a.volume);
  }

  /**
   * Calculate daily PnL Map for HeatMap
   */
  calculateDailyPnL() {
    const pnlMap = new Map<string, number>();

    this.pnlCalculatedTrades.forEach((trade) => {
      const date = trade.timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
      const current = pnlMap.get(date) || 0;
      pnlMap.set(date, current + (trade.pnl || 0));
    });

    return pnlMap;
  }

  /**
   * Generate complete analytics report
   */
  generateFullReport(currentPrices?: Map<string, number>) {
    return {
      core: this.calculateCoreMetrics(currentPrices),
      longShort: this.calculateLongShortRatio(),
      risk: this.calculateRiskMetrics(),
      drawdown: this.calculateDrawdown(),
      sessions: this.calculateSessionPerformance(),
      fees: this.calculateFeeComposition(),
      timeSeries: this.generatePnLTimeSeries(),
      // New Revolutionary Analytics
      hourly: this.calculateHourlyPerformance(),
      daily: this.calculateDayOfWeekPerformance(),
      orderTypes: this.calculateOrderTypePerformance(),
      symbols: this.calculateSymbolPerformance(),
      dailyPnl: this.calculateDailyPnL(),
    };
  }
}
