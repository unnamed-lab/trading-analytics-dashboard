"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  BarChart3,
  TrendingUp,
  BookOpen,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDemoStore } from "@/lib/stores/demo-store";

const features = [
  {
    icon: BarChart3,
    title: "PnL & Performance",
    description: "Real-time realized and unrealized PnL with ROI and daily change.",
  },
  {
    icon: TrendingUp,
    title: "Equity Curve",
    description: "Account value over time with drawdown and technical indicators.",
  },
  {
    icon: BookOpen,
    title: "Trade Journal",
    description: "Annotate trades, tag setups, and export PDF reports.",
  },
  {
    icon: Shield,
    title: "Fee Analysis",
    description: "Total fees, fee/PnL ratio, and breakdown by type.",
  },
  {
    icon: Zap,
    title: "Long/Short Ratio",
    description: "Position distribution and directional bias visualization.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { isDemoMode, setDemoMode } = useDemoStore();

  const handleEnter = () => {
    if (connected || isDemoMode) {
      router.push("/dashboard");
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto max-w-7xl px-4 py-16 md:py-24">
        {/* Hero Section */}
        <section className="mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Deriverse Analytics
            </span>
          </h1>
          <p className="mt-5 font-display text-xl font-medium text-slate-400 sm:text-2xl">
            Professional Trading Intelligence
          </p>
          <p className="mt-3 max-w-2xl mx-auto text-slate-500 text-base leading-relaxed">
            Connect your Solana wallet to view PnL, equity curves, and trade analytics—or try demo mode with sample data.
          </p>

          {/* Wallet & Demo Toggle */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <WalletMultiButton className="!h-12 !rounded-xl !bg-[#0ea5e9] !px-6 !text-base !font-medium hover:!bg-[#0284c7] !transition-colors !shadow-lg !shadow-[#0ea5e9]/25" />
            <div className="flex items-center gap-3">
              <Button
                variant={isDemoMode ? "default" : "outline"}
                size="lg"
                onClick={() => setDemoMode(!isDemoMode)}
              >
                {isDemoMode ? "Demo Mode On" : "Try Demo Mode"}
              </Button>
              <Button size="lg" onClick={handleEnter} asChild>
                <Link href="/dashboard">
                  Enter Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          {isDemoMode && (
            <p className="mt-4 text-sm font-medium text-[#22c55e]">
              Demo mode enabled. Sample data will be shown on the dashboard.
            </p>
          )}
        </section>

        {/* Feature Preview Grid */}
        <section className="mt-28">
          <h2 className="font-display text-center text-2xl font-semibold text-slate-200 sm:text-3xl">
            Dashboard Capabilities
          </h2>
          <p className="mt-2 text-center text-slate-500 max-w-xl mx-auto">
            Mini previews of what you&apos;ll see after connecting.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="group overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/10"
              >
                <CardHeader className="pb-2">
                  <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0ea5e9]/15 text-[#0ea5e9] transition-colors group-hover:bg-[#0ea5e9]/25">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-slate-200">{title}</CardTitle>
                  <CardDescription className="text-slate-400 leading-relaxed">
                    {description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
