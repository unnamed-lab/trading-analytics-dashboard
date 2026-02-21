"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { cn } from "@/lib/utils";
import { GaugeSkeleton } from "@/components/ui/dashboard-states";
import { TradeFilters } from "@/types";

// ─── Gauge geometry constants ─────────────────────────────────────────────────
const SVG_W = 280;
const SVG_H = 160; // half-height: arc from left to right along bottom
const CX = SVG_W / 2;
const CY = SVG_H;       // arc pivot is at bottom-centre of the viewBox
const R_OUTER = 130;
const R_INNER = 90;
const R_NEEDLE = 108;   // needle length
const R_TICKS = R_OUTER + 8;

// Zone definitions: [startScore, endScore, color]
const ZONES: [number, number, string][] = [
    [0, 20, "#3b82f6"], // cold – blue
    [20, 40, "#6366f1"], // cool – indigo
    [40, 60, "#10b981"], // neutral – emerald
    [60, 80, "#f59e0b"], // warm – amber
    [80, 100, "#ef4444"], // hot – red
];

const TICK_VALUES = [0, 25, 50, 75, 100];

// ─── Score → angle (degrees, 0 = pointing left, 180 = pointing right) ────────
const scoreToAngle = (score: number) => (score / 100) * 180;

// ─── Polar → cartesian (origin at CX, CY) ────────────────────────────────────
const polar = (angleDeg: number, r: number) => {
    const rad = ((angleDeg - 180) * Math.PI) / 180; // -180 offset: 0° = left
    return {
        x: CX + r * Math.cos(rad),
        y: CY + r * Math.sin(rad),
    };
};

// ─── SVG arc path between two score values ───────────────────────────────────
const arcPath = (s0: number, s1: number, rInner: number, rOuter: number) => {
    const a0 = scoreToAngle(s0);
    const a1 = scoreToAngle(s1);
    const p0o = polar(a0, rOuter);
    const p1o = polar(a1, rOuter);
    const p0i = polar(a0, rInner);
    const p1i = polar(a1, rInner);
    const large = a1 - a0 > 180 ? 1 : 0;
    return [
        `M ${p0o.x} ${p0o.y}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1o.x} ${p1o.y}`,
        `L ${p1i.x} ${p1i.y}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${p0i.x} ${p0i.y}`,
        "Z",
    ].join(" ");
};

// ─── Status config (static Tailwind classes only — no dynamic construction) ──
const STATUS_CONFIG: Record<
    string,
    { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
    explosive: { label: "🚀 Explosive", textClass: "text-rose-400", bgClass: "bg-rose-500/10", borderClass: "border-rose-500/30" },
    onfire: { label: "🔥 On Fire", textClass: "text-orange-400", bgClass: "bg-orange-500/10", borderClass: "border-orange-500/30" },
    heatingup: { label: "📈 Heating Up", textClass: "text-amber-400", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/30" },
    stable: { label: "⚖️ Stable", textClass: "text-emerald-400", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/30" },
    sideways: { label: "🌊 Sideways", textClass: "text-indigo-400", bgClass: "bg-indigo-500/10", borderClass: "border-indigo-500/30" },
    coolingdown: { label: "📉 Cooling Down", textClass: "text-cyan-400", bgClass: "bg-cyan-500/10", borderClass: "border-cyan-500/30" },
    icecold: { label: "🧊 Ice Cold", textClass: "text-blue-400", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/30" },
    nodata: { label: "— No Data", textClass: "text-muted-foreground", bgClass: "bg-muted/20", borderClass: "border-border/40" },
};

// ─── Ease function for needle animation ──────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// ─── Component ────────────────────────────────────────────────────────────────
export function MomentumGauge({ filters: _propsFilters }: { filters?: TradeFilters }) {
    const { trades, isLoading } = useDashboard();

    const [displayAngle, setDisplayAngle] = useState(0); // start at leftmost (score=0)
    const animRef = useRef<number | null>(null);
    const prevAngleRef = useRef(0);

    // ── Analytics ──────────────────────────────────────────────────────────────
    const analytics = useMemo(() => {
        if (!trades || trades.length === 0) {
            return { score: 50, statusKey: "nodata", recentWinRate: 0, avgPnL: 0, consistency: 0 };
        }

        const recent = trades.slice(0, 50);
        const n = recent.length;
        let wins = 0, gains = 0, losses = 0, totalPnL = 0;

        recent.forEach(({ pnl = 0 }) => {
            totalPnL += pnl;
            if (pnl > 0) { wins++; gains += pnl; }
            else losses += Math.abs(pnl);
        });

        const winRate = (wins / n) * 100;
        const rsiRaw = gains + losses === 0 ? 50 : (gains / (gains + losses)) * 100;
        const score = Math.round(rsiRaw * 0.7 + winRate * 0.3);

        // Consistency: inverse coefficient of variation
        const avgPnL = totalPnL / n;
        const variance = recent.reduce((s: number, { pnl = 0 }) => s + (pnl - avgPnL) ** 2, 0) / n;
        const cv = avgPnL === 0 ? 1 : Math.sqrt(variance) / (Math.abs(avgPnL) || 1);
        const consistency = Math.round(Math.max(0, Math.min(100, 100 - cv * 20)));

        let statusKey = "stable";
        if (score >= 80) statusKey = "explosive";
        else if (score >= 70) statusKey = "onfire";
        else if (score >= 60) statusKey = "heatingup";
        else if (score <= 20) statusKey = "icecold";
        else if (score <= 30) statusKey = "coolingdown";
        else if (score <= 40) statusKey = "sideways";

        return { score, statusKey, recentWinRate: winRate, avgPnL, consistency };
    }, [trades]);

    // ── Animate needle to target angle ────────────────────────────────────────
    const animateTo = useCallback((targetAngle: number) => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        const startAngle = prevAngleRef.current;
        const delta = targetAngle - startAngle;
        const duration = 900; // ms
        let startTime: number | null = null;

        const step = (ts: number) => {
            if (!startTime) startTime = ts;
            const t = Math.min((ts - startTime) / duration, 1);
            const eased = easeOutCubic(t);
            const current = startAngle + delta * eased;
            setDisplayAngle(current);
            if (t < 1) animRef.current = requestAnimationFrame(step);
            else prevAngleRef.current = targetAngle;
        };

        animRef.current = requestAnimationFrame(step);
    }, []);

    useEffect(() => {
        animateTo(scoreToAngle(analytics.score));
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [analytics.score, animateTo]);

    if (isLoading) return <GaugeSkeleton />;

    // ── Needle tip & base ─────────────────────────────────────────────────────
    const needleTip = polar(displayAngle, R_NEEDLE);
    const needleLeft = polar(displayAngle + 90, 5);
    const needleRight = polar(displayAngle - 90, 5);

    const status = STATUS_CONFIG[analytics.statusKey] ?? STATUS_CONFIG.nodata;

    const fmtCurrency = (v: number) => {
        const abs = Math.abs(v);
        const s = new Intl.NumberFormat("en-US", {
            style: "currency", currency: "USD", maximumFractionDigits: 0,
        }).format(abs);
        return v >= 0 ? `+${s}` : `−${s}`;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Card className="h-full col-span-1 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-1 px-4 sm:px-5 pt-4 sm:pt-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground/70">
                            Momentum Gauge
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-foreground mt-0.5">
                            Last 50 trades
                        </CardDescription>
                    </div>

                    {/* Status badge — static Tailwind classes */}
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap mt-0.5",
                        status.bgClass, status.textClass, status.borderClass
                    )}>
                        {status.label}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col items-center px-4 pb-5 pt-2">

                {/* ── SVG Gauge ──────────────────────────────────────────── */}
                <svg
                    viewBox={`0 0 ${SVG_W} ${SVG_H + 16}`}
                    width="100%"
                    className="max-w-[300px] overflow-visible"
                    aria-label={`Momentum score: ${analytics.score}`}
                >
                    <defs>
                        {/* Glow filter for needle */}
                        <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        {/* Track shadow */}
                        <filter id="track-shadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                        </filter>
                    </defs>

                    {/* Background track */}
                    <path
                        d={arcPath(0, 100, R_INNER - 2, R_OUTER + 2)}
                        fill="hsl(var(--muted) / 0.15)"
                        filter="url(#track-shadow)"
                    />

                    {/* Zone arcs */}
                    {ZONES.map(([s0, s1, color], i) => (
                        <path
                            key={i}
                            d={arcPath(s0, s1, R_INNER, R_OUTER)}
                            fill={color}
                            opacity={0.82}
                        />
                    ))}

                    {/* Zone separator lines */}
                    {ZONES.slice(0, -1).map(([, s1], i) => {
                        const p1 = polar(scoreToAngle(s1), R_INNER - 2);
                        const p2 = polar(scoreToAngle(s1), R_OUTER + 2);
                        return (
                            <line
                                key={i}
                                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                                strokeOpacity={0.5}
                            />
                        );
                    })}

                    {/* Tick marks + labels */}
                    {TICK_VALUES.map((v) => {
                        const a = scoreToAngle(v);
                        const p1 = polar(a, R_OUTER + 3);
                        const p2 = polar(a, R_OUTER + 12);
                        const lp = polar(a, R_TICKS + 10);
                        return (
                            <g key={v}>
                                <line
                                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                    stroke="hsl(var(--muted-foreground) / 0.5)"
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                />
                                <text
                                    x={lp.x}
                                    y={lp.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={9}
                                    fill="hsl(var(--muted-foreground) / 0.7)"
                                    fontFamily="monospace"
                                >
                                    {v}
                                </text>
                            </g>
                        );
                    })}

                    {/* Score glow arc (active portion) */}
                    <path
                        d={arcPath(0, analytics.score, R_INNER + 4, R_OUTER - 4)}
                        fill="white"
                        opacity={0.06}
                    />

                    {/* Needle (triangle pointing from center to tip) */}
                    <polygon
                        points={`${needleTip.x},${needleTip.y} ${needleLeft.x},${needleLeft.y} ${needleRight.x},${needleRight.y}`}
                        fill="#f1f5f9"
                        opacity={0.95}
                    />
                    {/* Needle tail (short line behind pivot) */}
                    {(() => {
                        const tail = polar(displayAngle + 180, 14);
                        return (
                            <line
                                x1={CX} y1={CY}
                                x2={tail.x} y2={tail.y}
                                stroke="#e2e8f0e7"
                                strokeWidth={3}
                                strokeLinecap="round"
                            />
                        );
                    })()}

                    {/* Pivot hub */}
                    <circle cx={CX} cy={CY} r={10} fill="#64748b" stroke="rgb(51 65 85 / 0.6)" strokeWidth={2} />
                    <circle cx={CX} cy={CY} r={4} fill="#e2e8f0f8" />
                </svg>

                {/* ── Score score display ──────────────────────────────────── */}
                <div className="mt-1 text-center">
                    <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                        {analytics.score}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1 font-mono">/100</span>
                </div>

                {/* ── Metric row ───────────────────────────────────────────── */}
                <div className="mt-4 w-full grid grid-cols-3 gap-3">
                    <MetricCell
                        value={`${analytics.recentWinRate.toFixed(0)}%`}
                        label="Win Rate"
                        valueClass={analytics.recentWinRate >= 50 ? "text-emerald-400" : "text-rose-400"}
                    />
                    <MetricCell
                        value={fmtCurrency(analytics.avgPnL)}
                        label="Avg P&L"
                        valueClass={analytics.avgPnL >= 0 ? "text-emerald-400" : "text-rose-400"}
                        mono
                    />
                    <MetricCell
                        value={`${analytics.consistency}%`}
                        label="Consistency"
                        valueClass={
                            analytics.consistency >= 70 ? "text-emerald-400" :
                                analytics.consistency >= 40 ? "text-amber-400" : "text-rose-400"
                        }
                    />
                </div>

                {/* ── Consistency bar ──────────────────────────────────────── */}
                <div className="mt-4 w-full">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                        <span>Consistency</span>
                        <span className="font-mono">{analytics.consistency}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted/25 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${analytics.consistency}%`,
                                background: `linear-gradient(90deg,
                                    #3b82f6 0%, #10b981 50%, #f59e0b 80%, #ef4444 100%)`,
                                backgroundSize: `${(100 / Math.max(analytics.consistency, 1)) * 100}%`,
                            }}
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function MetricCell({
    value,
    label,
    valueClass,
    mono,
}: {
    value: string;
    label: string;
    valueClass?: string;
    mono?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-muted/15 border border-border/40">
            <span className={cn("text-base font-bold tabular-nums", mono && "font-mono", valueClass)}>
                {value}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
    );
}