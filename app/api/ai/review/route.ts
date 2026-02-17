/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { TradeRecord, AIReviewResult } from "@/types";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_URL,
});

// Rate limiting map (simple in-memory, use Redis in production)
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 50;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(identifier);

  if (!userLimit) {
    rateLimit.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimit.set(identifier, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { trade, journalContent, sessionContext } = body as {
      trade: TradeRecord;
      journalContent: string;
      sessionContext?: {
        recentTrades?: TradeRecord[];
        symbolStats?: Record<string, any>;
      };
    };

    if (!trade || !journalContent) {
      return NextResponse.json(
        { error: "Missing required fields: trade and journalContent" },
        { status: 400 },
      );
    }

    // Validate trade data
    if (!trade.symbol || trade.entryPrice === undefined) {
      return NextResponse.json(
        { error: "Invalid trade data" },
        { status: 400 },
      );
    }

    // Prepare context for AI
    const isProfitable = trade.pnl >= 0;
    const isLong = trade.side === "long" || trade.side === "buy";
    const direction = isLong ? "LONG" : "SHORT";

    // Calculate additional metrics
    const riskRewardRatio =
      trade.value && Math.abs(trade.pnl)
        ? (Math.abs(trade.pnl) / (trade.value || 1)).toFixed(2)
        : "N/A";

    const feeImpact =
      trade.value && trade.fees?.total
        ? ((trade.fees.total / Math.abs(trade.value)) * 100).toFixed(2)
        : "0";

    // Build system prompt
    const systemPrompt = `You are an expert trading analyst and coach. Analyze the provided trade data and journal entry to generate actionable insights. Focus on:
1. Technical execution quality
2. Psychological patterns
3. Risk management
4. Specific, actionable improvements

Provide analysis in a constructive, educational tone. Never give financial advice or predictions.`;

    // Build user prompt with trade context
    const userPrompt = `
Trade Details:
- Symbol: ${trade.symbol}
- Direction: ${direction}
- Entry Price: $${trade.entryPrice.toFixed(4)}
- Exit Price: $${trade.exitPrice.toFixed(4)}
- Quantity: ${trade.quantity.toFixed(6)}
- Total Value: $${(trade.value || 0).toFixed(2)}
- PnL: ${isProfitable ? "+" : "-"}$${Math.abs(trade.pnl || 0).toFixed(2)}
- PnL %: ${trade.pnlPercentage?.toFixed(2)}%
- Duration: ${Math.floor((trade.duration || 0) / 60)} minutes
- Order Type: ${trade.orderType || "market"}
- Trade Type: ${trade.tradeType || "spot"}
- Fees Paid: $${(trade.fees?.total || 0).toFixed(6)}
- Fee Impact: ${feeImpact}% of trade value

${
  sessionContext?.recentTrades
    ? `
Recent Performance Context:
- Last 10 trades PnL: $${sessionContext.recentTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
- Win rate last 10: ${((sessionContext.recentTrades.filter((t) => (t.pnl || 0) > 0).length / sessionContext.recentTrades.length) * 100).toFixed(1)}%
`
    : ""
}

Trader's Journal Entry:
"""
${journalContent}
"""

Provide a comprehensive analysis in the following JSON format:
{
  "performanceCritique": "Detailed analysis of trade execution (2-3 sentences)",
  "emotionalReview": "Analysis of psychological patterns based on journal (2-3 sentences)",
  "actionableInsights": ["3 specific, actionable insights to improve"],
  "riskAssessment": "Brief assessment of risk management (1-2 sentences)",
  "disclaimer": "Standard disclaimer"
}`;

    // Call OpenAI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const completion = await openai.chat.completions.create(
        {
          model: process.env.OPENAI_API_MODEL || "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
          response_format: { type: "json_object" },
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      // Parse and validate response
      const analysis = JSON.parse(content) as AIReviewResult;

      // Ensure required fields
      if (
        !analysis.performanceCritique ||
        !analysis.emotionalReview ||
        !analysis.actionableInsights ||
        !analysis.riskAssessment
      ) {
        throw new Error("Invalid analysis format from AI");
      }

      // Add disclaimer if missing
      if (!analysis.disclaimer) {
        analysis.disclaimer =
          "Not financial advice. AI analysis for educational and self-improvement purposes only.";
      }

      // Ensure actionableInsights is array with at least 3 items
      if (
        !Array.isArray(analysis.actionableInsights) ||
        analysis.actionableInsights.length < 3
      ) {
        analysis.actionableInsights = [
          analysis.actionableInsights?.[0] ||
            "Consider reviewing your entry criteria for this setup",
          analysis.actionableInsights?.[1] ||
            "Evaluate your exit strategy against market conditions",
          analysis.actionableInsights?.[2] ||
            "Review position sizing relative to account risk",
        ];
      }

      return NextResponse.json(analysis);
    } catch (openaiError: any) {
      clearTimeout(timeoutId);
      console.error("OpenAI API error:", openaiError);

      // Fallback to structured mock response
      const mockAnalysis = generateMockAnalysis(trade, journalContent);
      return NextResponse.json(mockAnalysis);
    }
  } catch (error: any) {
    console.error("AI Review API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI review" },
      { status: 500 },
    );
  }
}

// Fallback mock generator
function generateMockAnalysis(
  trade: TradeRecord,
  journalContent: string,
): AIReviewResult {
  const isProfitable = trade.pnl >= 0;
  const isLong = trade.side === "long" || trade.side === "buy";
  const direction = isLong ? "long" : "short";

  return {
    performanceCritique: isProfitable
      ? `Your ${direction} entry at $${trade.entryPrice.toFixed(2)} showed good timing. The exit captured ${trade.pnlPercentage?.toFixed(1)}% of the move. Consider using limit orders to improve entry precision.`
      : `The ${direction} entry at $${trade.entryPrice.toFixed(2)} went against the prevailing trend. The ${Math.abs(trade.pnlPercentage || 0).toFixed(1)}% loss suggests reviewing your entry confirmation criteria.`,
    emotionalReview:
      journalContent.length > 50
        ? "Your journal notes indicate awareness of market conditions. Continue documenting your thought process before entries."
        : "Consider adding more detail to your journal about your emotional state and reasoning before entering the trade.",
    actionableInsights: [
      isProfitable
        ? `Your winning trades average ${(trade.duration / 60).toFixed(0)} minutes. Compare this to your losing trades.`
        : `Review your stop placement - this loss was ${Math.abs(trade.pnlPercentage || 0).toFixed(1)}% which might exceed your risk parameters.`,
      `Position sizing at $${(trade.value || 0).toFixed(0)} was ${Math.abs(trade.value || 0) > 20000 ? "aggressive" : "appropriate"} for this setup.`,
      `Fee impact of $${(trade.fees?.total || 0).toFixed(4)} represents ${(((trade.fees?.total || 0) / Math.abs(trade.value || 1)) * 100).toFixed(2)}% of trade value.`,
    ],
    riskAssessment: `Risk/Reward: ${isProfitable ? "1:" + ((trade.pnl / (trade.value || 1)) * 10).toFixed(1) : "Negative"}. Duration: ${Math.floor((trade.duration || 0) / 60)}min.`,
    disclaimer:
      "Not financial advice. AI analysis for educational and self-improvement purposes only.",
  };
}
