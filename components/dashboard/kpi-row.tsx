import {
  TrendingUp,
  Target,
  BarChart3,
  Coins,
  ArrowUpDown,
} from "lucide-react";

const kpis = [
  {
    label: "TOTAL PNL",
    value: "+$12,450.23",
    sub: "+12.5% vs prev",
    icon: TrendingUp,
    positive: true,
  },
  {
    label: "WIN RATE",
    value: "64.2%",
    icon: Target,
    progress: 64.2,
  },
  {
    label: "VOLUME",
    value: "$2.4M",
    sub: "142 Trades",
    icon: BarChart3,
  },
  {
    label: "FEES PAID",
    value: "-$1,204.50",
    sub: "0.05% Avg Fee",
    icon: Coins,
    negative: true,
  },
  {
    label: "L/S RATIO",
    value: "1.85",
    icon: ArrowUpDown,
    ratio: { long: 65, short: 35 },
  },
];

const KPIRow = () => {
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
              className={`text-xs ${kpi.positive ? "text-profit" : "text-muted-foreground"}`}
            >
              {kpi.sub}
            </span>
          )}
          {kpi.progress !== undefined && (
            <div className="h-1 w-full rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${kpi.progress}%` }}
              />
            </div>
          )}
          {kpi.ratio && (
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
          )}
        </div>
      ))}
    </div>
  );
};

export default KPIRow;
