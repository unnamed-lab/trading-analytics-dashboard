"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Clock,
  Loader2,
} from "lucide-react";
import {
  useAllTrades,
  useMockTrades,
  useExportTrades,
} from "@/hooks/use-trade-queries";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import TradeReviewPanel from "@/components/dashboard/trade-review-panel";
import { getJournalStatus } from "@/data/mockTrades";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;
const periods = ["All", "7D", "30D"];

const TradeHistoryPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activePeriod, setActivePeriod] = useState("All");
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const { connected, publicKey } = useWallet();
  const { exportToCSV, exportToJSON } = useExportTrades();

  // Use real data if wallet is connected, otherwise use mock data
  const { data: realTrades = [], isLoading: realLoading } = useAllTrades({
    enabled: connected && !!publicKey,
    excludeFees: true,
  });

  const { data: mockTrades = [], isLoading: mockLoading } = useMockTrades({
    enabled: !connected || process.env.NODE_ENV === "development",
  });

  const allTrades = connected ? realTrades : mockTrades;
  const isLoading = connected ? realLoading : mockLoading;

  // Filter trades based on period
  const filteredTrades = useMemo(() => {
    if (!allTrades.length) return [];

    let filtered = [...allTrades];

    if (activePeriod !== "All") {
      const now = new Date();
      const cutoff = new Date();

      if (activePeriod === "7D") {
        cutoff.setDate(now.getDate() - 7);
        filtered = filtered.filter((t) => new Date(t.timestamp) >= cutoff);
      } else if (activePeriod === "30D") {
        cutoff.setDate(now.getDate() - 30);
        filtered = filtered.filter((t) => new Date(t.timestamp) >= cutoff);
      }
    }

    if (dateRange.start) {
      filtered = filtered.filter(
        (t) => new Date(t.timestamp) >= dateRange.start!,
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(
        (t) => new Date(t.timestamp) <= dateRange.end!,
      );
    }

    return filtered;
  }, [allTrades, activePeriod, dateRange]);

  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTrades.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTrades, currentPage]);

  const handleExportCSV = async () => {
    try {
      const csv = await exportToCSV.mutateAsync(filteredTrades);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trades-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const json = await exportToJSON.mutateAsync(filteredTrades);
      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trades-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    } catch (error) {
      console.error("Failed to export JSON:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-5">
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading your trades...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!connected && filteredTrades.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-5">
        <div className="rounded-lg border border-border bg-card p-12">
          <div className="text-center text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">No Wallet Connected</h3>
            <p>Connect your wallet to view your trade history</p>
            <p className="text-sm mt-4">Demo data will appear when available</p>
          </div>
        </div>
      </div>
    );
  }

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
                {filteredTrades.length.toLocaleString()}
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
            <button
              onClick={handleExportCSV}
              disabled={exportToCSV.isPending}
              className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors disabled:opacity-50"
              title="Export as CSV"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handleExportJSON}
              disabled={exportToJSON.isPending}
              className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors disabled:opacity-50"
              title="Export as JSON"
            >
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
                  "Price",
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
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("h-2 w-2 rounded-full",
                            trade.symbol.startsWith("SOL")
                              ? "bg-primary"
                              : trade.symbol.startsWith("BTC")
                                ? "bg-warning"
                                : trade.symbol.startsWith("ETH")
                                  ? "bg-[hsl(270, 70%, 60%)]"
                                  : "bg-muted",
                          )}
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
                      {trade.quantity.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                      -${Math.abs(trade.fees.total).toFixed(2)}
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
        {filteredTrades.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-mono font-bold text-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-mono font-bold text-foreground">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredTrades.length)}
              </span>{" "}
              of{" "}
              <span className="font-mono font-bold text-primary">
                {filteredTrades.length.toLocaleString()}
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
