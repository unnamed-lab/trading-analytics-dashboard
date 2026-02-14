// lib/stores/trade-selectors.ts
import { useTradeData } from '@/hooks/use-trade-data';
import { useUIStore } from './trade-store';
import { MOCK_JOURNAL_TRADES } from '@/lib/mock-data';

// These selectors now use React Query directly
export const useTradeTableData = () => {
  const { isDemoMode } = useUIStore();
  const { journalTrades } = useTradeData();
  
  if (isDemoMode) return MOCK_JOURNAL_TRADES;
  
  return journalTrades.slice(0, 10).map((trade) => ({
    id: trade.id,
    date: trade.time,
    time: trade.time,
    symbol: trade.symbol,
    side: trade.side,
    entry: trade.entryPrice.toFixed(4),
    exit: trade.exitPrice.toFixed(4),
    quantity: trade.size,
    pnl: trade.pnl,
    pnlPercent: trade.pnlPercent,
    status: trade.pnl >= 0 ? 'win' : 'loss',
    duration: 0,
    type: 'market',
    notes: trade.setup,
  }));
};

export const usePerformanceMetricsData = () => {
  const { isDemoMode } = useUIStore();
  const { performanceMetrics } = useTradeData();
  
  if (isDemoMode) return MOCK_DATA.performanceMetrics;
  
  return {
    winRate: Number(performanceMetrics.winRate.toFixed(1)),
    avgWin: Number(performanceMetrics.avgWin.toFixed(2)),
    avgLoss: Number(performanceMetrics.avgLoss.toFixed(2)),
    profitFactor: Number(performanceMetrics.profitFactor.toFixed(2)),
  };
};

export const usePnLOverviewData = () => {
  const { isDemoMode } = useUIStore();
  const { pnlOverview } = useTradeData();
  
  if (isDemoMode) return MOCK_DATA.pnlOverview;
  
  return {
    total: Number(pnlOverview.total.toFixed(2)),
    realized: Number(pnlOverview.realized.toFixed(2)),
    unrealized: Number(pnlOverview.unrealized.toFixed(2)),
    roiPercent: Number(pnlOverview.roiPercent.toFixed(2)),
    dailyChange: Number(pnlOverview.dailyChange.toFixed(2)),
  };
};

export const useLongShortData = () => {
  const { isDemoMode } = useUIStore();
  const { longShortRatio } = useTradeData();
  
  return isDemoMode ? MOCK_DATA.longShort : longShortRatio;
};

export const useEquityCurveData = () => {
  const { isDemoMode } = useUIStore();
  const { equityCurveData } = useTradeData();
  
  return isDemoMode ? MOCK_DATA.equityCurve : equityCurveData;
};

export const useDailyPnLData = () => {
  const { isDemoMode } = useUIStore();
  const { dailyPnLData } = useTradeData();
  
  return isDemoMode ? MOCK_DATA.dailyPnL : dailyPnLData;
};

export const useFeeAnalysisData = () => {
  const { isDemoMode } = useUIStore();
  const { feeAnalysisData } = useTradeData();
  
  return isDemoMode ? MOCK_DATA.feeBreakdown : feeAnalysisData;
};

export const useDashboardMetrics = () => {
  const { isDemoMode } = useUIStore();
  const { dashboardMetrics } = useTradeData();
  
  return isDemoMode ? MOCK_DATA.dashboardMetrics : dashboardMetrics;
};