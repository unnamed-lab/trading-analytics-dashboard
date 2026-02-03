"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimeframeSelector } from "./timeframe-selector";
import { useDemoStore } from "@/lib/stores/demo-store";
import {
  usePnLOverviewData,
  useDailyPnLData,
} from "@/lib/stores/trade-selectors";
import {
  formatCurrency,
  formatPercent,
  getColorForPnL,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

function TrendIndicator({ change }: { change: number }) {
  const isPositive = change >= 0;
  return (
    <span
      className={cn(
        "ml-2 text-sm font-medium",
        isPositive ? "text-[#22c55e]" : "text-[#f43f5e]",
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
          getColorForPnL(value).replace("#", "text-[") + "]",
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function PnLOverviewCard() {
  const { isDemoMode } = useDemoStore();
  const realData = usePnLOverviewData();
  const sparklineData = useDailyPnLData();

  const data = isDemoMode
    ? {
        total: 438,
        realized: 320,
        unrealized: 118,
        roiPercent: 4.38,
        dailyChange: 2.1,
      }
    : realData;

  const total = data.total;

  // Use mock data for demo or if no real data
  const chartData = isDemoMode
    ? [
        { date: "Mon", pnl: 120 },
        { date: "Tue", pnl: -45 },
        { date: "Wed", pnl: 280 },
        { date: "Thu", pnl: -12 },
        { date: "Fri", pnl: 95 },
        { date: "Sat", pnl: 150 },
        { date: "Sun", pnl: -30 },
      ]
    : sparklineData;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-sm font-semibold text-slate-200">
            TOTAL P&L
          </h3>
          <TimeframeSelector />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline">
            <span
              className={cn(
                "text-3xl font-bold text-data",
                total >= 0 ? "text-[#22c55e]" : "text-[#f43f5e]",
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
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="pnlGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
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
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "PnL",
                    ]}
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
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No PnL data
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
