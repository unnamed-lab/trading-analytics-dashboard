"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDemoStore } from "@/lib/stores/demo-store";
import { useLongShortData } from "@/lib/stores/trade-selectors";
import { MOCK_LONG_SHORT } from "@/lib/mock-data";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = ["#22c55e", "#f43f5e"];

export function LongShortWidget() {
  const { isDemoMode } = useDemoStore();
  const realData = useLongShortData();
  const { long, short } = isDemoMode ? MOCK_LONG_SHORT : realData;
  const data = [
    { name: "Long", value: long, color: COLORS[0] },
    { name: "Short", value: short, color: COLORS[1] },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold text-slate-200">
          Long / Short Ratio
        </h3>
        <p className="text-xs text-slate-500">Position distribution</p>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full rounded-lg bg-white/[0.02]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={64}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(15 23 42 / 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [`${value}%`, ""]}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-slate-300 text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex justify-center gap-6 text-sm font-medium">
          <span className="text-[#22c55e]">{long}% Long</span>
          <span className="text-[#f43f5e]">{short}% Short</span>
        </div>
      </CardContent>
    </Card>
  );
}
