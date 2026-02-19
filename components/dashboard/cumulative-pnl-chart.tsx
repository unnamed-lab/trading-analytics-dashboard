"use client";

import { useState, useMemo } from "react";
import { useTradeAnalytics, useCalculatedPnL } from "@/hooks/use-trade-queries";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  DashboardCardSkeleton,
  DashboardError,
} from "@/components/ui/dashboard-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  timestamp: number;
  pnl: number;
  daily?: number;
}

const CumulativePnLChart = () => {
  const [mode, setMode] = useState<"line" | "bar">("line");
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch } = useTradeAnalytics();
  const { data: pnlTrades, isLoading: pnlLoading } = useCalculatedPnL();

  const isLoading = analyticsLoading || pnlLoading;

  // Generate chart data from analytics timeSeries or calculate from trades
  const chartData = useMemo((): ChartDataPoint[] => {
    // First try to use analytics timeSeries data
    if (analytics?.timeSeries && analytics.timeSeries.length > 0) {
      return analytics.timeSeries.map((point) => ({
        date: point.date,
        timestamp: point.timestamp,
        pnl: point.cumulativePnL,
        daily: point.tradePnL,
      }));
    }

    // Fallback: calculate from PnL trades
    if (pnlTrades && pnlTrades.length > 0) {
      let cumulative = 0;
      const dailyMap = new Map<string, { cumulative: number; daily: number }>();

      // Sort chronologically
      const sorted = [...pnlTrades].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      sorted.forEach((trade) => {
        const dateStr = trade.timestamp.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        cumulative += trade.pnl || 0;

        if (!dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, { cumulative, daily: trade.pnl || 0 });
        } else {
          const existing = dailyMap.get(dateStr)!;
          dailyMap.set(dateStr, {
            cumulative,
            daily: existing.daily + (trade.pnl || 0),
          });
        }
      });

      return Array.from(dailyMap.entries()).map(([date, values]) => ({
        date,
        timestamp:
          sorted
            .find(
              (t) =>
                t.timestamp.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }) === date,
            )
            ?.timestamp.getTime() || 0,
        pnl: values.cumulative,
        daily: values.daily,
      }));
    }

    // Return empty array if no data
    return [];
  }, [analytics, pnlTrades]);

  // Prepare bar chart data (daily PnL)
  const barData = useMemo(() => {
    return chartData.map((point) => ({
      date: point.date,
      daily: point.daily || 0,
      pnl: point.pnl,
    }));
  }, [chartData]);

  if (isLoading) {
    return <DashboardCardSkeleton title="Cumulative PnL" className="min-h-[400px]" />;
  }

  if (analyticsError) {
    return <DashboardError
      title="Chart Error"
      message="Failed to load PnL data"
      onRetry={() => refetch()}
      className="min-h-[400px]"
    />;
  }

  // Show loading or empty state
  if (chartData.length === 0) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="text-muted-foreground">No PnL data available</div>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-col min-h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-foreground">Cumulative PnL</CardTitle>
        <div className="bg-secondary/50 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setMode("line")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all",
              mode === "line"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Line
          </button>
          <button
            onClick={() => setMode("bar")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all",
              mode === "bar"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Bar
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          {mode === "line" ? (
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={
                      chartData[chartData.length - 1]?.pnl >= 0
                        ? "#10b981"
                        : "#ef4444"
                    }
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={
                      chartData[chartData.length - 1]?.pnl >= 0
                        ? "#10b981"
                        : "#ef4444"
                    }
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.4}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={10}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover/95 border border-border rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
                        <p className="font-semibold mb-2 text-popover-foreground">{label}</p>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Cumulative PnL</span>
                          <span className={`font-mono font-medium ${Number(payload[0].value) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            ${Number(payload[0].value).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={
                  chartData[chartData.length - 1]?.pnl >= 0
                    ? "#10b981"
                    : "#ef4444"
                }
                strokeWidth={2}
                fill="url(#pnlGradient)"
                animationDuration={1500}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={barData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.4}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
                width={60}
              />
              <Tooltip
                cursor={{ fill: '#475569' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover/95 border border-border rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
                        <p className="font-semibold mb-2 text-popover-foreground">{label}</p>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Daily PnL</span>
                          <span className={`font-mono font-medium ${Number(payload[0].value) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            ${Number(payload[0].value).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="daily"
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
              >
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.daily >= 0 ? "#10b981" : "#ef4444"}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>

      <div className="flex border-t border-border/50 p-4 bg-muted/20">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Total PnL</span>
            <span className={`font-mono font-bold ${chartData[chartData.length - 1]?.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ${chartData[chartData.length - 1]?.pnl.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Best Day</span>
            <span className="font-mono font-bold text-emerald-500">
              +${Math.max(...barData.map((d) => d.daily), 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Worst Day</span>
            <span className="font-mono font-bold text-rose-500">
              ${Math.min(...barData.map((d) => d.daily), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CumulativePnLChart;
