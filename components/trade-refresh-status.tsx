// components/trade-refresh-status.tsx
"use client";

import { useRefreshTradeData } from "@/hooks/use-trade-data";
import { useUIStore } from "@/lib/stores/trade-store";
import { useWallet } from "@solana/wallet-adapter-react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function TradeRefreshStatus() {
  const { publicKey } = useWallet();
  const { isDemoMode, isRefreshing } = useUIStore();
  const refreshMutation = useRefreshTradeData();

  if (isDemoMode || !publicKey) {
    return null;
  }

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const isLoading = refreshMutation.isPending || isRefreshing;

  return (
    <div className="mt-2 flex items-center gap-3 text-xs">
      <button
        onClick={handleRefresh}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-300 disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        {isLoading ? "Refreshing..." : "Refresh Data"}
      </button>
      {refreshMutation.isSuccess && (
        <span className="text-[#22c55e]">Updated</span>
      )}
      {refreshMutation.error && (
        <span className="text-[#f43f5e]">Failed to refresh</span>
      )}
    </div>
  );
}
