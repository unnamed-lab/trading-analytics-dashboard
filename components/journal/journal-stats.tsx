"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPnl } from "@/types";
import { TrendingUp, TrendingDown, BookOpen, Quote } from "lucide-react";

interface JournalEntry {
    id: string;
    pnl?: number | null;
    tradeId?: string | null;
    mood?: string | null;
}

interface JournalStatsProps {
    entries: JournalEntry[];
}

export function JournalStats({ entries }: JournalStatsProps) {
    const totalEntries = entries.length;
    const linkedTrades = entries.filter((e) => e.tradeId);
    const totalPnl = linkedTrades.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const winningTrades = linkedTrades.filter((e) => (e.pnl || 0) > 0).length;
    const winRate = linkedTrades.length > 0 ? (winningTrades / linkedTrades.length) * 100 : 0;

    // Find most frequent mood
    const moodCounts = entries.reduce((acc, e) => {
        if (e.mood) {
            acc[e.mood] = (acc[e.mood] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const topMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const topMoodName = topMoodEntry ? topMoodEntry[0] : "N/A";
    const topMoodEmoji = MOODS_MAP[topMoodName] || "📝";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/40 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Total Entries</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{totalEntries}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        <span className="text-primary font-bold">{linkedTrades.length}</span> linked to trades
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Net PnL (Journaled)</CardTitle>
                    <div className={cn(
                        "p-2 rounded-lg",
                        totalPnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
                    )}>
                        {totalPnl >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={`text-3xl font-black ${totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatPnl(totalPnl)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        From <span className="font-bold">{linkedTrades.length}</span> documented trades
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Win Rate</CardTitle>
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black">{winRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Success on journaled setups
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-tight">Dominant Mood</CardTitle>
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Quote className="h-4 w-4 text-purple-500" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-black truncate flex items-center gap-2">
                        <span className="text-2xl">{topMoodEmoji}</span>
                        {topMoodName}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                        Recorded in <span className="text-primary">{topMoodEntry ? topMoodEntry[1] : 0}</span> entries
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

const MOODS_MAP: Record<string, string> = {
    "Confident": "🚀",
    "Neutral": "😐",
    "Anxious": "😨",
    "Frustrated": "😡",
    "Excited": "🤩",
    "Revenge": "👿",
};
