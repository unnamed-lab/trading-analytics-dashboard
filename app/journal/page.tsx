"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookOpen, Filter, ExternalLink } from "lucide-react";
import { useDemoStore } from "@/lib/stores/demo-store";
import {
  MOCK_JOURNAL_TRADES,
  formatCurrency,
  formatPercent,
  type JournalTrade,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function JournalTable({ trades }: { trades: JournalTrade[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left text-slate-500">
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Side</th>
            <th className="px-4 py-3 font-medium">Entry → Exit</th>
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium text-right">PnL</th>
            <th className="px-4 py-3 font-medium text-right">%</th>
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Setup</th>
            <th className="w-8 px-2 py-3" aria-label="View" />
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr
              key={trade.id}
              className="border-b border-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.04]"
            >
              <td className="px-4 py-3 font-medium text-slate-200">{trade.symbol}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium uppercase",
                    trade.side === "long"
                      ? "bg-[#22c55e]/15 text-[#22c55e]"
                      : "bg-[#f43f5e]/15 text-[#f43f5e]"
                  )}
                >
                  {trade.side}
                </span>
              </td>
              <td className="px-4 py-3 text-data text-slate-400">
                ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-slate-400">{trade.size}</td>
              <td
                className={cn(
                  "px-4 py-3 text-right text-data font-medium",
                  trade.pnl >= 0 ? "text-[#22c55e]" : "text-[#f43f5e]"
                )}
              >
                {formatCurrency(trade.pnl)}
              </td>
              <td
                className={cn(
                  "px-4 py-3 text-right text-data text-xs",
                  trade.pnlPercent >= 0 ? "text-[#22c55e]" : "text-[#f43f5e]"
                )}
              >
                {formatPercent(trade.pnlPercent)}
              </td>
              <td className="px-4 py-3 text-slate-500">{trade.time}</td>
              <td className="px-4 py-3 text-slate-400">{trade.setup}</td>
              <td className="px-2 py-3">
                <Link
                  href={`/journal?trade_id=${trade.id}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-[#0ea5e9]"
                  aria-label={`View trade ${trade.id}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function JournalPage() {
  const searchParams = useSearchParams();
  const tradeId = searchParams.get("trade_id");
  const { isDemoMode } = useDemoStore();
  const trades = isDemoMode ? MOCK_JOURNAL_TRADES : [];

  return (
    <AppShell>
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-slate-100 sm:text-3xl">
            Trade Journal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter, annotate, and export your trade history.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                    <Filter className="h-4 w-4" />
                  </span>
                  <h2 className="font-display text-sm font-semibold text-slate-200">Filters</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-slate-500">
                  Multi-criteria filtering, saved filters, and live counts will appear here.
                </p>
                {isDemoMode && (
                  <p className="mt-3 text-xs font-medium text-[#22c55e]">
                    Demo: {trades.length} trades shown
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ea5e9]/15 text-[#0ea5e9]">
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <h2 className="font-display text-lg font-semibold text-slate-200">
                    {tradeId ? `Trade ${tradeId}` : "All Trades"}
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  {tradeId
                    ? "Full trade analysis, chart comparison, and annotations."
                    : "Sort, filter, pagination. TradeTable with virtual scrolling."}
                </p>
              </CardHeader>
              <CardContent>
                {tradeId ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-sm text-slate-400">
                      Trade detail view and annotations for trade_id={tradeId} will be implemented
                      here.
                    </p>
                    <Link
                      href="/journal"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0ea5e9] hover:underline"
                    >
                      ← Back to All Trades
                    </Link>
                  </div>
                ) : isDemoMode && trades.length > 0 ? (
                  <JournalTable trades={trades} />
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-slate-500">
                    {!isDemoMode
                      ? "Enable Demo mode from the header to see sample trades, or connect your wallet for live data."
                      : "No trades to display."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
