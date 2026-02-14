"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Clock,
} from "lucide-react";
import { allTrades, getJournalStatus } from "@/data/mockTrades";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import TradeReviewPanel from "@/components/dashboard/trade-review-panel";

const ITEMS_PER_PAGE = 7;
const periods = ["All", "7D", "30D"];

const TradeHistoryPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activePeriod, setActivePeriod] = useState("All");
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);

  const totalPages = Math.ceil(allTrades.length / ITEMS_PER_PAGE);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return allTrades.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage]);

  return (
    <div className="px-4 sm:px-6 py-5">
      {/* Filter bar */}
      <div className="rounded-lg border border-border bg-card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Date Range
            </span>
            <div className="flex rounded border border-border overflow-hidden">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    activePeriod === p
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center rounded border border-border px-3 py-1.5 text-sm text-muted-foreground gap-2">
              <span>mm/dd/yyyy</span>
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-border" />

          {["All Symbols", "All Sides", "Profitability (All)"].map((label) => (
            <button
              key={label}
              className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              {label}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
            Journal Status (A…
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              <span className="font-mono font-bold text-foreground">
                {allTrades.length.toLocaleString()}
              </span>{" "}
              <span className="text-xs">Trades Found</span>
            </span>
            <button className="rounded bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-opacity">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Full Trade History
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors">
              <Download className="h-4 w-4" />
            </button>
            <button className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors">
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                {[
                  "Date",
                  "Asset",
                  "Side",
                  "Entry Price",
                  "Exit Price",
                  "Qty",
                  "Fees",
                  "PnL",
                  "Journal",
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
              {paginatedTrades.map((trade) => {
                const journalStatus = getJournalStatus(trade.id);
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
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: trade.symbol.startsWith("SOL")
                              ? "hsl(var(--primary))"
                              : trade.symbol.startsWith("BTC")
                                ? "hsl(var(--warning))"
                                : trade.symbol.startsWith("ETH")
                                  ? "hsl(270, 70%, 60%)"
                                  : "hsl(var(--muted-foreground))",
                          }}
                        />
                        <span className="font-mono text-sm font-medium text-foreground">
                          {trade.symbol}
                        </span>
                      </div>
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
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      {trade.quantity.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      -${trade.fees.total.toFixed(2)}
                    </td>
                    <td
                      className={`px-5 py-3.5 font-mono text-sm font-medium ${
                        trade.pnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatPnl(trade.pnl)}
                    </td>
                    <td className="px-5 py-3.5">
                      {journalStatus === "journaled" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-0.5 text-xs text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-profit" />
                          Journaled
                        </span>
                      ) : journalStatus === "missing" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-loss/30 bg-loss/10 px-3 py-0.5 text-xs text-loss">
                          <span className="h-1.5 w-1.5 rounded-full bg-loss" />
                          Missing Entry
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-mono font-bold text-foreground">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-mono font-bold text-foreground">
              {Math.min(currentPage * ITEMS_PER_PAGE, allTrades.length)}
            </span>{" "}
            of{" "}
            <span className="font-mono font-bold text-primary">
              {allTrades.length.toLocaleString()}
            </span>{" "}
            results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from(
              { length: Math.min(3, totalPages) },
              (_, i) => i + 1,
            ).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {page}
              </button>
            ))}
            {totalPages > 3 && (
              <>
                <span className="text-muted-foreground px-1">…</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                    currentPage === totalPages
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedTrade && (
        <TradeReviewPanel
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  );
};

export default TradeHistoryPage;
