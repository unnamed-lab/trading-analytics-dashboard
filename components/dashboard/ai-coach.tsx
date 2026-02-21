"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BrainCircuit, TrendingUp, AlertTriangle, Target, Loader2, User, Send } from "lucide-react";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";
import { cn } from "@/lib/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export function AICoach() {
    const { data: analytics } = useTradeAnalytics();
    const { core, risk, longShort } = analytics || {};
    const { publicKey, signMessage } = useWallet();

    const [messages, setMessages] = React.useState<ChatMessage[]>([]);
    const [input, setInput] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    // Generate dynamic insights based on real data
    const insights = React.useMemo(() => {
        if (!analytics) return [];

        const list = [];

        // 1. Win Rate / Streak Insight
        if (core && core.winRate > 60) {
            list.push({
                id: "win-rate",
                type: "success",
                icon: <Target className="h-4 w-4 text-emerald-500" />,
                title: "High Performance",
                message: `You're trading with a ${core.winRate.toFixed(1)}% win rate. Keep executing your edge.`,
                time: "Current"
            });
        } else if (core && core.winRate < 40 && core.totalTrades > 5) {
            list.push({
                id: "low-win-rate",
                type: "warning",
                icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                title: "Strategy Review Needed",
                message: `Win rate is currently ${core.winRate.toFixed(1)}%. Consider reducing size until stability returns.`,
                time: "Current"
            });
        }

        // 2. Risk Insight
        if (risk && risk.avgLoss > risk.avgWin) {
            list.push({
                id: "risk-ratio",
                type: "danger",
                icon: <AlertTriangle className="h-4 w-4 text-rose-500" />,
                title: "Inverted Risk/Reward",
                message: `Avg Loss ($${risk.avgLoss.toFixed(2)}) is exceeding Avg Win ($${risk.avgWin.toFixed(2)}). Tighten stops.`,
                time: "Analysis"
            });
        }

        // 3. Bias Insight
        if (longShort && longShort.ratio > 2) {
            list.push({
                id: "long-bias",
                type: "info",
                icon: <TrendingUp className="h-4 w-4 text-blue-500" />,
                title: "Strong Long Bias",
                message: `You are taking 2x more longs than shorts. Ensure this aligns with market conditions.`,
                time: "Pattern"
            });
        }

        // 4. Volume Insight
        if (core && core.totalVolume > 100000) {
            list.push({
                id: "volume",
                type: "info",
                icon: <BrainCircuit className="h-4 w-4 text-purple-500" />,
                title: "High Volume Session",
                message: `You've traded over $${(core.totalVolume / 1000).toFixed(0)}k volume. Watch for fatigue.`,
                time: "Session"
            });
        }

        return list;
    }, [analytics, core, risk, longShort]);

    const handleSend = async () => {
        if (!input.trim() || !publicKey || !signMessage || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMsg }]);
        setIsLoading(true);

        try {
            const messageStr = `Authenticate to Trade Analytics Dashboard\nTimestamp: ${Date.now()}`;
            const encodedMessage = Buffer.from(messageStr).toString("base64");

            let msgBytes: Uint8Array;
            if (typeof window !== "undefined" && typeof window.atob === "function") {
                const binary = window.atob(encodedMessage);
                const arr = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                msgBytes = arr;
            } else {
                const bin = Buffer.from(encodedMessage, "base64");
                msgBytes = new Uint8Array(bin);
            }

            const signed = await signMessage(msgBytes as Uint8Array);
            const signature = bs58.encode(Buffer.from((signed as any)?.signature ?? signed));

            const payloadMessages = messages.map(m => ({ role: m.role, content: m.content }));

            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-solana-publickey": publicKey.toBase58(),
                    "x-solana-signature": signature,
                    "x-solana-message": encodedMessage,
                },
                body: JSON.stringify({
                    prompt: userMsg,
                    messages: payloadMessages,
                    sessionContext: analytics,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: data.reply }]);
            } else {
                setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error connecting to my servers." }]);
            }
        } catch (e) {
            console.error("Chat error:", e);
            setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Something went wrong locally while sending your message." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-[0_0_20px_rgba(14,165,233,0.3)] bg-gradient-to-br from-electric to-blue-600 border-none hover:scale-105 active:scale-95 z-50 transition-all duration-300 group"
                >
                    <BrainCircuit className="h-6 w-6 text-white animate-pulse" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[540px] flex flex-col border-l border-border">
                <SheetHeader className="border-b pb-4 mb-4 mt-8 sm:mt-0">
                    <SheetTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        AI Trading Coach
                    </SheetTitle>
                    <SheetDescription>
                        Real-time analysis of your trading behavior and metrics.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Active Insights
                        </h3>
                        <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                            {insights.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>No active insights yet.</p>
                                    <p className="text-xs mt-2">Trade more to generate analysis.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {insights.map((insight) => (
                                        <Card key={insight.id} className="glass-card border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-4">
                                                    <div className={cn("mt-0.5 p-2 rounded-lg border border-white/[0.05]",
                                                        insight.type === 'success' ? "bg-emerald-500/10" :
                                                            insight.type === 'danger' ? "bg-rose-500/10" :
                                                                insight.type === 'warning' ? "bg-amber-500/10" : "bg-electric/10"
                                                    )}>
                                                        {insight.icon}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-medium text-sm text-foreground">{insight.title}</h4>
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground border-white/[0.1]">
                                                                {insight.time}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-400 leading-relaxed">
                                                            {insight.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Chat Messages */}
                            {messages.length > 0 && (
                                <div className="mt-8 space-y-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                        Conversation
                                    </h3>
                                    {messages.map((m) => (
                                        <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                                            <div className={cn("mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center border",
                                                m.role === "user" ? "bg-primary/20 border-primary/30" : "bg-electric/20 border-electric/30"
                                            )}>
                                                {m.role === "user" ? <User className="h-4 w-4 text-primary" /> : <BrainCircuit className="h-4 w-4 text-electric" />}
                                            </div>
                                            <div className={cn("px-4 py-2.5 rounded-xl max-w-[80%] text-sm",
                                                m.role === "user" ? "bg-primary/10 text-primary-foreground border-transparent" : "bg-card border border-border/50 text-foreground"
                                            )}>
                                                {m.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="mt-4 flex gap-3 flex-row">
                                    <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center border bg-electric/20 border-electric/30">
                                        <BrainCircuit className="h-4 w-4 text-electric animate-pulse" />
                                    </div>
                                    <div className="px-4 py-3 rounded-xl bg-card border border-border/50 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} className="h-4" />
                        </ScrollArea>
                    </div>
                </div>

                <div className="mt-auto border-t pt-4 bg-background">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Ask about your performance..."
                            className="w-full bg-muted/50 border border-input px-4 py-3 pr-10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSend();
                            }}
                            disabled={isLoading || !publicKey}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
                            onClick={handleSend}
                            disabled={isLoading || !publicKey || !input.trim()}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-3">
                        AI analysis based on your recent trading session data.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
