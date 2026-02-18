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
      <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">
            Cumulative PnL
          </h3>
          <div className="flex rounded border border-border overflow-hidden">
            <button className="px-3 py-1 text-xs font-medium bg-secondary text-foreground">
              Line
            </button>
            <button className="px-3 py-1 text-xs font-medium text-muted-foreground">
              Bar
            </button>
          </div>
        </div>
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          No PnL data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          Cumulative PnL
        </h3>
        <div className="flex rounded border border-border overflow-hidden">
          <button
            onClick={() => setMode("line")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${mode === "line"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Line
          </button>
          <button
            onClick={() => setMode("bar")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${mode === "bar"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Bar
          </button>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "line" ? (
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
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
                stroke="hsl(222, 25%, 16%)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 40%, 8%)",
                  border: "1px solid hsl(222, 25%, 16%)",
                  borderRadius: 4,
                  color: "hsl(210, 20%, 90%)",
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "PnL"]}
                labelFormatter={(label) => `Date: ${label}`}
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
                dot={{
                  fill:
                    chartData[chartData.length - 1]?.pnl >= 0
                      ? "#10b981"
                      : "#ef4444",
                  r: 3,
                }}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={barData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(222, 25%, 16%)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 40%, 8%)",
                  border: "1px solid hsl(222, 25%, 16%)",
                  borderRadius: 4,
                  color: "hsl(210, 20%, 90%)",
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  `$${value.toFixed(2)}`,
                  "Daily PnL",
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar
                dataKey="daily"
                fill="hsl(187, 100%, 50%)"
                radius={[2, 2, 0, 0]}
              >
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.daily >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div>
          <span className="block">Total PnL</span>
          <span
            className={`font-mono text-sm font-bold ${chartData[chartData.length - 1]?.pnl >= 0
              ? "text-profit"
              : "text-loss"
              }`}
          >
            ${chartData[chartData.length - 1]?.pnl.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <span className="block">Best Day</span>
          <span className="font-mono text-sm font-bold text-profit">
            +${Math.max(...barData.map((d) => d.daily)).toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <span className="block">Worst Day</span>
          <span className="font-mono text-sm font-bold text-loss">
            ${Math.min(...barData.map((d) => d.daily)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CumulativePnLChart;
