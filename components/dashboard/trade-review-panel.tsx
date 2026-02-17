import { X, Share2, CheckCircle, Sparkles } from "lucide-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import formatBigNumber, { shortenHash } from "@/utils/number-format";

interface TradeReviewPanelProps {
  trade: TradeRecord;
  onClose: () => void;
}

const TradeReviewPanel = ({ trade, onClose }: TradeReviewPanelProps) => {
  const isProfitable = trade.pnl >= 0;
  const bullish = isBullishSide(trade.side);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="w-full bg-background sm:w-105 lg:w-130 border-l border-border overflow-y-auto animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="font-mono truncate text-xs text-muted-foreground w-30">
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
          <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
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
                {formatBigNumber(trade.quantity, 2)}{" "}
                {trade.symbol.split("/")[0]}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Analysis */}
        <div className="p-5">
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
                value: trade.orderType?.toUpperCase(),
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
        </div>

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
              <span className="font-mono" title={trade.transactionHash}>
                {shortenHash(trade.transactionHash)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground/70">Type:</span>{" "}
              {trade.tradeType?.toUpperCase()} •{" "}
              {trade.orderType?.toUpperCase()}
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
