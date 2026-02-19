"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts";
import { TradeFilters } from "@/types";
import { format } from "date-fns";

export function FusionGraph({ filters }: { filters?: TradeFilters }) {
    const { data: analytics } = useTradeAnalytics(filters);

    if (!analytics) return null;

    const { drawdown, timeSeries } = analytics;

    // Merge PnL and Drawdown data
    const data = timeSeries.map((item) => {
        // Find matching drawdown point (approximate by timestamp)
        const ddPoint = drawdown.drawdownSeries.find(
            (d) => Math.abs(d.timestamp - item.timestamp) < 1000 * 60 * 60 * 24 // within 24h
        );

        return {
            ...item,
            drawdown: ddPoint ? ddPoint.drawdown : 0,
            drawdownPct: ddPoint ? (ddPoint.drawdown / (ddPoint.peak || 1)) * 100 : 0
        };
    });

    return (
        <Card className="col-span-2 mb-6">
            <CardHeader>
                <CardTitle>Performance Fusion</CardTitle>
                <CardDescription>Cumulative PnL vs Drawdown Depth</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={(ts) => format(new Date(ts), "MMM dd")}
                            minTickGap={30}
                            fontSize={12}
                        />
                        <YAxis yAxisId="left" orientation="left" fontSize={12} tickFormatter={(val) => `$${val}`} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={(val) => `$${val}`} />

                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
                                            <p className="font-bold mb-2">{format(new Date(label), "PPP")}</p>
                                            <div className="space-y-1">
                                                <p className="text-emerald-500 flex justify-between gap-4">
                                                    <span>Cumulative PnL:</span>
                                                    <span className="font-mono font-bold">${Number(payload[0].value).toFixed(2)}</span>
                                                </p>
                                                <p className="text-rose-500 flex justify-between gap-4">
                                                    <span>Drawdown:</span>
                                                    <span className="font-mono font-bold">${Number(payload[1].value).toFixed(2)}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="cumulativePnL"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorPnL)"
                            strokeWidth={2}
                        />

                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="drawdown"
                            stroke="#f43f5e"
                            fillOpacity={1}
                            fill="url(#colorDD)"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
