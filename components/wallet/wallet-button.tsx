// components/wallet/wallet-button.tsx
"use client";

import dynamic from "next/dynamic";
import { ComponentProps } from "react";

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-[140px] animate-pulse rounded-lg bg-white/10" />
    ),
  },
);

export function WalletButton(props: ComponentProps<typeof WalletMultiButton>) {
  return <WalletMultiButton {...props} />;
}
