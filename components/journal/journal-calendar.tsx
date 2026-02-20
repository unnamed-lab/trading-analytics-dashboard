"use client";

import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface JournalEntry {
    id: string;
    createdAt: Date | string;
    title?: string | null;
    pnl?: number | null;
    mood?: string | null;
}

interface JournalCalendarProps {
    entries: JournalEntry[];
    onSelectDate: (date: Date | undefined) => void;
    selectedDate: Date | undefined;
    isLoading?: boolean;
}

export function JournalCalendar({ entries, onSelectDate, selectedDate, isLoading }: JournalCalendarProps) {
    // Group entries by date for quick lookup
    const entriesByDate = entries.reduce((acc, entry) => {
        const dateStr = format(new Date(entry.createdAt), "yyyy-MM-dd");
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(entry);
        return acc;
    }, {} as Record<string, JournalEntry[]>);

    // Calculate total PnL for each day (if available)
    const dailyPnl = Object.entries(entriesByDate).reduce((acc, [date, daysEntries]) => {
        const total = daysEntries.reduce((sum, e) => sum + (e.pnl || 0), 0);
        acc[date] = total;
        return acc;
    }, {} as Record<string, number>);

    return (
        <Card className="p-4 border-border/40 bg-card/30 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-lg tracking-tight">Trade History</h3>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onSelectDate}
                className="rounded-xl border border-border/20 bg-background/30 p-3"
                modifiers={{
                    hasEntry: (date) => !!entriesByDate[format(date, "yyyy-MM-dd")],
                    positiveDay: (date) => {
                        const d = format(date, "yyyy-MM-dd");
                        return (dailyPnl[d] || 0) > 0;
                    },
                    negativeDay: (date) => {
                        const d = format(date, "yyyy-MM-dd");
                        return (dailyPnl[d] || 0) < 0;
                    }
                }}
                modifiersClassNames={{
                    hasEntry: "font-bold underline decoration-primary/50 decoration-2 underline-offset-4",
                    positiveDay: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-500",
                    negativeDay: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-500",
                }}
                components={{
                    DayContent: (props: any) => {
                        const { date } = props;
                        const dateKey = format(date, "yyyy-MM-dd");
                        const pnl = dailyPnl[dateKey];
                        const count = entriesByDate[dateKey]?.length;
                        const hasEntry = !!count;

                        return (
                            <div className={cn(
                                "relative w-full h-full flex items-center justify-center transition-all rounded-md",
                                hasEntry && pnl > 0 && "bg-emerald-500/10 text-emerald-500 font-bold",
                                hasEntry && pnl < 0 && "bg-rose-500/10 text-rose-500 font-bold",
                                hasEntry && pnl === 0 && "bg-primary/5 text-primary font-bold"
                            )}>
                                {/* Indicator ring for entries */}
                                {hasEntry && (
                                    <div className={cn(
                                        "absolute inset-0 border-2 rounded-md opacity-20",
                                        pnl > 0 ? "border-emerald-500" : pnl < 0 ? "border-rose-500" : "border-primary"
                                    )} />
                                )}
                                <span className="relative z-10">{date.getDate()}</span>
                            </div>
                        )
                    }
                } as any}
            />
            <div className="mt-6 flex flex-wrap gap-4 text-[10px] text-muted-foreground justify-center uppercase tracking-widest font-semibold">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
                    <span>Profit Day</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40" />
                    <span>Loss Day</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded bg-primary/20 border border-primary/40" />
                    <span>Entry</span>
                </div>
            </div>
        </Card>
    );
}
