import { useMemo } from "react";
import { useTradeAnalytics, useCalculatedPnL } from "@/hooks/use-trade-queries";
import {
  DashboardCardSkeleton,
  DashboardError,
} from "@/components/ui/dashboard-states";

interface PortfolioSnapshotProps {
  initialBalance?: number; // Starting balance if known
}

const PortfolioSnapshot = ({ initialBalance = 0 }: PortfolioSnapshotProps) => {
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch } = useTradeAnalytics();
  const { data: pnlTrades, isLoading: pnlLoading } = useCalculatedPnL();

  const isLoading = analyticsLoading || pnlLoading;

  const portfolioData = useMemo(() => {
    // Get total PnL from analytics or calculate
    const totalPnL =
      analytics?.core?.netPnL ??
      pnlTrades?.reduce((sum, t) => sum + (t.pnl || 0), 0) ??
      0;

    // Get today's PnL
    const today = new Date().toDateString();
    const todayPnL =
      pnlTrades
        ?.filter((t) => t.timestamp.toDateString() === today)
        .reduce((sum, t) => sum + (t.pnl || 0), 0) ?? 0;

    // Get yesterday's PnL for comparison
    // eslint-disable-next-line react-hooks/purity
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
      <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4 h-full">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Portfolio Snapshot
        </span>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No portfolio data available
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4 h-full">
      <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Portfolio Snapshot
      </span>

      <div>
        <span className="text-xs text-muted-foreground">
          Total Account Value
        </span>
        <p className="font-mono text-3xl font-bold text-foreground">
          $
          {portfolioData.accountValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">Total PnL:</span>
          <span
            className={`text-xs font-mono font-bold ${portfolioData.isProfitableOverall ? "text-profit" : "text-loss"
              }`}
          >
            {portfolioData.isProfitableOverall ? "+" : "-"}$
            {Math.abs(portfolioData.totalPnL).toFixed(2)}
            {portfolioData.pnlPercentage !== 0 && (
              <span className="ml-1">
                ({portfolioData.isProfitableOverall ? "+" : "-"}
                {Math.abs(portfolioData.pnlPercentage).toFixed(2)}%)
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-muted-foreground">{"Today's PnL"}</span>
          <div className="flex flex-col">
            <span
              className={`font-mono text-xl font-bold ${portfolioData.isProfitableToday ? "text-profit" : "text-loss"
                }`}
            >
              {portfolioData.isProfitableToday ? "+" : "-"}$
              {Math.abs(portfolioData.todayPnL).toFixed(2)}
            </span>
            <span
              className={`text-xs ${portfolioData.todayPnL !== 0
                ? portfolioData.isProfitableToday
                  ? "text-profit"
                  : "text-loss"
                : "text-muted-foreground"
                }`}
            >
              {portfolioData.todayPnL !== 0
                ? portfolioData.isProfitableToday
                  ? "+"
                  : "-"
                : ""}
              {Math.abs(portfolioData.todayPnlPercentage).toFixed(2)}%
              {portfolioData.yesterdayPnL !== 0 && (
                <span className="text-muted-foreground ml-1">
                  vs {portfolioData.yesterdayPnL > 0 ? "+" : "-"}$
                  {Math.abs(portfolioData.yesterdayPnL).toFixed(2)} yesterday
                </span>
              )}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs text-muted-foreground">Total Fees</span>
          <p className="font-mono text-xl font-bold text-loss">
            ${portfolioData.totalFees.toFixed(4)}
          </p>
          <span className="text-xs text-muted-foreground">Paid in fees</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            Est. Margin Usage
          </span>
          <span className="font-mono text-xs text-foreground">
            {portfolioData.marginUsage.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${portfolioData.marginUsage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Conservative</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
        <div>
          <span className="text-muted-foreground">Best Trade</span>
          <p className="font-mono text-profit font-bold">
            +$
            {Math.max(...(pnlTrades?.map((t) => t.pnl || 0) || [0])).toFixed(2)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Worst Trade</span>
          <p className="font-mono text-loss font-bold">
            -$
            {Math.abs(
              Math.min(...(pnlTrades?.map((t) => t.pnl || 0) || [0])),
            ).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSnapshot;
