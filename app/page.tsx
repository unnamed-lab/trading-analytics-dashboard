"use client";

import { useState } from "react";

import FilterBar from "@/components/dashboard/filter-bar";
import FeesBreakdown from "@/components/dashboard/fees-breakdown";
import TradeHistory from "@/components/dashboard/trade-history";
import { CommandCenter } from "@/components/dashboard/command-center";
import { HeatMaps } from "@/components/dashboard/heat-maps";
import { FusionGraph } from "@/components/dashboard/fusion-graph";
import { PerformanceMatrix } from "@/components/dashboard/performance-matrix";
import { FeeWaterfall } from "@/components/dashboard/fee-waterfall";
import { MomentumGauge } from "@/components/dashboard/momentum-gauge";
import { AICoach } from "@/components/dashboard/ai-coach";
import { TradeFilters } from "@/types";

export default function HomePage() {
  const [filters, setFilters] = useState<TradeFilters>({
    period: "7D",
  });

  const handlePeriodChange = (period: string) => {
    setFilters((prev) => ({ ...prev, period }));
  };

  const handleFilterChange = (newFilters: Partial<TradeFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-background/50 pb-20">
      {/* 1. The Command Center (Fixed Top) */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CommandCenter
          activePeriod={filters.period || "7D"}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 space-y-6 mt-6">

        {/* 2. Top Row: Momentum & Heat Maps */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <MomentumGauge filters={filters} />
          </div>
          <div className="lg:col-span-3">
            <HeatMaps filters={filters} />
          </div>
        </div>

        {/* 3. The Fusion & Performance Layer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          activePeriod={filters.period || "7D"}
          setActivePeriod={(p) => handlePeriodChange(p)}
        />
      </div>
    </div>
  );
}
