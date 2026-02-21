// app/trades/page.tsx (or wherever your full trade history page is)
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
import { ErrorBanner } from "@/components/ui/error-banner";
import {
  useAllTrades,
  useMockTrades,
  useExportTrades,
} from "@/hooks/use-trade-queries";
import { useWallet } from "@solana/wallet-adapter-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl, formatQuantity } from "@/types";
import TradeReviewPanel from "@/components/dashboard/trade-review-panel";
// import { getJournalStatus } from "@/data/mockTrades"; // Removed mock import
import { cn } from "@/lib/utils";
import { useJournals } from "@/hooks/use-journals"; // Added hook
import bs58 from "bs58"; // Added bs58 for signer

const ITEMS_PER_PAGE = 20;
const periods = ["All", "24H", "7D", "30D"];

const TradeHistoryPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activePeriod, setActivePeriod] = useState("All");
  const [selectedTrade, setSelectedTrade] = useState<TradeRecord | null>(null);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [symbolFilter, setSymbolFilter] = useState<string>("All Symbols");
  const [sideFilter, setSideFilter] = useState<"all" | "long" | "short">("all");
  const [sortBy, setSortBy] = useState<"date" | "pnl" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { connected, publicKey, signMessage } = useWallet();
  const { exportToCSV, exportToJSON } = useExportTrades();

  // Create signer for useJournals
  const signer = async (messageB64: string) => {
    if (!signMessage) throw new Error("wallet cannot sign messages");
    let msgBytes: Uint8Array;
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = window.atob(messageB64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      msgBytes = arr;
    } else {
      msgBytes = new Uint8Array(Buffer.from(messageB64, "base64"));
    }
    const signed = await signMessage(msgBytes as Uint8Array);
    const sigBytes = (signed as unknown as { signature: Uint8Array })?.signature ?? signed;
    return bs58.encode(Buffer.from(sigBytes));
  };

  const publicKeyStr = publicKey?.toBase58() ?? null;
  const { list: journalList } = useJournals(publicKeyStr, signer);

  // Memoize journaled trade IDs for O(1) lookup
  const journaledTradeIds = useMemo(() => {
    if (!journalList.data) return new Set<string>();
    const ids = new Set<string>();
    journalList.data.forEach((j: { tradeId?: string | null }) => {
      if (j.tradeId) ids.add(j.tradeId);
    });
    return ids;
  }, [journalList.data]);


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

  // Basic error handling for real trades
  const isError = connected && (realTrades as { error?: string })?.error;

  const perpTrades = useMemo(() => {
    return allTrades.filter(t => t.discriminator === 19 || t.tradeType === "perp");
  }, [allTrades]);

  // Apply additional filters
  const filteredTrades = useMemo(() => {
    if (!perpTrades.length) return [];

    let filtered = [...perpTrades];

    // Time period filter
    if (activePeriod !== "All") {
      const now = new Date();
      const cutoff = new Date();

      if (activePeriod === "24H") {
        cutoff.setDate(now.getDate() - 1);
        filtered = filtered.filter((t) => new Date(t.timestamp) >= cutoff);
      } else if (activePeriod === "7D") {
        cutoff.setDate(now.getDate() - 7);
        filtered = filtered.filter((t) => new Date(t.timestamp) >= cutoff);
      } else if (activePeriod === "30D") {
        cutoff.setDate(now.getDate() - 30);
        filtered = filtered.filter((t) => new Date(t.timestamp) >= cutoff);
      }
    }

    // Date range filter
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

    // Symbol filter
    if (symbolFilter !== "All Symbols") {
      filtered = filtered.filter((t) => t.symbol === symbolFilter);
    }

    // Side filter
    if (sideFilter !== "all") {
      filtered = filtered.filter((t) =>
        sideFilter === "long"
          ? (t.side === "long" || t.side === "buy")
          : (t.side === "short" || t.side === "sell")
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === "pnl") {
        comparison = a.pnl - b.pnl;
      } else if (sortBy === "price") {
        comparison = (a.entryPrice || 0) - (b.entryPrice || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [perpTrades, activePeriod, dateRange, symbolFilter, sideFilter, sortBy, sortOrder]);

  // Get unique symbols for filter dropdown
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(perpTrades.map(t => t.symbol));
    return ["All Symbols", ...Array.from(symbols)];
  }, [perpTrades]);

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
      a.download = `perp-trades-${new Date().toISOString().split("T")[0]}.csv`;
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
      a.download = `perp-trades-${new Date().toISOString().split("T")[0]}.json`;
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
            <span>Loading your perpetual trades...</span>
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
            <p>Connect your wallet to view your perpetual trade history</p>
            <p className="text-sm mt-4">Demo data will appear when available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-5 relative">
      {isError && (
        <ErrorBanner message="Failed to load trades. Please try refreshing." />
      )}
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
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${activePeriod === p
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Symbol filter */}
          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="rounded border border-border px-3 py-1.5 text-sm bg-transparent outline-none hover:bg-secondary focus:border-primary transition-colors cursor-pointer"
          >
            {uniqueSymbols.map(s => (
              <option key={s} value={s} className="bg-card text-foreground">{s}</option>
            ))}
          </select>

          {/* Side filter */}
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as "all" | "long" | "short")}
            className="rounded border border-border px-3 py-1.5 text-sm bg-transparent outline-none hover:bg-secondary focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all" className="bg-card text-foreground">All Sides</option>
            <option value="long" className="bg-card text-foreground">Long Only</option>
            <option value="short" className="bg-card text-foreground">Short Only</option>
          </select>

          {/* Sort controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "pnl" | "price")}
            className="rounded border border-border px-3 py-1.5 text-sm bg-transparent outline-none hover:bg-secondary focus:border-primary transition-colors cursor-pointer"
          >
            <option value="date" className="bg-card text-foreground">Sort by Date</option>
            <option value="pnl" className="bg-card text-foreground">Sort by PnL</option>
            <option value="price" className="bg-card text-foreground">Sort by Price</option>
          </select>

          <button
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="px-2 py-1.5 text-sm border border-border rounded"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-mono font-bold text-foreground">
              {filteredTrades.length.toLocaleString()}
            </span>{" "}
            <span className="text-xs">Perpetual Trades Found</span>
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
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Perpetual Trade History
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-border">
                {[
                  "Date",
                  "Symbol",
                  "Side",
                  "Price",
                  "Quantity (SOL)",
                  "Fees",
                  "PnL",
                  "ROI %",
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
                const isJournaled = journaledTradeIds.has(trade.id);
                // const journalStatus = getJournalStatus(trade.id); // Replaced with real data
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
                    <td className="px-5 py-3.5 font-mono text-sm text-loss">
                      -${Math.abs(trade.fees.total).toFixed(2)}
                    </td>
                    <td
                      className={`px-5 py-3.5 font-mono text-sm font-bold ${trade.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                    >
                      {formatPnl(trade.pnl)}
                    </td>
                    <td
                      className={`px-5 py-3.5 font-mono text-sm ${trade.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                    >
                      {trade.pnlPercentage >= 0 ? "+" : ""}
                      {trade.pnlPercentage.toFixed(2)}%
                    </td>
                    <td className="px-5 py-3.5">
                      {isJournaled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-0.5 text-xs text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-profit" />
                          Journaled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-loss/30 bg-loss/10 px-3 py-0.5 text-xs text-loss">
                          <span className="h-1.5 w-1.5 rounded-full bg-loss" />
                          Missing
                        </span>
                      )}
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
              </span>{" - "}
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
                  className={`h-8 w-8 rounded text-sm font-medium transition-colors ${currentPage === page
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
                    className={`h-8 w-8 rounded text-sm font-medium transition-colors ${currentPage === totalPages
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