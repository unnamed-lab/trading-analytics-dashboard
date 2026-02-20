"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPnl } from "@/types";
import { format } from "date-fns";
import {
    Plus,
    ArrowRight,
    Sparkles,
} from "lucide-react";

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
    tags?: string[] | null;
    mood?: string | null;
    images?: string[] | null;
}

interface JournalCardProps {
    journal: JournalEntry;
    onEdit: (journal: JournalEntry) => void;
    onDelete: (id: string) => void;
    className?: string;
}

export function JournalCard({ journal, onEdit, onDelete, className }: JournalCardProps) {
    const pnl = journal.pnl ?? 0;
    const roi = journal.pnl ? (journal.pnl / 1000) * 100 : 0; // Placeholder ROI calc
    const content = journal.content || "";

    const isPositive = pnl >= 0;

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all hover:bg-card/60 bg-card/30 backdrop-blur-md border border-white/5 flex flex-col h-fit break-inside-avoid mb-5 shadow-2xl cursor-pointer",
                className
            )}
            onClick={() => onEdit(journal)}
        >
            <CardHeader className="p-5 pb-3 space-y-4">
                {/* Top Header: Timestamp & AI Badge */}
                <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-muted-foreground/60 uppercase">
                    <span>{format(new Date(journal.createdAt), "yyyy-MM-dd HH:mm")}</span>
                    <Badge variant="outline" className="h-5 px-1.5 border-primary/20 bg-primary/5 text-primary text-[9px] font-bold gap-1 animate-pulse">
                        <Sparkles className="w-2.5 h-2.5" /> AI ANALYZED
                    </Badge>
                </div>

                {/* Symbol & Side Section */}
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black tracking-tight text-foreground">
                        {journal.symbol || "UNKNOWN"}-PERP
                    </h3>
                    <Badge
                        variant="secondary"
                        className={cn(
                            "text-[10px] font-black uppercase px-2 h-5 flex items-center justify-center rounded",
                            journal.side === "long" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        )}
                    >
                        {journal.side || "SIDE"}
                    </Badge>
                </div>

                {/* PnL & ROI Grid */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">PnL</div>
                        <div className={cn(
                            "text-xl font-black font-mono tracking-tighter",
                            isPositive ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {isPositive ? "+" : ""}{formatPnl(pnl)}
                        </div>
                    </div>
                    <div className="space-y-1 text-right">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">ROI</div>
                        <div className={cn(
                            "text-xl font-black font-mono tracking-tighter",
                            isPositive ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {isPositive ? "+" : ""}{roi.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-5 pb-5 space-y-4">
                {/* Trade Notes Section */}
                <div className="space-y-2">
                    <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest opacity-40">Trade Notes</div>
                    <p className="text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed font-medium">
                        {content || "No notes provided for this trade."}
                    </p>
                </div>

                {/* Thumbnails & Footer */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex -space-x-2">
                        {journal.images?.slice(0, 3).map((img, i) => (
                            <div key={i} className="h-8 w-8 rounded-full border-2 border-card overflow-hidden bg-muted">
                                <img src={img} alt="trade-view" className="h-full w-full object-cover" />
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                        {journal.tags?.slice(0, 1).map((tag) => (
                            <Badge key={tag} variant="outline" className="bg-muted/30 border-none text-[9px] h-5 px-2 text-muted-foreground font-bold lowercase">
                                {tag}
                            </Badge>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-tight">
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function LogNewTradeCard({ onClick }: { onClick: () => void }) {
    return (
        <Card
            className="group relative flex flex-col items-center justify-center h-[280px] bg-transparent border-2 border-dashed border-white/5 hover:border-primary/30 transition-all cursor-pointer break-inside-avoid mb-5 overflow-hidden"
            onClick={onClick}
        >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center gap-4 text-center p-6">
                <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Log New Trade</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                        Manually add a trade or import from history
                    </p>
                </div>
            </div>
        </Card>
    );
}
