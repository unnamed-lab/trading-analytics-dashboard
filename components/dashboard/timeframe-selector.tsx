"use client";

import { useFilterStore, type Timeframe } from "@/lib/stores/filter-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Timeframe; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export function TimeframeSelector() {
  const { timeframe, setTimeframe } = useFilterStore();

  return (
    <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTimeframe(value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            timeframe === value
              ? "bg-[#0ea5e9] text-white"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
