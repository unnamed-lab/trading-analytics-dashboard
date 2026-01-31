"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BarChart3, BookOpen, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/lib/stores/demo-store";

const nav = [
  { href: "/", label: "Home", icon: BarChart3 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();
  const { isDemoMode, toggleDemoMode } = useDemoStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-slate-900/70 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0ea5e9]/20 text-[#0ea5e9]">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Deriverse Analytics
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-slate-100"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant={isDemoMode ? "default" : "outline"}
            size="sm"
            onClick={toggleDemoMode}
            className="hidden sm:flex"
          >
            Demo
          </Button>
          <WalletMultiButton className="!h-9 !rounded-lg !bg-[#0ea5e9] !px-4 !text-sm !font-medium hover:!bg-[#0284c7] !transition-colors" />
        </div>
      </div>
    </header>
  );
}
