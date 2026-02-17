/* eslint-disable @typescript-eslint/no-explicit-any */
import { TradeRecord, PerformanceMetrics, TimeBasedMetrics, FeeAnalysis, DrawdownPoint } from '@/types';

export class PerformanceAnalyzer {
  private trades: TradeRecord[] = [];
  private metricsCache: Map<string, PerformanceMetrics> = new Map();

  constructor(trades: TradeRecord[] = []) {
    this.trades = trades;
  }

  addTrade(trade: TradeRecord): void {
    this.trades.push(trade);
    this.metricsCache.clear(); // Clear cache when new trade is added
  }

  addTrades(trades: TradeRecord[]): void {
    this.trades.push(...trades);
    this.metricsCache.clear();
  }

  // Filter trades by criteria
  filterTrades(filters: {
    symbol?: string;
    startDate?: Date;
    endDate?: Date;
    side?: 'long' | 'short' | 'buy' | 'sell';
    minPnL?: number;
    maxPnL?: number;
    orderType?: string;
  }): TradeRecord[] {
    return this.trades.filter(trade => {
      if (filters.symbol && trade.symbol !== filters.symbol) return false;
      if (filters.startDate && trade.timestamp < filters.startDate) return false;
      if (filters.endDate && trade.timestamp > filters.endDate) return false;
      if (filters.side && trade.side !== filters.side) return false;
      if (filters.minPnL && trade.pnl < filters.minPnL) return false;
      if (filters.maxPnL && trade.pnl > filters.maxPnL) return false;
      if (filters.orderType && trade.orderType !== filters.orderType) return false;
      return true;
    });
  }

  // Calculate comprehensive performance metrics
  calculateMetrics(filters?: any): PerformanceMetrics {
    const cacheKey = JSON.stringify(filters || 'all');
    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!;
    }

    const filteredTrades = filters ? this.filterTrades(filters) : this.trades;
    if (filteredTrades.length === 0) {
      return this.getEmptyMetrics();
    }

    const winningTrades = filteredTrades.filter(t => t.pnl > 0);
    const losingTrades = filteredTrades.filter(t => t.pnl < 0);
    const breakevenTrades = filteredTrades.filter(t => t.pnl === 0);

    const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalVolume = filteredTrades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);
    const totalFees = filteredTrades.reduce((sum, t) => sum + t.fees.total, 0);
    
    const winRate = (winningTrades.length / filteredTrades.length) * 100;
    
    const averageTradeDuration = filteredTrades.reduce((sum, t) => sum + t.duration, 0) / filteredTrades.length;
    
    const longTrades = filteredTrades.filter(t => t.side === 'long');
    const shortTrades = filteredTrades.filter(t => t.side === 'short');
    const longShortRatio = longTrades.length / Math.max(shortTrades.length, 1);
    
    const largestGain = Math.max(...filteredTrades.map(t => t.pnl));
    const largestLoss = Math.min(...filteredTrades.map(t => t.pnl));
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
      : 0;
    
    const averageLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length 
      : 0;
    
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    
    const expectancy = (winRate / 100) * averageWin - ((100 - winRate) / 100) * Math.abs(averageLoss);

    const metrics: PerformanceMetrics = {
      totalTrades: filteredTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalPnL,
      totalVolume,
      totalFees,
      averageTradeDuration,
      longShortRatio,
      largestGain,
      largestLoss,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown: this.calculateMaxDrawdown(filteredTrades),
      expectancy
    };

    this.metricsCache.set(cacheKey, metrics);
    return metrics;
  }

  // Calculate time-based metrics
  calculateTimeBasedMetrics(): TimeBasedMetrics {
    const hourly: Record<string, PerformanceMetrics> = {};
    const daily: Record<string, PerformanceMetrics> = {};
    const weekly: Record<string, PerformanceMetrics> = {};
    const monthly: Record<string, PerformanceMetrics> = {};

    // Group trades by time intervals
    this.trades.forEach(trade => {
      const date = trade.timestamp;
      
      // Hourly
      const hourKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:00`;
      if (!hourly[hourKey]) {
        hourly[hourKey] = this.calculateMetrics({ trades: [trade] });
      }
      
      // Daily
      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!daily[dayKey]) {
        daily[dayKey] = this.calculateMetrics({ trades: [trade] });
      }
      
      // Weekly
      const weekNumber = this.getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber}`;
      if (!weekly[weekKey]) {
        weekly[weekKey] = this.calculateMetrics({ trades: [trade] });
      }
      
      // Monthly
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = this.calculateMetrics({ trades: [trade] });
      }
    });

    // Calculate session-based metrics
    const asianTrades = this.trades.filter(t => {
      const hour = t.timestamp.getUTCHours();
      return hour >= 0 && hour < 8; // Asian session
    });
    
    const londonTrades = this.trades.filter(t => {
      const hour = t.timestamp.getUTCHours();
      return hour >= 8 && hour < 16; // London session
    });
    
    const newYorkTrades = this.trades.filter(t => {
      const hour = t.timestamp.getUTCHours();
      return hour >= 16 || hour < 0; // New York session
    });

    return {
      hourly,
      daily,
      weekly,
      monthly,
      session: {
        asian: this.calculateMetrics({ trades: asianTrades }),
        london: this.calculateMetrics({ trades: londonTrades }),
        newYork: this.calculateMetrics({ trades: newYorkTrades })
      }
    };
  }

  // Calculate drawdown
  calculateDrawdown(trades: TradeRecord[]): DrawdownPoint[] {
    const drawdowns: DrawdownPoint[] = [];
    let peak = 0;
    let trough = 0;
    let currentDrawdown = 0;
    let drawdownStart: Date | null = null;

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate cumulative PnL
    let cumulativePnL = 0;
    const cumulativePnLs: number[] = [];

    for (const trade of sortedTrades) {
      cumulativePnL += trade.pnl;
      cumulativePnLs.push(cumulativePnL);

      if (cumulativePnL > peak) {
        peak = cumulativePnL;
        trough = cumulativePnL;
        if (drawdownStart) {
          drawdowns.push({
            peak: peak,
            trough: trough,
            drawdown: currentDrawdown,
            recovery: 0,
            startDate: drawdownStart,
            endDate: trade.timestamp
          });
          drawdownStart = null;
        }
      } else if (cumulativePnL < trough) {
        trough = cumulativePnL;
        currentDrawdown = ((peak - trough) / Math.abs(peak)) * 100;
        if (!drawdownStart) {
          drawdownStart = trade.timestamp;
        }
      }
    }

    // Handle ongoing drawdown
    if (drawdownStart) {
      drawdowns.push({
        peak,
        trough,
        drawdown: currentDrawdown,
        recovery: 0,
        startDate: drawdownStart
      });
    }

    return drawdowns;
  }

  calculateMaxDrawdown(trades: TradeRecord[]): number {
    const drawdowns = this.calculateDrawdown(trades);
    return drawdowns.length > 0 
      ? Math.max(...drawdowns.map(d => d.drawdown))
      : 0;
  }

  // Fee analysis
  analyzeFees(): FeeAnalysis {
    const totalFees = this.trades.reduce((sum, t) => sum + t.fees.total, 0);
    const makerFees = this.trades.reduce((sum, t) => sum + t.fees.maker, 0);
    const takerFees = this.trades.reduce((sum, t) => sum + t.fees.taker, 0);
    const totalVolume = this.trades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);
    
    // Calculate cumulative fees over time
    const sortedTrades = [...this.trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const cumulativeFees = [];
    let cumulativeFee = 0;
    
    for (const trade of sortedTrades) {
      cumulativeFee += trade.fees.total;
      cumulativeFees.push({
        date: trade.timestamp,
        fees: cumulativeFee
      });
    }

    return {
      totalFees,
      makerFees,
      takerFees,
      feePercentageOfVolume: totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0,
      cumulativeFees
    };
  }

  // Order type performance analysis
  analyzeOrderTypes(): Map<string, PerformanceMetrics> {
    const orderTypes = new Set(this.trades.map(t => t.orderType));
    const results = new Map<string, PerformanceMetrics>();
    
    for (const orderType of orderTypes) {
      const typeTrades = this.trades.filter(t => t.orderType === orderType);
      if (orderType) results.set(orderType, this.calculateMetrics({ trades: typeTrades }));
    }
    
    return results;
  }

  // Symbol performance analysis
//   analyzeSymbols(): Map<string, PerformanceMetrics> {
//     const symbols = new Set(this.trades.map(t => t.symbol));
//     const results = new Map<string, PerformanceMetrics>();
    
//     for (const symbol of symbols) {
//       const symbolTrades = this.trades.filter(t => t.symbol === symbol);
//       results.set(symbol, this.calculateMetrics({ trades: symbolTrades }));
//     }
    
//     return results;
//   }

  // Helper methods
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      totalVolume: 0,
      totalFees: 0,
      averageTradeDuration: 0,
      longShortRatio: 0,
      largestGain: 0,
      largestLoss: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      expectancy: 0
    };
  }
}