import { X, Share2, CheckCircle, Sparkles } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";

const priceData = [
  { time: "09:00", price: 140 },
  { time: "09:15", price: 141 },
  { time: "09:30", price: 139 },
  { time: "09:45", price: 142.5 },
  { time: "10:00", price: 144 },
  { time: "10:15", price: 146 },
  { time: "10:30", price: 148 },
  { time: "10:45", price: 150 },
  { time: "11:00", price: 153 },
  { time: "11:15", price: 155 },
  { time: "11:30", price: 157 },
  { time: "11:45", price: 158 },
  { time: "12:00", price: 160 },
];

interface TradeReviewPanelProps {
  trade: TradeRecord;
  onClose: () => void;
}

const TradeReviewPanel = ({ trade, onClose }: TradeReviewPanelProps) => {
  const isProfitable = trade.pnl >= 0;
  const bullish = isBullishSide(trade.side);
  const durationMin = Math.round(trade.duration / 60);
  const durationStr =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-background backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-full sm:w-105 lg:w-130 bg-card border-l border-border overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              #{trade.id}
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              {trade.symbol}
            </span>
            <span
              className={`rounded border px-2 py-0.5 text-xs font-bold ${
                bullish ? "border-profit text-profit" : "border-loss text-loss"
              }`}
            >
              {formatSide(trade.side)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Profit Banner */}
        <div
          className={`mx-5 mt-5 rounded-lg p-4 flex items-center justify-between ${
            isProfitable
              ? "bg-profit/10 border border-profit/30"
              : "bg-loss/10 border border-loss/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle
              className={`h-5 w-5 ${isProfitable ? "text-profit" : "text-loss"}`}
            />
            <span
              className={`text-sm font-bold uppercase ${isProfitable ? "text-profit" : "text-loss"}`}
            >
              {isProfitable ? "Profitable" : "Loss"}
            </span>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-2xl font-bold ${isProfitable ? "text-profit" : "text-loss"}`}
            >
              {formatPnl(trade.pnl)}
            </p>
            <p
              className={`font-mono text-xs ${isProfitable ? "text-profit" : "text-loss"}`}
            >
              {trade.pnlPercentage >= 0 ? "+" : ""}
              {trade.pnlPercentage.toFixed(1)}% ROI
            </p>
          </div>
        </div>

        {/* Execution Data */}
        <div className="p-5">
          <h4 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-3">
            Execution Data
          </h4>
          <div className="grid grid-cols-2 gap-px bg-border rounded-lg overflow-hidden">
            <div className="bg-card p-3">
              <span className="text-xs text-muted-foreground">Entry Price</span>
              <p className="font-mono text-sm text-primary mt-1">
                {formatPrice(trade.entryPrice)}
              </p>
            </div>
            <div className="bg-card p-3">
              <span className="text-xs text-muted-foreground">Exit Price</span>
              <p
                className={`font-mono text-sm mt-1 ${isProfitable ? "text-profit" : "text-loss"}`}
              >
                {formatPrice(trade.exitPrice)}
              </p>
            </div>
            <div className="bg-card p-3">
              <span className="text-xs text-muted-foreground">Quantity</span>
              <p className="font-mono text-sm text-primary mt-1">
                {trade.quantity.toFixed(2)} {trade.symbol.split("/")[0]}
              </p>
            </div>
            <div className="bg-card p-3">
              <span className="text-xs text-muted-foreground">Duration</span>
              <p className="font-mono text-sm text-primary mt-1">
                {durationStr}
              </p>
            </div>
          </div>
        </div>

        {/* Price Action Chart */}
        {/* <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Price Action
            </h4>
            <span className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground">
              15m TF
            </span>
          </div>
          <div className="h-44 rounded-lg bg-secondary/30 border border-border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(187, 100%, 50%)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(187, 100%, 50%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(187, 100%, 50%)"
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                />
                <ReferenceDot
                  x="09:45"
                  y={142.5}
                  r={5}
                  fill="hsl(187, 100%, 50%)"
                  stroke="none"
                />
                <ReferenceDot
                  x="12:00"
                  y={160}
                  r={5}
                  fill="hsl(152, 69%, 50%)"
                  stroke="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-1.5 px-1">
            <span className="text-xs text-primary font-mono">ENTRY</span>
            <span className="text-xs text-profit font-mono">EXIT</span>
          </div>
        </div> */}

        {/* Risk Analysis */}
        {/* <div className="p-5">
          <h4 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-3">
            Risk Analysis
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "RISK/REWARD",
                value: isProfitable
                  ? `1:${(Math.abs(trade.pnlPercentage) / 2).toFixed(1)}`
                  : "Negative",
              },
              {
                label: "FEES",
                value: `-$${trade.fees.total.toFixed(2)}`,
                negative: true,
              },
              {
                label: "ORDER TYPE",
                value: trade.orderType.toUpperCase(),
                primary: true,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-border bg-secondary/30 p-3"
              >
                <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  {m.label}
                </span>
                <p
                  className={`font-mono text-lg font-bold mt-1 ${
                    m.negative
                      ? "text-loss"
                      : m.primary
                        ? "text-primary"
                        : "text-foreground"
                  }`}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div> */}

        {/* AI Insight */}
        <div className="px-5 pb-5">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 glow-primary">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Deriverse AI Insight
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isProfitable ? (
                <>
                  <span className="text-profit font-medium">
                    Entry was optimal
                  </span>
                  . You entered at a strong support level. The exit captured{" "}
                  {trade.pnlPercentage.toFixed(1)}% of the move on{" "}
                  {trade.symbol}.
                </>
              ) : (
                <>
                  <span className="text-loss font-medium">Review needed</span>.
                  The {formatSide(trade.side).toLowerCase()} entry at{" "}
                  {formatPrice(trade.entryPrice)} resulted in a{" "}
                  {Math.abs(trade.pnlPercentage).toFixed(1)}% loss. Consider
                  waiting for confirmation before entering.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Trade metadata */}
        <div className="px-5 pb-5">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <span className="text-muted-foreground/70">Tx:</span>{" "}
              <span className="font-mono">{trade.transactionHash}</span>
            </p>
            <p>
              <span className="text-muted-foreground/70">Type:</span>{" "}
              {trade.tradeType?.toUpperCase()} • {trade.orderType}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto border-t border-border p-5 flex gap-3">
          <button className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
            Delete Log
          </button>
          <button className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeReviewPanel;
