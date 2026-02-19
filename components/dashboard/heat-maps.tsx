"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import HeatMap from '@uiw/react-heat-map';
import Tooltip from '@uiw/react-tooltip';

import { TradeFilters } from "@/types";

export function HeatMaps({ filters }: { filters?: TradeFilters }) {
    const { data: analytics } = useTradeAnalytics(filters);

    if (!analytics) return null;

    const { hourly, dailyPnl } = analytics;

    // Explicit typing for the map iteration
    const pnlMap = dailyPnl || new Map<string, number>();

    // Calculate dynamic range for intensity
    let maxAbsPnl = 0;
    pnlMap.forEach((pnl) => {
        const abs = Math.abs(pnl);
        if (abs > maxAbsPnl) maxAbsPnl = abs;
    });
    if (maxAbsPnl === 0) maxAbsPnl = 100; // prevent divide by zero

    const value = Array.from<[string, number]>(pnlMap.entries()).map(([dateStr, pnl]: [string, number]) => {
        let intensity = 0;

        // Normalize PnL to 0-4 scale for each side (5 levels: 1-5 for loss, 11-15 for win)
        // Level 1/11: 0-20% of max
        // Level 2/12: 20-40% of max
        // ...

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

    const today = new Date();
    const startDate = new Date();
    startDate.setFullYear(today.getFullYear() - 1);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Heat Map (Hourly) */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Daily Rhythm</CardTitle>
                    <CardDescription>Performance by hour of day (UTC)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourly}>
                            <XAxis dataKey="hour" tickFormatter={(val) => `${val}h`} fontSize={10} />
                            <YAxis hide />
                            <RechartsTooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                                                <p className="font-bold mb-1">{data.hour}:00 - {data.hour + 1}:00</p>
                                                <p className={data.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}>
                                                    PnL: ${data.pnl.toFixed(2)}
                                                </p>
                                                <p className="text-muted-foreground">Trades: {data.trades}</p>
                                                <p className="text-muted-foreground">Win Rate: {data.winRate.toFixed(1)}%</p>
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
                                        fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"}
                                        fillOpacity={0.8}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* GitHub-style Calendar Heat Map */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Trading Consistency</CardTitle>
                    <CardDescription>Daily PnL Activity (Last Year)</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center overflow-x-auto">
                    <HeatMap
                        value={value}
                        startDate={startDate}
                        endDate={today}
                        width={600}
                        rectSize={12}
                        space={3}
                        panelColors={{
                            0: '#27272a', // empty

                            // Losses (Dark Red -> Bright Red)
                            1: '#7f1d1d', // 0-20%
                            2: '#991b1b', // 20-40%
                            3: '#b91c1c', // 40-60%
                            4: '#dc2626', // 60-80%
                            5: '#ef4444', // 80-100%

                            // Wins (Dark Green -> Bright Green)
                            11: '#064e3b', // 0-20%
                            12: '#065f46', // 20-40%
                            13: '#047857', // 40-60%
                            14: '#059669', // 60-80%
                            15: '#10b981', // 80-100%
                        }}
                        rectProps={{
                            rx: 2.5
                        }}
                        rectRender={(props, data) => {
                            if (!data.count) return <rect {...props} />;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const pnl = (data as any).pnl;
                            return (
                                <Tooltip placement="top" content={`$${pnl?.toFixed(2) || '0.00'}`}>
                                    <rect {...props} />
                                </Tooltip>
                            );
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
