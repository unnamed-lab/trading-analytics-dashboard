"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface TerminalLine {
    id: string;
    text: string;
    status: "pending" | "success" | "warning" | "error";
    delay: number;
}

const BOOT_SEQUENCE: TerminalLine[] = [
    { id: "1", text: "INITIALIZING DERIVERSE CORE...", status: "success", delay: 100 },
    { id: "2", text: "ESTABLISHING SECURE RPC UPLINK...", status: "success", delay: 400 },
    { id: "3", text: "VERIFYING WALLET SIGNATURE...", status: "success", delay: 800 },
    { id: "4", text: "LOADING HISTORICAL TRADE DATA...", status: "pending", delay: 1200 },
    { id: "5", text: "CALCULATING PNL METRICS...", status: "pending", delay: 2000 },
    { id: "6", text: "APPLYING PREDICTIVE ANALYTICS...", status: "pending", delay: 2800 },
    { id: "7", text: "RENDERING DASHBOARD INTERFACE...", status: "pending", delay: 3500 },
];

export function LoadingTerminal({ onComplete }: { onComplete?: () => void }) {
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let timeouts: NodeJS.Timeout[] = [];

        // Reset
        setLines([]);
        setProgress(0);

        // Sequence for lines
        BOOT_SEQUENCE.forEach((line) => {
            const timeout = setTimeout(() => {
                setLines((prev) => {
                    // Mark previous pending as success (simulation)
                    const updated = prev.map(p => p.status === 'pending' ? { ...p, status: 'success' as const } : p);
                    return [...updated, line];
                });

                // Update progress based on index
                const index = BOOT_SEQUENCE.findIndex(l => l.id === line.id);
                const newProgress = Math.round(((index + 1) / BOOT_SEQUENCE.length) * 100);
                setProgress(newProgress);

            }, line.delay);
            timeouts.push(timeout);
        });

        // Cleanup
        const completeTimeout = setTimeout(() => {
            if (onComplete) onComplete();
        }, BOOT_SEQUENCE[BOOT_SEQUENCE.length - 1].delay + 1500);
        timeouts.push(completeTimeout);

        return () => timeouts.forEach(clearTimeout);
    }, [onComplete]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 text-primary font-mono p-4">
            <div className="w-full max-w-2xl bg-card/50 border border-primary/30 rounded-lg p-6 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] relative overflow-hidden">
                {/* Scanline effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none" />

                <div className="flex justify-between items-center mb-4 border-b border-primary/20 pb-2 relative z-10">
                    <h2 className="text-xl font-bold tracking-widest text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">
                        SYSTEM BOOT
                    </h2>
                    <span className="text-xs animate-pulse text-muted-foreground">v1.1.0-alpha</span>
                </div>

                <div
                    ref={scrollRef}
                    className="h-64 overflow-y-auto space-y-2 mb-6 font-mono text-sm relative z-10 scrollbar-hide"
                >
                    {lines.map((line) => (
                        <div key={line.id} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-muted-foreground/50">[{new Date().toLocaleTimeString()}]</span>
                            <span className={cn(
                                "flex-1",
                                line.status === 'success' && "text-primary/90",
                                line.status === 'pending' && "text-primary/70 animate-pulse",
                            )}>
                                {line.text}
                            </span>
                            <span className={cn(
                                "w-3 h-3 rounded-full",
                                line.status === 'success' && "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]",
                                line.status === 'pending' && "bg-yellow-500 animate-ping",
                                line.status === 'error' && "bg-destructive",
                            )} />
                        </div>
                    ))}
                    <div className="h-4 w-3 bg-primary animate-pulse inline-block mr-3" />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between text-xs mb-1 text-primary/60 uppercase">
                        <span>System Integrity</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-primary/10 border border-primary/20 [&>div]:bg-primary" />
                </div>
            </div>
        </div>
    );
}
