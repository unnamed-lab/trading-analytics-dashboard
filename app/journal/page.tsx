"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useMemo } from "react";
import { useJournals } from "@/hooks/use-journals";
import bs58 from "bs58";
import {
  Loader2,
  Search,
  Plus,
  History,
  Filter,
  X,
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JournalStats } from "@/components/journal/journal-stats";
import { JournalCalendar } from "@/components/journal/journal-calendar";
import { JournalCard, LogNewTradeCard } from "@/components/journal/journal-card";
import { MoodSelector } from "@/components/journal/mood-selector";
import { format } from "date-fns";
import { TradeRecord } from "@/types";

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

export default function JournalsPage() {
  const { publicKey, signMessage } = useWallet();
  const publicKeyStr = publicKey?.toBase58() ?? null;

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

  const { list, create, update, remove } = useJournals(publicKeyStr, signer);

  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyLinked, setShowOnlyLinked] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // View State
  const [viewMode, setViewMode] = useState<"list" | "grid" | "calendar">("grid");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // New Entry State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newMood, setNewMood] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newSide, setNewSide] = useState<TradeRecord["side"] | "">("");
  const [newPnl, setNewPnl] = useState("");
  const [newPnlPct, setNewPnlPct] = useState("");

  const filteredJournals = useMemo(() => {
    if (!list.data) return [];
    return list.data.filter((j: JournalEntry) => {
      const matchesSearch =
        j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLinked = showOnlyLinked ? !!j.tradeId : true;

      // If a date is selected in calendar mode, filter by that date
      const matchesDate = selectedDate
        ? new Date(j.createdAt).toDateString() === selectedDate.toDateString()
        : true;

      // Only apply date filter if we are actually filtering by date (e.g. user clicked a date)
      // For now, let's say date filter applies always if selectedDate is set
      // But maybe we only want it in calendar view?
      // Let's keep it simple: date filter works if set.
      const dateFilterActive = viewMode === "calendar" && selectedDate;

      return matchesSearch && matchesLinked && (!dateFilterActive || matchesDate);
    });
  }, [list.data, searchQuery, showOnlyLinked, selectedDate, viewMode]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this journal entry?")) {
      try {
        await remove.mutateAsync(id);
      } catch (e) {
        console.error("Delete failed", e);
      }
    }
  };

  const handleEdit = (journal: any) => {
    // In a real app, maybe navigate to detail page or open a modal
    // For now, let's just use the detail page
    window.location.href = `/journal/${journal.id}`;
  };

  if (!publicKeyStr) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] space-y-4">
        <div className="p-4 rounded-full bg-secondary/20">
          <History className="h-12 w-12 text-muted-foreground opacity-50" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Connect Wallet</h2>
        <p className="text-muted-foreground text-center max-w-xs">
          Please connect your Solana wallet to view and manage your trading journals.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            Trading Journal
          </h1>
          <p className="text-muted-foreground font-medium">
            Master your psychology and track your progress.
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all font-bold px-6 py-6 rounded-2xl"
        >
          <Plus className="mr-2 h-5 w-5" /> New Entry
        </Button>
      </div>

      {/* Stats Overview */}
      {list.data && <JournalStats entries={list.data} />}

      {/* Main Controls */}
      <div className="flex flex-col gap-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 -my-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative group w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="h-4 w-4" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search journals..."
              className="pl-10 bg-card/40 border-border/40 focus:border-primary/50 rounded-xl"
            />
          </div>

          {/* View Toggles & Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant={showOnlyLinked ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyLinked(!showOnlyLinked)}
              className="h-9 rounded-lg border-border/40"
            >
              <History className={cn("mr-2 h-3 w-3", showOnlyLinked && "text-primary-foreground")} />
              Linked Trade
            </Button>

            <div className="bg-card/40 border border-border/40 rounded-lg p-1 flex items-center gap-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Entry Form */}
      {isAdding && (
        <div className="bg-card/40 backdrop-blur-md border border-primary/20 rounded-3xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">New Journal Entry</h3>
            <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4">
            <Input
              placeholder="Title (e.g., Morning Scalp Strategy)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-background/50 border-border/40 h-10 font-bold"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input
                placeholder="Pair (e.g. SOL-PERP)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                className="bg-background/50 border-border/40 h-10 font-mono text-xs"
              />
              <div className="flex bg-background/50 rounded-lg p-1 border border-border/40 gap-1 h-10">
                <Button
                  type="button"
                  variant={newSide === "long" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("flex-1 h-full text-[10px] font-bold uppercase", newSide === "long" && "bg-emerald-500/10 text-emerald-500")}
                  onClick={() => setNewSide("long")}
                >
                  Long
                </Button>
                <Button
                  type="button"
                  variant={newSide === "short" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("flex-1 h-full text-[10px] font-bold uppercase", newSide === "short" && "bg-rose-500/10 text-rose-500")}
                  onClick={() => setNewSide("short")}
                >
                  Short
                </Button>
              </div>
              <Input
                type="number"
                placeholder="PnL ($)"
                value={newPnl}
                onChange={(e) => setNewPnl(e.target.value)}
                className="bg-background/50 border-border/40 h-10 font-mono text-xs"
              />
              <Input
                type="number"
                placeholder="ROI (%)"
                value={newPnlPct}
                onChange={(e) => setNewPnlPct(e.target.value)}
                className="bg-background/50 border-border/40 h-10 font-mono text-xs"
              />
            </div>

            <MoodSelector value={newMood} onChange={setNewMood} />

            <textarea
              placeholder="Document your setup, emotions, and lessons learned..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full min-h-[120px] rounded-xl border border-border/40 bg-background/50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="rounded-xl">Cancel</Button>
            <Button
              disabled={!newContent || create.isPending}
              onClick={async () => {
                await create.mutateAsync({
                  title: newTitle,
                  content: newContent,
                  mood: newMood,
                  symbol: newSymbol || undefined,
                  side: newSide || undefined,
                  pnl: newPnl ? parseFloat(newPnl) : undefined,
                  pnlPercentage: newPnlPct ? parseFloat(newPnlPct) : undefined,
                });
                setNewTitle("");
                setNewContent("");
                setNewMood("");
                setNewSymbol("");
                setNewSide("");
                setNewPnl("");
                setNewPnlPct("");
                setIsAdding(false);
              }}
              className="rounded-xl font-bold"
            >
              {create.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Post Entry
            </Button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[400px] mt-6">
        {list.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Syncing your journal database...</p>
          </div>
        ) : (
          <>
            {viewMode === "calendar" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <JournalCalendar
                    entries={list.data || []}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">
                    {selectedDate ? format(selectedDate, "MMMM do") : "All Entries"}
                    <span className="text-muted-foreground font-normal text-sm ml-2">({filteredJournals.length})</span>
                  </h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {filteredJournals.map((j: JournalEntry) => (
                      <JournalCard
                        key={j.id}
                        journal={j}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        className="border-border/60"
                      />
                    ))}
                    {filteredJournals.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground border border-dashed border-border/40 rounded-xl">
                        No entries for this date
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewMode !== "calendar" && (
              <div className={cn(
                "w-full space-y-4",
                viewMode === "grid" ? "columns-1 md:columns-2 lg:columns-3 gap-5" : "max-w-3xl mx-auto"
              )}>
                {viewMode === "grid" && !searchQuery && (
                  <LogNewTradeCard onClick={() => setIsAdding(true)} />
                )}
                {filteredJournals.map((j: JournalEntry) => (
                  <JournalCard
                    key={j.id}
                    journal={j}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                {filteredJournals.length === 0 && !(!searchQuery && viewMode === "grid") && (
                  <div className="col-span-full text-center py-20 bg-card/10 rounded-3xl border border-dashed border-border/40">
                    <p className="text-muted-foreground">No journals found matching your search.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

