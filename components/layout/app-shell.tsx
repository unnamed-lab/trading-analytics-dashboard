"use client";

import { ReactNode } from "react";
import {
  BarChart3,
  History,
  BookOpen,
} from "lucide-react";
import { WalletOverlay } from "@/components/dashboard/wallet-overlay";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRefreshTrades } from "@/hooks/use-trade-queries";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/", icon: BarChart3 },
  { label: "Trade History", path: "/trades", icon: History },
  { label: "Journals", path: "/journal", icon: BookOpen },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const {
    connected,
    connect,
    disconnect,
    connecting,
    publicKey: address,
  } = useWallet();

  const { mutate: refreshTrades, isPending: isRefreshing } = useRefreshTrades();

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-[#020617]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-electric to-blue-600 flex items-center justify-center shadow-lg shadow-electric/20">
                <span className="text-white font-bold text-sm">
                  ◆
                </span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-white hidden sm:block">
                Deriverse
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.path ||
                  (item.path !== "/" && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-white/[0.08] text-white shadow-sm ring-1 ring-white/[0.1]"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", active ? "text-electric" : "text-slate-500")} />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshTrades()}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-300",
                "text-slate-400 hover:text-white hover:bg-white/[0.05]",
                isRefreshing && "animate-spin text-electric"
              )}
              disabled={isRefreshing}
              title="Refresh Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            </button>

            <div className="h-6 w-px bg-white/[0.1]" />

            {connected ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col items-end mr-1">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Connected</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                    {address?.toString().slice(0, 4)}...{address?.toString().slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white px-4 py-2 rounded-lg text-xs font-medium transition-all border border-white/[0.05]"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={connecting}
                className="bg-gradient-to-r from-electric to-blue-600 hover:from-electric/90 hover:to-blue-600/90 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-electric/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-20 pb-10 min-h-screen">
        {children}
      </main>

      {/* Wallet overlay */}
      <WalletOverlay />
    </div>
  );
};

export default AppLayout;
