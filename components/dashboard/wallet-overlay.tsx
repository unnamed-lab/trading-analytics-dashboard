"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Lock, ShieldCheck, Activity, Loader2 } from "lucide-react";

export function WalletOverlay() {
    const { connected, connecting } = useWallet();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // Prevent hydration error
    if (connected) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-md w-full mx-4 relative group">
                {/* Glow Effects */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative bg-card border border-border/50 rounded-xl p-8 text-center shadow-2xl overflow-hidden">

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 p-12 opacity-5 translate-x-1/3 -translate-y-1/3">
                        <ShieldCheck size={120} />
                    </div>
                    <div className="absolute bottom-0 left-0 p-12 opacity-5 -translate-x-1/3 translate-y-1/3">
                        <Activity size={120} />
                    </div>

                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-primary/10 rounded-full ring-1 ring-primary/20 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]">
                            {connecting ? (
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            ) : (
                                <Lock className="w-8 h-8 text-primary" />
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                        {connecting ? "Connecting Wallet..." : "Connect to Dashboard"}
                    </h2>

                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                        {connecting
                            ? "Establishing secure connection to Solana network. Please approve the request in your wallet."
                            : "Establish a secure connection to the Solana network to access real-time trading analytics, PnL tracking, and performance metrics."
                        }
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <div className="flex justify-center transform hover:scale-105 transition-transform duration-200">
                            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !h-12 !px-8 !rounded-lg !font-semibold !shadow-lg hover:!shadow-primary/25 transition-all" />
                        </div>

                        {connecting && (
                            <button
                                onClick={() => window.location.reload()}
                                className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors"
                            >
                                Stuck? Reload to reset
                            </button>
                        )}
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4 text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-t border-border/50 pt-6">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-primary">●</span> Secure
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-primary">●</span> Real-time
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-primary">●</span> Non-custodial
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
