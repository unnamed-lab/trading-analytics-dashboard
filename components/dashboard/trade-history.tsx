"use client";

import { useState, useMemo } from "react";
import { useAllTrades, useMockTrades } from "@/hooks/use-trade-queries";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl, formatQuantity } from "@/types";
import TradeReviewPanel from "./trade-review-panel";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { RiskMirrors } from "@/components/dashboard/risk-mirrors";
import { TradeFilters } from "@/types";
import { DashboardError } from "@/components/ui/dashboard-states";
import { useJournals } from "@/hooks/use-journals";

const TradeHistory = ({
  filters,
  onFilterChange
}: {
  filters?: TradeFilters;
  onFilterChange?: (filters: Partial<TradeFilters>) => void;
}) => {
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const { connected, publicKey } = useWallet();

  // Fetch journals to display tags/notes
  const { list: journalList } = useJournals(publicKey?.toBase58() || null);
  const journals = journalList.data || [];

  // Create a map for fast lookup of journals by tradeId
  const journalMap = useMemo(() => {
    return new Map(journals.map(j => [j.tradeId, j]));
  }, [journals]);

  // Use real data if wallet is connected, otherwise use mock data
  const {
    data: realTrades = [],
    isLoading: realLoading,
    isError: realError,
    refetch: refetchReal
  } = useAllTrades({
    enabled: connected && !!publicKey,
    excludeFees: true,
    filters,
  });

  const {
    data: mockTrades = [],
    isLoading: mockLoading,
    isError: mockError,
    refetch: refetchMock
  } = useMockTrades({
    enabled: !connected || process.env.NODE_ENV === "development",
    filters,
  });

  if (connected && realError) {
    return (
      <DashboardError
        title="Trade History Error"
        message="Failed to load trade history"
        onRetry={() => refetchReal()}
        className="min-h-[400px]"
      />
    );
  }

  if (!connected && mockError && process.env.NODE_ENV === "development") {
    return (
      <DashboardError
        title="Mock Data Error"
        message="Failed to load mock data"
        onRetry={() => refetchMock()}
        className="min-h-[400px]"
      />
    );
  }

  const trades = connected ? realTrades : mockTrades;
  const isLoading = connected ? realLoading : mockLoading;

  // FILTER: Only show perp fill orders (discriminator 19)
  const perpTrades = trades.filter(t =>
    t.discriminator === 19 || t.tradeType === "perp"
  );
  const recentTrades = perpTrades.slice(0, 9);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between pb-4">
          <h3 className="font-semibold text-sm text-foreground">
            Recent Perp Trades
          </h3>
        </div>
        <TableSkeleton rows={5} className="w-full" />
      </div>
    );
  }

  if (!connected && perpTrades.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8">
        <div className="text-center text-muted-foreground">
          <p>Connect your wallet to view your perpetual trades</p>
          <p className="text-sm mt-2">or check back later for demo data</p>
        </div>
      </div>
    );
  }

  if (perpTrades.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8">
        <div className="text-center text-muted-foreground">
          No perpetual trades found for this wallet
        </div>
      </div>
    );
  }

  return (
    <>
      <RiskMirrors trades={perpTrades} />

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-semibold text-sm text-foreground">
            Recent Perpetual Trades
          </h3>
          <Link href="/trades" className="text-xs text-primary hover:underline">
            View All
          </Link>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden px-4 pb-4 space-y-3">
          {recentTrades.map((trade) => {
            const bullish = isBullishSide(trade.side);
            return (
              <div
                key={trade.id}
                className="bg-secondary/20 rounded-lg p-3 border border-border/50 hover:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => setSelectedTrade(trade)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-bold text-foreground">{trade.symbol}</span>
                    <span className="text-xs text-muted-foreground">{new Date(trade.timestamp).toLocaleDateString()}</span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${bullish
                      ? "bg-profit/15 text-profit"
                      : "bg-loss/15 text-loss"
                      }`}
                  >
                    {formatSide(trade.side)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Price</span>
                    <span className="font-mono">{formatPrice(trade.entryPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-right">Size</span>
                    <span className="font-mono text-right block">{formatQuantity(trade.quantity)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">PnL</span>
                    <span
                      className={`font-mono font-bold ${trade.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                    >
                      {formatPnl(trade.pnl)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-right">ROI</span>
                    <span className={`font-mono block text-right ${trade.pnlPercentage >= 0 ? "text-profit" : "text-loss"}`}>
                      {trade.pnlPercentage >= 0 ? "+" : ""}
                      {trade.pnlPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-180 table-auto">
            <thead>
              <tr className="border-t border-border">
                {[
                  "Date",
                  "Symbol",
                  "Side",
                  "Price",
                  "Quantity (SOL)",
                  "PnL",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade) => {
                const bullish = isBullishSide(trade.side);
                const journal = journalMap.get(trade.id);

                return (
                  <tr
                    key={trade.id}
                    className="border-t border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTrade(trade)}
                  >
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm font-medium text-foreground">
                      <span
                        className="hover:underline cursor-pointer hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterChange?.({ symbol: trade.symbol });
                        }}
                      >
                        {trade.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${bullish
                          ? "bg-profit/15 text-profit"
                          : "bg-loss/15 text-loss"
                          }`}
                      >
                        {formatSide(trade.side)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {formatPrice(trade.entryPrice)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {formatQuantity(trade.quantity)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`font-mono text-sm font-bold ${trade.pnl >= 0 ? "text-profit" : "text-loss"
                          }`}
                      >
                        {formatPnl(trade.pnl)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({trade.pnlPercentage >= 0 ? "+" : ""}
                        {trade.pnlPercentage.toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrade && (
        <TradeReviewPanel
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </>
  );
};

export default TradeHistory;