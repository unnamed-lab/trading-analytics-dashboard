"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAllTrades } from "@/hooks/use-trade-queries";
import { cn } from "@/lib/utils";
import { TradeFilters } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function MomentumGauge({ filters }: { filters?: TradeFilters }) {
    // Get all trades, sorted by date descending (default from hook)
    const { data: trades } = useAllTrades({ filters });

    const { score, status, statusColor, recentWinRate } = useMemo(() => {
        if (!trades || trades.length === 0) {
            return { score: 50, status: "No Data", statusColor: "text-muted-foreground", recentWinRate: 0 };
        }

        // Analyze last 50 trades
        const recentTrades = trades.slice(0, 50);
        const totalRecent = recentTrades.length;

        if (totalRecent === 0) {
            return { score: 50, status: "No Data", statusColor: "text-muted-foreground", recentWinRate: 0 };
        }

        let wins = 0;
        let totalGains = 0;
        let totalLosses = 0;

        recentTrades.forEach((t) => {
            const val = t.pnl || 0;
            if (val > 0) {
                wins++;
                totalGains += val;
            } else {
                totalLosses += Math.abs(val);
            }
        });

        // RSI-like Momentum Calculation (Profitability Index)
        // Formula: 100 * TotalGains / (TotalGains + TotalLosses)
        // If 0 volume (flat), 50.
        const totalMovement = totalGains + totalLosses;
        let rsiScore = totalMovement === 0 ? 50 : (totalGains / totalMovement) * 100;

        // Round to integer
        rsiScore = Math.round(rsiScore);

        // Determine Status based on RSI levels
        let statusStr = "Neutral";
        let color = "text-muted-foreground";

        if (rsiScore >= 70) {
            statusStr = "On Fire 🔥";
            color = "text-rose-500";
        } else if (rsiScore >= 60) {
            statusStr = "Heating Up";
            color = "text-orange-500";
        } else if (rsiScore <= 30) {
            statusStr = "Ice Cold ❄️";
            color = "text-blue-500";
        } else if (rsiScore <= 40) {
            statusStr = "Cooling Down";
            color = "text-cyan-500";
        } else {
            statusStr = "Stable";
            color = "text-emerald-500";
        }

        return {
            score: rsiScore,
            status: statusStr,
            statusColor: color,
            recentWinRate: totalRecent > 0 ? (wins / totalRecent) * 100 : 0
        };
    }, [trades]);

    // Gauge Data for Recharts
    // Slices: [Value, Remainder]
    // Value = score, Remainder = 100 - score
    // We actually want a semi-circle gauge. 
    // Easier way: 
    // Create a needle implementation or use a colored pie slice.
    // Let's use a Pie chart to show "zones" and a needle overlay.

    const gaugeData = [
        { name: "Cold", value: 33, color: "#3b82f6" },   // Blue
        { name: "Neutral", value: 33, color: "#10b981" }, // Emerald
        { name: "Hot", value: 33, color: "#f43f5e" },     // Rose
    ];

    // Needle rotation: -90deg (0) to 90deg (100)
    // Formula: rotation = (score / 100) * 180 - 90
    const needleRotation = (score / 100) * 180 - 90;

    return (
        <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Momentum</span>
                    <span className={cn("text-sm font-mono", statusColor)}>{status}</span>
                </CardTitle>
                <CardDescription>Based on last 50 trades</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6 relative">

                {/* Gauge Chart */}
                <div className="w-full h-[140px] relative overflow-hidden flex justify-center items-end pb-2">
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={gaugeData}
                                cx="50%"
                                cy="50%" // Center at bottom
                                startAngle={180}
                                endAngle={0}
                                innerRadius={80}
                                outerRadius={110}
                                dataKey="value"
                                stroke="none"
                            >
                                {gaugeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Needle */}
                    <div
                        className="absolute bottom-2 left-1/2 w-[4px] h-[90px] bg-foreground origin-bottom rounded-t-full transition-transform duration-700 ease-out"
                        style={{
                            transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                            zIndex: 10
                        }}
                    >
                        <div className="absolute -bottom-1 -left-1.5 w-4 h-4 rounded-full bg-foreground" />
                    </div>
                </div>

                <div className="flex justify-between w-full text-xs text-muted-foreground mt-4 px-8">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-3xl font-bold tracking-tighter">{score}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Momentum Score (L50 Win Rate: {recentWinRate.toFixed(0)}%)
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

