/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTrades, useMetrics, useIsLoading, useError, useIsEngineInitialized, useTradeStore } from '@/lib/stores/trade-store';
import { PerformanceMetrics, TradeFilters, TradeRecord } from '@/types';
import { useDemoStore } from '@/lib/stores/demo-store';
import { 
  MOCK_JOURNAL_TRADES,
  MOCK_PNL_OVERVIEW,
  MOCK_PERFORMANCE,
  MOCK_RECENT_TRADES,
  MOCK_DAILY_PNL,
  MOCK_EQUITY_CURVE,
  MOCK_FEE_BREAKDOWN,
  MOCK_LONG_SHORT,
  formatCurrency,
  formatPercent,
} from '@/lib/mock-data';

// Convert mock data to TradeRecord format
const convertMockToTradeRecord = (mockTrade: any): TradeRecord => ({
  id: mockTrade.id,
  timestamp: new Date(),
  symbol: mockTrade.symbol,
  side: mockTrade.side,
  entryPrice: mockTrade.entryPrice || 0,
  exitPrice: mockTrade.exitPrice || 0,
  quantity: mockTrade.size || 0,
  orderType: 'limit',
  fees: { maker: 0, taker: 0, total: 0 },
  pnl: mockTrade.pnl,
  pnlPercentage: mockTrade.pnlPercent,
  duration: 60,
  status: mockTrade.pnl > 0 ? 'win' : mockTrade.pnl < 0 ? 'loss' : 'breakeven',
  clientId: 'demo-client',
  instrId: 1,
  notes: mockTrade.notes,
});

// Mock metrics
const MOCK_METRICS: PerformanceMetrics = {
  totalTrades: MOCK_JOURNAL_TRADES.length,
  winningTrades: MOCK_JOURNAL_TRADES.filter(t => t.pnl > 0).length,
  losingTrades: MOCK_JOURNAL_TRADES.filter(t => t.pnl < 0).length,
  winRate: MOCK_PERFORMANCE.winRate,
  totalPnL: MOCK_PNL_OVERVIEW.total,
  totalVolume: 10000,
  totalFees: MOCK_FEE_BREAKDOWN.reduce((sum, fee) => sum + fee.amount, 0),
  averageTradeDuration: 60,
  longShortRatio: MOCK_LONG_SHORT.long / MOCK_LONG_SHORT.short,
  largestGain: Math.max(...MOCK_JOURNAL_TRADES.map(t => t.pnl)),
  largestLoss: Math.min(...MOCK_JOURNAL_TRADES.map(t => t.pnl)),
  averageWin: MOCK_PERFORMANCE.avgWin,
  averageLoss: MOCK_PERFORMANCE.avgLoss,
  profitFactor: MOCK_PERFORMANCE.profitFactor,
  maxDrawdown: 5.2,
  expectancy: 24.3,
};


export function useTradeData() {
  const { publicKey, connected } = useWallet();
   const { isDemoMode } = useDemoStore();
   
  // Zustand selectors
  const trades = useTrades();
  const metrics = useMetrics();
  const isLoading = useIsLoading();
  const error = useError();
  const isEngineInitialized = useIsEngineInitialized();
  
  // Zustand actions
  const {
    initializeFetcher,
    fetchAllTrades,
    fetchInstrumentTrades,
    refreshTrades,
    setFilters,
    clearFilters,
    applyFilters,
    calculateMetrics,
    exportToCSV,
    clearCache,
    clearError,
    resetStore,
  } = useTradeStore();

  // Initialize when wallet connects
  useEffect(() => {
    if (connected && publicKey && !isEngineInitialized) {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
      const programId = process.env.NEXT_PUBLIC_DERIVERSE_PROGRAM_ID || '';
      const version = Number(process.env.NEXT_PUBLIC_DERIVERSE_VERSION) || 1;
      
      initializeFetcher(rpcUrl, programId, version, publicKey);
    } else if (!connected) {
      // Reset store when wallet disconnects
      resetStore();
    }
  }, [connected, publicKey, isEngineInitialized, initializeFetcher, resetStore]);

  // Wrapper functions
  const handleFetchTrades = useCallback(async () => {
    try {
      return await fetchAllTrades();
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      throw err;
    }
  }, [fetchAllTrades]);

  const handleFetchInstrumentTrades = useCallback(async (instrId: number) => {
    try {
      return await fetchInstrumentTrades(instrId);
    } catch (err) {
      console.error(`Failed to fetch instrument ${instrId} trades:`, err);
      throw err;
    }
  }, [fetchInstrumentTrades]);

  const handleRefreshTrades = useCallback(async () => {
    try {
      await refreshTrades();
    } catch (err) {
      console.error('Failed to refresh trades:', err);
      throw err;
    }
  }, [refreshTrades]);

  const handleSetFilters = useCallback((filters: Partial<TradeFilters>) => {
    setFilters(filters);
  }, [setFilters]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const handleApplyFilters = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  const handleCalculateMetrics = useCallback((filters?: TradeFilters) => {
    return calculateMetrics(filters);
  }, [calculateMetrics]);

  const handleExportToCSV = useCallback((filters?: TradeFilters) => {
    return exportToCSV(filters);
  }, [exportToCSV]);

  const handleClearCache = useCallback(() => {
    clearCache();
  }, [clearCache]);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  // Get additional state from store
  const store = useTradeStore();
  
  // Demo mode data
  const demoData = useMemo(() => {
    const mockTrades = MOCK_JOURNAL_TRADES.map(convertMockToTradeRecord);
    
    return {
      trades: mockTrades,
      filteredTrades: mockTrades,
      metrics: MOCK_METRICS,
      timeMetrics: null,
      feeAnalysis: null,
      drawdownAnalysis: [],
      loading: false,
      isFetching: false,
      error: null,
      lastUpdated: new Date(),
      filters: {},
      isInitialized: true,
      hasTrades: true,
      totalTrades: mockTrades.length,
      filteredTradesCount: mockTrades.length,
      
      // Actions that work with mock data
      fetchTrades: async () => mockTrades,
      fetchInstrumentTrades: async () => [],
      refreshTrades: async () => {},
      setFilters: () => {},
      clearFilters: () => {},
      applyFilters: () => {},
      getPerformanceMetrics: () => MOCK_METRICS,
      exportToCSV: () => '',
      clearCache: () => {},
      clearError: () => {},
      resetStore: () => {},
      
      // Additional mock data for UI components
      mockData: {
        dailyPnl: MOCK_DAILY_PNL,
        equityCurve: MOCK_EQUITY_CURVE,
        pnlOverview: MOCK_PNL_OVERVIEW,
        performance: MOCK_PERFORMANCE,
        recentTrades: MOCK_RECENT_TRADES,
        feeBreakdown: MOCK_FEE_BREAKDOWN,
        longShort: MOCK_LONG_SHORT,
        journalTrades: MOCK_JOURNAL_TRADES,
        formatCurrency,
        formatPercent,
      },
    };
  }, []);

  // Return appropriate data based on mode
  if (isDemoMode) {
    return demoData;
  }

  return {
    // Data
    trades,
    filteredTrades: store.filteredTrades,
    metrics,
    timeMetrics: store.timeMetrics,
    feeAnalysis: store.feeAnalysis,
    drawdownAnalysis: store.drawdownAnalysis,
    
    // UI State
    loading: isLoading,
    isFetching: store.isFetching,
    error,
    lastUpdated: store.lastUpdated,
    
    // Filters
    filters: store.filters,
    
    // Engine State
    isInitialized: isEngineInitialized,
    
    // Actions
    fetchTrades: handleFetchTrades,
    fetchInstrumentTrades: handleFetchInstrumentTrades,
    refreshTrades: handleRefreshTrades,
    setFilters: handleSetFilters,
    clearFilters: handleClearFilters,
    applyFilters: handleApplyFilters,
    getPerformanceMetrics: handleCalculateMetrics,
    exportToCSV: handleExportToCSV,
    clearCache: handleClearCache,
    clearError: handleClearError,
    resetStore,
    
    // Additional utilities
    hasTrades: trades.length > 0,
    totalTrades: trades.length,
    filteredTradesCount: store.filteredTrades.length,
  };
}