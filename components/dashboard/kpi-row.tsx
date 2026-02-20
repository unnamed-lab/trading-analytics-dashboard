import {
  TrendingUp,
  Target,
  BarChart3,
  Coins,
  ArrowUpDown,
} from "lucide-react";
import {
  DashboardCardSkeleton,
  KPISkeleton,
  DashboardError,
} from "@/components/ui/dashboard-states";
import {
  useTradeAnalytics,
  useCalculatedPnL,
  useAllTrades,
} from "@/hooks/use-trade-queries";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type AnalyticsSummary = {
  totalPnl: number;
  winRate: number;
  totalVolume: number;
  totalFees: number;
  longTrades: number;
  shortTrades: number;
  longVolume: number;
  shortVolume: number;
  totalTrades: number;
  netPnL: number;
  unrealizedPnL: number;
};

const defaultIcons = {
  total: TrendingUp,
  winRate: Target,
  volume: BarChart3,
  fees: Coins,
  ratio: ArrowUpDown,
};



// ... imports

export default function KPIRow({
  analyticsProp,
}: {
  analyticsProp?: Partial<AnalyticsSummary>;
}) {
  // Get analytics from the full report
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch } = useTradeAnalytics();
  const { data: pnlCalculatedTrades, isLoading: pnlLoading } = useCalculatedPnL();
  const { data: rawTrades, isLoading: tradesLoading } = useAllTrades();

  // Derive metrics from the full analytics report or fallback to calculated values
  const metrics = useMemo(() => {
    // If we have the full analytics report, use it
    if (analytics) {
      return {
        totalPnl: analytics.core?.totalPnL ?? 0,
        winRate: analytics.core?.winRate ?? 0,
        totalVolume: analytics.core?.totalVolume ?? 0,
        totalFees: analytics.core?.totalFees ?? 0,
        netPnL: analytics.core?.netPnL ?? 0,
        longTrades: analytics.longShort?.longTrades ?? 0,
        shortTrades: analytics.longShort?.shortTrades ?? 0,
        longVolume: analytics.longShort?.longVolume ?? 0,
        shortVolume: analytics.longShort?.shortVolume ?? 0,
        totalTrades: analytics.core?.totalTrades ?? 0,
        unrealizedPnL: analytics.core?.unrealizedPnl ?? 0,
      };
    }

    // If we have PnL calculated trades but no analytics, derive basic metrics
    if (pnlCalculatedTrades && pnlCalculatedTrades.length > 0) {
      const totalPnl = pnlCalculatedTrades.reduce(
        (sum, t) => sum + (t.pnl || 0),
        0,
      );
      const totalVolume = pnlCalculatedTrades.reduce(
        (sum, t) => sum + t.entryPrice * t.quantity,
        0,
      );
      const totalFees = pnlCalculatedTrades.reduce(
        (sum, t) => sum + (t.fees?.total || 0),
        0,
      );
      const winningTrades = pnlCalculatedTrades.filter(
        (t) => (t.pnl || 0) > 0,
      ).length;
      const winRate = (winningTrades / pnlCalculatedTrades.length) * 100;

      const longTrades = pnlCalculatedTrades.filter(
        (t) => t.side === "long" || t.side === "buy",
      ).length;
      const shortTrades = pnlCalculatedTrades.filter(
        (t) => t.side === "short" || t.side === "sell",
      ).length;

      return {
        totalPnl,
        winRate,
        totalVolume,
        totalFees,
        netPnL: totalPnl - totalFees,
        longTrades,
        shortTrades,
        longVolume: 0, // Can calculate if needed
        shortVolume: 0, // Can calculate if needed
        totalTrades: pnlCalculatedTrades.length,
        unrealizedPnL: 0,
      };
    }

    // Fallback to raw trades
    if (rawTrades && rawTrades.length > 0) {
      const totalPnl = rawTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalVolume = rawTrades.reduce(
        (sum, t) => sum + t.entryPrice * t.quantity,
        0,
      );
      const totalFees = rawTrades.reduce(
        (sum, t) => sum + (t.fees?.total || 0),
        0,
      );
      const fillTrades = rawTrades.filter(
        (t) => t.discriminator === 11 || t.discriminator === 19,
      );
      const winningTrades = fillTrades.filter((t) => (t.pnl || 0) > 0).length;
      const winRate =
        fillTrades.length > 0 ? (winningTrades / fillTrades.length) * 100 : 0;

      return {
        totalPnl,
        winRate,
        totalVolume,
        totalFees,
        netPnL: totalPnl - totalFees,
        longTrades: 0,
        shortTrades: 0,
        longVolume: 0,
        shortVolume: 0,
        totalTrades: fillTrades.length,
        unrealizedPnL: 0,
      };
    }

    // Default values
    return {
      totalPnl: 0,
      winRate: 0,
      totalVolume: 0,
      totalFees: 0,
      netPnL: 0,
      longTrades: 0,
      shortTrades: 0,
      longVolume: 0,
      shortVolume: 0,
      totalTrades: 0,
      unrealizedPnL: 0,
    };
  }, [analytics, pnlCalculatedTrades, rawTrades]);

  const isLoading = analyticsLoading || pnlLoading || tradesLoading;

  if (isLoading && !analyticsProp) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <KPISkeleton key={i} />
        ))}
      </div>
    );
  }

  if (analyticsError && !analyticsProp) {
    return (
      <DashboardError
        message="Failed to load KPI metrics"
        onRetry={() => refetch()}
        className="min-h-[150px]"
      />
    );
  }

  // Override with prop values if provided
  const finalMetrics = {
    ...metrics,
    ...analyticsProp,
  };

  // Calculate L/S ratio
  const longShortRatio =
    finalMetrics.shortTrades > 0
      ? (finalMetrics.longTrades / finalMetrics.shortTrades).toFixed(2)
      : finalMetrics.longTrades.toFixed(2);

  // Calculate percentages for the ratio bar
  const totalDirectionalTrades =
    finalMetrics.longTrades + finalMetrics.shortTrades;
  const longPercentage =
    totalDirectionalTrades > 0
      ? (finalMetrics.longTrades / totalDirectionalTrades) * 100
      : 50;
  const shortPercentage =
    totalDirectionalTrades > 0
      ? (finalMetrics.shortTrades / totalDirectionalTrades) * 100
      : 50;

  const totalWithUnrealized = finalMetrics.netPnL + finalMetrics.unrealizedPnL;

  const kpis = [
    {
      label: "TOTAL PNL",
      value: `${totalWithUnrealized >= 0 ? "+" : "-"}$${Math.abs(
        totalWithUnrealized,
      ).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      sub: `Real: $${finalMetrics.netPnL.toFixed(0)} | Unr: $${finalMetrics.unrealizedPnL.toFixed(0)}`,
      icon: defaultIcons.total,
      positive: totalWithUnrealized >= 0,
    },
    {
      label: "WIN RATE",
      value: `${finalMetrics.winRate.toFixed(1)}%`,
      sub: `${finalMetrics.totalTrades} trades`,
      icon: defaultIcons.winRate,
      progress: Math.min(100, Math.max(0, finalMetrics.winRate)),
      positive: finalMetrics.winRate >= 50,
    },
    {
      label: "VOLUME",
      value:
        finalMetrics.totalVolume >= 1000
          ? `$${(finalMetrics.totalVolume / 1000).toFixed(1)}K`
          : `$${finalMetrics.totalVolume.toFixed(2)}`,
      sub: `${finalMetrics.totalTrades} Trades`,
      icon: defaultIcons.volume,
    },
    {
      label: "FEES PAID",
      value: `$${Math.abs(finalMetrics.totalFees).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })}`,
      sub:
        finalMetrics.totalVolume > 0
          ? `${((finalMetrics.totalFees / finalMetrics.totalVolume) * 100).toFixed(3)}% of volume`
          : undefined,
      icon: defaultIcons.fees,
      negative: finalMetrics.totalFees > 0,
    },
    {
      label: "L/S RATIO",
      value: longShortRatio,
      sub: `${finalMetrics.longTrades}L / ${finalMetrics.shortTrades}S`,
      icon: defaultIcons.ratio,
      ratio: {
        long: longPercentage,
        short: shortPercentage,
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi, index) => (
        <div
          key={kpi.label}
          className="glass-card rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-300"
        >
          {/* Subtle background gradient based on index */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-50" />

          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {kpi.label}
            </span>
            <div className={cn("p-1.5 rounded-lg bg-white/[0.05]", kpi.positive ? "text-emerald-400" : kpi.negative ? "text-rose-400" : "text-electric")}>
              <kpi.icon className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="relative z-10">
            <span
              className={cn(
                "font-mono text-xl sm:text-2xl font-bold tracking-tight block mb-1",
                kpi.positive
                  ? "text-emerald-400 text-glow-green"
                  : kpi.negative
                    ? "text-rose-400 text-glow-red"
                    : "text-white"
              )}
            >
              {kpi.value}
            </span>

            {kpi.sub && (
              <span className="text-[11px] font-medium text-slate-500 block truncate">
                {kpi.sub}
              </span>
            )}
          </div>

          {/* Progress / Ratio Bars */}
          {kpi.progress !== undefined && (
            <div className="mt-auto relative z-10 pt-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", kpi.positive ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]")}
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
            </div>
          )}

          {kpi.ratio && (
            <div className="mt-auto relative z-10 pt-1">
              <div className="flex h-1.5 w-full rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-10"
                  style={{ width: `${kpi.ratio.long}%` }}
                />
                <div
                  className="bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)] z-10"
                  style={{ width: `${kpi.ratio.short}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] items-center mt-1.5 font-medium">
                <span className="text-emerald-500">Long {kpi.ratio.long.toFixed(0)}%</span>
                <span className="text-rose-500">Short {kpi.ratio.short.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
