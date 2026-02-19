/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  X,
  Share2,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Layers,
  DollarSign,
  Activity,
  ChevronRight,
  Calendar,
  Hash,
  Tag,
  PenLine,
} from "lucide-react";
import type { TradeRecord } from "@/types";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import formatBigNumber, { shortenHash } from "@/utils/number-format";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useJournals } from "@/hooks/use-journals";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

  const [tags, setTags] = useState<string[]>(
    existing?.tags ?? trade.tags ?? []
  );

  useEffect(() => {
    setJournalContent(existing?.content ?? trade.notes ?? "");
    setTags(existing?.tags ?? trade.tags ?? []);
  }, [existing?.id, trade.id]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <div className="relative h-full w-full bg-background/80 backdrop-blur-xl sm:w-110 lg:w-130 border-l border-border/50 shadow-2xl animate-slide-in-right flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40 bg-card/10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                Trade {shortenHash(trade.id)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {trade.symbol}
              </h2>
              <Badge
                variant="outline"
                className={`text-xs font-bold px-2 py-0.5 ${bullish
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-500"
                  }`}
              >
                {formatSide(trade.side)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors border border-border/30">
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground transition-all border border-border/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Profit Banner */}
          <div className="px-6 pt-6">
            <div
              className={`relative rounded-2xl p-6 overflow-hidden border ${isProfitable
                ? "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                : "border-rose-500/20 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.05)]"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                {isProfitable ? (
                  <TrendingUp className="h-20 w-20 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-20 w-20 text-rose-500" />
                )}
              </div>

              <div className="relative flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={`h-4 w-4 ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {isProfitable ? "Successful Execution" : "Negative Outcome"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-mono font-bold tracking-tighter ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}>
                      {formatPnl(trade.pnl)}
                    </span>
                    <span className={`text-sm font-mono font-medium ${isProfitable ? "text-emerald-500/70" : "text-rose-500/70"}`}>
                      {trade.pnlPercentage >= 0 ? "+" : ""}
                      {trade.pnlPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Execution Metrics */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card/30 backdrop-blur-sm border border-border/40 rounded-xl p-4 transition-all hover:border-border/60">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Position Size</span>
                </div>
                <div className="font-mono text-lg font-bold text-foreground">
                  {formatBigNumber(trade.quantity, 2)} <span className="text-xs text-muted-foreground">{trade.symbol.split("/")[0]}</span>
                </div>
              </div>

              <div className="bg-card/30 backdrop-blur-sm border border-border/40 rounded-xl p-4 transition-all hover:border-border/60">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Total Fees</span>
                </div>
                <div className="font-mono text-lg font-bold text-rose-500">
                  -${trade.fees.total.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-card/20 border border-border/40 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 border-b border-border/40">
                <div className="p-4 border-r border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Avg Entry</span>
                  <span className="font-mono text-sm font-semibold">{formatPrice(trade.entryPrice)}</span>
                </div>
                <div className="p-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Avg Exit</span>
                  <span className={`font-mono text-sm font-semibold ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}>
                    {formatPrice(trade.exitPrice)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-4 border-r border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Type</span>
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-primary/70" />
                    <span className="text-xs font-medium uppercase">{trade.tradeType}</span>
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Order</span>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-primary/70" />
                    <span className="text-xs font-medium uppercase">{trade.orderType}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Journaling */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PenLine className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-widest">Trade Journal</span>
                </div>
              </div>
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="What was the setup? Any mistakes? Emotions during the trade..."
                className="w-full min-h-[160px] rounded-xl border border-border/40 bg-card/10 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none transition-all placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 rounded-md bg-secondary/50 hover:bg-rose-500/10 hover:text-rose-500 group transition-all border border-border/40 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    <span className="text-xs">{tag}</span>
                    <X className="h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
                ))}
                <div className="relative">
                  <Input
                    className="h-8 text-xs bg-transparent border-dashed border-border/60 w-32 focus-visible:ring-0 focus-visible:border-primary/60 transition-all"
                    placeholder="+ Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="pt-4 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground tracking-wider uppercase">
                <span>Transaction details</span>
                <span className="font-mono text-[9px] lowercase opacity-50"># {trade.transactionHash.slice(0, 16)}...</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 opacity-50" />
                  <span className="text-xs text-muted-foreground/80">{new Date(trade.timestamp).toLocaleString()}</span>
                </div>
                <a
                  href={`https://solscan.io/tx/${trade.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors underline underline-offset-4 decoration-primary/20"
                >
                  View on Explorer <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border/40 bg-card/10 flex gap-4">
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
            className="flex-1 rounded-xl border border-rose-500/20 py-3 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-30 disabled:grayscale"
          >
            {remove.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mx-auto" />
            ) : (
              "Delete Entry"
            )}
          </button>
          <button
            onClick={async () => {
              try {
                if (existing) {
                  await update.mutateAsync({
                    id: existing.id,
                    content: journalContent,
                    tags,
                  });
                } else {
                  await create.mutateAsync({
                    tradeId: trade.id,
                    content: journalContent,
                    title: `${trade.symbol} ${trade.id}`,
                    tags,
                  });
                }
              } catch (e) {
                // ignore
              }
            }}
            disabled={create.isPending || update.isPending}
            className="flex-[2] rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:brightness-110 transition-all disabled:opacity-50"
          >
            {create.isPending || update.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mx-auto" />
            ) : (
              "Save Review"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeReviewPanel;
