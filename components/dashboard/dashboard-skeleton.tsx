import { DashboardCardSkeleton } from "@/components/ui/dashboard-states";

export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-background/50 pb-20 relative animate-in fade-in duration-700">
            {/* Command Center Skeleton */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
                <div className="container mx-auto py-1 px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse" />
                        <div className="h-10 w-px bg-white/[0.05]" />
                        <div className="h-8 w-24 bg-slate-800/30 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-48 bg-slate-800/50 rounded-lg animate-pulse" />
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 space-y-6 mt-6">
                {/* Top Row: Momentum & Heat Maps */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-1">
                        <DashboardCardSkeleton className="h-[300px] glass-card border-white/[0.05]" />
                    </div>
                    <div className="lg:col-span-3">
                        <DashboardCardSkeleton className="h-[300px] glass-card border-white/[0.05]" />
                    </div>
                </div>

                {/* Fusion & Performance Layer */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <DashboardCardSkeleton className="h-[450px] glass-card border-white/[0.05]" />
                        <div className="border border-white/[0.05] rounded-xl bg-slate-900/50 h-[400px] p-4">
                            <div className="h-8 w-1/3 bg-slate-800/50 rounded mb-4 animate-pulse" />
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-12 w-full bg-slate-800/30 rounded animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column Analysis */}
                    <div className="space-y-6">
                        <DashboardCardSkeleton className="h-[320px] glass-card border-white/[0.05]" />
                        <DashboardCardSkeleton className="h-[250px] glass-card border-white/[0.05]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
