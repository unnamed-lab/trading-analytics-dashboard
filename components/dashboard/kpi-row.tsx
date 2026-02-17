import {
  TrendingUp,
  Target,
  BarChart3,
  Coins,
  ArrowUpDown,
} from "lucide-react";
import {
  useTradeAnalytics,
  useCalculatedPnL,
  useAllTrades,
} from "@/hooks/use-trade-queries";
import { useMemo } from "react";

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
};

const defaultIcons = {
  total: TrendingUp,
  winRate: Target,
  volume: BarChart3,
  fees: Coins,
  ratio: ArrowUpDown,
};

export default function KPIRow({
  analyticsProp,
}: {
  analyticsProp?: Partial<AnalyticsSummary>;
}) {
  // Get analytics from the full report
  const { data: analytics } = useTradeAnalytics();
  const { data: pnlCalculatedTrades } = useCalculatedPnL();
  const { data: rawTrades } = useAllTrades();

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
    };
  }, [analytics, pnlCalculatedTrades, rawTrades]);

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

  const kpis = [
    {
      label: "NET PNL",
      value: `${finalMetrics.netPnL >= 0 ? "+" : "-"}$${Math.abs(
        finalMetrics.netPnL,
      ).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      sub: `${finalMetrics.totalTrades} Trades`,
      icon: defaultIcons.total,
      positive: finalMetrics.netPnL >= 0,
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
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {kpi.label}
            </span>
            <kpi.icon className="h-4 w-4 text-primary" />
          </div>
          <span
            className={`font-mono text-xl sm:text-2xl font-bold ${
              kpi.positive
                ? "text-profit"
                : kpi.negative
                  ? "text-loss"
                  : "text-foreground"
            }`}
          >
            {kpi.value}
          </span>
          {kpi.sub && (
            <span
              className={`text-xs ${
                kpi.positive ? "text-profit" : "text-muted-foreground"
              }`}
            >
              {kpi.sub}
            </span>
          )}
          {kpi.progress !== undefined && (
            <div className="mt-1">
              <div className="h-1 w-full rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${kpi.progress}%` }}
                />
              </div>
            </div>
          )}
          {kpi.ratio && (
            <div className="mt-1">
              <div className="flex h-1 w-full rounded-full overflow-hidden">
                <div
                  className="bg-profit"
                  style={{ width: `${kpi.ratio.long}%` }}
                />
                <div
                  className="bg-loss"
                  style={{ width: `${kpi.ratio.short}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Long {kpi.ratio.long.toFixed(0)}%</span>
                <span>Short {kpi.ratio.short.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
