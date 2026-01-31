/**
 * Mock data for demo mode and placeholder widgets.
 */

export const MOCK_DAILY_PNL = [
  { date: "Mon", pnl: 120 },
  { date: "Tue", pnl: -45 },
  { date: "Wed", pnl: 280 },
  { date: "Thu", pnl: -12 },
  { date: "Fri", pnl: 95 },
  { date: "Sat", pnl: 150 },
  { date: "Sun", pnl: -30 },
];

export const MOCK_EQUITY_CURVE = [
  { date: "01", value: 10000 },
  { date: "05", value: 10200 },
  { date: "10", value: 9850 },
  { date: "15", value: 10100 },
  { date: "20", value: 10500 },
  { date: "25", value: 10300 },
  { date: "30", value: 10800 },
];

export const MOCK_PNL_OVERVIEW = {
  total: 438,
  realized: 320,
  unrealized: 118,
  roiPercent: 4.38,
  dailyChange: 2.1,
};

export const MOCK_PERFORMANCE = {
  winRate: 62,
  avgWin: 85,
  avgLoss: -42,
  profitFactor: 1.92,
};

export const MOCK_LONG_SHORT = { long: 58, short: 42 };

export const MOCK_RECENT_TRADES = [
  { id: "1", symbol: "SOL", side: "long", pnl: 42.5, pnlPercent: 2.1, time: "2h ago" },
  { id: "2", symbol: "SOL", side: "short", pnl: -18.2, pnlPercent: -0.9, time: "5h ago" },
  { id: "3", symbol: "SOL", side: "long", pnl: 95.0, pnlPercent: 4.5, time: "1d ago" },
  { id: "4", symbol: "SOL", side: "short", pnl: 22.1, pnlPercent: 1.2, time: "2d ago" },
  { id: "5", symbol: "SOL", side: "long", pnl: -12.0, pnlPercent: -0.6, time: "3d ago" },
];

export const MOCK_FEE_BREAKDOWN = [
  { type: "Trading", amount: 28 },
  { type: "Funding", amount: 12 },
  { type: "Withdrawal", amount: 2 },
];

/** Extended trade entries for Journal (demo mode): id, symbol, side, PnL, times, setup, notes */
export interface JournalTrade {
  id: string;
  symbol: string;
  side: "long" | "short";
  pnl: number;
  pnlPercent: number;
  time: string;
  entryPrice: number;
  exitPrice: number;
  size: number;
  setup: string;
  notes?: string;
}

export const MOCK_JOURNAL_TRADES: JournalTrade[] = [
  {
    id: "1",
    symbol: "SOL-PERP",
    side: "long",
    pnl: 42.5,
    pnlPercent: 2.1,
    time: "2h ago",
    entryPrice: 198.2,
    exitPrice: 202.36,
    size: 10,
    setup: "Breakout",
    notes: "Clean breakout above 197. Held through first pullback.",
  },
  {
    id: "2",
    symbol: "SOL-PERP",
    side: "short",
    pnl: -18.2,
    pnlPercent: -0.9,
    time: "5h ago",
    entryPrice: 201.0,
    exitPrice: 199.18,
    size: 10,
    setup: "Counter-trend",
    notes: "Faded extension; stopped out. Reduce size next time.",
  },
  {
    id: "3",
    symbol: "SOL-PERP",
    side: "long",
    pnl: 95.0,
    pnlPercent: 4.5,
    time: "1d ago",
    entryPrice: 192.5,
    exitPrice: 201.8,
    size: 20,
    setup: "Breakout",
    notes: "Strong momentum day. Took partial at +2%.",
  },
  {
    id: "4",
    symbol: "SOL-PERP",
    side: "short",
    pnl: 22.1,
    pnlPercent: 1.2,
    time: "2d ago",
    entryPrice: 188.0,
    exitPrice: 185.79,
    size: 18,
    setup: "Rejection",
  },
  {
    id: "5",
    symbol: "SOL-PERP",
    side: "long",
    pnl: -12.0,
    pnlPercent: -0.6,
    time: "3d ago",
    entryPrice: 195.0,
    exitPrice: 193.8,
    size: 15,
    setup: "Pullback",
    notes: "Failed hold of 194. Cut loss quickly.",
  },
  {
    id: "6",
    symbol: "SOL-PERP",
    side: "long",
    pnl: 58.4,
    pnlPercent: 2.8,
    time: "4d ago",
    entryPrice: 199.0,
    exitPrice: 204.08,
    size: 25,
    setup: "Breakout",
  },
  {
    id: "7",
    symbol: "SOL-PERP",
    side: "short",
    pnl: -8.5,
    pnlPercent: -0.4,
    time: "5d ago",
    entryPrice: 205.2,
    exitPrice: 206.02,
    size: 20,
    setup: "Counter-trend",
  },
];

export function formatCurrency(value: number): string {
  const sign = value >= 0 ? "" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
