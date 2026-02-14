import type { TradeRecord, AIReviewResult } from "@/types";

/**
 * Mock AI review service.
 * TODO: Replace with OpenAI edge function call when Cloud is enabled.
 */
export async function getAIReview(
  trade: TradeRecord,
  journalContent: string,
): Promise<AIReviewResult> {
  // Simulate API delay
  await new Promise((r) => setTimeout(r, 800));

  const isProfitable = trade.pnl >= 0;
  const isLong = trade.side === "long" || trade.side === "buy";

  return {
    performanceCritique: isProfitable
      ? `Entry was ${trade.orderType === "limit" ? "well-placed with a limit order" : "slightly late relative to VWAP (+0.4% deviation)"}. While the setup was valid, a limit order at ${(trade.entryPrice * 0.998).toFixed(2)} would have improved R:R by 0.2. Exit captured ${trade.pnlPercentage.toFixed(1)}% of the move.`
      : `The ${isLong ? "long" : "short"} entry at ${trade.entryPrice.toFixed(2)} was against the prevailing trend on the higher timeframe. The stop placement allowed for a ${Math.abs(trade.pnlPercentage).toFixed(1)}% drawdown which was excessive for this setup quality.`,
    emotionalReview: isProfitable
      ? `Based on the journal notes, execution discipline was solid. The decision to ${trade.orderType === "limit" ? "use a limit order shows patience" : "enter via market suggests possible urgency"}. Monitor for overconfidence bias on the next trade.`
      : `The notes suggest possible FOMO or impatience in the entry decision. Consider implementing a pre-trade checklist to catch emotional entries before execution. Review your average hold time for losing trades vs winners.`,
    actionableInsights: [
      isProfitable
        ? `Consider trailing stops instead of discretionary exits—this trade reached ${(trade.exitPrice * 1.01).toFixed(2)} shortly after your exit.`
        : `Wait for confirmation on the ${trade.symbol} setup. Adding a "candle close" rule would have avoided this loss.`,
      `Your ${isLong ? "long" : "short"} trades on ${trade.symbol} have a pattern of ${isProfitable ? "premature exits" : "early entries"}. Review the last 10 similar setups.`,
      `Position sizing was ${(trade.value || 0) > 20000 ? "aggressive" : "appropriate"} at $${(trade.value || 0).toLocaleString()} notional.`,
    ],
    riskAssessment: `Risk/Reward: ${isProfitable ? "1:" + ((Math.abs(trade.pnl) / (trade.value || 1)) * 10).toFixed(1) : "Negative"}. Duration: ${Math.round(trade.duration / 60)}min. Fee impact: ${((trade.fees.total / Math.abs(trade.pnl)) * 100).toFixed(1)}% of PnL.`,
    disclaimer:
      "Not financial advice. AI analysis for educational and self-improvement purposes only.",
  };
}
