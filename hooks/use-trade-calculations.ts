// hooks/use-trade-calculations.ts
import { useMemo } from 'react';
import { TradeRecord } from '@/types';
import { JournalTrade } from '@/lib/mock-data';

export function useTradeCalculations(trades: TradeRecord[]) {
  // Transform TradeRecord to JournalTrade format
  const journalTrades = useMemo((): JournalTrade[] => {
    return trades.map((trade, index) => ({
      // eslint-disable-next-line react-hooks/purity
      id: trade.id || `trade-${index}-${Date.now()}`,
      symbol: trade.symbol || 'UNKNOWN',
      side: trade.side === 'buy' || trade.side === 'long' ? 'long' : 'short',
      entryPrice: trade.entryPrice || 0,
      exitPrice: trade.exitPrice || 0,
      size: trade.quantity || 0,
      pnl: trade.pnl || 0,
      pnlPercent: trade.pnlPercentage || 0,
      time: trade.timestamp?.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) || '00:00',
      date: trade.timestamp?.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }) || '01-Jan-2024',
      setup: trade.notes || 'Market',
    }));
  }, [trades]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'win' || t.status === 'loss');
    const winningTrades = trades.filter(t => t.status === 'win');
    const losingTrades = trades.filter(t => t.status === 'loss');
    
    const winRate = closedTrades.length > 0 
      ? (winningTrades.length / closedTrades.length) * 100 
      : 0;
    
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    return { winRate, avgWin, avgLoss, profitFactor };
  }, [trades]);

  // PnL Overview
  const pnlOverview = useMemo(() => {
    const total = trades.reduce((sum, t) => sum + t.pnl, 0);
    const realized = trades
      .filter(t => t.status === 'win' || t.status === 'loss')
      .reduce((sum, t) => sum + t.pnl, 0);
    const unrealized = total - realized;
    const startingCapital = 10000;
    const roiPercent = startingCapital > 0 ? (total / startingCapital) * 100 : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayPnL = trades
      .filter(t => {
        const tradeDate = new Date(t.timestamp);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === today.getTime();
      })
      .reduce((sum, t) => sum + t.pnl, 0);
      
    const yesterdayPnL = trades
      .filter(t => {
        const tradeDate = new Date(t.timestamp);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === yesterday.getTime();
      })
      .reduce((sum, t) => sum + t.pnl, 0);
    
    const dailyChange = yesterdayPnL !== 0 
      ? ((todayPnL - yesterdayPnL) / Math.abs(yesterdayPnL)) * 100 
      : todayPnL > 0 ? 100 : todayPnL < 0 ? -100 : 0;

    return { total, realized, unrealized, roiPercent, dailyChange };
  }, [trades]);

  // Long/Short ratio
  const longShortRatio = useMemo(() => {
    const longTrades = trades.filter(t => t.side === 'long' || t.side === 'buy').length;
    const shortTrades = trades.filter(t => t.side === 'short' || t.side === 'sell').length;
    const total = longTrades + shortTrades;
    
    return {
      long: total > 0 ? Math.round((longTrades / total) * 100) : 50,
      short: total > 0 ? Math.round((shortTrades / total) * 100) : 50,
    };
  }, [trades]);

  // Equity curve
  const equityCurveData = useMemo(() => {
    if (trades.length === 0) return [];
    
    const sortedTrades = [...trades]
      .filter(t => t.status === 'win' || t.status === 'loss')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    let runningEquity = 10000;
    return sortedTrades.map((trade, index) => {
      runningEquity += trade.pnl;
      return {
        date: trade.timestamp.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        value: Math.max(0, runningEquity),
        pnl: trade.pnl,
      };
    });
  }, [trades]);

  // Daily PnL
  const dailyPnLData = useMemo(() => {
    if (trades.length === 0) return [];
    
    const dailyMap = new Map<string, number>();
    trades.forEach(trade => {
      const dateKey = trade.timestamp.toLocaleDateString('en-US', { 
        weekday: 'short' 
      });
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + trade.pnl);
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      date: day,
      pnl: dailyMap.get(day) || 0,
    }));
  }, [trades]);

  // Fee analysis
  const feeAnalysisData = useMemo(() => {
    const makerFees = trades.reduce((sum, t) => sum + (t.fees?.maker || 0), 0);
    const takerFees = trades.reduce((sum, t) => sum + (t.fees?.taker || 0), 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.fees?.total || 0), 0);
    const rebates = trades.reduce((sum, t) => sum + (t.fees?.rebates || 0), 0);
    
    return [
      { type: 'Maker Fees', amount: makerFees },
      { type: 'Taker Fees', amount: takerFees },
      { type: 'Rebates', amount: rebates },
      { type: 'Total Fees', amount: totalFees },
    ].filter(item => item.amount !== 0);
  }, [trades]);

  // Dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        averageTradeDuration: 0,
        largestGain: 0,
        largestLoss: 0,
        longShortRatio: 0,
        averageWin: 0,
        averageLoss: 0,
      };
    }

    const winningTrades = trades.filter(t => t.status === 'win');
    const losingTrades = trades.filter(t => t.status === 'loss');
    
    const largestGain = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(t => t.pnl)) 
      : 0;
    
    const largestLoss = losingTrades.length > 0 
      ? Math.min(...losingTrades.map(t => t.pnl)) 
      : 0;

    const longTrades = trades.filter(t => t.side === 'long' || t.side === 'buy').length;
    const shortTrades = trades.filter(t => t.side === 'short' || t.side === 'sell').length;
    const totalSideTrades = longTrades + shortTrades;

    return {
      totalTrades: trades.length,
      winRate: performanceMetrics.winRate,
      totalPnL: trades.reduce((sum, t) => sum + t.pnl, 0),
      profitFactor: performanceMetrics.profitFactor,
      maxDrawdown: 0,
      averageTradeDuration: 0,
      largestGain,
      largestLoss,
      longShortRatio: totalSideTrades > 0 ? (longTrades / totalSideTrades) * 100 : 0,
      averageWin: performanceMetrics.avgWin,
      averageLoss: performanceMetrics.avgLoss,
    };
  }, [trades, performanceMetrics]);

  return {
    journalTrades,
    recentTrades: journalTrades.slice(0, 5),
    performanceMetrics,
    pnlOverview,
    longShortRatio,
    equityCurveData,
    dailyPnLData,
    feeAnalysisData,
    dashboardMetrics,
  };
}