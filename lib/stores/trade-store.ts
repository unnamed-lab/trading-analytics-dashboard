import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { TradeDataFetcher } from '@/services/trader-data-fetch';
import { PerformanceAnalyzer } from '@/lib/analyzers/performance-analyzer';
import { TradeFilters } from '@/types';
import { TradeState, TradeStore } from './trade-store.types';
import { PublicKey } from '@solana/web3.js';

const initialState: TradeState = {
  trades: [],
  filteredTrades: [],
  metrics: null,
  timeMetrics: null,
  feeAnalysis: null,
  drawdownAnalysis: [],
  isLoading: false,
  isFetching: false,
  error: null,
  lastUpdated: null,
  filters: {},
  fetcher: null,
  isEngineInitialized: false,
};

export const useTradeStore = create<TradeStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Initialize fetcher and engine
        initializeFetcher: async (rpcUrl: string, programId: string, version: number, publicKey: PublicKey) => {
          if (!publicKey) {
            set({ error: 'Wallet not connected' });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const fetcher = new TradeDataFetcher(rpcUrl, programId, version);
            await fetcher.initializeEngine(publicKey);
            
            set({
              fetcher,
              isEngineInitialized: true,
              isLoading: false,
              error: null,
            });

            console.log('Fetcher initialized successfully');
          } catch (error) {
            console.error('Failed to initialize fetcher:', error);
            set({
              error: error instanceof Error ? error.message : 'Failed to initialize trading engine',
              isLoading: false,
              isEngineInitialized: false,
            });
          }
        },

        // Fetch all trades
        fetchAllTrades: async () => {
          const { fetcher, isEngineInitialized } = get();
          
          if (!fetcher || !isEngineInitialized) {
            const error = 'Trading engine not initialized';
            set({ error });
            throw new Error(error);
          }

          set({ isFetching: true, error: null });

          try {
            const trades = await fetcher.fetchAllTrades();
            
            // Calculate all metrics
            const analyzer = new PerformanceAnalyzer(trades);
            const metrics = analyzer.calculateMetrics();
            const timeMetrics = analyzer.calculateTimeBasedMetrics();
            const feeAnalysis = analyzer.analyzeFees();
            const drawdownAnalysis = analyzer.calculateDrawdown(trades);
            
            set({
              trades,
              filteredTrades: trades,
              metrics,
              timeMetrics,
              feeAnalysis,
              drawdownAnalysis,
              lastUpdated: new Date(),
              isFetching: false,
            });

            return trades;
          } catch (error) {
            console.error('Error fetching trades:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch trades';
            set({ error: errorMessage, isFetching: false });
            throw error;
          }
        },

        // Fetch trades for specific instrument
        fetchInstrumentTrades: async (instrId: number) => {
          const { fetcher, isEngineInitialized, trades } = get();
          
          if (!fetcher || !isEngineInitialized) {
            throw new Error('Trading engine not initialized');
          }

          set({ isFetching: true, error: null });

          try {
            const instrumentTrades = await fetcher['fetchTradesForInstrument'](instrId);
            
            // Merge with existing trades, removing duplicates
            const allTrades = [...trades, ...instrumentTrades].filter(
              (trade, index, self) => index === self.findIndex(t => t.id === trade.id)
            );

            // Recalculate metrics
            const analyzer = new PerformanceAnalyzer(allTrades);
            const metrics = analyzer.calculateMetrics();
            const timeMetrics = analyzer.calculateTimeBasedMetrics();
            const feeAnalysis = analyzer.analyzeFees();
            const drawdownAnalysis = analyzer.calculateDrawdown(allTrades);
            
            set({
              trades: allTrades,
              filteredTrades: allTrades,
              metrics,
              timeMetrics,
              feeAnalysis,
              drawdownAnalysis,
              lastUpdated: new Date(),
              isFetching: false,
            });

            return instrumentTrades;
          } catch (error) {
            console.error('Error fetching instrument trades:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch instrument trades';
            set({ error: errorMessage, isFetching: false });
            throw error;
          }
        },

        // Refresh trades (re-fetch all)
        refreshTrades: async () => {
          await get().fetchAllTrades();
        },

        // Set filters
        setFilters: (newFilters: Partial<TradeFilters>) => {
          const currentFilters = get().filters;
          const updatedFilters = { ...currentFilters, ...newFilters };
          
          set({ filters: updatedFilters });
          
          // Auto-apply filters if we have trades
          if (get().trades.length > 0) {
            get().applyFilters();
          }
        },

        // Clear all filters
        clearFilters: () => {
          set({ 
            filters: {},
            filteredTrades: get().trades,
            metrics: get().metrics,
          });
        },

        // Apply current filters to trades
        applyFilters: () => {
          const { trades, filters, fetcher } = get();
          
          if (!fetcher || trades.length === 0) {
            return;
          }

          // Get filtered trades
          const filteredTrades = fetcher.getFilteredTrades(filters);
          
          // Calculate metrics for filtered trades
          const analyzer = new PerformanceAnalyzer(filteredTrades);
          const metrics = analyzer.calculateMetrics();
          const timeMetrics = analyzer.calculateTimeBasedMetrics();
          const feeAnalysis = analyzer.analyzeFees();
          const drawdownAnalysis = analyzer.calculateDrawdown(filteredTrades);
          
          set({
            filteredTrades,
            metrics,
            timeMetrics,
            feeAnalysis,
            drawdownAnalysis,
          });
        },

        // Calculate metrics with optional custom filters
        calculateMetrics: (customFilters?: TradeFilters) => {
          const { trades, fetcher } = get();
          
          if (!fetcher || trades.length === 0) {
            return null;
          }

          const filtersToUse = customFilters || get().filters;
          const tradesToAnalyze = filtersToUse 
            ? fetcher.getFilteredTrades(filtersToUse)
            : trades;

          const analyzer = new PerformanceAnalyzer(tradesToAnalyze);
          return analyzer.calculateMetrics();
        },

        // Calculate time-based metrics
        calculateTimeMetrics: () => {
          const { trades } = get();
          
          if (trades.length === 0) {
            return null;
          }

          const analyzer = new PerformanceAnalyzer(trades);
          return analyzer.calculateTimeBasedMetrics();
        },

        // Calculate fee analysis
        calculateFeeAnalysis: () => {
          const { trades } = get();
          
          if (trades.length === 0) {
            return null;
          }

          const analyzer = new PerformanceAnalyzer(trades);
          return analyzer.analyzeFees();
        },

        // Calculate drawdown analysis
        calculateDrawdownAnalysis: (customFilters?: TradeFilters) => {
          const { trades, fetcher } = get();
          
          if (!fetcher || trades.length === 0) {
            return [];
          }

          const filtersToUse = customFilters || get().filters;
          const tradesToAnalyze = filtersToUse 
            ? fetcher.getFilteredTrades(filtersToUse)
            : trades;

          const analyzer = new PerformanceAnalyzer(tradesToAnalyze);
          return analyzer.calculateDrawdown(tradesToAnalyze);
        },

        // Export to CSV
        exportToCSV: (customFilters?: TradeFilters) => {
          const { fetcher } = get();
          
          if (!fetcher) {
            return '';
          }

          const filtersToUse = customFilters || get().filters;
          return fetcher.exportToCSV(filtersToUse);
        },

        // Export to JSON
        exportToJSON: (customFilters?: TradeFilters) => {
          const { trades, fetcher } = get();
          
          if (!fetcher || trades.length === 0) {
            return '[]';
          }

          const filtersToUse = customFilters || get().filters;
          const tradesToExport = filtersToUse 
            ? fetcher.getFilteredTrades(filtersToUse)
            : trades;

          return JSON.stringify(tradesToExport, null, 2);
        },

        // Clear cache and reset data
        clearCache: () => {
          const { fetcher } = get();
          
          if (fetcher) {
            fetcher.clearCache();
          }
          
          set({
            trades: [],
            filteredTrades: [],
            metrics: null,
            timeMetrics: null,
            feeAnalysis: null,
            drawdownAnalysis: [],
            lastUpdated: null,
          });
        },

        // Clear error
        clearError: () => {
          set({ error: null });
        },

        // Reset entire store
        resetStore: () => {
          const { fetcher } = get();
          
          if (fetcher) {
            fetcher.clearCache();
          }
          
          set(initialState);
        },
      }),
      {
        name: 'trade-store',
        partialize: (state) => ({
          // Only persist these fields
          trades: state.trades,
          filters: state.filters,
          lastUpdated: state.lastUpdated,
        }),
      }
    ),
    {
      name: 'TradeStore',
      enabled: process.env.NODE_ENV !== 'production', // Only enable devtools in development
    }
  )
);

// Selector hooks for better performance
export const useTrades = () => useTradeStore((state) => state.trades);
export const useFilteredTrades = () => useTradeStore((state) => state.filteredTrades);
export const useMetrics = () => useTradeStore((state) => state.metrics);
export const useTimeMetrics = () => useTradeStore((state) => state.timeMetrics);
export const useFeeAnalysis = () => useTradeStore((state) => state.feeAnalysis);
export const useDrawdownAnalysis = () => useTradeStore((state) => state.drawdownAnalysis);
export const useIsLoading = () => useTradeStore((state) => state.isLoading);
export const useIsFetching = () => useTradeStore((state) => state.isFetching);
export const useError = () => useTradeStore((state) => state.error);
export const useFilters = () => useTradeStore((state) => state.filters);
export const useIsEngineInitialized = () => useTradeStore((state) => state.isEngineInitialized);