// Define your TradeRecord interface
export interface TradeRecord {
  id: string;
  timestamp: Date;
  section?: string;
  symbol: string;
  side: 'long' | 'short' | 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  amount?: number;
  value?: number;
  orderType: 'limit' | 'market' | 'cancel' | 'revoke' | 'unknown';
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
  status: 'win' | 'loss' | 'breakeven';
  notes?: string;
  tradeType?: 'spot' | 'perp';
  fundingPayments?: number;
  socializedLoss?: number;
  logType?: string;
  discriminator?: number;
  rawLogMessage?: string;
}


// New types for Deriverse-specific data
export interface DeriverseTradeEvent {
  tag: number; // LogType enum value
  side: number; // 0 for buy/long, 1 for sell/short
  clientId: number;
  orderId: number;
  // Spot specific
  qty?: number;
  crncy?: number;
  price?: number;
  rebates?: number;
  // Perp specific
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
  side?: 'long' | 'short' | 'buy' | 'sell';
  minPnL?: number;
  maxPnL?: number;
  orderType?: string;
  clientId?: string;
  instrId?: number;
}


export interface DeRiverseTradeEvent {
  timestamp: number;
  side: number; // 0 for buy, 1 for sell
  price: number;
  quantity: number;
  orderId: string;
  instrId: number;
  clientId: string;
  transactionHash: string;
  fee: number;
  orderType: string;
}