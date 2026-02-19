"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAllTrades } from "@/hooks/use-trade-queries";
import { cn } from "@/lib/utils";
import { TradeFilters } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function MomentumGauge({ filters }: { filters?: TradeFilters }) {
    const { data: trades } = useAllTrades({ filters });
    const [animatedScore, setAnimatedScore] = useState(50);
    const gaugeRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Measure gauge container for responsive sizing
    useEffect(() => {
        if (!gaugeRef.current) return;

        const updateDimensions = () => {
            if (gaugeRef.current) {
                const { width, height } = gaugeRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        const observer = new ResizeObserver(updateDimensions);
        observer.observe(gaugeRef.current);

        return () => observer.disconnect();
    }, []);

    const { score, status, statusColor, recentWinRate, avgProfitLoss, consistency } = useMemo(() => {
        if (!trades || trades.length === 0) {
            return { 
                score: 50, 
                status: "No Data", 
                statusColor: "text-muted-foreground", 
                recentWinRate: 0,
                avgProfitLoss: 0,
                consistency: 0
            };
        }

        // Analyze last 50 trades
        const recentTrades = trades.slice(0, 50);
        const totalRecent = recentTrades.length;

        if (totalRecent === 0) {
            return { 
                score: 50, 
                status: "No Data", 
                statusColor: "text-muted-foreground", 
                recentWinRate: 0,
                avgProfitLoss: 0,
                consistency: 0
            };
        }

        let wins = 0;
        let totalGains = 0;
        let totalLosses = 0;
        let totalPnL = 0;
        let sumOfSquares = 0;

        recentTrades.forEach((t) => {
            const val = t.pnl || 0;
            totalPnL += val;
            
            if (val > 0) {
                wins++;
                totalGains += val;
            } else {
                totalLosses += Math.abs(val);
            }
        });

        // Calculate win rate consistency
        const avgPnL = totalPnL / totalRecent;
        recentTrades.forEach((t) => {
            sumOfSquares += Math.pow((t.pnl || 0) - avgPnL, 2);
        });
        const stdDev = Math.sqrt(sumOfSquares / totalRecent);
        const maxStdDev = Math.max(Math.abs(avgPnL) * 3, 100);
        const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev / maxStdDev) * 100));

        // RSI-like Momentum Calculation
        const totalMovement = totalGains + totalLosses;
        let rsiScore = totalMovement === 0 ? 50 : (totalGains / totalMovement) * 100;

        // Weight the score with win rate
        const winRate = (wins / totalRecent) * 100;
        const weightedScore = (rsiScore * 0.7 + winRate * 0.3);
        rsiScore = Math.round(weightedScore);

        // Determine Status
        let statusStr = "Neutral";
        let color = "text-yellow-500";

        if (rsiScore >= 80) {
            statusStr = "🚀 Explosive";
            color = "text-rose-500";
        } else if (rsiScore >= 70) {
            statusStr = "🔥 On Fire";
            color = "text-orange-500";
        } else if (rsiScore >= 60) {
            statusStr = "📈 Heating Up";
            color = "text-amber-500";
        } else if (rsiScore <= 20) {
            statusStr = "🧊 Ice Cold";
            color = "text-blue-500";
        } else if (rsiScore <= 30) {
            statusStr = "📉 Cooling Down";
            color = "text-cyan-500";
        } else if (rsiScore <= 40) {
            statusStr = "🌊 Sideways";
            color = "text-indigo-500";
        } else {
            statusStr = "⚖️ Stable";
            color = "text-emerald-500";
        }

        return {
            score: rsiScore,
            status: statusStr,
            statusColor: color,
            recentWinRate: winRate,
            avgProfitLoss: totalPnL / totalRecent,
            consistency: Math.round(consistencyScore)
        };
    }, [trades]);

    // Animate the score when it changes
    useEffect(() => {
        setAnimatedScore(score);
    }, [score]);

    // Gauge Data
    const gaugeData = [
        { name: "Cold Zone", value: 30, color: "#3b82f6", opacity: 0.7 },
        { name: "Cool Zone", value: 20, color: "#6366f1", opacity: 0.8 },
        { name: "Neutral Zone", value: 20, color: "#10b981", opacity: 0.9 },
        { name: "Warm Zone", value: 20, color: "#f59e0b", opacity: 0.9 },
        { name: "Hot Zone", value: 10, color: "#ef4444", opacity: 0.8 },
    ];

    // Calculate responsive sizes
    const needleRotation = (animatedScore / 100) * 180 - 90;
    const isMobile = dimensions.width < 400;
    const needleHeight = isMobile ? 70 : 100;
    const innerRadius = isMobile ? 50 : 70;
    const outerRadius = isMobile ? 90 : 120;

    // Format currency
    const formatCurrency = (value: number) => {
        const absValue = Math.abs(value);
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(absValue);
        
        return value >= 0 ? `+${formatted}` : `-${formatted}`;
    };

    return (
        <Card className="col-span-1 border-border/50 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-0.5 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                        <CardTitle className="text-base sm:text-lg font-semibold">Momentum Gauge</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Last 50 trades analysis</CardDescription>
                    </div>
                    <div className={cn(
                        "px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border whitespace-nowrap",
                        "bg-opacity-20 backdrop-blur-sm",
                        statusColor.replace('text-', 'bg-').replace('500', '500/20'),
                        statusColor,
                        "border-current/20"
                    )}>
                        {status}
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="flex flex-col items-center justify-center pb-6 px-3 sm:px-6" ref={gaugeRef}>
                {/* Gauge Chart Container */}
                <div className="relative w-full h-[140px] sm:h-[160px] mt-0.5 sm:mt-2">
                    {/* Background glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent rounded-full blur-3xl" />
                    
                    {/* Gauge Chart */}
                    <div className="absolute inset-0 flex justify-center items-end">
                        <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
                            <PieChart>
                                <defs>
                                    {gaugeData.map((entry, index) => (
                                        <linearGradient key={`grad-${index}`} id={`zoneGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={entry.color} stopOpacity={entry.opacity} />
                                            <stop offset="100%" stopColor={entry.color} stopOpacity={entry.opacity * 0.6} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="100%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={innerRadius}
                                    outerRadius={outerRadius}
                                    dataKey="value"
                                    stroke="rgba(0,0,0,0.2)"
                                    strokeWidth={1}
                                    paddingAngle={1}
                                >
                                    {gaugeData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={`url(#zoneGradient-${index})`}
                                            className="transition-all duration-300 hover:opacity-100"
                                            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Needle */}
                    <div
                        className="absolute bottom-2 left-1/2 transition-transform duration-1000 ease-out"
                        style={{
                            transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                            transformOrigin: 'bottom center',
                            zIndex: 20
                        }}
                    >
                        <div className="relative">
                            <div 
                                className="bg-gradient-to-t from-foreground to-foreground/80 rounded-full shadow-lg"
                                style={{ width: isMobile ? 3 : 4, height: needleHeight }}
                            />
                            <div className="absolute -bottom-2 -left-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-foreground border-2 border-background shadow-xl" />
                        </div>
                    </div>

                    {/* Center decorative element */}
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-xl z-30">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-foreground/60" />
                    </div>
                </div>

                {/* Scale markers */}
                <div className="relative w-full max-w-[240px] sm:max-w-[280px] mt-4 px-2 sm:px-4">
                    <div className="flex justify-between text-[10px] sm:text-xs font-mono">
                        <span className="text-blue-500 font-medium">0</span>
                        <span className="text-emerald-500 font-medium">25</span>
                        <span className="text-yellow-500 font-medium">50</span>
                        <span className="text-orange-500 font-medium">75</span>
                        <span className="text-rose-500 font-medium">100</span>
                    </div>
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 via-yellow-500 via-orange-500 to-rose-500 rounded-full opacity-30" />
                </div>

                {/* Score and metrics */}
                <div className="mt-4 sm:mt-6 w-full grid grid-cols-3 gap-2 sm:gap-4 px-2 sm:px-4">
                    <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">
                            {score}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Score</div>
                    </div>
                    
                    <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">
                            {recentWinRate.toFixed(0)}%
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Win Rate</div>
                    </div>

                    <div className="text-center">
                        <div className={cn(
                            "text-sm sm:text-lg font-mono font-bold",
                            (avgProfitLoss || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {formatCurrency(avgProfitLoss || 0)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Avg P&L</div>
                    </div>
                </div>

                {/* Consistency meter */}
                <div className="w-full mt-3 sm:mt-4 px-2 sm:px-4">
                    <div className="flex justify-between items-center text-[10px] sm:text-xs mb-1">
                        <span className="text-muted-foreground">Consistency</span>
                        <span className={cn(
                            "font-mono font-medium",
                            consistency >= 70 ? "text-emerald-500" : 
                            consistency >= 40 ? "text-yellow-500" : "text-rose-500"
                        )}>
                            {consistency}%
                        </span>
                    </div>
                    <div className="w-full h-1 sm:h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-yellow-500 transition-all duration-700"
                            style={{ width: `${consistency}%` }}
                        />
                    </div>
                </div>

                {/* Mini trend indicators */}
                <div className="flex gap-3 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500/50" />
                        <span>Profitable</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500/50" />
                        <span>Losses</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}