"use client";

import { useState } from "react";
import {
  Plus,
  ArrowRight,
  Sparkles,
  ChevronDown,
  TrendingUp,
  Download,
} from "lucide-react";
import { journals } from "@/data/mockTrades";
import type { Journal } from "@/types";
import { formatSide, isBullishSide, formatPnl } from "@/types";
import { useRouter } from "next/navigation";

const filters = ["All Entries", "Winners", "Losers", "✦ AI Analyzed"];

const JournalsPage = () => {
  const [activeFilter, setActiveFilter] = useState("All Entries");
  const router = useRouter();

  const filteredJournals = journals.filter((j) => {
    if (activeFilter === "Winners") return j.pnl >= 0;
    if (activeFilter === "Losers") return j.pnl < 0;
    if (activeFilter === "✦ AI Analyzed") return j.aiAnalyzed;
    return true;
  });

  return (
    <div className="px-4 sm:px-6 py-5">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex rounded border border-border overflow-hidden">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === f
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="hidden sm:block w-px h-6 bg-border" />
          <button className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
            Sort by Date: Newest
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-mono font-bold text-foreground">
            {filteredJournals.length}
          </span>{" "}
          of{" "}
          <span className="font-mono font-bold text-primary">
            {journals.length}
          </span>{" "}
          journals
        </p>
      </div>

      {/* Journal cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {/* Log new trade card */}
        <button
          onClick={() => router.push("/journal/new")}
          className="rounded-lg border-2 border-dashed border-border bg-card/50 p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-card transition-all min-h-70"
        >
          <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm text-foreground">
              Log New Trade
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Manually add a trade or import from history
            </p>
          </div>
        </button>

        {/* Journal cards */}
        {filteredJournals.map((journal) => (
          <JournalCard
            key={journal.id}
            journal={journal}
            onClick={() => router.push(`/journal/${journal.id}`)}
          />
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            October Journal Entries
          </p>
          <p className="font-mono text-3xl font-bold text-foreground mt-2">
            24
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs text-profit">
            <TrendingUp className="h-3 w-3" />
            +4 vs Sept
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Review Pending
          </p>
          <p className="font-mono text-3xl font-bold text-foreground mt-2">3</p>
          <p className="text-xs text-muted-foreground mt-2">Need analysis</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Win Rate (Journaled)
          </p>
          <p className="font-mono text-3xl font-bold text-foreground mt-2">
            68%
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: "68%" }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-center gap-2">
          <Download className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-foreground">Export Journal Data</span>
        </div>
      </div>
    </div>
  );
};

const JournalCard = ({
  journal,
  onClick,
}: {
  journal: Journal;
  onClick: () => void;
}) => {
  const isProfitable = journal.pnl >= 0;
  const bullish = isBullishSide(journal.side);

  return (
    <div
      onClick={onClick}
      className="rounded-lg border border-border bg-card p-5 cursor-pointer hover:border-primary/30 transition-all flex flex-col justify-between min-h-70"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-muted-foreground">
            {journal.date}
          </span>
          {journal.aiAnalyzed && (
            <span className="flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              AI Analyzed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-lg font-bold text-foreground">
            {journal.symbol}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              bullish ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
            }`}
          >
            {formatSide(journal.side)}
          </span>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-muted-foreground">PnL</span>
            <p
              className={`font-mono text-lg font-bold ${isProfitable ? "text-profit" : "text-loss"}`}
            >
              {formatPnl(journal.pnl)}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">ROI</span>
            <p
              className={`font-mono text-sm font-medium ${isProfitable ? "text-profit" : "text-loss"}`}
            >
              {journal.pnlPercentage >= 0 ? "+" : ""}
              {journal.pnlPercentage}%
            </p>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-2">
            Trade Notes
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {journal.notes}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto pt-3">
        <div className="flex gap-1.5">
          {journal.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-border bg-secondary/50 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View Details <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default JournalsPage;
