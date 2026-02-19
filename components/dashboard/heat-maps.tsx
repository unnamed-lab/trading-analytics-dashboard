"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid } from "recharts";
import HeatMap from '@uiw/react-heat-map';
import Tooltip from '@uiw/react-tooltip';

import { TradeFilters } from "@/types";

export function HeatMaps({ filters }: { filters?: TradeFilters }) {
    const { data: analytics } = useTradeAnalytics(filters);

    const { hourly, dailyPnl } = useMemo(() => {
        if (!analytics) return { hourly: [], dailyPnl: new Map<string, number>() };
        return {
            hourly: analytics.hourly,
            dailyPnl: analytics.dailyPnl || new Map<string, number>()
        };
    }, [analytics]);

    const heatMapData = useMemo(() => {
        // Calculate dynamic range for intensity
        let maxAbsPnl = 0;
        dailyPnl.forEach((pnl) => {
            const abs = Math.abs(pnl);
            if (abs > maxAbsPnl) maxAbsPnl = abs;
        });
        if (maxAbsPnl === 0) maxAbsPnl = 100; // prevent divide by zero

        return Array.from(dailyPnl.entries()).map(([dateStr, pnl]) => {
            let intensity = 0;

            // Normalize PnL to 0-4 scale for each side (5 levels: 1-5 for loss, 11-15 for win)
            const ratio = Math.abs(pnl) / maxAbsPnl;
            const level = Math.ceil(ratio * 5); // 1 to 5
            const clampedLevel = Math.max(1, Math.min(5, level));

            if (pnl > 0) {
                intensity = 10 + clampedLevel; // 11 to 15
            } else if (pnl < 0) {
                intensity = clampedLevel; // 1 to 5
            }

            return {
                date: dateStr.replace(/-/g, '/'),
                count: intensity,
                pnl: pnl
            };
        });
    }, [dailyPnl]);

    const { today, startDate } = useMemo(() => {
        const t = new Date();
        const s = new Date();

        // Dynamic start date based on data
        if (dailyPnl.size > 0) {
            const dates = Array.from(dailyPnl.keys()).map(d => new Date(d).getTime());
            const minDate = Math.min(...dates);
            s.setTime(minDate);

            // If data is older than 1 year, capitulate to 1 year ago to avoid huge grids
            // OR if data is very recent, ensure we show at least 3 months for context
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(t.getFullYear() - 1);

            if (s < oneYearAgo) {
                s.setTime(oneYearAgo.getTime());
            } else {
                // Adjust start date to be the first of that month for cleaner UI
                s.setDate(1);
            }
        } else {
            // Default to 6 months if no data
            s.setMonth(t.getMonth() - 6);
        }

        return { today: t, startDate: s };
    }, [dailyPnl]);

    if (!analytics) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Heat Map (Hourly) */}
            <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Daily Rhythm</CardTitle>
                    <CardDescription>Performance by hour of day (UTC)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourly}>
                            <defs>
                                <linearGradient id="barGradientWin" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                                </linearGradient>
                                <linearGradient id="barGradientLoss" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.4} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                            <XAxis
                                dataKey="hour"
                                tickFormatter={(val) => `${val}h`}
                                fontSize={10}
                                tick={{ fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis hide />
                            <RechartsTooltip
                                cursor={{ fill: '#334155', opacity: 0.4 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-popover/95 border border-border rounded-xl p-3 shadow-xl backdrop-blur-md text-xs">
                                                <p className="font-semibold mb-2 text-popover-foreground">{data.hour}:00 - {data.hour + 1}:00</p>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-muted-foreground">PnL</span>
                                                        <span className={`font-mono font-medium ${data.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                            ${data.pnl.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-muted-foreground">Trades</span>
                                                        <span className="text-foreground">{data.trades}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-muted-foreground">Win Rate</span>
                                                        <span className="text-foreground">{data.winRate.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                {hourly.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.pnl >= 0 ? "url(#barGradientWin)" : "url(#barGradientLoss)"}
                                        stroke={entry.pnl >= 0 ? "#10b981" : "#f43f5e"}
                                        strokeWidth={1}
                                        strokeOpacity={0.5}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* GitHub-style Calendar Heat Map */}
            <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Trading Consistency</CardTitle>
                    <CardDescription>Daily PnL Activity</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center overflow-x-auto text-slate-400">
                    {heatMapData.length > 0 ? (
                        <HeatMap
                            value={heatMapData}
                            startDate={startDate}
                            endDate={today}
                            width={750}
                            rectSize={14}
                            space={3}
                            panelColors={{
                                0: '#475569', // empty

                                // Losses (Dark Red -> Bright Red)
                                1: '#450a0a', // very dark red
                                2: '#7f1d1d',
                                3: '#991b1b',
                                4: '#dc2626',
                                5: '#ef4444', // bright red

                                // Wins (Dark Green -> Bright Green)
                                11: '#022c22', // very dark green
                                12: '#064e3b',
                                13: '#065f46',
                                14: '#059669',
                                15: '#10b981', // bright green
                            }}
                            rectProps={{
                                rx: 3,
                                ry: 3
                            }}
                            rectRender={(props, data) => {
                                if (!data.count) return <rect {...props} />;
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const pnl = (data as any).pnl;
                                return (
                                    <Tooltip
                                        placement="top"
                                        content={
                                            <div className="text-xs">
                                                <span className="font-semibold block">{data.date}</span>
                                                <span className={pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                                    ${pnl?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                        }
                                    >
                                        <rect {...props} />
                                    </Tooltip>
                                );
                            }}
                        />
                    ) : (
                        <div className="text-muted-foreground text-sm">No trading activity data found</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

