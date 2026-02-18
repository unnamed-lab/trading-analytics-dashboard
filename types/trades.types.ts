/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// Core Trade Types for Deriverse Analytics
// ============================================

export interface TradeRecord extends Partial<TradeComprehensiveRecord> {
  id: string;
  timestamp: Date;
  section?: string;
  symbol: string;
  side: "long" | "short" | "buy" | "sell" | "unknown";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  amount?: number;
  value?: number;
  orderType?:
    | "limit"
    | "market"
    | "cancel"
    | "revoke"
    | "fee"
    | "funding"
    | "event"
    | "new"
    | "deposit"
    | "socLoss"
    | "withdraw"
    | "unknown";
  instrument?: string;
  clientId: string;
  orderId: string;
  transactionHash: string;
  fees: {
    maker: number;
    taker: number;
    total: number;
    rebates?: number;
    funding?: number; // For perp funding
    socializedLoss?: number;
  };
  pnl: number;
  pnlPercentage: number;
  duration: number;
  status:
    | "win"
    | "loss"
    | "breakeven"
    | "open"
    | "close"
    | "pending"
    | "info"
    | "unknown";
  notes?: string;
  tradeType?: "spot" | "perp" | "swap" | "unknown";
  fundingPayments?: number;
  socializedLoss?: number;
  logType?: string;
  discriminator?: number;
  rawLogMessage?: string;
  rawData?: any;
}

export interface TradeComprehensiveRecord {
  pnl: number;
  pnlPercentage: number;
  fees: {
    maker: number;
    taker: number;
    total: number;
    rebates?: number;
    funding?: number; // For perp funding
    socializedLoss?: number;
  };
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  duration: number; // in seconds
  positionSize: number;
  leverage?: number;

  // Analytics tags
  isWinner: boolean;
  isLoser: boolean;
  isBreakeven: boolean;

  // Risk metrics
  riskAmount?: number; // Amount risked on this trade
  riskRewardRatio?: number;

  // Context
  marketCondition?: "trending" | "ranging" | "volatile";
  session?: "asia" | "london" | "ny" | "overlap";

  // PnL components
  pricePnl?: number; // PnL from price movement
  fundingPnl?: number; // PnL from funding
  feeImpact?: number; // Net fee impact
}

export interface TradeAnalytics {
  // Core PnL
  totalPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;

  // Win Rate
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage

  // Volume & Fees
  totalVolume: number;
  totalFees: number;
  feeBreakdown: {
    spotFees: number;
    perpFees: number;
    fundingPayments: number;
    socializedLosses: number;
  };

  // Time Analysis
  avgTradeDuration: number; // in seconds
  tradesByTimeOfDay: Map<number, TradeRecord[]>; // hour -> trades
  tradesByDayOfWeek: Map<number, TradeRecord[]>; // day -> trades

  // Directional Bias
  longTrades: number;
  shortTrades: number;
  longVolume: number;
  shortVolume: number;
  longShortRatio: number;

  // Risk Metrics
  largestGain: number;
  largestLoss: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number; // gross profit / gross loss

  // Drawdown
  maxDrawdown: number;
  currentDrawdown: number;
  peakEquity: number;

  // Symbol Performance
  symbolPerformance: Map<
    string,
    {
      pnl: number;
      trades: number;
      volume: number;
      winRate: number;
    }
  >;

  // Order Type Performance
  orderTypePerformance: {
    market: TradeStats;
    limit: TradeStats;
    stop: TradeStats;
  };

  // Historical
  dailyPnl: Map<string, number>; // date -> pnl
  cumulativePnl: number[];
}

export interface TradeStats {
  count: number;
  pnl: number;
  volume?: number;
  wins: number;
  losses: number;
}

// Journal entry linked to a trade
export interface Journal {
  id: string;
  title?: string;
  tradeId: string;
  date: string;
  symbol: string;
  side: TradeRecord["side"];
  pnl: number;
  pnlPercentage: number;
  notes: string;
  tags: string[];
  aiAnalyzed: boolean;
  content: string;
}

// ============================================
// Deriverse-specific Event Types
// ============================================

export interface DeriverseTradeEvent {
  tag: number;
  side: number; // 0 for buy/long, 1 for sell/short
  clientId: number;
  orderId: number;
  qty?: number;
  crncy?: number;
  price?: number;
  rebates?: number;
  perps?: number;
  funding?: number;
  socLoss?: number;
  time?: number;
}

export interface DeriverseFeeEvent {
  tag: number;
  refClientId: number;
  fees: number;
  refPayment: number;
}

export interface DeriverseFundingEvent {
  tag: number;
  clientId: number;
  instrId: number;
  time: number;
  funding: number;
}

export interface DeRiverseTradeEvent {
  timestamp: number;
  side: number;
  price: number;
  quantity: number;
  orderId: string;
  instrId: number;
  clientId: string;
  transactionHash: string;
  fee: number;
  orderType: string;
}

// ============================================
// Performance & Analytics Types
// ============================================

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalVolume: number;
  totalFees: number;
  averageTradeDuration: number;
  longShortRatio: number;
  largestGain: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  expectancy: number;
}

export interface TimeBasedMetrics {
  hourly: Record<string, PerformanceMetrics>;
  daily: Record<string, PerformanceMetrics>;
  weekly: Record<string, PerformanceMetrics>;
  monthly: Record<string, PerformanceMetrics>;
  session: {
    asian: PerformanceMetrics;
    london: PerformanceMetrics;
    newYork: PerformanceMetrics;
  };
}

export interface FeeAnalysis {
  totalFees: number;
  makerFees: number;
  takerFees: number;
  feePercentageOfVolume: number;
  cumulativeFees: Array<{ date: Date; fees: number }>;
}

export interface DrawdownPoint {
  peak: number;
  trough: number;
  drawdown: number;
  recovery: number;
  startDate: Date;
  endDate?: Date;
}

export interface TradeFilters {
  symbol?: string;
  startDate?: Date;
  endDate?: Date;
  side?: "long" | "short" | "buy" | "sell";
  minPnL?: number;
  maxPnL?: number;
  orderType?: string;
  clientId?: string;
  instrId?: number;
}

// ============================================
// Pagination & Fetching Types
// ============================================

export interface PaginationOptions {
  limit?: number;
  before?: string;
  until?: string;
}

export interface FetchResult {
  trades: TradeRecord[];
  hasMore: boolean;
  lastSignature?: string;
  totalProcessed: number;
}

// ============================================
// AI Review Types
// ============================================

export interface AIReviewResult {
  performanceCritique: string;
  emotionalReview: string;
  actionableInsights: string[];
  riskAssessment: string;
  disclaimer: string;
}

// ============================================
// Helper: format side for display
// ============================================

export function formatSide(side: TradeRecord["side"]): string {
  if (side === "long" || side === "buy") return "LONG";
  if (side === "short" || side === "sell") return "SHORT";
  return String(side).toUpperCase();
}

export function isBullishSide(side: TradeRecord["side"]): boolean {
  return side === "long" || side === "buy";
}

export function formatPrice(price: number): string {
  if (price === 0) return "-"
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(price < 1 ? 6 : 2);
}

export function formatLamports(lamports: number): string {
  const sol = lamports / 1e9;
  return formatPrice(sol);
}

export function formatPnl(pnl: number): string {
  const prefix = pnl >= 0 ? "+" : "";
  return `${prefix}$${Math.abs(pnl).toFixed(2)}`;
}


export interface FinancialDetails {
  // Fee totals
  totalProtocolFees: number;      // Fees paid to protocol (USDC)
  totalNetworkFees: number;        // SOL network fees (converted to USDC)
  totalFees: number;               // Total fees (protocol + network)
  
  // Funding payments
  totalFundingReceived: number;    // Positive funding received
  totalFundingPaid: number;        // Negative funding paid
  netFunding: number;              // Net funding PnL
  
  // Deposits/Withdrawals
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposits: number;             // Net capital inflow
  
  // Losses
  socializedLosses: number;        // Total socialized losses
  
  // Detailed breakdowns
  feeBreakdown: {
    spotFees: number;
    perpFees: number;
    makerRebates: number;
    takerFees: number;
  };
  
  fundingBreakdown: Map<string, number>;        // Symbol -> net funding
  fundingBreakdownArray?: Array<{ symbol: string; amount: number }>;
  
  dailySummary: Map<string, {                    // Date -> daily totals
    date: string;
    fees: number;
    funding: number;
    deposits: number;
    withdrawals: number;
    trades: number;
  }>;
  dailySummaryArray?: Array<{
    date: string;
    fees: number;
    funding: number;
    deposits: number;
    withdrawals: number;
    trades: number;
  }>;
}