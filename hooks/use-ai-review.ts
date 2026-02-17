/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TradeRecord, AIReviewResult } from "@/types";

// Query keys for AI reviews
export const aiReviewKeys = {
  all: ["ai-reviews"] as const,
  lists: () => [...aiReviewKeys.all, "list"] as const,
  list: (tradeId?: string) => [...aiReviewKeys.lists(), tradeId] as const,
  detail: (tradeId: string) =>
    [...aiReviewKeys.all, "detail", tradeId] as const,
};

interface ReviewContext {
  recentTrades?: TradeRecord[];
  symbolStats?: Record<string, any>;
}

/**
 * Hook to get AI review for a specific trade
 */
export function useAITradeReview(
  trade: TradeRecord | null,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: aiReviewKeys.detail(trade?.id || "none"),
    queryFn: async (): Promise<AIReviewResult | null> => {
      if (!trade) return null;

      // Try read from localStorage cache first (client-only)
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const key = `ai-review:${trade.id}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as {
              timestamp: number;
              data: AIReviewResult;
            };
            const age = Date.now() - (parsed.timestamp || 0);
            const ttl = 30 * 60 * 1000; // 30 minutes
            if (age < ttl) {
              return parsed.data;
            }
          }
        }
      } catch (e) {
        // ignore storage issues
        // eslint-disable-next-line no-console
        console.debug("ai-review cache read error", e);
      }

      const response = await fetch("/api/ai/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trade,
          journalContent: trade.notes || "No journal entry provided",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate AI review");
      }

      const result = await response.json();

      // Persist to localStorage to reduce future calls
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const key = `ai-review:${trade.id}`;
          localStorage.setItem(
            key,
            JSON.stringify({ timestamp: Date.now(), data: result }),
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("ai-review cache write error", e);
      }

      return result;
    },
    enabled: enabled && !!trade,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to generate a new AI review
 */
export function useGenerateAIReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trade,
      journalContent,
      context,
    }: {
      trade: TradeRecord;
      journalContent: string;
      context?: ReviewContext;
    }): Promise<AIReviewResult> => {
      const response = await fetch("/api/ai/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trade,
          journalContent,
          sessionContext: context,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate AI review");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the cache with the new review
      queryClient.setQueryData(aiReviewKeys.detail(variables.trade.id), data);

      // Persist to localStorage as well to avoid repeated API calls
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const key = `ai-review:${variables.trade.id}`;
          localStorage.setItem(
            key,
            JSON.stringify({ timestamp: Date.now(), data }),
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug("ai-review cache write failed", e);
      }

      // Invalidate lists to trigger refetch
      queryClient.invalidateQueries({
        queryKey: aiReviewKeys.lists(),
      });
    },
  });
}

/**
 * Hook to get AI reviews for multiple trades (batch)
 */
export function useBatchAITradeReviews(trades: TradeRecord[]) {
  return useQuery({
    queryKey: aiReviewKeys.list(trades.map((t) => t.id).join("-")),
    queryFn: async (): Promise<Map<string, AIReviewResult>> => {
      const reviews = new Map();

      // Process in small batches to avoid rate limits and token waste
      const batchSize = 3;
      for (let i = 0; i < trades.length; i += batchSize) {
        const batch = trades.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (trade) => {
            // Try cached entry first
            try {
              if (typeof window !== "undefined" && window.localStorage) {
                const key = `ai-review:${trade.id}`;
                const raw = localStorage.getItem(key);
                if (raw) {
                  const parsed = JSON.parse(raw) as {
                    timestamp: number;
                    data: AIReviewResult;
                  };
                  const age = Date.now() - (parsed.timestamp || 0);
                  const ttl = 30 * 60 * 1000;
                  if (age < ttl) {
                    reviews.set(trade.id, parsed.data);
                    return;
                  }
                }
              }
            } catch (e) {
              // ignore storage issues
            }

            try {
              const response = await fetch("/api/ai/review", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  trade,
                  journalContent: trade.notes || "No journal entry provided",
                }),
              });

              if (response.ok) {
                const review = await response.json();
                reviews.set(trade.id, review);

                // cache locally
                try {
                  if (typeof window !== "undefined" && window.localStorage) {
                    const key = `ai-review:${trade.id}`;
                    localStorage.setItem(
                      key,
                      JSON.stringify({ timestamp: Date.now(), data: review }),
                    );
                  }
                } catch (e) {
                  // ignore
                }
              }
            } catch (error) {
              console.error(
                `Failed to get review for trade ${trade.id}:`,
                error,
              );
            }
          }),
        );

        // Delay between batches to reduce burst requests
        if (i + batchSize < trades.length) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      return reviews;
    },
    enabled: trades.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}
