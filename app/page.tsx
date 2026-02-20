"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import FilterBar from "@/components/dashboard/filter-bar";
import FeesBreakdown from "@/components/dashboard/fees-breakdown";
import TradeHistory from "@/components/dashboard/trade-history";
import { CommandCenter } from "@/components/dashboard/command-center";
import { HeatMaps } from "@/components/dashboard/heat-maps";
import { FusionGraph } from "@/components/dashboard/fusion-graph";
import { PerformanceMatrix } from "@/components/dashboard/performance-matrix";
import { FeeWaterfall } from "@/components/dashboard/fee-waterfall";
import { MomentumGauge } from "@/components/dashboard/momentum-gauge";
import KPIRow from "@/components/dashboard/kpi-row";
import { AICoach } from "@/components/dashboard/ai-coach";
import { LoadingTerminal } from "@/components/ui/loading-terminal";
import { ErrorBanner } from "@/components/ui/error-banner";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { TradeFilters } from "@/types";
import { useAllTrades } from "@/hooks/use-trade-queries";

export default function HomePage() {
  const { connected, publicKey } = useWallet();
  const [showTerminal, setShowTerminal] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<TradeFilters>({
    period: "7D",
  });

  // Fetch data to determine loading state
  const { data: analytics, isLoading, isFetching, isError, error } = useTradeAnalytics(filters);
  const {
    data: realTrades = [],
    isLoading: realLoading,
  } = useAllTrades({
    enabled: connected && !!publicKey,
    excludeFees: true,
    filters,
  });


  // Initial loading terminal logic
  useEffect(() => {
    // Hide terminal once initial loading is done or if not connected
    if (!isLoading && !realLoading && showTerminal) {
      // Add a small delay for smooth transition
      const timer = setTimeout(() => setShowTerminal(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, showTerminal, realLoading]);

  // Handle period changes
  const handlePeriodChange = (period: string) => {
    setFilters((prev) => ({ ...prev, period }));
  };

  const handleFilterChange = (newFilters: Partial<TradeFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // 1. Not connected state (handled by AppShell overlay mostly, but we can show skeleton behind)
  if (!connected) {
    return <DashboardSkeleton />;
  }

  // 2. Initial Terminal Loading
  if (showTerminal && isLoading || realLoading) {
    return <LoadingTerminal onComplete={() => setShowTerminal(false)} />;
  }

  // 3. Skeleton Loading - REMOVED full page swap
  // Individual components now handle their own skeletons based on isLoading/isFetching
  // const shouldShowSkeleton = (isLoading || isFetching || realLoading) && !analytics && !realTrades;
  // if (shouldShowSkeleton) {
  //   return <DashboardSkeleton />;
  // }

  return (
    <div className="min-h-screen bg-background/50 pb-20 relative animate-in fade-in duration-500">

      {isError && (
        <ErrorBanner message={error?.message || "Failed to load trade data. Please try refreshing."} />
      )}

      {/* 1. The Command Center (Fixed Top) */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CommandCenter
          activePeriod={filters.period || "7D"}
          onPeriodChange={handlePeriodChange}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 space-y-6 mt-6">
        {/* KPI Row Overview */}
        <KPIRow />

        {/* 2. Top Row: Momentum & Heat Maps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            <MomentumGauge filters={filters} />
          </div>
          <div className="lg:col-span-2">
            <HeatMaps filters={filters} />
          </div>
        </div>

        {/* 3. The Fusion & Performance Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 space-y-6">
            <FusionGraph filters={filters} />
            <TradeHistory filters={filters} onFilterChange={handleFilterChange} />
          </div>

          {/* Right Column Analysis */}
          <div className="space-y-6">
            <PerformanceMatrix filters={filters} />
            <FeeWaterfall filters={filters} />
            <FeesBreakdown /> {/* Keeping existing component as detailed view */}
          </div>
        </div>
      </div>

      {/* 4. The AI Coach (Floating) */}
      <AICoach />

      {/* Hidden Filter Bar state management for compatibility with TradeHistory for now */}
      <div className="hidden">
        <FilterBar
          setActivePeriod={(p) => handlePeriodChange(p)}
          activePeriod={filters.period || "7D"}
        />
      </div>
    </div>
  );
}
