"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useJournals } from "@/hooks/use-journals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoodSelector } from "@/components/journal/mood-selector";
import { ArrowLeft, History, Save, Trash2, Loader2, Sparkles, TrendingUp, TrendingDown, Target } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatPnl, TradeRecord } from "@/types";

interface JournalEntry {
  id: string;
  title?: string | null;
  content?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  tradeId?: string | null;
  symbol?: string | null;
  side?: string | null;
  pnl?: number | null;
  pnlPercentage?: number | null;
  tags?: string[] | null;
  mood?: string | null;
  images?: string[] | null;
}

export default function JournalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { publicKey, signMessage } = useWallet();
  const publicKeyStr = publicKey?.toBase58() ?? null;
  const router = useRouter();

  const signer = async (messageB64: string) => {
    if (!signMessage) throw new Error("wallet cannot sign messages");
    let msgBytes: Uint8Array;
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = window.atob(messageB64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      msgBytes = arr;
    } else {
      msgBytes = new Uint8Array(Buffer.from(messageB64, "base64"));
    }
    const signed = await signMessage(msgBytes as Uint8Array);
    const sigBytes = (signed as any)?.signature ?? signed;
    return bs58.encode(Buffer.from(sigBytes));
  };

  const { list, update, remove } = useJournals(publicKeyStr, signer);
  const [item, setItem] = useState<JournalEntry | null>(null);

  // Edit State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<TradeRecord["side"] | "">("");
  const [pnl, setPnl] = useState("");
  const [pnlPct, setPnlPct] = useState("");

  useEffect(() => {
    const found = list.data?.find((j: JournalEntry) => j.id === id);
    if (found) {
      setItem(found);
      setTitle(found.title || "");
      setContent(found.content || "");
      setMood(found.mood || "");
      setSymbol(found.symbol || "");
      setSide((found.side as any) || "");
      setPnl(found.pnl?.toString() || "");
      setPnlPct(found.pnlPercentage?.toString() || "");
    } else if (id) {
      fetch(`/api/journal/${id}`)
        .then((r) => r.json())
        .then((j: JournalEntry) => {
          setItem(j);
          setTitle(j.title || "");
          setContent(j.content || "");
          setMood(j.mood || "");
          setSymbol(j.symbol || "");
          setSide((j.side as any) || "");
          setPnl(j.pnl?.toString() || "");
          setPnlPct(j.pnlPercentage?.toString() || "");
        })
        .catch(() => { });
    }
  }, [list.data, id]);

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest animate-pulse">Loading Analysis...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/journal">
            <Button variant="outline" className="rounded-xl border-white/5 bg-card/20 backdrop-blur-md hover:bg-card/40 transition-all group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
            </Button>
          </Link>
          <div className="h-8 w-[1px] bg-white/10 hidden md:block" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest">
                Journal Entry
              </span>
              <Badge variant="outline" className="h-4 px-1.5 border-primary/20 bg-primary/5 text-primary text-[8px] font-bold gap-1">
                <Sparkles className="w-2 h-2" /> AI ANALYZED
              </Badge>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Created on {format(new Date(item.createdAt), "MMMM do, yyyy")}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="rounded-xl text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            onClick={async () => {
              if (confirm("Permanently delete this journal entry?")) {
                await remove.mutateAsync(item.id);
                router.push("/journal");
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Entry
          </Button>
          <Button
            onClick={async () => {
              await update.mutateAsync({
                id: item.id,
                title,
                content,
                mood,
                symbol,
                side: side || undefined,
                pnl: pnl ? parseFloat(pnl) : undefined,
                pnlPercentage: pnlPct ? parseFloat(pnlPct) : undefined
              });
              router.refresh();
            }}
            disabled={update.isPending}
            className="rounded-xl font-bold bg-primary hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all px-8"
          >
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Editor Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-4xl font-black tracking-tighter border-transparent bg-transparent hover:bg-white/5 focus:bg-white/5 px-0 h-auto transition-all focus-visible:ring-0 placeholder:opacity-20"
              placeholder="Give your trade a title..."
            />

            <div className="relative group">
              <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-primary/20 group-focus-within:bg-primary transition-colors" />
              <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 opacity-80 flex items-center gap-2">
                <Target className="w-3 h-3" /> Trade Notes
              </div>
              <div className="bg-card/20 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-1 min-h-[600px] transition-all hover:bg-card/30">
                <textarea
                  className="w-full h-full min-h-[600px] bg-transparent p-8 resize-none focus:outline-none leading-relaxed text-base text-foreground/90 font-medium placeholder:text-muted-foreground/20 custom-scrollbar"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Document your setup, execution, emotions, and key takeaways..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Metadata Section */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mood Selector Panel */}
          <div className="p-6 rounded-3xl bg-card/20 backdrop-blur-md border border-white/5 space-y-4 shadow-xl">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Psychology State
            </label>
            <MoodSelector value={mood} onChange={setMood} className="grid grid-cols-2 gap-2" />
          </div>

          {/* Financial Data Composition Panel */}
          <div className="p-6 rounded-3xl bg-card/20 backdrop-blur-md border border-white/10 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-primary uppercase tracking-widest">
                Data Composition
              </label>
              <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Trading Pair</span>
                <Input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="E.G. SOL-PERP"
                  className="h-11 bg-background/50 border-white/5 rounded-xl font-black tracking-tight focus:border-primary/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Execution Side</span>
                <div className="flex bg-background/50 rounded-xl p-1.5 border border-white/5 gap-1.5 h-12">
                  <Button
                    variant={side === "long" ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 h-full text-xs font-black uppercase rounded-lg transition-all",
                      side === "long" ? "bg-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10" : "text-muted-foreground hover:bg-white/5"
                    )}
                    onClick={() => setSide("long")}
                  >
                    <TrendingUp className="w-3 h-3 mr-1.5" /> Long
                  </Button>
                  <Button
                    variant={side === "short" ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 h-full text-xs font-black uppercase rounded-lg transition-all",
                      side === "short" ? "bg-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/10" : "text-muted-foreground hover:bg-white/5"
                    )}
                    onClick={() => setSide("short")}
                  >
                    <TrendingDown className="w-3 h-3 mr-1.5" /> Short
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Net PnL ($)</span>
                  <Input
                    type="number"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    placeholder="0.00"
                    className={cn(
                      "h-11 bg-background/50 border-white/5 rounded-xl font-mono font-bold transition-all focus:border-primary/50",
                      parseFloat(pnl) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Return (%)</span>
                  <Input
                    type="number"
                    value={pnlPct}
                    onChange={(e) => setPnlPct(e.target.value)}
                    placeholder="0.0"
                    className={cn(
                      "h-11 bg-background/50 border-white/5 rounded-xl font-mono font-bold transition-all focus:border-primary/50",
                      parseFloat(pnlPct) >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Linked Trade Info (If exists) */}
          {item.tradeId && (
            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-4 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <History className="w-20 h-20" />
              </div>
              <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                <History className="h-4 w-4" />
                Linked Protocol Data
              </div>
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Trade ID</span>
                  <span className="font-mono text-xs text-primary/80">#{item.tradeId.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Verification</span>
                  <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">ON-CHAIN VERIFIED</Badge>
                </div>
                {item.pnl !== null && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black uppercase text-foreground/60">Live Protocol PnL</span>
                    <span className={cn("font-mono font-bold text-lg", (item.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {formatPnl(item.pnl ?? 0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
