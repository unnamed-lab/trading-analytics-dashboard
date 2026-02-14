import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";
import { Button } from "../ui/button";

const WalletConnectionOverlay = () => {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Connection Required
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your Solana wallet to view analytics & journals
        </p>
        <Button
          onClick={() => setVisible(true)}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          Connect Wallet
        </Button>
      </div>
    </div>
  );
};

export default WalletConnectionOverlay;
