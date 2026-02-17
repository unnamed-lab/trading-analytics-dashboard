// components/dashboard/trade-history.tsx
"use client";

import { useState } from "react";
import { useAllTrades, useMockTrades } from "@/hooks/use-trade-queries";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice } from "@/types";
import TradeReviewPanel from "./trade-review-panel";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const TradeHistory = () => {
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const { connected, publicKey } = useWallet();

  // Use real data if wallet is connected, otherwise use mock data
  const { data: realTrades = [], isLoading: realLoading } = useAllTrades({
    enabled: connected && !!publicKey,
    excludeFees: true,
  });

  const { data: mockTrades = [], isLoading: mockLoading } = useMockTrades({
    enabled: !connected || process.env.NODE_ENV === "development",
  });

  const trades = connected ? realTrades : mockTrades;
  const isLoading = connected ? realLoading : mockLoading;
  const recentTrades = trades.slice(0, 9);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading trades...</span>
        </div>
      </div>
    );
  }

  if (!connected && trades.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8">
        <div className="text-center text-muted-foreground">
          <p>Connect your wallet to view your trade history</p>
          <p className="text-sm mt-2">or check back later for demo data</p>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8">
        <div className="text-center text-muted-foreground">
          No trades found for this wallet
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-semibold text-sm text-foreground">
            Recent Trade History
          </h3>
          <Link href="/trades" className="text-xs text-primary hover:underline">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 table-auto">
            <thead>
              <tr className="border-t border-border">
                {[
                  "Date",
                  "Symbol",
                  "Type",
                  "Side",
                  "Price",
                  "Amount",
                  "Notes",
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
                      {trade.symbol}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground capitalize">
                      {trade.tradeType || "N/A"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          bullish
                            ? "bg-profit/15 text-profit"
                            : "bg-loss/15 text-loss"
                        }`}
                      >
                        {formatSide(trade.side)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {formatPrice(trade?.entryPrice )|| "-"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {trade?.amount || 0}
                    </td>
                    {/* <td
                      className={`px-5 py-3.5 font-mono text-sm font-medium ${
                        trade.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatPnl(trade.pnl)}
                    </td> */}
                    <td
                      className="px-5 py-3.5 text-sm text-muted-foreground max-w-[14rem] truncate"
                      title={trade.notes}
                    >
                      {trade.notes}
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
