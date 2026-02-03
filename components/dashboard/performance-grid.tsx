"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDemoStore } from "@/lib/stores/demo-store";
import { usePerformanceMetricsData } from "@/lib/stores/trade-selectors";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  threshold: number;
  isPercent: boolean;
}

function MetricCard({ label, value, threshold, isPercent }: MetricCardProps) {
  const numericValue =
    typeof value === "string" ? parseFloat(value.replace("%", "")) : value;

  let colorClass = "text-slate-300";
  if (isPercent && numericValue >= threshold) colorClass = "text-[#22c55e]";
  else if (isPercent && numericValue < threshold) colorClass = "text-[#f43f5e]";
  else if (!isPercent && label.includes("Loss")) colorClass = "text-[#f43f5e]";
  else if (!isPercent && (label.includes("Win") || label.includes("Factor"))) {
    if (numericValue >= threshold) colorClass = "text-[#22c55e]";
  }

  const displayValue = isPercent ? `${value}%` : value;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold text-data", colorClass)}>
        {displayValue}
      </p>
    </div>
  );
}

export function PerformanceGrid() {
  const { isDemoMode } = useDemoStore();
  const realMetrics = usePerformanceMetricsData();

  const data = isDemoMode
    ? {
        winRate: 62,
        avgWin: 85,
        avgLoss: -42,
        profitFactor: 1.92,
      }
    : realMetrics;

  const metrics = [
    {
      key: "winRate",
      label: "Win Rate",
      value: data.winRate.toFixed(1),
      threshold: 50,
      isPercent: true,
    },
    {
      key: "avgWin",
      label: "Avg Win",
      value: formatCurrency(data.avgWin),
      threshold: 0,
      isPercent: false,
    },
    {
      key: "avgLoss",
      label: "Avg Loss",
      value: formatCurrency(data.avgLoss),
      threshold: 0,
      isPercent: false,
    },
    {
      key: "profitFactor",
      label: "Profit Factor",
      value: data.profitFactor.toFixed(2),
      threshold: 1,
      isPercent: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold text-slate-200">
          Performance Metrics
        </h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m) => (
            <MetricCard
              key={m.key}
              label={m.label}
              value={m.value}
              threshold={m.threshold}
              isPercent={m.isPercent}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
