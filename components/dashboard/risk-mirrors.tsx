"use client";

import { TradeRecord } from "@/types";
import { formatPnl, formatPrice, formatSide } from "@/types";
import { ArrowUpRight, ArrowDownRight, Trophy, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskMirrorsProps {
    trades: TradeRecord[];
}

export function RiskMirrors({ trades }: RiskMirrorsProps) {
    if (!trades.length) return null;

    // Filter for closed trades only
    const closedTrades = trades.filter((t) => t.status !== "open" && t.status !== "pending");

    if (closedTrades.length === 0) return null;

    // Find Best and Worst trades
    const bestTrade = closedTrades.reduce((prev, current) =>
        (prev.pnl > current.pnl) ? prev : current
        , closedTrades[0]);

    const worstTrade = closedTrades.reduce((prev, current) =>
        (prev.pnl < current.pnl) ? prev : current
        , closedTrades[0]);

    // If best and worst are the same (e.g. only 1 trade), show it as best if profitable, else worst.
    // Or just show both.

    return (
        <div className="grid gap-4 md:grid-cols-2 mb-4">
            <Card className="border-profit/20 bg-profit/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-profit flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Best Trade
                    </CardTitle>
                    <div className="text-xs text-muted-foreground font-mono">
                        {bestTrade.symbol} | {new Date(bestTrade.timestamp).toLocaleDateString()}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-2xl font-bold text-profit">
                                {formatPnl(bestTrade.pnl)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {bestTrade.pnlPercentage > 0 ? "+" : ""}{bestTrade.pnlPercentage.toFixed(2)}% ROI
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase">{bestTrade.orderType}</div>
                            <div className="text-sm font-bold flex items-center justify-end gap-1">
                                {formatSide(bestTrade.side)}
                                {bestTrade.side === "long" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-loss/20 bg-loss/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-loss flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Worst Trade
                    </CardTitle>
                    <div className="text-xs text-muted-foreground font-mono">
                        {worstTrade.symbol} | {new Date(worstTrade.timestamp).toLocaleDateString()}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-2xl font-bold text-loss">
                                {formatPnl(worstTrade.pnl)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {worstTrade.pnlPercentage > 0 ? "+" : ""}{worstTrade.pnlPercentage.toFixed(2)}% ROI
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase">{worstTrade.orderType}</div>
                            <div className="text-sm font-bold flex items-center justify-end gap-1">
                                {formatSide(worstTrade.side)}
                                {worstTrade.side === "long" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
