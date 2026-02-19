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
  ReferenceLine,
} from "recharts";
import {
  DashboardCardSkeleton,
  DashboardError,
} from "@/components/ui/dashboard-states";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TradeFilters } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChartDataPoint {
  date: string;
  timestamp: number;
  pnl: number;      // cumulative
  daily: number;    // single-day
}

// ─── Safe currency formatter (never produces "$-123") ────────────────────────
const fmtUSD = (v: number, showSign = false) => {
  const abs = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (showSign) return `${v >= 0 ? "+" : "−"}$${abs}`;
  return `${v < 0 ? "−" : ""}$${abs}`;
};

// ─── Safe max/min (no spread → no call-stack limit) ──────────────────────────
const safeMax = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => (b > a ? b : a), -Infinity);
const safeMin = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((a, b) => (b < a ? b : a), Infinity);

// ─── Shared tooltip style ─────────────────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  mode: "line" | "bar";
}) {
  if (!active || !payload?.length) return null;
  const cum   = payload.find((p) => p.dataKey === "pnl")?.value as number | undefined;
  const daily = payload.find((p) => p.dataKey === "daily")?.value as number | undefined;
  const primary = mode === "bar" ? daily : cum;

  return (
    <div className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-2xl p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-popover-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {mode === "line" && cum !== undefined && (
          <Row label="Cumulative">
            <Mono value={cum} />
          </Row>
        )}
        {daily !== undefined && (
          <Row label={mode === "bar" ? "Daily PnL" : "Daily"}>
            <Mono value={daily} />
          </Row>
        )}
        {mode === "line" && daily !== undefined && cum !== undefined && (
          <div className="mt-1 pt-1.5 border-t border-border/40">
            <Row label="Running total">
              <Mono value={cum} />
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Mono({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        value >= 0 ? "text-emerald-400" : "text-rose-400",
      )}
    >
      {fmtUSD(value, true)}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  filters?: TradeFilters;
}

const CumulativePnLChart = ({ filters }: Props) => {
  const [mode, setMode] = useState<"line" | "bar">("line");

  // Pass filters down so the chart respects active period/symbol filters
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch,
  } = useTradeAnalytics(filters);
  const { data: pnlTrades, isLoading: pnlLoading } = useCalculatedPnL();

  const isLoading = analyticsLoading || pnlLoading;

  // ── Build chart data ────────────────────────────────────────────────────────
  const chartData = useMemo((): ChartDataPoint[] => {
    // Prefer analytics timeSeries (pre-computed, fast)
    if (analytics?.timeSeries?.length) {
      return analytics.timeSeries.map((p) => ({
        date:      p.date,
        timestamp: p.timestamp,
        pnl:       p.cumulativePnL,
        daily:     p.tradePnL,
      }));
    }

    // Fallback: aggregate from raw PnL trades
    if (pnlTrades?.length) {
      let cumulative = 0;
      const dailyMap = new Map<string, { cumulative: number; daily: number; ts: number }>();

      const sorted = [...pnlTrades].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      sorted.forEach((trade) => {
        const key = trade.timestamp.toLocaleDateString("en-US", {
          month: "short",
          day:   "numeric",
        });
        cumulative += trade.pnl ?? 0;
        const existing = dailyMap.get(key);
        dailyMap.set(key, {
          cumulative,
          daily:     (existing?.daily ?? 0) + (trade.pnl ?? 0),
          ts:        existing?.ts ?? trade.timestamp.getTime(),
        });
      });

      return Array.from(dailyMap.entries()).map(([date, v]) => ({
        date,
        timestamp: v.ts,
        pnl:       v.cumulative,
        daily:     v.daily,
      }));
    }

    return [];
  }, [analytics, pnlTrades]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const first     = chartData[0].pnl;
    const last      = chartData[chartData.length - 1].pnl;
    const dailyVals = chartData.map((d) => d.daily);
    const bestDay   = safeMax(dailyVals);
    const worstDay  = safeMin(dailyVals);
    const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;

    return { last, bestDay, worstDay, pctChange };
  }, [chartData]);

  // ── Gradient split at y=0 for line chart ──────────────────────────────────
  // We compute what fraction of the Y range sits above zero so the green↔red
  // split in the gradient aligns with the zero line, not the top of the chart.
  const gradientOffset = useMemo(() => {
    if (!chartData.length) return 1;
    const values = chartData.map((d) => d.pnl);
    const max = safeMax(values);
    const min = safeMin(values);
    if (max <= 0) return 0;   // all losses → all red
    if (min >= 0) return 1;   // all gains  → all green
    return max / (max - min); // fraction above zero
  }, [chartData]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) return <DashboardCardSkeleton title="Cumulative PnL" className="min-h-[400px]" />;
  if (analyticsError) return (
    <DashboardError
      title="Chart Error"
      message="Failed to load PnL data"
      onRetry={() => refetch()}
      className="min-h-[400px]"
    />
  );
  if (!chartData.length) return (
    <Card className="min-h-[400px] flex items-center justify-center border-border/50 bg-card/50 backdrop-blur-sm">
      <p className="text-sm text-muted-foreground/60 italic">No PnL data available</p>
    </Card>
  );

  const isProfit = (stats?.last ?? 0) >= 0;

  // ── Shared axis props ──────────────────────────────────────────────────────
  const axisProps = {
    tick:      { fill: "hsl(var(--muted-foreground))", fontSize: 10 },
    axisLine:  false as const,
    tickLine:  false as const,
  };
  const gridProps = {
    strokeDasharray: "3 3" as const,
    vertical:        false as const,
    stroke:          "hsl(var(--border))",
    opacity:         0.35,
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-col min-h-[400px] overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-5 pt-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
            Cumulative PnL
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span
              className={cn(
                "text-2xl font-bold tabular-nums",
                isProfit ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {fmtUSD(stats?.last ?? 0, true)}
            </span>
            {stats?.pctChange != null && (
              <span
                className={cn(
                  "text-xs font-mono",
                  stats.pctChange >= 0 ? "text-emerald-500/70" : "text-rose-500/70",
                )}
              >
                {stats.pctChange >= 0 ? "+" : ""}
                {stats.pctChange.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/40">
          {(["line", "bar"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 capitalize",
                mode === m
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "line" ? "↗ Line" : "▊ Bars"}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <CardContent className="flex-1 px-2 pb-2" style={{ minHeight: 280 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={280}>
          {mode === "line" ? (
            // ── Area chart: cumulative PnL ──────────────────────────────────
            <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
              <defs>
                {/*
                  Split gradient: green above zero, red below.
                  `gradientOffset` is the fraction of the total Y extent above 0.
                */}
                <linearGradient id="splitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"                       stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset={`${(1 - gradientOffset) * 100}%`} stopColor="#10b981" stopOpacity={0.05} />
                  <stop offset={`${(1 - gradientOffset) * 100}%`} stopColor="#ef4444" stopOpacity={0.05} />
                  <stop offset="100%"                     stopColor="#ef4444" stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={`${(1 - gradientOffset) * 100}%`} stopColor="#10b981" />
                  <stop offset={`${(1 - gradientOffset) * 100}%`} stopColor="#ef4444" />
                </linearGradient>
              </defs>

              <CartesianGrid {...gridProps} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.3)" strokeWidth={1} strokeDasharray="4 4" />

              <XAxis
                dataKey="date"
                {...axisProps}
                interval="preserveStartEnd"
                dy={8}
              />
              <YAxis
                {...axisProps}
                tickFormatter={(v) => fmtUSD(v)}
                width={64}
              />

              <Tooltip
                cursor={{ stroke: "hsl(var(--muted-foreground) / 0.3)", strokeWidth: 1 }}
                content={<ChartTooltip mode="line" />}
              />

              <Area
                type="monotone"
                dataKey="pnl"
                stroke="url(#strokeGradient)"
                strokeWidth={2}
                fill="url(#splitGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={1200}
              />
              {/* Hidden bar so tooltip can show daily delta too */}
              <Area
                type="monotone"
                dataKey="daily"
                stroke="transparent"
                fill="transparent"
                legendType="none"
                dot={false}
                activeDot={false}
                animationDuration={0}
              />
            </AreaChart>

          ) : (
            // ── Bar chart: daily PnL ────────────────────────────────────────
            <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="barGradWin"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#34d399" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="barGradLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#f87171" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.5} />
                </linearGradient>
              </defs>

              <CartesianGrid {...gridProps} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.3)" strokeWidth={1} />

              <XAxis
                dataKey="date"
                {...axisProps}
                interval="preserveStartEnd"
                dy={8}
              />
              <YAxis
                {...axisProps}
                tickFormatter={(v) => fmtUSD(v)}
                width={64}
              />

              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)", radius: 4 } as any}
                content={<ChartTooltip mode="bar" />}
              />

              <Bar dataKey="daily" radius={[3, 3, 0, 0]} maxBarSize={20} animationDuration={1200}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.daily >= 0 ? "url(#barGradWin)" : "url(#barGradLoss)"}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>

      {/* ── Stats footer ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-t border-border/40 px-5 py-3 bg-muted/10">
        <StatCell
          label="Total PnL"
          value={fmtUSD(stats?.last ?? 0, true)}
          positive={(stats?.last ?? 0) >= 0}
        />
        <StatCell
          label="Best Day"
          value={fmtUSD(stats?.bestDay ?? 0, true)}
          positive
        />
        <StatCell
          label="Worst Day"
          value={fmtUSD(stats?.worstDay ?? 0, true)}
          positive={false}
        />
        <StatCell
          label="Trading Days"
          value={String(chartData.filter((d) => d.daily !== 0).length)}
        />
      </div>
    </Card>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function StatCell({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <span
        className={cn(
          "font-mono font-bold text-sm tabular-nums",
          positive === undefined
            ? "text-foreground"
            : positive
              ? "text-emerald-400"
              : "text-rose-400",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default CumulativePnLChart;