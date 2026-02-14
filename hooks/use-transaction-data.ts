// hooks/useTransactionDataFetcher.ts
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { TransactionDataFetcher, FetchResult } from '@/services/fetch-data.service';
import { useMemo, useState, useEffect } from 'react';
import { TradeRecord } from '@/types';

// Query keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: { wallet?: string; limit?: number }) => 
    [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (signature: string) => [...transactionKeys.details(), signature] as const,
  instrumentTrades: (instrumentId: number, wallet?: string) => 
    ['instrumentTrades', instrumentId, wallet] as const,
  summary: (wallet?: string) => ['tradeSummary', wallet] as const,
};

// Singleton instance manager
let fetcherInstance: TransactionDataFetcher | null = null;

const getFetcher = (rpcUrl: string, programId?: string, version?: number) => {
  if (!fetcherInstance) {
    fetcherInstance = new TransactionDataFetcher(
      rpcUrl,
      programId,
      version,
      300, // delay
      1000 // max transactions
    );
  }
  return fetcherInstance;
};

// Hook to initialize the fetcher
export const useTransactionFetcher = (rpcUrl: string, programId?: string, version?: number) => {
  const fetcher = useMemo(() => getFetcher(rpcUrl, programId, version), [rpcUrl, programId, version]);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  const initializeMutation = useMutation({
    mutationFn: async (walletPublicKey: PublicKey) => {
      await fetcher.initialize(walletPublicKey);
      return walletPublicKey.toString();
    },
    onSuccess: (walletAddress) => {
      setIsInitialized(true);
      // Pre-fetch initial data
      queryClient.prefetchInfiniteQuery({
        queryKey: transactionKeys.list({ wallet: walletAddress }),
        queryFn: ({ pageParam }) => fetcher.fetchTransactionsPaginated({ before: pageParam }),
        initialPageParam: undefined,
      });
    },
  });

  return {
    fetcher,
    isInitialized,
    initialize: initializeMutation.mutateAsync,
    isInitializing: initializeMutation.isPending,
    initializationError: initializeMutation.error,
  };
};

// Hook for paginated transactions
export const usePaginatedTransactions = (
  walletPublicKey: PublicKey | null,
  rpcUrl: string,
  limit: number = 100,
  programId?: string,
  version?: number
) => {
  const { fetcher, isInitialized, initialize } = useTransactionFetcher(rpcUrl, programId, version);

  // Auto-initialize when wallet is available
  useEffect(() => {
    if (walletPublicKey && !isInitialized) {
      initialize(walletPublicKey);
    }
  }, [walletPublicKey, isInitialized, initialize]);

  return useInfiniteQuery({
    queryKey: transactionKeys.list({ 
      wallet: walletPublicKey?.toString(), 
      limit 
    }),
    queryFn: async ({ pageParam }): Promise<FetchResult> => {
      if (!walletPublicKey) throw new Error('Wallet not initialized');
      if (!isInitialized) throw new Error('Fetcher not initialized');
      
      return fetcher.fetchTransactionsPaginated({
        limit,
        before: pageParam,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastSignature : undefined,
    enabled: !!walletPublicKey && isInitialized,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Hook for all transactions (without pagination)
export const useAllTransactions = (
  walletPublicKey: PublicKey | null,
  rpcUrl: string,
  programId?: string,
  version?: number
) => {
  const { fetcher, isInitialized, initialize } = useTransactionFetcher(rpcUrl, programId, version);

  useEffect(() => {
    if (walletPublicKey && !isInitialized) {
      initialize(walletPublicKey);
    }
  }, [walletPublicKey, isInitialized, initialize]);

  return useQuery({
    queryKey: transactionKeys.list({ wallet: walletPublicKey?.toString() }),
    queryFn: async () => {
      if (!walletPublicKey) throw new Error('Wallet not initialized');
      if (!isInitialized) throw new Error('Fetcher not initialized');
      
      return fetcher.fetchAllTransactions();
    },
    enabled: !!walletPublicKey && isInitialized,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook for instrument-specific trades
export const useInstrumentTrades = (
  instrumentId: number,
  walletPublicKey: PublicKey | null,
  rpcUrl: string,
  programId?: string,
  version?: number
) => {
  const { fetcher, isInitialized, initialize } = useTransactionFetcher(rpcUrl, programId, version);

  useEffect(() => {
    if (walletPublicKey && !isInitialized) {
      initialize(walletPublicKey);
    }
  }, [walletPublicKey, isInitialized, initialize]);

  return useQuery({
    queryKey: transactionKeys.instrumentTrades(instrumentId, walletPublicKey?.toString()),
    queryFn: async () => {
      if (!walletPublicKey) throw new Error('Wallet not initialized');
      if (!isInitialized) throw new Error('Fetcher not initialized');
      
      return fetcher.fetchTradesForInstrument(instrumentId);
    },
    enabled: !!walletPublicKey && isInitialized && instrumentId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook for trade summary statistics
export const useTradeSummary = (
  walletPublicKey: PublicKey | null,
  rpcUrl: string,
  programId?: string,
  version?: number
) => {
  const { data: transactions, isLoading, error } = useAllTransactions(
    walletPublicKey,
    rpcUrl,
    programId,
    version
  );

  const summary = useMemo(() => {
    if (!transactions) return null;
    return fetcherInstance?.getSummary(transactions) ?? null;
  }, [transactions]);

  return useQuery({
    queryKey: transactionKeys.summary(walletPublicKey?.toString()),
    queryFn: async () => summary,
    enabled: !!transactions,
    staleTime: Infinity,
    initialData: summary,
  });
};

// Hook for manual refresh
export const useRefreshTransactions = (
  walletPublicKey: PublicKey | null,
  rpcUrl: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Re-fetch with new instance to get fresh data
      fetcherInstance = null;
      const newFetcher = getFetcher(rpcUrl);
      if (walletPublicKey) {
        await newFetcher.initialize(walletPublicKey);
        return newFetcher.fetchAllTransactions();
      }
      throw new Error('Wallet not initialized');
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
      });
      // Set new data
      queryClient.setQueryData(
        transactionKeys.list({ wallet: walletPublicKey?.toString() }),
        data
      );
    },
  });
};

// Hook for CSV export
export const useExportToCSV = () => {
  return useMutation({
    mutationFn: async (trades: TradeRecord[]) => {
      if (!fetcherInstance) {
        throw new Error('Fetcher not initialized');
      }
      return fetcherInstance.exportToCSV(trades);
    },
  });
};

// Hook for JSON export
export const useExportToJSON = () => {
  return useMutation({
    mutationFn: async (trades: TradeRecord[]) => {
      if (!fetcherInstance) {
        throw new Error('Fetcher not initialized');
      }
      return fetcherInstance.exportToJSON(trades);
    },
  });
};