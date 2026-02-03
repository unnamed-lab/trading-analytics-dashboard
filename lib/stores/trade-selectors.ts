import { useTradeStore } from './trade-store';
// import { useFilterStore } from './filter-store';

// Dashboard metrics selector
export const useDashboardMetrics = () => {
  const metrics = useTradeStore((state) => state.metrics);
//   const { timeframe } = useFilterStore();

  if (!metrics) {
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

  // Apply timeframe filter logic here if needed
  return {
    totalTrades: metrics.totalTrades,
    winRate: metrics.winRate,
    totalPnL: metrics.totalPnL,
    profitFactor: metrics.profitFactor,
    maxDrawdown: metrics.maxDrawdown,
    averageTradeDuration: metrics.averageTradeDuration,
    largestGain: metrics.largestGain,
    largestLoss: metrics.largestLoss,
    longShortRatio: metrics.longShortRatio,
    averageWin: metrics.averageWin,
    averageLoss: metrics.averageLoss,
  };
};

// Trade table data selector
export const useTradeTableData = () => {
  const filteredTrades = useTradeStore((state) => state.filteredTrades);
  
  return filteredTrades.slice(0, 10).map((trade) => ({
    id: trade.id,
    date: trade.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: trade.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    symbol: trade.symbol || `INSTR_${trade.instrId}`,
    side: trade.side,
    entry: trade.entryPrice.toFixed(4),
    exit: trade.exitPrice.toFixed(4),
    quantity: trade.quantity.toFixed(4),
    pnl: trade.pnl,
    pnlPercent: trade.pnlPercentage,
    status: trade.status,
    duration: trade.duration,
    type: trade.orderType,
    notes: trade.notes,
  }));
};

// PnL chart data selector
export const usePnLChartData = () => {
  const filteredTrades = useTradeStore((state) => state.filteredTrades);
//   const { timeframe } = useFilterStore();
  
  if (filteredTrades.length === 0) {
    return [];
  }

  // Sort by date and calculate cumulative PnL
  const sortedTrades = [...filteredTrades].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  let cumulativePnL = 0;
  return sortedTrades.map((trade, index) => {
    // eslint-disable-next-line react-hooks/immutability
    cumulativePnL += trade.pnl;
    return {
      date: trade.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: trade.timestamp,
      pnl: trade.pnl,
      cumulativePnL,
      tradeCount: index + 1,
    };
  });
};

// Equity curve data selector
export const useEquityCurveData = () => {
  const pnlData = usePnLChartData();
  
  if (pnlData.length === 0) {
    return [];
  }

  // Start with initial equity of 10000 and add PnL
  let equity = 10000;
  return pnlData.map((data, index) => {
    // eslint-disable-next-line react-hooks/immutability
    equity += data.pnl;
    return {
      date: index === 0 || index === pnlData.length - 1 || index % Math.max(1, Math.floor(pnlData.length / 6)) === 0 
        ? data.date 
        : '',
      value: equity,
      pnl: data.pnl,
    };
  });
};

// Fee analysis selector
export const useFeeAnalysisData = () => {
  const feeAnalysis = useTradeStore((state) => state.feeAnalysis);
  
  if (!feeAnalysis) {
    return [];
  }

  return [
    { type: 'Maker', amount: feeAnalysis.makerFees },
    { type: 'Taker', amount: feeAnalysis.takerFees },
    { type: 'Total', amount: feeAnalysis.totalFees },
  ];
};

// Long/Short ratio selector
export const useLongShortData = () => {
  const filteredTrades = useTradeStore((state) => state.filteredTrades);
  
  if (filteredTrades.length === 0) {
    return { long: 50, short: 50 };
  }

  const longTrades = filteredTrades.filter(t => t.side === 'long').length;
  const shortTrades = filteredTrades.filter(t => t.side === 'short').length;
  const total = longTrades + shortTrades;
  
  return {
    long: total > 0 ? Math.round((longTrades / total) * 100) : 50,
    short: total > 0 ? Math.round((shortTrades / total) * 100) : 50,
  };
};

// Performance metrics selector
export const usePerformanceMetricsData = () => {
  const metrics = useTradeStore((state) => state.metrics);
  
  if (!metrics) {
    return {
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
    };
  }

  return {
    winRate: metrics.winRate,
    avgWin: metrics.averageWin,
    avgLoss: metrics.averageLoss,
    profitFactor: metrics.profitFactor,
  };
};

// PnL Overview selector
export const usePnLOverviewData = () => {
  const filteredTrades = useTradeStore((state) => state.filteredTrades);
  const metrics = useTradeStore((state) => state.metrics);
  
  if (filteredTrades.length === 0 || !metrics) {
    return {
      total: 0,
      realized: 0,
      unrealized: 0,
      roiPercent: 0,
      dailyChange: 0,
    };
  }

  // Calculate realized vs unrealized (simplified)
  const realizedTrades = filteredTrades.filter(t => t.status !== 'breakeven');
  const realized = realizedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const total = metrics.totalPnL;
  const unrealized = total - realized;
  
  // Calculate ROI percentage (assuming starting capital of 10000)
  const roiPercent = (total / 10000) * 100;
  
  // Calculate daily change (simplified)
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdayTrades = filteredTrades.filter(t => 
    t.timestamp.getDate() === yesterday.getDate() &&
    t.timestamp.getMonth() === yesterday.getMonth() &&
    t.timestamp.getFullYear() === yesterday.getFullYear()
  );
  
  const todayTrades = filteredTrades.filter(t => 
    t.timestamp.getDate() === today.getDate() &&
    t.timestamp.getMonth() === today.getMonth() &&
    t.timestamp.getFullYear() === today.getFullYear()
  );
  
  const yesterdayPnL = yesterdayTrades.reduce((sum, t) => sum + t.pnl, 0);
  const todayPnL = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
  const dailyChange = yesterdayPnL !== 0 ? ((todayPnL - yesterdayPnL) / Math.abs(yesterdayPnL)) * 100 : 0;

  return {
    total,
    realized,
    unrealized,
    roiPercent,
    dailyChange,
  };
};

// Daily PnL data selector
export const useDailyPnLData = () => {
  const filteredTrades = useTradeStore((state) => state.filteredTrades);
  
  if (filteredTrades.length === 0) {
    return [];
  }

  // Group trades by day
  const dailyData = new Map<string, number>();
  
  filteredTrades.forEach(trade => {
    const dateKey = trade.timestamp.toLocaleDateString('en-US', { weekday: 'short' });
    dailyData.set(dateKey, (dailyData.get(dateKey) || 0) + trade.pnl);
  });

  // Ensure we have data for all days of the week
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    date: day,
    pnl: dailyData.get(day) || 0,
  }));
};