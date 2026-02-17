import { useState } from "react";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
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
} from "recharts";

const sampleData = [
  { date: "Oct 1", pnl: 1000 },
  { date: "Oct 4", pnl: 1200 },
  { date: "Oct 6", pnl: 900 },
  { date: "Oct 8", pnl: 1400 },
  { date: "Oct 10", pnl: 2100 },
  { date: "Oct 12", pnl: 2600 },
  { date: "Oct 14", pnl: 2400 },
  { date: "Oct 16", pnl: 3200 },
  { date: "Oct 18", pnl: 3100 },
  { date: "Oct 20", pnl: 3500 },
  { date: "Oct 22", pnl: 3400 },
  { date: "Oct 24", pnl: 4700 },
];

const buildDailyFrom = (data: { date: string; pnl: number }[]) =>
  data.map((d, i) => ({ ...d, daily: i === 0 ? 0 : d.pnl - data[i - 1].pnl }));

const CumulativePnLChart = () => {
  const [mode, setMode] = useState<"line" | "bar">("line");
  const { data: analytics } = useTradeAnalytics();

  // Build chart data from analytics.dailyPnl if available
  const chartData = analytics?.timing?.dailyPnl
    ? Object.entries(analytics.timing.dailyPnl).map(([date, pnl]) => ({ date, pnl }))
    : sampleData;

  const barData = buildDailyFrom(chartData as { date: string; pnl: number }[]);

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          Cumulative PnL
        </h3>
        <div className="flex rounded border border-border overflow-hidden">
          <button
            onClick={() => setMode("line")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === "line"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setMode("bar")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === "bar"
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
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(187, 100%, 50%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(187, 100%, 50%)"
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
              />
              <YAxis
                tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
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
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="hsl(187, 100%, 50%)"
                strokeWidth={2}
                fill="url(#pnlGradient)"
                dot={{ fill: "hsl(187, 100%, 50%)", r: 3 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={barData}>
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
                tickFormatter={(v) => `$${v}`}
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
              />
              <Bar dataKey="daily" fill="hsl(187, 100%, 50%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CumulativePnLChart;
