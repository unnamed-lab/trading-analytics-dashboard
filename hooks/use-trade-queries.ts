// hooks/use-trade-queries.ts
import 'dotenv/config';
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useEffect, useState } from "react";
import { TransactionDataFetcher } from "@/services/fetch-data.service";
import { PnLCalculator } from "@/services/pnl-calculator.service";
import { TradeAnalyticsCalculator } from "@/services/trade-analytics.service";
import type { TradeRecord, FetchResult, TradeFilters } from "@/types";

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
      parseInt(process.env.NEXT_PUBLIC_ENGINE_VERSION || "1", 10), // version from env
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
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEnabled(true);
    }, 45000); // 45 seconds delay
    return () => clearTimeout(timer);
  }, []);

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
    enabled: !!publicKey && isEnabled,
    staleTime: Infinity, // Keep data fresh indefinitely to avoid re-fetching
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// ============================================
// All Trades Query (For smaller datasets)
// ============================================
export const useAllTrades = (options?: {
  enabled?: boolean;
  excludeFees?: boolean;
  filters?: TradeFilters;
}) => {
  const { fetcher, publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: tradeKeys.list(publicKey?.toString(), {
      type: "all",
      filters: options?.filters,
      fees: options?.excludeFees,
    }),
    queryFn: async (): Promise<TradeRecord[]> => {
      if (!publicKey) throw new Error("Wallet not connected");

      // console.log("Fetching all trades..."); 
      return fetcher
        .fetchAllTransactions({ fees: options?.excludeFees })
        .then((trades) => {
          let sorted = trades.sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
          );

          if (options?.filters && fetcher.filterTrades) {
            sorted = fetcher.filterTrades(sorted, options.filters);
          }
          return sorted;
        });
    },
    enabled: !!publicKey && (options?.enabled ?? true),

    // Rate Limit Fix: Aggressive caching
    // 1. Data is considered fresh for 30 minutes. 
    // 2. We don't refetch on window focus or mount.
    // 3. User can manually refresh via button if needed.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,

    select: (data) =>
      data.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
  });
};

// ============================================
// Financial Details Query
// ============================================
export const useFinancialDetails = () => {
  const { fetcher, publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: ["financial-details", publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");
      return fetcher.extractFinancialDetails();
    },
    enabled: !!publicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
// ============================================
// Full analytics using TradeAnalyticsCalculator
// ============================================
export const useTradeAnalytics = (filters?: TradeFilters) => {
  const { data: trades = [] } = useAllTrades({ filters });
  const { data: financials } = useFinancialDetails();
  const { publicKey } = useTransactionFetcher();

  return useQuery({
    queryKey: [
      ...tradeKeys.summary(publicKey?.toString()),
      trades.length,
      !!financials,
      JSON.stringify(filters), // Include filters in query key
    ],
    queryFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");
      // Note: useAllTrades already filters the trades if filters are passed.
      // So we just need to calculate analytics on the returned trades.
      const analytics = new TradeAnalyticsCalculator(trades, financials);
      const report = analytics.generateFullReport();
      return report;
    },
    enabled: !!publicKey && (trades.length > 0 || !!financials),
    staleTime: Infinity,
  });
};

// ============================================
// Mock Data Hooks (Development/Demo)
// ============================================
export const useMockTrades = (options?: {
  enabled?: boolean;
  filters?: TradeFilters;
}) => {
  return useQuery({
    queryKey: ["mock-trades", options?.filters],
    queryFn: async () => {
      // Import mock data dynamically
      const { allTrades } = await import("@/data/mockTrades");
      let filtered = [...allTrades];

      if (options?.filters) {
        // Apply duplicate filtering logic for mocks
        const { period, symbol, sides } = options.filters;

        // 1. Time Period
        const now = new Date();
        let startDate: Date | undefined;

        if (period) {
          switch (period) {
            case "7D":
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "30D":
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case "90D":
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case "YTD":
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
            case "ALL":
            default:
              startDate = undefined;
              break;
          }
        }

        if (startDate) {
          filtered = filtered.filter((t) => t.timestamp >= startDate!);
        }

        // 2. Symbol
        if (symbol && symbol !== "All Symbols") {
          filtered = filtered.filter((t) => t.symbol === symbol);
        }

        // 3. Side
        if (sides) {
          const { long, short } = sides;
          if (!long && !short) {
            filtered = [];
          } else if (!long || !short) {
            filtered = filtered.filter((t) => {
              const isLong = t.side === "buy" || t.side === "long";
              const isShort = t.side === "sell" || t.side === "short";
              if (long && isLong) return true;
              if (short && isShort) return true;
              return false;
            });
          }
        }
      }

      return filtered;
    },
    staleTime: Infinity,
    enabled:
      process.env.NODE_ENV === "development" && (options?.enabled ?? true),
  });
};
