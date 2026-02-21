// hooks/use-trade-queries.ts
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
  // If instance exists but RPC URL changed, recreate it
  if (fetcherInstance && (fetcherInstance as any).rpcUrl !== rpcUrl) {
    fetcherInstance = null;
  }

  if (!fetcherInstance) {
    fetcherInstance = new TransactionDataFetcher(
      rpcUrl,
      programId || process.env.NEXT_PUBLIC_PROGRAM_ID,
      parseInt(process.env.NEXT_PUBLIC_ENGINE_VERSION || "14", 10), // version from env
      300, // delay
      1000, // max transactions
    );
    // Attach rpcUrl to instance for future checks (hacky but effective since it's private in class)
    (fetcherInstance as any).rpcUrl = rpcUrl;
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
// ============================================
// Raw Trades Query (Base - cached)
// ============================================
const useRawTrades = (options?: { excludeFees?: boolean }) => {
  const { fetcher, publicKey } = useTransactionFetcher();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: tradeKeys.list(publicKey?.toString(), {
      type: "raw",
      fees: options?.excludeFees,
    }),
    queryFn: async (): Promise<TradeRecord[]> => {
      if (!publicKey) throw new Error("Wallet not connected");

      const cacheKey = tradeKeys.list(publicKey.toString(), {
        type: "raw",
        fees: options?.excludeFees,
      });

      // Background sync: Fetch fresh data and update query cache silently
      setTimeout(() => {
        fetcher.fetchAllTransactions({ fees: options?.excludeFees })
          .then((freshData) => {
            queryClient.setQueryData(cacheKey, freshData);
          })
          .catch(console.error);
      }, 0);

      // Instantly return the pre-existing DB cache 
      return fetcher.getCachedTrades({ fees: options?.excludeFees });
    },
    enabled: !!publicKey,
    staleTime: 30 * 1000, // 30 seconds raw cache
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

// ============================================
// All Trades Query (Filtered view of Raw)
// ============================================
export const useAllTrades = (options?: {
  enabled?: boolean;
  excludeFees?: boolean;
  filters?: TradeFilters;
}) => {
  const { data: rawTrades = [], isLoading, isError, error, isFetching } = useRawTrades({
    excludeFees: options?.excludeFees,
  });

  const { fetcher } = useTransactionFetcher();

  // Memoize the filtered result
  const filteredTrades = useMemo(() => {
    let sorted = [...rawTrades].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (options?.filters && fetcher.filterTrades) {
      sorted = fetcher.filterTrades(sorted, options.filters);
    }
    return sorted;
  }, [rawTrades, options?.filters, fetcher]);

  return {
    data: filteredTrades,
    isLoading,
    isFetching, // Expose isFetching for background updates
    isError,
    error,
    refetch: () => { /* No-op or trigger raw refetch if needed */ },
  };
};

// ============================================
// Financial Details Query
// ============================================
export const useFinancialDetails = () => {
  const { fetcher, publicKey } = useTransactionFetcher();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["financial-details", publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");

      const cacheKey = ["financial-details", publicKey.toString()];
      const localStoreKey = `fin_cache_${publicKey.toString()}`;

      // Background extract: Takes ~13s by scanning RPC.
      // Update cache and LocalStorage when it finishes.
      setTimeout(() => {
        fetcher.extractFinancialDetails()
          .then((freshFin) => {
            try { localStorage.setItem(localStoreKey, JSON.stringify(freshFin)); } catch (e) { }
            queryClient.setQueryData(cacheKey, freshFin);
          })
          .catch(console.error);
      }, 0);

      // Attempt to load from localStorage first for instant render
      try {
        const localCache = localStorage.getItem(localStoreKey);
        if (localCache) return JSON.parse(localCache);
      } catch (e) { }

      // Fallback empty structure while loading for the first time
      return null;
    },
    enabled: !!publicKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

      // Force invalidate raw trades to trigger re-fetch
      // Note: In a real app we might call fetcher specifically, but invalidating is cleaner with React Query
      await queryClient.invalidateQueries({
        queryKey: tradeKeys.list(publicKey?.toString(), { type: "raw" })
      });

      // Wait for the refetch to complete (optional, or just return)
      return [];
    },
    onSuccess: () => {
      // Also invalidate lists
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
// Note: Dashboard components should use useDashboard() instead of this hook directly
// to avoid redundant calculations across multiple components.
export const useTradeAnalytics = (filters?: TradeFilters) => {
  const { data: trades = [], isLoading: isTradesLoading, isFetching: isTradesFetching } = useAllTrades({ filters });
  const { data: financials, isLoading: isFinLoading } = useFinancialDetails();
  const { publicKey, fetcher } = useTransactionFetcher();

  return useQuery({
    queryKey: [
      ...tradeKeys.summary(publicKey?.toString()),
      trades.length,
      !!financials,
      JSON.stringify(filters), // Include filters in query key
    ],
    queryFn: async () => {
      if (!publicKey) throw new Error("Wallet not connected");

      // Fetch prices for unrealized PnL (cached 1 min)
      const currentPrices = await fetcher.fetchCurrentPrices();

      // Note: useAllTrades already filters the trades if filters are passed.
      // So we just need to calculate analytics on the returned trades.
      const analytics = new TradeAnalyticsCalculator(trades, financials);
      const report = analytics.generateFullReport(currentPrices);
      return report;
    },
    enabled: !!publicKey && (trades.length > 0 || !!financials),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // 1 minute refresh
    // We pass loading state from dependencies manually since this query depends on them
    meta: {
      isLoading: isTradesLoading || isFinLoading,
      isFetching: isTradesFetching
    }
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
            case "24H":
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
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
