import { Loader2, AlertCircle, RefreshCw, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardSkeletonProps {
    className?: string;
    title?: string;
}

export function DashboardCardSkeleton({
    className,
    title,
}: DashboardCardSkeletonProps) {
    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-card p-5 flex flex-col gap-4 h-full",
                className,
            )}
        >
            {title && (
                <div className="flex items-center justify-between">
                    <div className="h-4 w-1/3 bg-muted/20 rounded animate-pulse" />
                    <div className="h-4 w-4 bg-muted/20 rounded animate-pulse" />
                </div>
            )}
            {!title && (
                <div className="h-4 w-1/4 bg-muted/20 rounded animate-pulse mb-2" />
            )}
            <div className="flex-1 flex flex-col gap-3 justify-center">
                <div className="h-8 w-3/4 bg-muted/10 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted/10 rounded animate-pulse" />
                <div className="h-32 w-full bg-muted/5 rounded animate-pulse mt-2" />
            </div>
        </div>
    );
}

export function KPISkeleton() {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-slate-900/40 p-5 flex flex-col gap-2">
            <div className="h-4 w-20 bg-muted/20 rounded animate-pulse" />
            <div className="h-8 w-32 bg-muted/10 rounded animate-pulse" />
            <div className="h-3 w-12 bg-muted/5 rounded animate-pulse" />
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-slate-900/40 p-6 h-full min-h-[400px] flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-muted/20 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-muted/10 rounded animate-pulse" />
                </div>
                <div className="flex gap-2">
                    <div className="h-8 w-16 bg-muted/10 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-muted/10 rounded animate-pulse" />
                </div>
            </div>
            <div className="flex-1 w-full bg-gradient-to-b from-muted/5 to-transparent rounded animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 flex items-end px-4 pb-8 justify-between">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="w-4 bg-muted/10 rounded-t animate-pulse"
                            style={{ height: `${20 + Math.random() * 60}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function GaugeSkeleton() {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-slate-900/40 p-6 h-full min-h-[300px] flex flex-col items-center justify-center gap-6">
            <div className="relative h-48 w-48 rounded-full border-12 border-muted/5 animate-pulse flex items-center justify-center">
                <div className="h-12 w-24 bg-muted/10 rounded animate-pulse" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-2 bg-muted/20 origin-bottom rotate-45 animate-pulse" />
            </div>
            <div className="space-y-2 text-center w-full">
                <div className="h-4 w-3/4 bg-muted/20 rounded animate-pulse mx-auto" />
                <div className="h-3 w-1/2 bg-muted/10 rounded animate-pulse mx-auto" />
            </div>
        </div>
    );
}


interface DashboardErrorProps {
    className?: string;
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export function DashboardError({
    className,
    title = "Error",
    message = "Failed to load data",
    onRetry,
}: DashboardErrorProps) {
    return (
        <div
            className={cn(
                "rounded-lg border border-red-900/20 bg-red-950/10 p-5 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[200px]",
                className,
            )}
        >
            <div className="p-3 rounded-full bg-red-900/20">
                <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
                <h3 className="font-medium text-red-500 mb-1">{title}</h3>
                <p className="text-sm text-red-400/80 max-w-[250px] mx-auto">
                    {message}
                </p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-900/20 hover:bg-red-900/30 text-xs font-medium text-red-400 transition-colors mt-2"
                >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                </button>
            )}
        </div>
    );
}

export function GridSkeleton() {
    return (
        <div className="rounded-xl border border-white/[0.05] bg-slate-900/40 p-6 h-full min-h-[300px] flex flex-col gap-4">
            <div className="h-6 w-32 bg-muted/20 rounded animate-pulse" />
            <div className="flex-1 grid grid-cols-7 gap-1 overflow-hidden">
                {[...Array(7 * 10)].map((_, i) => (
                    <div
                        key={i}
                        className="aspect-square bg-muted/10 rounded-sm animate-pulse"
                        style={{ opacity: 0.2 + Math.random() * 0.8 }}
                    />
                ))}
            </div>
        </div>
    );
}

interface DashboardEmptyProps {
    className?: string;
    title?: string;
    message?: string;
    icon?: typeof Archive;
}

export function DashboardEmpty({
    className,
    title = "No Data",
    message = "No data available for the selected period",
    icon: Icon = Archive,
}: DashboardEmptyProps) {
    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-card p-5 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[200px]",
                className,
            )}
        >
            <div className="p-3 rounded-full bg-secondary/50">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
                <h3 className="font-medium text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                    {message}
                </p>
            </div>
        </div>
    );
}
