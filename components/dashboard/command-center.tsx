"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { TradeFilters } from "@/types";
import { RefreshCw } from "lucide-react";

interface CommandCenterProps {
    activePeriod?: string;
    onPeriodChange?: (period: string) => void;
    filters?: TradeFilters;
    onFilterChange?: (filters: Partial<TradeFilters>) => void;
}

export function CommandCenter({
    activePeriod = "7D",
    onPeriodChange,
    filters,
    onFilterChange
}: CommandCenterProps) {
    // Pass the active period to the hook to filter data
    const result = useTradeAnalytics({ period: activePeriod });
    const analytics = result.data;
    const isFetching = result.isFetching; // Check if refreshing

    const periods = ["24H", "7D", "30D", "ALL"];

    // Fallback if data is ensuring layout doesn't jump too much
    if (!analytics) return null;

    const { totalPnL, realizedPnl = 0, unrealizedPnl = 0 } = analytics.core;
    const isProfitable = totalPnL >= 0;

    return (
        <div className="w-full mb-6 z-50 relative py-3.5">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm" />
            <div className="container mx-auto relative flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4">
                {/* Left: Brand or Context */}
                <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                                Net PnL
                            </span>
                            {isFetching && (
                                <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
                            )}
                        </div>

                        <div className="flex items-baseline space-x-2">
                            <span
                                className={cn(
                                    "text-3xl font-bold tracking-tight",
                                    isProfitable ? "text-emerald-500" : "text-rose-500"
                                )}
                            >
                                {totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)}
                            </span>
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] h-5",
                                    isProfitable
                                        ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                                        : "border-rose-500/30 text-rose-500 bg-rose-500/10"
                                )}
                            >
                                {analytics.core.winRate.toFixed(1)}% WR
                            </Badge>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-border/50 mx-4 hidden sm:block" />

                    {/* Realized vs Unrealized Pill */}
                    <div className="flex flex-col space-y-1 items-end sm:items-start">
                        <div className="flex items-center space-x-2 text-xs">
                            <span className="text-muted-foreground">R:</span>
                            <span
                                className={cn(
                                    "font-medium",
                                    realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                                )}
                            >
                                ${realizedPnl.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                            <span className="text-muted-foreground">U:</span>
                            <span
                                className={cn(
                                    "font-medium",
                                    unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                                )}
                            >
                                ${unrealizedPnl.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: Sparkline placeholder */}
                <div className="hidden md:flex flex-1 mx-8 h-10 items-center justify-center opacity-20">
                    <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-foreground to-transparent" />
                </div>

                {/* Right: Period Filter */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                    {filters?.symbol && (
                        <Badge
                            variant="secondary"
                            className="h-7 px-2 cursor-pointer hover:bg-destructive/20 gap-1"
                            onClick={() => onFilterChange?.({ symbol: undefined })}
                        >
                            <span className="text-xs">{filters.symbol}</span>
                            <span className="sr-only">Remove filter</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                            >
                                <path d="M18 6 6 18" />
                                <path d="m6 6 18 18" />
                            </svg>
                        </Badge>
                    )}
                    <div className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50 overflow-x-auto">
                        {periods.map((p) => (
                            <button
                                key={p}
                                onClick={() => onPeriodChange?.(p)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                                    activePeriod === p
                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
