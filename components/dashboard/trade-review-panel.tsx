/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  X,
  Share2,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import formatBigNumber, { shortenHash } from "@/utils/number-format";
import { useAITradeReview, useGenerateAIReview } from "@/hooks/use-ai-review";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useJournals } from "@/hooks/use-journals";

interface TradeReviewPanelProps {
  trade: TradeRecord;
  onClose: () => void;
}

const TradeReviewPanel = ({ trade, onClose }: TradeReviewPanelProps) => {
  const isProfitable = trade.pnl >= 0;
  const bullish = isBullishSide(trade.side);

   // Only show if it's a perp trade
  if (trade.discriminator !== 19 && trade.tradeType !== "perp") {
    return null;
  }

  const {
    data: aiReview,
    isLoading: aiLoading,
    refetch: refetchReview,
  } = useAITradeReview(trade, !!trade);

  const generateReview = useGenerateAIReview();
  const [regenerating, setRegenerating] = useState(false);
  const { publicKey, signMessage } = useWallet();

  const publicKeyStr = publicKey?.toBase58() ?? null;

  // signer expects a base64 message string and returns base58 signature
  const signer = async (messageB64: string) => {
    if (!signMessage) throw new Error("wallet cannot sign messages");

    // decode base64 to bytes in browser/node-safe way
    let msgBytes: Uint8Array;
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = window.atob(messageB64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      msgBytes = arr;
    } else {
      const bin = Buffer.from(messageB64, "base64");
      msgBytes = new Uint8Array(bin);
    }

    const signed = await signMessage(msgBytes as Uint8Array);
    const sigBytes = (signed as any)?.signature ?? signed;
    return bs58.encode(Buffer.from(sigBytes));
  };

  const { list, create, update, remove } = useJournals(
    publicKeyStr,
    signer,
    trade.id,
  );

  const existing = list.data?.[0];

  const [journalContent, setJournalContent] = useState<string>(
    existing?.content ?? trade.notes ?? "",
  );

  useEffect(() => {
    setJournalContent(existing?.content ?? trade.notes ?? "");
  }, [existing?.id, trade.id]);

  // cached review info (client-only)
  let cachedMinutes: number | null = null;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(`ai-review:${trade.id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { timestamp: number; data: any };
        if (parsed?.timestamp) {
          cachedMinutes = Math.round((Date.now() - parsed.timestamp) / 60000);
        }
      }
    }
  } catch (e) {
    cachedMinutes = null;
  }

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
            <div className="flex flex-col items-start justify-between gap-3">
              <div className="flex-1">
                {aiLoading || regenerating ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 w-1/3 bg-muted-foreground/10 rounded" />
                    <div className="h-3 w-full bg-muted-foreground/8 rounded" />
                    <div className="h-3 w-5/6 bg-muted-foreground/8 rounded" />
                    <div className="h-3 w-3/4 bg-muted-foreground/8 rounded" />
                  </div>
                ) : aiReview ? (
                  <div className="flex-col">
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {aiReview.performanceCritique}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {aiReview.emotionalReview}
                    </p>
                    <div className="text-xs text-foreground">
                      <strong>Actionable:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {aiReview.actionableInsights.slice(0, 5).map((a, i) => (
                          <li key={i} className="mt-1">
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No AI review available.
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 flex  items-end gap-2">
                <button
                  onClick={async () => {
                    try {
                      setRegenerating(true);
                      await generateReview.mutateAsync({
                        trade,
                        journalContent:
                          trade.notes || "No journal entry provided",
                        context: { recentTrades: [] },
                      });
                      refetchReview();
                    } finally {
                      setRegenerating(false);
                    }
                  }}
                  className="flex items-center gap-2 rounded px-3 py-1 text-xs border border-border bg-secondary/5 hover:bg-secondary"
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <div className="text-[10px] text-muted-foreground/60 italic text-right">
                  <div>{aiReview?.disclaimer || "Not financial advice."}</div>
                  {cachedMinutes !== null && (
                    <div className="text-[10px] text-muted-foreground/50 mt-1">
                      Cached {cachedMinutes}m ago
                    </div>
                  )}
                </div>
              </div>
            </div>
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
        <div className="px-5 pb-5">
          <label className="text-xs text-muted-foreground">Journal</label>
          <textarea
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            className="w-full mt-2 min-h-[120px] rounded-md border border-border bg-card p-3 text-sm"
          />
        </div>

        <div className="mt-auto border-t border-border p-5 flex gap-3">
          <button
            onClick={async () => {
              try {
                if (!existing) return;
                await remove.mutateAsync(existing.id);
              } catch (e) {
                // ignore
              }
            }}
            disabled={!existing || remove.isPending}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
          >
            {remove.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mx-auto" />
            ) : (
              "Delete Log"
            )}
          </button>
          <button
            onClick={async () => {
              try {
                if (existing) {
                  await update.mutateAsync({
                    id: existing.id,
                    content: journalContent,
                  });
                } else {
                  await create.mutateAsync({
                    tradeId: trade.id,
                    content: journalContent,
                    title: `${trade.symbol} ${trade.id}`,
                  });
                }
              } catch (e) {
                // ignore
              }
            }}
            disabled={create.isPending || update.isPending}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {create.isPending || update.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mx-auto" />
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeReviewPanel;
