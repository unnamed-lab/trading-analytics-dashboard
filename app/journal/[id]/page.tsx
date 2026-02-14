"use client";

import { use, useState } from "react";
import {
  ArrowLeft,
  Bold,
  Italic,
  List,
  Image,
  Trash2,
  Save,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { journals, allTrades } from "@/data/mockTrades";
import { formatSide, isBullishSide, formatPrice, formatPnl } from "@/types";
import { useRouter } from "next/navigation";

const priceData = [
  { time: "14:00", price: 32.0 },
  { time: "14:15", price: 32.3 },
  { time: "14:30", price: 32.5 },
  { time: "14:45", price: 33.0 },
  { time: "15:00", price: 33.4 },
  { time: "15:15", price: 33.8 },
  { time: "15:30", price: 34.1 },
];

export default function JournalEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } =  use(params);
  const router = useRouter();
  const isNew = id === "new";

  const journal = isNew ? null : journals.find((j) => j.id === id);
  const trade = journal
    ? allTrades.find((t) => t.id === journal.tradeId)
    : null;

  const [content, setContent] = useState(journal?.content || "");

  const pnl = trade?.pnl ?? journal?.pnl ?? 0;
  const pnlPct = trade?.pnlPercentage ?? journal?.pnlPercentage ?? 0;
  const symbol = trade?.symbol ?? journal?.symbol ?? "SOL/USDC";
  const side = trade?.side ?? journal?.side ?? "long";
  const entryPrice = trade ? formatPrice(trade.entryPrice) : "32.45";
  const exitPrice = trade ? formatPrice(trade.exitPrice) : "34.10";
  const dateStr = trade
    ? trade.timestamp.toLocaleString()
    : (journal?.date ?? "Oct 24, 2023 • 14:32 UTC");
  const qty = trade ? trade.quantity.toFixed(2) : "385.05";
  const fees = trade ? `$${trade.fees.total.toFixed(2)}` : "$4.20";

  const isProfitable = pnl >= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Editor header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                ◆
              </span>
            </div>
            <span className="font-bold text-sm tracking-wide text-foreground uppercase">
              Deriverse Analytics
            </span>
            <span className="hidden sm:inline-block rounded border border-border px-2 py-0.5 text-xs text-muted-foreground tracking-wider uppercase">
              Journal Editor
            </span>
          </div>
          <button
            onClick={() => router.push("/journals")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-0">
        {/* Left sidebar - trade info */}
        <div className="border-r border-border p-5 space-y-5 overflow-y-auto">
          {/* Trade header */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-foreground">
                  {symbol}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    isBullishSide(side)
                      ? "bg-profit/15 text-profit"
                      : "bg-loss/15 text-loss"
                  }`}
                >
                  {formatSide(side)}
                </span>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-2xl font-bold ${isProfitable ? "text-profit" : "text-loss"}`}
                >
                  {formatPnl(pnl)}
                </p>
                <p
                  className={`font-mono text-xs ${isProfitable ? "text-profit" : "text-loss"}`}
                >
                  {pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{dateStr}</p>
          </div>

          {/* Execution data */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Entry Price
                </span>
                <p className="font-mono text-sm text-foreground mt-1">
                  {entryPrice}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Exit Price
                </span>
                <p className="font-mono text-sm text-foreground mt-1">
                  {exitPrice}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Quantity
                </span>
                <p className="font-mono text-sm text-foreground mt-1">{qty}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Fee
                </span>
                <p className="font-mono text-sm text-foreground mt-1">{fees}</p>
              </div>
            </div>
          </div>

          {/* Price action */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h4 className="text-xs font-medium tracking-wider text-muted-foreground uppercase mb-3">
              Price Action
            </h4>
            <div className="h-40 rounded-lg bg-secondary/30 border border-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData}>
                  <defs>
                    <linearGradient
                      id="journalPriceGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
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
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(187, 100%, 50%)"
                    strokeWidth={2}
                    fill="url(#journalPriceGrad)"
                  />
                  <ReferenceDot
                    x="14:00"
                    y={32.0}
                    r={5}
                    fill="hsl(187, 100%, 50%)"
                    stroke="none"
                  />
                  <ReferenceDot
                    x="15:30"
                    y={34.1}
                    r={5}
                    fill="hsl(152, 69%, 50%)"
                    stroke="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Assistant */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                AI Assistant
              </h4>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Performance Critique
                  </span>
                </div>
                <div className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Entry was slightly late relative to VWAP (+0.4% deviation).
                    While the setup was valid, a limit order at{" "}
                    {(trade ? trade.entryPrice * 0.998 : 32.35).toFixed(2)}{" "}
                    would have improved R:R by 0.2.
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Actionable Insight
                  </span>
                </div>
                <div className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You tend to exit winning trades prematurely in the afternoon
                    session. This trade reached{" "}
                    {(trade ? trade.exitPrice * 1.01 : 34.5).toFixed(2)} shortly
                    after your exit. Consider trailing stops instead of market
                    closing.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground italic">
              Not financial advice. AI analysis for educational purposes only.
            </p>
          </div>
        </div>

        {/* Right side - editor */}
        <div className="flex flex-col min-h-[calc(100vh-57px)]">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-foreground mr-3">
                ✏️ Trader Notes
              </span>
              <span className="w-px h-4 bg-border mx-1" />
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors">
                <Bold className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors">
                <Italic className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors">
                <List className="h-4 w-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground transition-colors">
                <Image className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-profit" />
              Auto-saved 14:35:22
            </div>
          </div>

          {/* Editor area */}
          <div className="flex-1 p-5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Trade Thesis & Execution Log&#10;&#10;Write your trade review here..."
              className="w-full h-full min-h-[400px] bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-5 py-2">
            <span className="text-xs text-muted-foreground font-mono">
              Ln 12, Col 45 &nbsp; UTF-8 &nbsp; Markdown
            </span>
          </div>

          {/* Actions */}
          <div className="border-t border-border px-5 py-4 flex items-center justify-between">
            <button className="flex items-center gap-2 rounded-lg border border-loss/30 px-4 py-2.5 text-sm font-medium text-loss hover:bg-loss/10 transition-colors">
              <Trash2 className="h-4 w-4" />
              Delete Journal
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/journals")}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
                <Save className="h-4 w-4" />
                Save Journal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
