import "@/components/buffer-polyfill";
import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import AppShell from "@/components/layout/app-shell";
import { WalletProvider } from "@/components/providers/wallet-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deriverse Analytics | Professional Trading Intelligence",
  description:
    "Solana trading analytics dashboard with PnL tracking, trade journal, and performance insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-[#0a0f1a] text-slate-100`}
      >
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(14,165,233,0.12),transparent)]" />
        <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.98),#0f172a)]" />
        <QueryProvider>
          <WalletProvider>
            <AppShell>{children}</AppShell>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
