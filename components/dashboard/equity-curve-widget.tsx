"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDemoStore } from "@/lib/stores/demo-store";
import { useEquityCurveData } from "@/lib/stores/trade-selectors";
import { MOCK_EQUITY_CURVE } from "@/lib/mock-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function EquityCurveWidget() {
  const { isDemoMode } = useDemoStore();
  const realData = useEquityCurveData();
  const data = isDemoMode ? MOCK_EQUITY_CURVE : realData;

  // If no real data and not in demo mode, show placeholder
  if (!isDemoMode && data.length === 0) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <h3 className="font-display text-sm font-semibold text-slate-200">
            Equity Curve
          </h3>
          <p className="text-xs text-slate-500">
            Account value over time with drawdown
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full rounded-lg bg-white/[0.02] flex items-center justify-center">
            <p className="text-slate-500 text-sm">No trade data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <h3 className="font-display text-sm font-semibold text-slate-200">
          Equity Curve
        </h3>
        <p className="text-xs text-slate-500">
          Account value over time with drawdown
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full rounded-lg bg-white/[0.02]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(15 23 42 / 0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`,
                  "Value",
                ]}
                labelFormatter={(label) => label || "Day"}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#equityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
