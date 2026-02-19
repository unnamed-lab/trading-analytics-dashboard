"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid } from "recharts";
import HeatMap from '@uiw/react-heat-map';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { TradeFilters } from "@/types";

// Define the type for heat map data items
interface HeatMapDataItem {
    date: string;
    count: number;
    pnl: number;
}

export function HeatMaps({ filters }: { filters?: TradeFilters }) {
    const { data: analytics } = useTradeAnalytics(filters);
    const cardRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    const { hourly, dailyPnl } = useMemo(() => {
        if (!analytics) return { hourly: [], dailyPnl: new Map<string, number>() };
        return {
            hourly: analytics.hourly || [],
            dailyPnl: analytics.dailyPnl || new Map<string, number>()
        };
    }, [analytics]);

    const heatMapData = useMemo<HeatMapDataItem[]>(() => {
        if (dailyPnl.size === 0) return [];

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
                date: dateStr,
                count: intensity,
                pnl: pnl
            };
        });
    }, [dailyPnl]);

    const { endDate, startDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();

        const period = filters?.period;

        if (period === "7D" || period === "30D") {
            // Show last 3 months for context
            start.setMonth(end.getMonth() - 3);
        } else if (period === "90D") {
            // Show current year
            start.setMonth(0);
            start.setDate(1);
        } else if (period === "YTD") {
            // From Jan 1st
            start.setMonth(0);
            start.setDate(1);
        } else {
            // Default to full rolling year
            start.setFullYear(end.getFullYear() - 1);
        }

        // Snap to start of week (Sunday) for a clean grid
        const day = start.getDay();
        if (day !== 0) {
            start.setDate(start.getDate() - day);
        }

        return { startDate: start, endDate: end };
    }, [filters?.period]);

    // Measure container width for responsive heatmap
    useEffect(() => {
        if (!cardRef.current) return;

        const updateWidth = () => {
            if (cardRef.current) {
                const width = cardRef.current.clientWidth - 48; // Subtract padding
                setContainerWidth(width);
            }
        };

        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(cardRef.current);

        return () => observer.disconnect();
    }, []);

    // Calculate heatmap width based on data range and container
    const heatmapWidth = useMemo(() => {
        const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const weeks = Math.ceil(diffDays / 7);
        // GitHub style: 14px rect + 5px space = 19px per week
        const requiredWidth = weeks * 19 + 100;

        // Use container width if available, otherwise use required width
        return Math.max(containerWidth || 300, requiredWidth);
    }, [startDate, endDate, containerWidth]);

    if (!analytics) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {[1, 2].map((i) => (
                    <Card key={i} className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardContent className="h-[300px] flex items-center justify-center">
                            <div className="text-muted-foreground">Loading analytics...</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Daily Heat Map (Hourly) */}
                <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg">Daily Rhythm</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Performance by hour of day (UTC)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] sm:h-[300px]">
                        {hourly.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourly} margin={{ top: 10, right: 5, left: 5, bottom: 20 }}>
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
                                        interval={window.innerWidth < 640 ? 3 : 2}
                                    />
                                    <YAxis hide />
                                    <RechartsTooltip
                                        cursor={{ fill: '#334155', opacity: 0.4 }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-popover/95 border border-border rounded-lg p-2 sm:p-3 shadow-xl backdrop-blur-md text-xs">
                                                        <p className="font-semibold mb-1 sm:mb-2 text-popover-foreground">
                                                            {data.hour}:00 - {data.hour + 1}:00
                                                        </p>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between gap-2 sm:gap-4">
                                                                <span className="text-muted-foreground">PnL</span>
                                                                <span className={`font-mono font-medium ${data.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                                    ${data.pnl?.toFixed(2) || '0.00'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 sm:gap-4">
                                                                <span className="text-muted-foreground">Trades</span>
                                                                <span className="text-foreground">{data.trades || 0}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 sm:gap-4">
                                                                <span className="text-muted-foreground">Win Rate</span>
                                                                <span className="text-foreground">{data.winRate?.toFixed(1) || '0'}%</span>
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
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No hourly data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* GitHub-style Calendar Heat Map */}
                <Card ref={cardRef} className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base sm:text-lg">Trading Consistency</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Daily PnL Activity</CardDescription>
                    </CardHeader>
                    <CardContent className="relative p-0" style={{ height: '250px', maxHeight: '300px' }}>
                        {heatMapData.length > 0 ? (
                            <div className="relative w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30">
                                <div className="inline-block min-w-full p-4">
                                    <div style={{ width: heatmapWidth }}>
                                        <HeatMap
                                            value={heatMapData}
                                            startDate={startDate}
                                            endDate={endDate}
                                            width={heatmapWidth}
                                            rectSize={12}
                                            space={4}
                                            legendCellSize={0}
                                            monthPlacement="top"
                                            monthLabels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                                            panelColors={{
                                                0: '#1e293b',
                                                // Losses (Dark Red -> Bright Red)
                                                1: '#450a0a',
                                                2: '#7f1d1d',
                                                3: '#991b1b',
                                                4: '#b91c1c',
                                                5: '#dc2626',
                                                // Wins (Dark Green -> Bright Green)
                                                11: '#022c22',
                                                12: '#064e3b',
                                                13: '#065f46',
                                                14: '#047857',
                                                15: '#059669',
                                            }}
                                            rectProps={{
                                                rx: 3,
                                                ry: 3,
                                            }}
                                            rectRender={(props, data) => {
                                                const dataWithPnl = data as typeof data & { pnl: number };
                                                return (
                                                    <Tooltip key={data.date}>
                                                        <TooltipTrigger asChild>
                                                            <rect {...props} />
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            className="bg-popover/95 border-border backdrop-blur-md p-2 shadow-2xl z-50"
                                                            sideOffset={5}
                                                        >
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <span className="font-semibold text-foreground">{data.date}</span>
                                                                <span className={dataWithPnl.pnl >= 0 ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                                                                    {dataWithPnl.pnl >= 0 ? "+" : "-"}${Math.abs(dataWithPnl.pnl || 0).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No trading activity data found
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}