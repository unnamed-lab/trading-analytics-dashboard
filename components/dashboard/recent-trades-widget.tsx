"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDemoStore } from "@/lib/stores/demo-store";
import { useTradeTableData } from "@/lib/stores/trade-selectors";
import { MOCK_RECENT_TRADES } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function RecentTradesWidget() {
  const { isDemoMode } = useDemoStore();
  const realTrades = useTradeTableData();
  const trades = isDemoMode
    ? MOCK_RECENT_TRADES
    : realTrades.map((trade) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side as "long" | "short",
        pnl: trade.pnl,
        pnlPercent: trade.pnlPercent,
        time: `${trade.date} ${trade.time}`,
      }));

  if (!isDemoMode && trades.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h3 className="font-display text-sm font-semibold text-slate-200">
            Recent Trades
          </h3>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
            <p className="text-slate-500 text-sm">No recent trades</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="font-display text-sm font-semibold text-slate-200">
          Recent Trades
        </h3>
        <Link
          href="/journal"
          className="text-xs font-medium text-[#0ea5e9] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {trades.map((trade) => (
            <Link
              key={trade.id}
              href={`/journal?trade_id=${trade.id}`}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.06] hover:border-white/[0.1]"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-medium uppercase",
                    trade.side === "long" ? "text-[#22c55e]" : "text-[#f43f5e]",
                  )}
                >
                  {trade.side}
                </span>
                <span className="text-sm text-slate-300">{trade.symbol}</span>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "text-sm font-medium text-data",
                    trade.pnl >= 0 ? "text-[#22c55e]" : "text-[#f43f5e]",
                  )}
                >
                  {formatCurrency(trade.pnl)}
                </span>
                <span
                  className={cn(
                    "ml-2 text-xs",
                    trade.pnlPercent >= 0 ? "text-[#22c55e]" : "text-[#f43f5e]",
                  )}
                >
                  {formatPercent(trade.pnlPercent)}
                </span>
                <p className="text-xs text-slate-500">{trade.time}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
