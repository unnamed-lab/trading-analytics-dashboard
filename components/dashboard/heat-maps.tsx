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
    const value = Array.from<[string, number]>(pnlMap.entries()).map(([dateStr, pnl]: [string, number]) => {
        let intensity = 0;
        if (pnl > 0) intensity = pnl > 1000 ? 14 : pnl > 500 ? 13 : pnl > 100 ? 12 : 11;
        if (pnl < 0) intensity = pnl < -1000 ? 4 : pnl < -500 ? 3 : pnl < -100 ? 2 : 1;

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
                            0: '#27272a',
                            1: '#fda4af',
                            2: '#f43f5e',
                            3: '#be123c',
                            4: '#881337',
                            11: '#6ee7b7',
                            12: '#10b981',
                            13: '#047857',
                            14: '#064e3b',
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
