"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MOCK_FEE_BREAKDOWN } from "@/lib/mock-data";
import { useDemoStore } from "@/lib/stores/demo-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

const BAR_COLORS = ["#0ea5e9", "#a78bfa", "#64748b"];

export function FeeAnalysisWidget() {
  const { isDemoMode } = useDemoStore();
  const data = isDemoMode ? MOCK_FEE_BREAKDOWN : MOCK_FEE_BREAKDOWN;
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold text-slate-200">Fee Analysis</h3>
        <p className="text-xs text-slate-500">
          Total: ${total.toFixed(2)} · Fee/PnL ratio in dashboard
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-40 w-full rounded-lg bg-white/[0.02]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="type"
                width={72}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(15 23 42 / 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
              />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]} maxBarSize={24}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
