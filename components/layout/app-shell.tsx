"use client";

import { ReactNode } from "react";
import {
  Search,
  RefreshCw,
  Download,
  BarChart3,
  History,
  BookOpen,
} from "lucide-react";
import { WalletOverlay } from "@/components/dashboard/wallet-overlay"; // Updated import
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                ◆
              </span>
            </div>
            <span className="font-bold text-sm tracking-wide text-foreground uppercase">
              Deriverse Analytics
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* <div className="hidden sm:flex items-center rounded border border-border bg-secondary px-3 py-1.5 gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Search wallet or tx hash.."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-48"
              />
            </div> */}
            <button className="p-2 rounded hover:bg-secondary text-muted-foreground transition-colors sm:hidden">
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => refreshTrades()}
              className={cn(
                "p-2 rounded hover:bg-secondary transition-colors",
                isRefreshing
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground",
              )}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing ? "animate-spin" : "")}
              />
            </button>
            <button className="hidden sm:flex p-2 rounded hover:bg-secondary text-muted-foreground transition-colors">
              <Download className="h-4 w-4" />
            </button>

            {connected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-profit" />
                  <span className="font-mono text-xs">
                    {`${address?.toString().slice(0, 6)}...${address?.toString().slice(-6)}`}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 rounded bg-secondary border border-border px-3 sm:px-4 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-loss" />
                  <span className="font-mono text-xs">DISCONNECTED</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="font-mono text-xs">---</span>
                </div>
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="flex items-center gap-2 rounded bg-primary px-3 sm:px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <span className="hidden sm:inline">Connect Wallet</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pb-2">
          {navItems.map((item) => {
            const active =
              pathname === item.path ||
              (item.path !== "/" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Wallet overlay */}
      <WalletOverlay />
    </div>
  );
};

export default AppLayout;
