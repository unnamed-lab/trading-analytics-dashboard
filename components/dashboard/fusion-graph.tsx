"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { ChartSkeleton } from "@/components/ui/dashboard-states";
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Bar,
    Cell
} from "recharts";
import { TradeFilters } from "@/types";
import { format } from "date-fns";

export function FusionGraph({ filters: _propsFilters }: { filters?: TradeFilters }) {
    const { analytics, isLoading } = useDashboard();

    const data = useMemo(() => {
        if (!analytics) return [];
        const { drawdown, timeSeries } = analytics;

        // Sort timeSeries by timestamp to ensure correct processing
        const sortedTimeSeries = [...timeSeries].sort((a, b) => a.timestamp - b.timestamp);

        // Down-sample for large datasets (max 50 points for clarity on small graphs)
        const step = Math.max(1, Math.floor(sortedTimeSeries.length / 50));
        const sampledTimeSeries = sortedTimeSeries.filter((_: any, i: number) => i % step === 0 || i === sortedTimeSeries.length - 1);

        // Merge PnL and Drawdown data
        return sampledTimeSeries.map((item) => {
            // Find matching drawdown point (approximate by timestamp)
            const ddPoint = drawdown.drawdownSeries.find(
                (d: any) => Math.abs(d.timestamp - item.timestamp) < 1000 * 60 * 60 * 24 // within 24h
            );

            return {
                ...item,
                drawdown: ddPoint ? ddPoint.drawdown : 0,
                drawdownPct: ddPoint ? (ddPoint.drawdown / (ddPoint.peak || 1)) * 100 : 0
            };
        });
    }, [analytics]);

    if (isLoading) return <ChartSkeleton />;

    if (!analytics) return null;

    if (data.length === 0) {
        return (
            <Card className="col-span-2 mb-6 border-border/50 bg-card/50 backdrop-blur-sm min-h-[400px] flex items-center justify-center">
                <div className="text-muted-foreground">No data available for fusion graph</div>
            </Card>
        );
    }

    return (
        <Card className="col-span-2 mb-6 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Performance Fusion</CardTitle>
                        <CardDescription>Cumulative PnL vs Drawdown Depth</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={(ts) => format(new Date(ts), "MMM dd")}
                            minTickGap={30}
                            fontSize={12}
                            tick={{ fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            fontSize={12}
                            tickFormatter={(val) => `$${val}`}
                            tick={{ fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            fontSize={12}
                            tickFormatter={(val) => `-$${Math.abs(val)}`}
                            tick={{ fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-popover/95 border border-border rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
                                            <p className="font-semibold mb-2 text-popover-foreground">{format(new Date(label), "PPP")}</p>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground mr-4">Cumulative PnL</span>
                                                    <span className="font-mono font-bold text-emerald-500">${Number(payload[0].value).toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground mr-4">Drawdown</span>
                                                    <span className="font-mono font-bold text-rose-500">-${Math.abs(Number(payload[1].value)).toFixed(2)}</span>
                                                </div>
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
                            animationDuration={1500}
                        />

                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="drawdown"
                            stroke="#f43f5e"
                            fillOpacity={1}
                            fill="url(#colorDD)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            animationDuration={1500}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
