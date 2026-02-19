"use client";

import { useMemo } from "react";
import { useTradeAnalytics, useCalculatedPnL } from "@/hooks/use-trade-queries";
import {
  DashboardCardSkeleton,
  DashboardError,
} from "@/components/ui/dashboard-states";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioSnapshotProps {
  initialBalance?: number; // Starting balance if known
}

const PortfolioSnapshot = ({ initialBalance = 0 }: PortfolioSnapshotProps) => {
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch } = useTradeAnalytics();
  const { data: pnlTrades, isLoading: pnlLoading } = useCalculatedPnL();

  const isLoading = analyticsLoading || pnlLoading;

  const portfolioData = useMemo(() => {
    // Get total PnL from analytics or calculate
    const realizedPnL =
      analytics?.core?.netPnL ??
      pnlTrades?.reduce((sum, t) => sum + (t.pnl || 0), 0) ??
      0;

    const unrealizedPnL = analytics?.core?.unrealizedPnl ?? 0;
    const totalPnL = realizedPnL + unrealizedPnL;

    // Get today's PnL
    const today = new Date().toDateString();
    const todayPnL =
      pnlTrades
        ?.filter((t) => t.timestamp.toDateString() === today)
        .reduce((sum, t) => sum + (t.pnl || 0), 0) ?? 0;

    // Get yesterday's PnL for comparison
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const yesterdayPnL =
      pnlTrades
        ?.filter((t) => t.timestamp.toDateString() === yesterday)
        .reduce((sum, t) => sum + (t.pnl || 0), 0) ?? 0;

    // Calculate total fees
    const totalFees =
      analytics?.fees?.totalFees ??
      pnlTrades?.reduce((sum, t) => sum + (t.fees?.total || 0), 0) ??
      0;

    // Calculate margin usage (simplified - you might want a more sophisticated calculation)
    const totalVolume =
      analytics?.core?.totalVolume ??
      pnlTrades?.reduce((sum, t) => sum + t.entryPrice * t.quantity, 0) ??
      0;

    // Assume 2x leverage for margin calculation
    const assumedLeverage = 2;
    const marginUsage =
      totalVolume > 0
        ? Math.min(
          100,
          (Math.abs(totalPnL) / (totalVolume / assumedLeverage)) * 100,
        )
        : 0;

    // Calculate account value (assuming initial balance + Net PnL + Net Deposits)
    const netDeposits = analytics?.core?.netDeposits ?? 0;
    const accountValue = Math.max(0, initialBalance + totalPnL + netDeposits);

    // Calculate PnL percentage
    const pnlPercentage =
      initialBalance > 0
        ? (totalPnL / initialBalance) * 100
        : totalVolume > 0
          ? (totalPnL / totalVolume) * 100
          : 0;

    // Calculate today's PnL percentage
    const todayPnlPercentage =
      accountValue > 0 ? (todayPnL / accountValue) * 100 : 0;

    const bestTrade = Math.max(...(pnlTrades?.map((t) => t.pnl || 0) || [0]));
    const worstTrade = Math.min(...(pnlTrades?.map((t) => t.pnl || 0) || [0]));

    return {
      accountValue,
      todayPnL,
      todayPnlPercentage,
      totalPnL,
      pnlPercentage,
      marginUsage: Math.min(100, Math.max(0, marginUsage)),
      totalFees,
      yesterdayPnL,
      isProfitableToday: todayPnL > 0,
      isProfitableOverall: totalPnL > 0,
      unrealizedPnL,
      bestTrade,
      worstTrade
    };
  }, [analytics, pnlTrades, initialBalance]);

  if (isLoading) {
    return <DashboardCardSkeleton title="Portfolio Snapshot" />;
  }

  if (analyticsError) {
    return <DashboardError
      title="Portfolio Data Error"
      message="Failed to load portfolio data"
      onRetry={() => refetch()}
    />;
  }

  if (!pnlTrades?.length && !analytics) {
    return (
      <Card className="h-full flex items-center justify-center p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="text-muted-foreground text-sm">No portfolio data available</div>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
      <CardContent className="p-6 flex flex-col gap-6 h-full justify-between">

        {/* Header / Account Value */}
        <div className="relative">
          <div className="absolute right-0 top-0 p-2 bg-secondary/30 rounded-full">
            <Wallet className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            Portfolio Balance
          </span>
          <div className="mt-1">
            <span className="text-4xl font-mono font-bold tracking-tighter text-foreground">
              ${portfolioData.accountValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <div className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-md ${portfolioData.isProfitableOverall ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              {portfolioData.isProfitableOverall ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {portfolioData.isProfitableOverall ? "+" : "-"}${Math.abs(portfolioData.totalPnL).toFixed(2)}
              </span>
            </div>
            <span className={`text-xs ${portfolioData.pnlPercentage >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              ({portfolioData.pnlPercentage >= 0 ? "+" : ""}{portfolioData.pnlPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Today's Data */}
          <div className="bg-background/40 rounded-xl p-3 border border-border/50 hover:border-border transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Today&apos;s PnL</span>
            </div>
            <div className={`font-mono text-lg font-bold ${portfolioData.isProfitableToday ? "text-emerald-500" : "text-rose-500"}`}>
              {portfolioData.isProfitableToday ? "+" : "-"}${Math.abs(portfolioData.todayPnL).toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              vs ${Math.abs(portfolioData.yesterdayPnL).toFixed(0)} yest.
            </div>
          </div>

          {/* Unr. PnL */}
          <div className="bg-background/40 rounded-xl p-3 border border-border/50 hover:border-border transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">Unrealized PnL</span>
            </div>
            <div className={`font-mono text-lg font-bold ${portfolioData.unrealizedPnL >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {portfolioData.unrealizedPnL >= 0 ? "+" : ""}${portfolioData.unrealizedPnL.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Open Positions
            </div>
          </div>
        </div>

        {/* Margin Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Est. Margin Usage</span>
            <span className={`font-mono ${portfolioData.marginUsage > 80 ? "text-rose-500" : "text-foreground"}`}>
              {portfolioData.marginUsage.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${portfolioData.marginUsage > 80 ? 'bg-rose-500' :
                  portfolioData.marginUsage > 50 ? 'bg-orange-500' : 'bg-emerald-500'
                }`}
              style={{ width: `${portfolioData.marginUsage}%` }}
            />
          </div>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/40">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Trade</span>
            <span className="font-mono text-sm text-emerald-500 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +${portfolioData.bestTrade.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Fees</span>
            <span className="font-mono text-sm text-rose-500 font-bold">
              -${portfolioData.totalFees.toFixed(2)}
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default PortfolioSnapshot;
