import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { allTrades, journals, getJournalStatus } from "@/data/mockTrades";
import type {
  TradeRecord,
  Journal,
  TradeFilters,
  PerformanceMetrics,
} from "@/types";

// ============================================
// Trade Queries
// ============================================

export function useTrades(filters?: TradeFilters) {
  return useQuery<TradeRecord[]>({
    queryKey: ["trades", filters],
    queryFn: async () => {
      // TODO: Replace with TransactionDataFetcher when wallet is connected
      let filtered = [...allTrades];

      if (filters?.symbol) {
        filtered = filtered.filter((t) => t.symbol === filters.symbol);
      }
      if (filters?.side) {
        filtered = filtered.filter((t) => t.side === filters.side);
      }
      if (filters?.minPnL !== undefined) {
        filtered = filtered.filter((t) => t.pnl >= filters.minPnL!);
      }
      if (filters?.maxPnL !== undefined) {
        filtered = filtered.filter((t) => t.pnl <= filters.maxPnL!);
      }
      if (filters?.startDate) {
        filtered = filtered.filter((t) => t.timestamp >= filters.startDate!);
      }
      if (filters?.endDate) {
        filtered = filtered.filter((t) => t.timestamp <= filters.endDate!);
      }

      return filtered;
    },
  });
}

export function useTrade(tradeId: string | undefined) {
  return useQuery<TradeRecord | undefined>({
    queryKey: ["trade", tradeId],
    queryFn: async () => {
      return allTrades.find((t) => t.id === tradeId);
    },
    enabled: !!tradeId,
  });
}

export function useTradeJournalStatus(tradeId: string) {
  return getJournalStatus(tradeId);
}

// ============================================
// Journal Queries
// ============================================

export function useJournals() {
  return useQuery<Journal[]>({
    queryKey: ["journals"],
    queryFn: async () => {
      // TODO: Replace with backend fetch when Cloud is enabled
      return journals;
    },
  });
}

export function useJournal(journalId: string | undefined) {
  return useQuery<Journal | undefined>({
    queryKey: ["journal", journalId],
    queryFn: async () => {
      return journals.find((j) => j.id === journalId);
    },
    enabled: !!journalId && journalId !== "new",
  });
}

export function useJournalForTrade(tradeId: string | undefined) {
  return useQuery<Journal | undefined>({
    queryKey: ["journal-for-trade", tradeId],
    queryFn: async () => {
      return journals.find((j) => j.tradeId === tradeId);
    },
    enabled: !!tradeId,
  });
}

// ============================================
// Performance Metrics
// ============================================

export function usePerformanceMetrics() {
  return useQuery<PerformanceMetrics>({
    queryKey: ["performance-metrics"],
    queryFn: async () => {
      const trades = allTrades;
      const wins = trades.filter((t) => t.status === "win");
      const losses = trades.filter((t) => t.status === "loss");

      return {
        totalTrades: trades.length,
        winningTrades: wins.length,
        losingTrades: losses.length,
        winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
        totalPnL: trades.reduce((sum, t) => sum + t.pnl, 0),
        totalVolume: trades.reduce((sum, t) => sum + (t.value || 0), 0),
        totalFees: trades.reduce((sum, t) => sum + t.fees.total, 0),
        averageTradeDuration:
          trades.reduce((sum, t) => sum + t.duration, 0) / trades.length,
        longShortRatio:
          trades.filter((t) => t.side === "long" || t.side === "buy").length /
          Math.max(
            1,
            trades.filter((t) => t.side === "short" || t.side === "sell")
              .length,
          ),
        largestGain: Math.max(...trades.map((t) => t.pnl)),
        largestLoss: Math.min(...trades.map((t) => t.pnl)),
        averageWin:
          wins.length > 0
            ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length
            : 0,
        averageLoss:
          losses.length > 0
            ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length
            : 0,
        profitFactor:
          losses.length > 0
            ? Math.abs(wins.reduce((s, t) => s + t.pnl, 0)) /
              Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
            : Infinity,
        maxDrawdown: 0, // TODO: implement proper drawdown calculation
        expectancy:
          trades.length > 0
            ? trades.reduce((s, t) => s + t.pnl, 0) / trades.length
            : 0,
      };
    },
  });
}
