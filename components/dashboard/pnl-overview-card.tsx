"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimeframeSelector } from "./timeframe-selector";
import {
  MOCK_PNL_OVERVIEW,
  MOCK_DAILY_PNL,
  formatCurrency,
  formatPercent,
} from "@/lib/mock-data";
import { useDemoStore } from "@/lib/stores/demo-store";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function TrendIndicator({ change }: { change: number }) {
  const isPositive = change >= 0;
  return (
    <span
      className={cn(
        "ml-2 text-sm font-medium",
        isPositive ? "text-[#22c55e]" : "text-[#f43f5e]"
      )}
    >
      {formatPercent(change)}
    </span>
  );
}

function MetricLabel({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-slate-500 text-xs">{label}</span>
      <p
        className={cn(
          "text-sm font-medium text-data",
          value >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function PnLOverviewCard() {
  const { isDemoMode } = useDemoStore();
  const data = MOCK_PNL_OVERVIEW;
  const sparklineData = MOCK_DAILY_PNL;
  const total = data.realized + data.unrealized;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-sm font-semibold text-slate-200">TOTAL P&L</h3>
          <TimeframeSelector />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline">
            <span
              className={cn(
                "text-3xl font-bold text-data",
                total >= 0 ? "text-[#22c55e]" : "text-[#f43f5e]"
              )}
            >
              {formatCurrency(total)}
            </span>
            <TrendIndicator change={data.dailyChange} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <MetricLabel label="Realized" value={data.realized} />
            <MetricLabel label="Unrealized" value={data.unrealized} />
          </div>
          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgb(15 23 42 / 0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "PnL"]}
                />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  fill="url(#pnlGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
