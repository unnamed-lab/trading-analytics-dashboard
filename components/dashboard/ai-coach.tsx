"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, BrainCircuit, TrendingUp, AlertTriangle } from "lucide-react";
import { useTradeAnalytics } from "@/hooks/use-trade-queries";

export function AICoach() {
    const { data: analytics } = useTradeAnalytics();

    // Mock insights for now, until we connect to LLM/AI service
    const insights = [
        {
            id: 1,
            type: "streak",
            icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
            title: "Hot Streak",
            message: "You are on a 5-trade winning streak in Longs. Average win +2.5%.",
            time: "2h ago"
        },
        {
            id: 2,
            type: "risk",
            icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
            title: "Risk Alert",
            message: "Your largest loss this month ($500) occurred on a Wednesday afternoon. Review Trade #2345.",
            time: "1d ago"
        },
        {
            id: 3,
            type: "pattern",
            icon: <BrainCircuit className="h-4 w-4 text-blue-500" />,
            title: "Pattern Found",
            message: "You tend to close winners too early between 2 PM - 3 PM. Consider trailing stops.",
            time: "2d ago"
        }
    ];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-primary text-primary-foreground border-primary hover:bg-primary/90 z-50 animate-bounce-slow"
                >
                    <Sparkles className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <span className="text-2xl">🧞‍♂️</span>
                        AI Trading Coach
                    </SheetTitle>
                    <SheetDescription>
                        Real-time reflection engine analyzing your behavior.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 mt-6">
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Live Insights</h3>
                        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                            <div className="space-y-4">
                                {insights.map((insight) => (
                                    <Card key={insight.id} className="bg-muted/50 border-none">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="mt-1 p-2 bg-background rounded-full shadow-sm">
                                                    {insight.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                                                        <span className="text-[10px] text-muted-foreground">{insight.time}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        {insight.message}
                                                    </p>
                                                    <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-xs text-primary">
                                                        Explore why ✨
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <div className="mt-auto border-t pt-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask the coach about your trading..."
                            className="flex-1 bg-muted px-4 py-2 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button size="icon">
                            <Sparkles className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
