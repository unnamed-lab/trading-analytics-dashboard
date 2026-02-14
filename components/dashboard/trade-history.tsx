import { useState } from "react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import { allTrades } from "@/data/mockTrades";
import TradeReviewPanel from "./trade-review-panel";
import Link from "next/link";

const TradeHistory = () => {
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const recentTrades = allTrades.slice(0, 4);

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
          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                {[
                  "Date",
                  "Symbol",
                  "Side",
                  "Entry Price",
                  "Exit Price",
                  "PnL",
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
                      {trade.timestamp.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm font-medium text-foreground">
                      {trade.symbol}
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
                      {formatPrice(trade.entryPrice)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {formatPrice(trade.exitPrice)}
                    </td>
                    <td
                      className={`px-5 py-3.5 font-mono text-sm font-medium ${
                        trade.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatPnl(trade.pnl)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[200px] truncate">
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
