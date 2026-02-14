/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-trade-data.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useMemo, useEffect } from 'react';
import { TransactionDataFetcher } from '@/services/fetch-data.service';
import { useUIStore } from '@/lib/stores/trade-store';
import { useTradeCalculations } from './use-trade-calculations';
import { useFilterStore } from '@/lib/stores/filter-store';

// Query keys
export const tradeKeys = {
  all: ['trades'] as const,
  list: (wallet?: string) => [...tradeKeys.all, wallet] as const,
};

// Singleton fetcher
let fetcherInstance: TransactionDataFetcher | null = null;

const getFetcher = (rpcUrl: string) => {
  if (!fetcherInstance) {
    fetcherInstance = new TransactionDataFetcher(
      rpcUrl,
      process.env.NEXT_PUBLIC_PROGRAM_ID,
      14,
      300,
      1000
    );
  }
  return fetcherInstance;
};

// Filter trades by timeframe
function filterTradesByTimeframe(trades: any[], timeframe: string) {
  if (!timeframe || timeframe === 'all' || trades.length === 0) return trades;
  
  const now = new Date();
  const cutoff = new Date();
  
  switch (timeframe) {
    case '24h': cutoff.setHours(now.getHours() - 24); break;
    case '7d': cutoff.setDate(now.getDate() - 7); break;
    case '30d': cutoff.setDate(now.getDate() - 30); break;
    case '90d': cutoff.setDate(now.getDate() - 90); break;
    default: return trades;
  }
  
  return trades.filter(trade => new Date(trade.timestamp) >= cutoff);
}

export const useTradeData = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { isDemoMode } = useUIStore();
  const { timeframe } = useFilterStore();

  const fetcher = useMemo(() => getFetcher(connection.rpcEndpoint), [connection.rpcEndpoint]);

  // Initialize fetcher
  useEffect(() => {
    if (publicKey && !isDemoMode) {
      fetcher.initialize(publicKey).catch(console.error);
    }
  }, [publicKey, isDemoMode, fetcher]);

  // Fetch trades
  const {
    data: rawTrades = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: tradeKeys.list(publicKey?.toString()),
    queryFn: async () => {
      if (isDemoMode) return [];
      if (!publicKey) throw new Error('Wallet not connected');
      return fetcher.fetchAllTransactions();
    },
    enabled: !isDemoMode && !!publicKey,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Apply filters
  const filteredTrades = useMemo(() => 
    filterTradesByTimeframe(rawTrades, timeframe),
    [rawTrades, timeframe]
  );

  // Calculate all derived data
  const calculations = useTradeCalculations(filteredTrades);

  return {
    trades: filteredTrades,
    isLoading,
    error,
    refetch,
    ...calculations,
  };
};

// Refresh mutation
export const useRefreshTradeData = () => {
  const queryClient = useQueryClient();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { isDemoMode, setIsRefreshing } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      if (isDemoMode) return [];
      if (!publicKey) throw new Error('Wallet not connected');
      
      setIsRefreshing(true);
      const fetcher = getFetcher(connection.rpcEndpoint);
      await fetcher.initialize(publicKey);
      const trades = await fetcher.fetchAllTransactions();
      return trades;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(tradeKeys.list(publicKey?.toString()), data);
      queryClient.invalidateQueries({ queryKey: tradeKeys.list(publicKey?.toString()) });
    },
    onSettled: () => {
      setIsRefreshing(false);
    },
  });
};