"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MOODS = [
    { label: "Confident", emoji: "🚀", color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" },
    { label: "Neutral", emoji: "😐", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
    { label: "Anxious", emoji: "😨", color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" },
    { label: "Frustrated", emoji: "😡", color: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" },
    { label: "Excited", emoji: "🤩", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
    { label: "Revenge", emoji: "👿", color: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" },
] as const;

interface MoodSelectorProps {
    value?: string | null;
    onChange: (mood: string) => void;
    className?: string;
}

export function MoodSelector({ value, onChange, className }: MoodSelectorProps) {
    return (
        <div className={cn("flex flex-wrap gap-2.5", className)}>
            {MOODS.map((mood) => {
                const isActive = value === mood.label;
                return (
                    <button
                        key={mood.label}
                        type="button"
                        onClick={() => onChange(mood.label)}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group",
                            "hover:scale-105 active:scale-95",
                            isActive
                                ? cn(mood.color, "border-transparent shadow-lg shadow-current/20 font-bold scale-105 ring-1 ring-current/30")
                                : "bg-card/20 border-border/40 text-muted-foreground hover:bg-card/40 hover:border-border/60"
                        )}
                        style={isActive ? {
                            boxShadow: `0 0 15px rgba(var(--primary), 0.1)`
                        } : {}}
                    >
                        <span className={cn(
                            "text-xl transition-transform duration-300",
                            isActive ? "scale-125" : "group-hover:scale-110"
                        )}>
                            {mood.emoji}
                        </span>
                        <span className="text-sm tracking-wide">
                            {mood.label}
                        </span>

                        {isActive && (
                            <div className="absolute inset-0 rounded-xl bg-current opacity-[0.03] animate-pulse" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
