/* eslint-disable @typescript-eslint/no-explicit-any */
import { TradeRecord, TradeFilters, PerformanceMetrics, TimeBasedMetrics, FeeAnalysis, DrawdownPoint } from '@/types';
import { PublicKey } from '@solana/web3.js';

export interface TradeState {
  // Data
  trades: TradeRecord[];
  filteredTrades: TradeRecord[];
  metrics: PerformanceMetrics | null;
  timeMetrics: TimeBasedMetrics | null;
  feeAnalysis: FeeAnalysis | null;
  drawdownAnalysis: DrawdownPoint[];
  
  // UI State
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Filters
  filters: TradeFilters;
  
  // Engine/Fetcher
  fetcher: any | null;
  isEngineInitialized: boolean;
}

export interface TradeActions {
  // Initialization
  initializeFetcher: (rpcUrl: string, programId: string, version: number, publicKey: PublicKey) => Promise<void>;
  
  // Data Fetching
  fetchAllTrades: () => Promise<TradeRecord[]>;
  fetchInstrumentTrades: (instrId: number) => Promise<TradeRecord[]>;
  refreshTrades: () => Promise<void>;
  
  // Filtering
  setFilters: (filters: Partial<TradeFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
  // Analysis
  calculateMetrics: (customFilters?: TradeFilters) => PerformanceMetrics | null;
  calculateTimeMetrics: () => TimeBasedMetrics | null;
  calculateFeeAnalysis: () => FeeAnalysis | null;
  calculateDrawdownAnalysis: (customFilters?: TradeFilters) => DrawdownPoint[];
  
  // Export
  exportToCSV: (customFilters?: TradeFilters) => string;
  exportToJSON: (customFilters?: TradeFilters) => string;
  
  // Cache Management
  clearCache: () => void;
  clearError: () => void;
  
  // Reset
  resetStore: () => void;
}

export type TradeStore = TradeState & TradeActions;