/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";
import { useTradeAnalytics, useCalculatedPnL } from "@/hooks/use-trade-queries";
import {
  useBatchAITradeReviews,
  useGenerateAIReview,
} from "@/hooks/use-ai-review";
import type { AIReviewResult } from "@/types";

interface AIInsightsProps {
  showDetailed?: boolean;
  onInsightClick?: (insight: string) => void;
}

const AIInsights = ({
  showDetailed = false,
  onInsightClick,
}: AIInsightsProps) => {
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const { data: analytics } = useTradeAnalytics();
  const { data: pnlTrades } = useCalculatedPnL();

  // Get recent trades for context
  const recentTrades = pnlTrades?.slice(0, 20) || [];

  // Batch fetch AI reviews for recent trades
  const {
    data: tradeReviews,
    isLoading,
    refetch,
  } = useBatchAITradeReviews(recentTrades);

  // Generate new review mutation
  const generateReview = useGenerateAIReview();

  // Aggregate insights from all reviews
  const aggregatedInsights = tradeReviews
    ? Array.from(tradeReviews.values()).flatMap((r) => r.actionableInsights)
    : [];

  // Session-based insights from analytics
  const sessionInsights = useSessionInsights(analytics);

  // Risk-based insights
  const riskInsights = useRiskInsights(analytics, pnlTrades || []);

  const handleRefresh = () => {
    refetch();
  };

  const handleTradeSelect = async (trade: any) => {
    setSelectedTradeId(trade.id);
    await generateReview.mutateAsync({
      trade,
      journalContent: trade.notes || "No journal entry provided",
      context: {
        recentTrades: pnlTrades?.slice(0, 20),
      },
    });
  };

  const allInsights = [
    ...sessionInsights,
    ...riskInsights,
    ...aggregatedInsights.slice(0, 3).map((text) => ({
      title: "Actionable Insight",
      description: text,
      type: "action" as const,
      icon: Sparkles,
    })),
  ];

  if (isLoading && allInsights.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5 h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-primary px-2.5 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase">
              AI Insights
            </span>
            <span className="text-xs text-muted-foreground animate-pulse">
              Analyzing...
            </span>
          </div>
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
        </div>
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Generating insights from your trading data...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded bg-primary px-2.5 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase">
            AI Insights
          </span>
          <span className="text-xs text-muted-foreground">
            Updated {new Date().toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1">
        {/* Session Performance Insight */}
        {sessionInsights.map((insight, idx) => (
          <InsightCard
            key={`session-${idx}`}
            icon={insight.type === "warning" ? AlertTriangle : Sparkles}
            title={insight.title}
            description={insight.description}
            badge={insight.badge}
            onClick={() => onInsightClick?.(insight.description)}
          />
        ))}

        {/* Risk Management Insight */}
        {riskInsights.map((insight, idx) => (
          <InsightCard
            key={`risk-${idx}`}
            icon={insight.type === "warning" ? AlertTriangle : Sparkles}
            title={insight.title}
            description={insight.description}
            badge={insight.badge}
            variant={insight.type === "warning" ? "warning" : "info"}
            onClick={() => onInsightClick?.(insight.description)}
          />
        ))}

        {/* Trade-specific insights */}
        {tradeReviews &&
          Array.from(tradeReviews.entries())
            .slice(0, 2)
            .map(([tradeId, review]) => (
              <div
                key={tradeId}
                className="flex flex-col gap-2 border-l-2 border-primary pl-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">
                    Trade Analysis
                  </span>
                  <button
                    onClick={() =>
                      handleTradeSelect(
                        recentTrades.find((t) => t.id === tradeId)!,
                      )
                    }
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View Trade <ChevronRight className="h-3 w-3 inline" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {review.performanceCritique}
                </p>
                {showDetailed &&
                  review.actionableInsights.slice(0, 1).map((insight, i) => (
                    <p key={i} className="text-xs text-foreground mt-1">
                      💡 {insight}
                    </p>
                  ))}
              </div>
            ))}

        {/* AI Disclaimer */}
        <div className="text-[10px] text-muted-foreground/50 italic mt-2 pt-2 border-t border-border">
          {tradeReviews?.values().next().value?.disclaimer ||
            "Not financial advice. AI analysis for educational purposes only."}
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface InsightCardProps {
  icon: any;
  title: string;
  description: string;
  badge?: string;
  variant?: "info" | "warning" | "success";
  onClick?: () => void;
}

const InsightCard = ({
  icon: Icon,
  title,
  description,
  badge,
  variant = "info",
  onClick,
}: InsightCardProps) => {
  const colors = {
    info: {
      icon: "text-primary",
      badge: "bg-primary/10 text-primary",
    },
    warning: {
      icon: "text-warning",
      badge: "bg-warning/10 text-warning",
    },
    success: {
      icon: "text-profit",
      badge: "bg-profit/10 text-profit",
    },
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-colors ${
        onClick ? "cursor-pointer hover:bg-secondary/50" : ""
      }`}
      onClick={onClick}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${colors[variant].icon}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-sm text-foreground">{title}</h4>
          {badge && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[variant].badge}`}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

// Custom hooks for derived insights
function useSessionInsights(analytics: any) {
  const insights = [];

  if (analytics?.timing?.sessionAnalysis) {
    const sessions = analytics.timing.sessionAnalysis;
    const bestSession = Object.entries(sessions).reduce(
      (best: any, [name, data]: [string, any]) => {
        if (!best || data.winRate > best.winRate) return { name, ...data };
        return best;
      },
      null,
    );

    if (bestSession && bestSession.winRate > 60) {
      insights.push({
        title: `${bestSession.name.toUpperCase()} Session Edge`,
        description: `Your win rate during the ${bestSession.name} session is ${bestSession.winRate.toFixed(1)}%. Consider focusing more trades during these hours.`,
        badge: `${bestSession.winRate.toFixed(0)}% WR`,
        type: "info",
      });
    }
  }

  return insights;
}

function useRiskInsights(analytics: any, trades: any[]) {
  const insights = [];

  if (analytics?.risk) {
    const { avgWin, avgLoss, profitFactor } = analytics.risk;

    if (avgLoss > avgWin * 0.5) {
      insights.push({
        title: "Risk Management Alert",
        description: `Your average loss ($${avgLoss.toFixed(2)}) is more than 50% of your average win ($${avgWin.toFixed(2)}). Consider tightening stops.`,
        badge: `${((avgLoss / avgWin) * 100).toFixed(0)}% ratio`,
        type: "warning",
      });
    }

    if (profitFactor < 1.5) {
      insights.push({
        title: "Profit Factor Optimization",
        description: `Your profit factor of ${profitFactor.toFixed(2)} is below the optimal range (1.5+). Focus on cutting losses faster.`,
        badge: `${profitFactor.toFixed(2)} PF`,
        type: "warning",
      });
    }
  }

  if (trades && trades.length > 0) {
    const holdTimes = trades.map((t) => t.duration / 60); // minutes
    const avgHoldWin =
      trades
        .filter((t) => t.pnl > 0)
        .reduce((sum, t) => sum + t.duration / 60, 0) /
        trades.filter((t) => t.pnl > 0).length || 0;
    const avgHoldLoss =
      trades
        .filter((t) => t.pnl < 0)
        .reduce((sum, t) => sum + t.duration / 60, 0) /
        trades.filter((t) => t.pnl < 0).length || 0;

    if (avgHoldLoss > avgHoldWin * 1.2) {
      insights.push({
        title: "Hold Time Analysis",
        description: `You hold losing trades (${avgHoldLoss.toFixed(0)}min) ${((avgHoldLoss / avgHoldWin) * 100 - 100).toFixed(0)}% longer than winners. Review your exit discipline.`,
        badge: `${avgHoldLoss.toFixed(0)}min vs ${avgHoldWin.toFixed(0)}min`,
        type: "warning",
      });
    }
  }

  return insights;
}

export default AIInsights;
