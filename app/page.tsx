"use client";

import { useState } from "react";

import FilterBar from "@/components/dashboard/filter-bar";
import AIInsights from "@/components/dashboard/ai-insights";
import KPIRow from "@/components/dashboard/kpi-row";
import PortfolioSnapshot from "@/components/dashboard/portfolio-snapshot";
import CumulativePnLChart from "@/components/dashboard/cumulative-pnl-chart";
import FeesBreakdown from "@/components/dashboard/fees-breakdown";
import TradeHistory from "@/components/dashboard/trade-history";


export default function HomePage() {
  const [activePeriod, setActivePeriod] = useState("7D");
  const [sides, setSides] = useState({ long: true, short: true });

  const filters = {
    period: activePeriod,
    sides,
  };

  return (
    <>
      <FilterBar
        activePeriod={activePeriod}
        setActivePeriod={setActivePeriod}
        onSideChange={setSides}
      />
      <div className="px-4 sm:px-6 pb-8 flex flex-col gap-4 sm:gap-5">
        <KPIRow />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2">
            <AIInsights />
          </div>
          <PortfolioSnapshot />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2">
            <CumulativePnLChart />
          </div>
          <div className="flex flex-col gap-4 sm:gap-5">
            <FeesBreakdown />
          </div>
        </div>

        <TradeHistory filters={filters} />
      </div>
    </>
  );
}
