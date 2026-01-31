"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useFilterStore } from "@/lib/stores/filter-store";
import { PnLOverviewCard } from "@/components/dashboard/pnl-overview-card";
import { PerformanceGrid } from "@/components/dashboard/performance-grid";
import { EquityCurveWidget } from "@/components/dashboard/equity-curve-widget";
import { LongShortWidget } from "@/components/dashboard/long-short-widget";
import { RecentTradesWidget } from "@/components/dashboard/recent-trades-widget";
import { FeeAnalysisWidget } from "@/components/dashboard/fee-analysis-widget";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { setSymbol, setTimeframe } = useFilterStore();

  useEffect(() => {
    const symbol = searchParams.get("symbol");
    const timeframe = searchParams.get("timeframe");
    if (symbol) setSymbol(symbol);
    if (timeframe && ["24h", "7d", "30d", "90d", "all"].includes(timeframe)) {
      setTimeframe(timeframe as "24h" | "7d" | "30d" | "90d" | "all");
    }
  }, [searchParams, setSymbol, setTimeframe]);

  return (
    <AppShell>
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-slate-100 sm:text-3xl">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            PnL, equity curve, performance metrics, and recent activity.
          </p>
        </div>
        <div className="grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <PnLOverviewCard />
          <PerformanceGrid />
          <EquityCurveWidget />
          <LongShortWidget />
          <FeeAnalysisWidget />
          <RecentTradesWidget />
        </div>
      </div>
    </AppShell>
  );
}
