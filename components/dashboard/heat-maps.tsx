"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { GridSkeleton, KPISkeleton } from "@/components/ui/dashboard-states";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Cell,
    CartesianGrid,
    ReferenceLine,
} from "recharts";
import HeatMap from "@uiw/react-heat-map";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TradeFilters } from "@/types";

interface HeatMapDataItem {
    date: string;
    count: number;
    pnl: number;
}

// Panel color config — centralised so legend and map stay in sync
const PANEL_COLORS = {
    0: "#1f273dff", // no trades
    1: "#3b0a0a",
    2: "#7f1d1d",
    3: "#991b1b",
    4: "#b91c1c",
    5: "#ef4444",
    11: "#0a1f14",
    12: "#064e3b",
    13: "#065f46",
    14: "#059669",
    15: "#34d399",
} as const;

const LEGEND_ITEMS = [
    { label: "Big loss", color: PANEL_COLORS[5] },
    { label: "Loss", color: PANEL_COLORS[3] },
    { label: "Small loss", color: PANEL_COLORS[1] },
    { label: "No trades", color: PANEL_COLORS[0] },
    { label: "Small win", color: PANEL_COLORS[11] },
    { label: "Win", color: PANEL_COLORS[13] },
    { label: "Big win", color: PANEL_COLORS[15] },
];

export function HeatMaps({ filters: _propsFilters }: { filters?: TradeFilters }) {
    const { analytics, isLoading, filters } = useDashboard();
    const cardRef = useRef<HTMLDivElement>(null);
    // Ref placed directly on the heatmap container — measures the exact available width.
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    // Track viewport width safely (avoids SSR crash)
    const [viewportWidth, setViewportWidth] = useState(1024);

    useEffect(() => {
        setViewportWidth(window.innerWidth);
        const handler = () => setViewportWidth(window.innerWidth);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    const { hourly, dailyPnl } = useMemo(() => {
        if (!analytics) return { hourly: [], dailyPnl: new Map<string, number>() };
        return {
            hourly: analytics.hourly || [],
            dailyPnl: analytics.dailyPnl || new Map<string, number>(),
        };
    }, [analytics]);

    const heatMapData = useMemo<HeatMapDataItem[]>(() => {
        if (dailyPnl.size === 0) return [];

        let maxAbsPnl = 0;
        dailyPnl.forEach((pnl: number) => {
            const abs = Math.abs(pnl);
            if (abs > maxAbsPnl) maxAbsPnl = abs;
        });
        if (maxAbsPnl === 0) maxAbsPnl = 100;

        return Array.from(dailyPnl.entries() as IterableIterator<[string, number]>).map(([dateStr, pnl]) => {
            let intensity = 0;
            const ratio = Math.abs(pnl) / maxAbsPnl;
            const level = Math.max(1, Math.min(5, Math.ceil(ratio * 5)));

            if (pnl > 0) intensity = 10 + level; // 11–15
            else if (pnl < 0) intensity = level;       // 1–5

            return { date: dateStr, count: intensity, pnl };
        });
    }, [dailyPnl]);

    const { endDate, startDate } = useMemo(() => {
        const end = new Date();
        const start = new Date();
        const period = filters?.period;

        if (period === "24H" || period === "7D" || period === "30D") {
            start.setMonth(end.getMonth() - 3);
        } else if (period === "90D" || period === "YTD") {
            start.setMonth(0);
            start.setDate(1);
        } else {
            start.setFullYear(end.getFullYear() - 1);
        }

        // Snap to Sunday for a clean grid
        const day = start.getDay();
        if (day !== 0) start.setDate(start.getDate() - day);

        return { startDate: start, endDate: end };
    }, [filters?.period]);

    // Measure the heatmap container for both width and height
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    /**
     * Derive heatmap dimensions that FILL the container exactly.
     *
     * - `heatmapWidth`  always equals the measured container width.
     * - `rectSize`      is computed so all week-columns fit within the available
     *                   space, clamped to [8, 13] px so cells stay legible.
     * - `cellSpace`     fixed at 2 px (tight but readable).
     */
    const { heatmapWidth, rectSize, cellSpace } = useMemo(() => {
        const width = containerSize.width || 500;
        const height = containerSize.height || 200;

        const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);
        const weeks = Math.ceil(diffDays / 7);
        // ~50 px for the day-of-week label column rendered on the left by the library
        const DAY_LABEL_WIDTH = 50;
        const availableWidth = width - DAY_LABEL_WIDTH;
        // ~25 px for the month labels on top
        const availableHeight = height - 25;

        const sp = 3; // tighter space allows larger boxes that are easier to see

        const computedW = Math.floor(availableWidth / Math.max(1, weeks) - sp);
        const computedH = Math.floor(availableHeight / 7 - sp);

        const computed = Math.min(computedW, computedH);

        const rs = Math.min(25, Math.max(8, computed));
        return { heatmapWidth: width, rectSize: rs, cellSpace: sp };
    }, [startDate, endDate, containerSize]);

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (isLoading || !analytics) {
        return (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
                <GridSkeleton />
                <GridSkeleton />
            </div>
        );
    }

    // ── Hourly tooltip ────────────────────────────────────────────────────────
    const HourlyTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        const isWin = d.pnl >= 0;
        return (
            <div className="rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-2xl p-3 text-xs min-w-[140px]">
                <p className="font-semibold text-popover-foreground mb-2">
                    {d.hour}:00 — {d.hour + 1}:00
                </p>
                <div className="space-y-1.5">
                    <Row label="PnL">
                        <span className={`font-mono font-semibold tabular-nums ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                            {isWin ? "+" : ""}${d.pnl?.toFixed(2) ?? "0.00"}
                        </span>
                    </Row>
                    <Row label="Trades">
                        <span className="tabular-nums text-foreground">{d.trades ?? 0}</span>
                    </Row>
                    <Row label="Win rate">
                        <span className="tabular-nums text-foreground">{d.winRate?.toFixed(1) ?? "0"}%</span>
                    </Row>
                </div>
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <TooltipProvider delayDuration={100}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">

                {/* ── Daily Rhythm bar chart ───────────────────────────────── */}
                <Card className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full flex flex-col">
                    <CardHeader className="pb-2 pt-5 px-5">
                        <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                            Daily Rhythm
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-foreground">
                            Performance by hour of day
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">(UTC)</span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-2 pb-4 flex-1 min-h-[260px]">
                        {hourly.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourly} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="gradWin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                                        </linearGradient>
                                        <linearGradient id="gradLoss" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#1e293b"
                                        strokeOpacity={0.8}
                                    />
                                    <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />

                                    <XAxis
                                        dataKey="hour"
                                        tickFormatter={(v) => `${v}h`}
                                        fontSize={10}
                                        tick={{ fill: "#64748b" }}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={viewportWidth < 640 ? 3 : 1}
                                    />
                                    <YAxis hide />

                                    <RechartsTooltip
                                        cursor={{ fill: "#1e293b", opacity: 0.6, radius: 4 }}
                                        content={<HourlyTooltip />}
                                    />

                                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={18}>
                                        {hourly.map((entry: any, i: number) => (
                                            <Cell
                                                key={`cell-${i}`}
                                                fill={entry.pnl >= 0 ? "url(#gradWin)" : "url(#gradLoss)"}
                                                stroke={entry.pnl >= 0 ? "#10b981" : "#f43f5e"}
                                                strokeWidth={0.5}
                                                strokeOpacity={0.6}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="No hourly data available" />
                        )}
                    </CardContent>
                </Card>

                {/* ── Trading Consistency heat map ─────────────────────────── */}
                <Card ref={cardRef} className="col-span-1 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full flex flex-col">
                    <CardHeader className="pb-2 pt-5 px-5">
                        <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                            Trading Consistency
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-foreground">
                            Daily PnL activity
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col">
                        {heatMapData.length > 0 ? (
                            <>
                                {/*
                                  Container fills the card. No horizontal scroll — the heatmap
                                  is sized to fit exactly. ref measures the true available width.
                                */}
                                <div
                                    ref={scrollContainerRef}
                                    className="w-full overflow-y-auto pb-1 flex-1"
                                    style={{ minHeight: 180 }}
                                >
                                    <div style={{ width: heatmapWidth, paddingTop: 4, height: "100%", display: "flex", alignItems: "center" }}>
                                        <HeatMap
                                            className="h-full w-full"
                                            value={heatMapData}
                                            startDate={startDate}
                                            endDate={endDate}
                                            width={heatmapWidth}
                                            rectSize={rectSize}
                                            space={cellSpace}
                                            legendCellSize={0}
                                            monthPlacement="top"
                                            monthLabels={[
                                                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                                            ]}
                                            style={{
                                                "--rhm-color-empty": PANEL_COLORS[0],
                                                color: "#64748b",
                                                fontSize: 10,
                                            } as React.CSSProperties}
                                            panelColors={PANEL_COLORS}
                                            rectProps={{ rx: 2.5, ry: 2.5 }}
                                            rectRender={(props, data) => {
                                                // react-heat-map uses YYYY/MM/DD internal format for data.date
                                                const normalizedDate = data.date.replace(/\//g, "-");
                                                const pnl = dailyPnl.get(normalizedDate);
                                                const hasTrade = pnl !== undefined;

                                                return (
                                                    <Tooltip key={data.date}>
                                                        <TooltipTrigger asChild>
                                                            <rect
                                                                {...props}
                                                                className="transition-opacity duration-100 hover:opacity-80 cursor-default"
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            sideOffset={6}
                                                            className="rounded-lg border-border/60 bg-popover/95 backdrop-blur-md shadow-2xl p-2.5 z-50"
                                                        >
                                                            <div className="flex flex-col gap-1 text-xs">
                                                                <span className="font-medium text-muted-foreground">
                                                                    {formatDate(data.date)}
                                                                </span>
                                                                {hasTrade ? (
                                                                    <span
                                                                        className={`font-mono font-semibold tabular-nums ${pnl! >= 0 ? "text-emerald-400" : "text-rose-400"
                                                                            }`}
                                                                    >
                                                                        {pnl! >= 0 ? "+" : "−"}$
                                                                        {Math.abs(pnl!).toFixed(2)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground/60 italic">No trades</span>
                                                                )}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                );
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="mt-auto pt-3 flex items-center justify-end gap-0.5 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground/60 mr-1.5">Less</span>
                                    {LEGEND_ITEMS.map(({ label, color }) => (
                                        <Tooltip key={label}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className="w-3 h-3 rounded-[2px] cursor-default transition-transform hover:scale-125"
                                                    style={{ backgroundColor: color }}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" sideOffset={4} className="text-[10px] px-2 py-1">
                                                {label}
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                    <span className="text-[10px] text-muted-foreground/60 ml-1.5">More</span>
                                </div>
                            </>
                        ) : (
                            <EmptyState message="No trading activity found" />
                        )}
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-full min-h-[120px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground/60 italic">{message}</p>
        </div>
    );
}

/** Format ISO date string → "Mon, Jan 1" */
function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch {
        return dateStr;
    }
}