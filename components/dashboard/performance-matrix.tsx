"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { DashboardCardSkeleton } from "@/components/ui/dashboard-states";
import { cn } from "@/lib/utils";
import { TradeFilters } from "@/types";

export function PerformanceMatrix({ filters: _propsFilters }: { filters?: TradeFilters }) {
    const { analytics, isLoading } = useDashboard();

    if (isLoading || !analytics) return <DashboardCardSkeleton title="Performance Matrix" />;

    const { longShort } = analytics;
    const { longTrades, shortTrades, ratio, bias } = longShort;

    // Calculate Win Rates for Long vs Short using the raw trades if available, 
    // or derived if we stored them. For now, let's assume we can derive them roughly 
    // or use the 'symbols' or 'orderTypes' data to infer, but ideally we should have 
    // explicitly calculated long/short win rates in the service.
    // 
    // TODO: Add refined Long/Short Win Rate to service. 
    // For now, we will display Volume Bias and Trade Count Bias.

    const totalTrades = longTrades + shortTrades;
    const longPct = totalTrades > 0 ? (longTrades / totalTrades) * 100 : 0;
    const shortPct = totalTrades > 0 ? (shortTrades / totalTrades) * 100 : 0;

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Performance Matrix</span>
                    <Badge variant={bias === "BULLISH" ? "default" : bias === "BEARISH" ? "destructive" : "secondary"}>
                        {bias} BIAS
                    </Badge>
                </CardTitle>
                <CardDescription>Directional preference and efficiency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Long Side */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-emerald-500">Long Exposure</span>
                        <span className="text-muted-foreground">{longTrades} trades</span>
                    </div>
                    <Progress value={longPct} className="h-2 bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-500" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Volume: ${analytics.longShort.longVolume.toFixed(0)}</span>
                        <span>{longPct.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Short Side */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-rose-500">Short Exposure</span>
                        <span className="text-muted-foreground">{shortTrades} trades</span>
                    </div>
                    <Progress value={shortPct} className="h-2 bg-rose-100 dark:bg-rose-950 [&>div]:bg-rose-500" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Volume: ${analytics.longShort.shortVolume.toFixed(0)}</span>
                        <span>{shortPct.toFixed(1)}%</span>
                    </div>
                </div>

                {/* Ratio */}
                <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">L/S Ratio</span>
                        <span className="text-2xl font-bold font-mono">{ratio.toFixed(2)}</span>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
