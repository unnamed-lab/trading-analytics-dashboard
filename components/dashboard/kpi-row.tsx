import { TrendingUp, Target, BarChart3, Coins, ArrowUpDown } from "lucide-react";
import { useTradeAnalytics, useCalculatedPnL } from "@/hooks/use-trade-queries";

type AnalyticsSummary = Partial<{
  totalPnl: number;
  winRate: number;
  totalVolume: number;
  totalFees: number;
  long: number;
  short: number;
}>;

const defaultIcons = {
  total: TrendingUp,
  winRate: Target,
  volume: BarChart3,
  fees: Coins,
  ratio: ArrowUpDown,
};

export default function KPIRow({ analyticsProp }: { analyticsProp?: AnalyticsSummary }) {
  const { data: analytics } = useTradeAnalytics();
  const { data: detailedPnL } = useCalculatedPnL();

  const a = analyticsProp ?? (analytics as any) ?? {};

  const totalPnl = a.totalPnl ?? (analytics?.summary?.totalPnl ?? 12450.23);
  const winRate = a.winRate ?? (analytics?.summary?.winRate ?? 64.2);
  const totalVolume = a.totalVolume ?? (analytics?.summary?.totalVolume ?? 2400000);
  const totalFees = a.totalFees ?? (analytics?.fees?.totalFees ?? -1204.5);
  const directional = analytics?.directional ?? { long: 65, short: 35 };

  const kpis = [
    {
      label: "TOTAL PNL",
      value: `${totalPnl >= 0 ? "+" : "-"}$${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: analytics?.summary?.totalPnl ? undefined : "+12.5% vs prev",
      icon: defaultIcons.total,
      positive: totalPnl >= 0,
    },
    {
      label: "WIN RATE",
      value: `${winRate.toFixed(1)}%`,
      icon: defaultIcons.winRate,
      progress: Math.min(100, Math.max(0, winRate)),
    },
    {
      label: "VOLUME",
      value: `$${(totalVolume >= 1000 ? (totalVolume / 1000).toFixed(1) + "k" : totalVolume)}`,
      sub: `${detailedPnL?.length ?? 0} Trades`,
      icon: defaultIcons.volume,
    },
    {
      label: "FEES PAID",
      value: `${totalFees < 0 ? "-" : "+"}$${Math.abs(totalFees).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: analytics?.fees ? undefined : "0.05% Avg Fee",
      icon: defaultIcons.fees,
      negative: totalFees < 0,
    },
    {
      label: "L/S RATIO",
      value: `${(directional.long / Math.max(1, directional.short)).toFixed(2)}`,
      icon: defaultIcons.ratio,
      ratio: { long: directional.long ?? 65, short: directional.short ?? 35 },
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
              kpi.positive ? "text-profit" : kpi.negative ? "text-loss" : "text-foreground"
            }`}
          >
            {kpi.value}
          </span>
          {kpi.sub && (
            <span className={`text-xs ${kpi.positive ? "text-profit" : "text-muted-foreground"}`}>
              {kpi.sub}
            </span>
          )}
          {kpi.progress !== undefined && (
            <div className="h-1 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${kpi.progress}%` }} />
            </div>
          )}
          {kpi.ratio && (
            <div className="flex h-1 w-full rounded-full overflow-hidden">
              <div className="bg-profit" style={{ width: `${kpi.ratio.long}%` }} />
              <div className="bg-loss" style={{ width: `${kpi.ratio.short}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
