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
