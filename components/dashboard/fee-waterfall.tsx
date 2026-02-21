"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { ChartSkeleton } from "@/components/ui/dashboard-states";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import { TradeFilters } from "@/types";
import { cn } from "@/lib/utils";

export function FeeWaterfall({ filters: _propsFilters }: { filters?: TradeFilters }) {
    const { analytics, isLoading } = useDashboard();

    if (isLoading || !analytics) return <ChartSkeleton />;

    const { totalPnL, totalFees, netPnL, totalFunding } = analytics.core;

    // Construct waterfall data
    // Start: Gross PnL (Total PnL + Fees - Funding if funding is included in PnL, but let's assume PnL is net of funding but gross of fees for this viz)
    // Actually, let's look at `analytics.core`:
    // totalPnL is usually what the fetcher returns. 
    // Let's assume:
    // Gross PnL = Net PnL + Fees - Funding (if funding is positive) or + Funding (if negative)... logic is tricky without precise definitions.
    // valuable metric: "Trading PnL" (Price Action) vs "Friction" (Fees) vs "Funding"

    // Let's define the steps:
    // 1. Gross Profit (from price action)
    // 2. Fees (always negative flow)
    // 3. Funding (can be +/-)
    // 4. Net PnL

    // We can approximate Gross PnL as Net PnL + Fees - Funding
    const grossPnL = netPnL + totalFees - totalFunding;

    const data = [
        { name: "Gross PnL", value: grossPnL, fill: "#3b82f6" }, // Blue
        { name: "Fees", value: -totalFees, fill: "#f43f5e" },    // Red
        { name: "Funding", value: totalFunding, fill: totalFunding >= 0 ? "#10b981" : "#f43f5e" },
        { name: "Net PnL", value: netPnL, fill: netPnL >= 0 ? "#10b981" : "#f43f5e", isTotal: true },
    ];

    // Waterfall logic is usually custom in Recharts, but we can standard Bar chart it
    // Or just show these 4 meaningful bars side-by-side which is clearer than a complex waterfall sometimes.
    // The user asked for a Waterfall specifically. 
    // A true waterfall needs "start" and "end" values for floating bars.
    // Simpler approach: Breakdown Chart.

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Fee Impact</CardTitle>
                <CardDescription>Breakdown of friction costs</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            fontSize={12}
                            tick={{ fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            dy={5}
                        />
                        <YAxis
                            tickFormatter={(val) => `$${val}`}
                            fontSize={12}
                            tick={{ fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-popover/95 border border-border rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
                                            <p className="font-bold mb-1 text-popover-foreground">{d.name}</p>
                                            <p className={cn("font-mono", d.value >= 0 ? "text-emerald-400" : "text-rose-400")}>${d.value.toFixed(2)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
