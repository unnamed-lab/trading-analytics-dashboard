"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MOCK_PERFORMANCE, formatCurrency } from "@/lib/mock-data";
import { useDemoStore } from "@/lib/stores/demo-store";
import { cn } from "@/lib/utils";

const metrics = [
  {
    key: "winRate",
    label: "Win Rate",
    value: `${MOCK_PERFORMANCE.winRate}%`,
    threshold: 50,
    isPercent: true,
  },
  {
    key: "avgWin",
    label: "Avg Win",
    value: formatCurrency(MOCK_PERFORMANCE.avgWin),
    threshold: 0,
    isPercent: false,
  },
  {
    key: "avgLoss",
    label: "Avg Loss",
    value: formatCurrency(MOCK_PERFORMANCE.avgLoss),
    threshold: 0,
    isPercent: false,
  },
  {
    key: "profitFactor",
    label: "Profit Factor",
    value: MOCK_PERFORMANCE.profitFactor.toFixed(2),
    threshold: 1,
    isPercent: false,
  },
];

function MetricCard({
  label,
  value,
  threshold,
  isPercent,
}: {
  label: string;
  value: string;
  threshold: number;
  isPercent: boolean;
}) {
  let colorClass = "text-slate-300";
  if (isPercent && parseFloat(value) >= threshold) colorClass = "text-[#22c55e]";
  else if (isPercent && parseFloat(value) < threshold) colorClass = "text-[#f43f5e]";
  else if (!isPercent && label.includes("Loss")) colorClass = "text-[#f43f5e]";
  else if (!isPercent && (label.includes("Win") || label.includes("Factor"))) {
    const num = parseFloat(value);
    if (num >= threshold) colorClass = "text-[#22c55e]";
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold text-data", colorClass)}>
        {value}
      </p>
    </div>
  );
}

export function PerformanceGrid() {
  const { isDemoMode } = useDemoStore();
  const data = MOCK_PERFORMANCE;

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
