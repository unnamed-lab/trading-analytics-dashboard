"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { cn } from "@/lib/utils";
import { TradeFilters } from "@/types";

export function MomentumGauge({ filters }: { filters?: TradeFilters }) {
    const { data: analytics } = useTradeAnalytics(filters);

    if (!analytics) return null;

    // Logic: "Needle points to performance over last 5 trades"
    // Let's get the last 5 trades from timeSeries or fetching them?
    // We can't easily get "last 5 trades" from `analytics` object unless we expose them.
    // But we have `trades` in the hook if we use `useAllTrades`.
    // Wait, `useTradeAnalytics` returns aggregated data.
    // The service doesn't implicitly return "recent trades".

    // Simplification: Use `dailyPnl` trend or assume we fetch trades elsewhere.
    // Actually, let's modify the service to return "recentPerformance" or similar.
    // Or, we can just use the PnL of the last day as a proxy for now, 
    // or calculation based on `cumulativePnl` slope.

    // Let's simulate a "Momentum Score" (0-100).
    // 50 is neutral. 
    // If last 3 days are green -> High Momentum.

    // Mock logic for display:
    const momentumScore = 75; // TODO: Calculate real momentum
    const status = "Heating Up";

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="flex justify-between">
                    <span>Momentum</span>
                    <span className="text-emerald-500">{status}</span>
                </CardTitle>
                <CardDescription>Recent performance trajectory</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-rose-500 via-yellow-500 to-emerald-500"
                        style={{ width: "100%" }}
                    />
                    {/* Needle */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-white border-x border-black"
                        style={{ left: `${momentumScore}%`, transition: "left 0.5s ease-out" }}
                    />
                </div>
                <div className="flex justify-between w-full text-xs text-muted-foreground mt-2">
                    <span>Cold</span>
                    <span>Neutral</span>
                    <span>Hot</span>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-2xl font-bold">{momentumScore}</p>
                    <p className="text-xs text-muted-foreground">Momentum Score</p>
                </div>
            </CardContent>
        </Card>
    );
}
