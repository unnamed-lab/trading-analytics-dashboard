// hooks/use-trade-queries.ts
import 'dotenv/config';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useEffect } from "react";
import { TransactionDataFetcher } from "@/services/fetch-data.service";
import { PnLCalculator } from "@/services/pnl-calculator.service";
import { TradeAnalyticsCalculator } from "@/services/trade-analytics.service";
import type { TradeRecord, FetchResult } from "@/types";

// ============================================
// Query Keys
// ============================================
export const tradeKeys = {
  all: ["trades"] as const,
  lists: () => [...tradeKeys.all, "list"] as const,
  list: (wallet?: string, filters?: Record<string, unknown>) =>
    [...tradeKeys.lists(), { wallet, ...filters }] as const,
  detail: (signature: string) =>
    [...tradeKeys.all, "detail", signature] as const,
  instrument: (instrumentId: number, wallet?: string) =>
    ["instrument", instrumentId, wallet] as const,
  summary: (wallet?: string) => ["summary", wallet] as const,
  stats: (wallet?: string) => ["stats", wallet] as const,
};
const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

// ============================================
// Fetcher Singleton Management
// ============================================
let fetcherInstance: TransactionDataFetcher | null = null;

const getFetcher = (rpcUrl: string, programId?: string) => {
  if (!fetcherInstance) {
    fetcherInstance = new TransactionDataFetcher(
      rpcUrl,
      programId || process.env.NEXT_PUBLIC_PROGRAM_ID,
      14, // version
      300, // delay
      1000, // max transactions
    );
  }
  return fetcherInstance;
};

// ============================================
// Core Hook with Auto-initialization
// ============================================
export const useTransactionFetcher = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const fetcher = useMemo(
    () => getFetcher(connection.rpcEndpoint),
    [connection.rpcEndpoint],
  );

  // Auto-initialize when wallet is connected
  useEffect(() => {
    if (publicKey) {
      fetcher.initialize(publicKey).catch((err) => {
        console.error("Failed to initialize fetcher:", err);
      });
    }
  }, [publicKey, fetcher]);

  return { fetcher, publicKey };
};

// ============================================
// Paginated Trades Query (Recommended for lists)
// ============================================
export const useTradesInfinite = (limit: number = 50) => {
  const { fetcher, publicKey } = useTransactionFetcher();

  return useInfiniteQuery({
    queryKey: tradeKeys.list(publicKey?.toString(), {
      type: "infinite",
      limit,
    }),
    queryFn: async ({ pageParam }): Promise<FetchResult> => {
      if (!publicKey) throw new Error("Wallet not connected");
      return fetcher.fetchTransactionsPaginated({
        limit,
        before: pageParam,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastSignature : undefined,
    enabled: !!publicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// ============================================
// All Trades Query (For smaller datasets)
// ============================================
export const useAllTrades = (options?: { enabled?: boolean }) => {
  const { fetcher, publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: tradeKeys.list(publicKey?.toString(), { type: "all" }),
    queryFn: async (): Promise<TradeRecord[]> => {
      if (!publicKey) throw new Error("Wallet not connected");
      return fetcher.fetchAllTransactions();
    },
    enabled: !!publicKey && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (data) =>
      data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
  });
};

// ============================================
// Instrument-Specific Trades
// ============================================
export const useInstrumentTrades = (instrumentId: number) => {
  const { fetcher, publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: tradeKeys.instrument(instrumentId, publicKey?.toString()),
    queryFn: async (): Promise<TradeRecord[]> => {
      if (!publicKey) throw new Error("Wallet not connected");
      return fetcher.fetchTradesForInstrument(instrumentId);
    },
    enabled: !!publicKey && instrumentId > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// Trade Summary Statistics
// ============================================
export const useTradeSummary = () => {
  const { data: trades = [] } = useAllTrades({ enabled: false });
  const { fetcher, publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: tradeKeys.summary(publicKey?.toString()),
    queryFn: () => {
      if (!fetcher) throw new Error("Fetcher not initialized");
      return fetcher.getSummary(trades);
    },
    enabled: trades.length > 0,
    staleTime: Infinity,
  });
};

// ============================================
// Refresh Mutation
// ============================================
export const useRefreshTrades = () => {
  const queryClient = useQueryClient();
  const { publicKey } = useTransactionFetcher();

  return useMutation({
    mutationFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");

      // Create new instance for fresh data
      fetcherInstance = null;
      const newFetcher = getFetcher(rpcEndpoint);
      await newFetcher.initialize(publicKey);
      return newFetcher.fetchAllTransactions();
    },
    onSuccess: (data) => {
      // Update all relevant queries
      queryClient.setQueryData(
        tradeKeys.list(publicKey?.toString(), { type: "all" }),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: tradeKeys.lists(),
      });
    },
  });
};

// ============================================
// Export Mutations
// ============================================
export const useExportTrades = () => {
  const { fetcher } = useTransactionFetcher();

  const exportToCSV = useMutation({
    mutationFn: async (trades: TradeRecord[]) => {
      if (!fetcher) throw new Error("Fetcher not initialized");
      return fetcher.exportToCSV(trades);
    },
  });

  const exportToJSON = useMutation({
    mutationFn: async (trades: TradeRecord[]) => {
      if (!fetcher) throw new Error("Fetcher not initialized");
      return fetcher.exportToJSON(trades);
    },
  });

  return { exportToCSV, exportToJSON };
};

// ============================================
// Calculated PnL (FIFO matching with fees/funding)
// ============================================
export const useCalculatedPnL = () => {
  const { data: trades = [] } = useAllTrades();
  const { publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: tradeKeys.stats(publicKey?.toString()),
    queryFn: async (): Promise<TradeRecord[]> => {
      if (!publicKey) throw new Error("Wallet not connected");
      const calculator = new PnLCalculator(trades);
      return calculator.calculatePnL();
    },
    enabled: !!publicKey && trades.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// Full analytics using TradeAnalyticsCalculator
// ============================================
export const useTradeAnalytics = () => {
  const { data: trades = [] } = useAllTrades();
  const { publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: tradeKeys.summary(publicKey?.toString()),
    queryFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");
      const analytics = new TradeAnalyticsCalculator(trades);
      return analytics.generateFullReport();
    },
    enabled: !!publicKey && trades.length > 0,
    staleTime: Infinity,
  });
};

// ============================================
// Mock Data Hooks (Development/Demo)
// ============================================
export const useMockTrades = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ["mock-trades", filters],
    queryFn: async () => {
      // Import mock data dynamically
      const { allTrades } = await import("@/data/mockTrades");
      return allTrades;
    },
    staleTime: Infinity,
    enabled: process.env.NODE_ENV === "development",
  });
};
