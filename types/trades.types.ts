// ============================================
// Core Trade Types for Deriverse Analytics
// ============================================

export interface TradeRecord {
  id: string;
  timestamp: Date;
  section?: string;
  symbol: string;
  side: "long" | "short" | "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  amount?: number;
  value?: number;
  orderType: "limit" | "market" | "cancel" | "revoke" | "unknown";
  instrument?: string;
  clientId: string;
  orderId: string;
  transactionHash: string;
  fees: {
    maker: number;
    taker: number;
    total: number;
    rebates?: number;
  };
  pnl: number;
  pnlPercentage: number;
  duration: number;
  status: "win" | "loss" | "breakeven" | "open" | "close";
  notes?: string;
  tradeType?: "spot" | "perp";
  fundingPayments?: number;
  socializedLoss?: number;
  logType?: string;
  discriminator?: number;
  rawLogMessage?: string;
}

// Journal entry linked to a trade
export interface Journal {
  id: string;
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
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(price < 1 ? 6 : 2);
}

export function formatPnl(pnl: number): string {
  const prefix = pnl >= 0 ? "+" : "";
  return `${prefix}$${Math.abs(pnl).toFixed(2)}`;
}
