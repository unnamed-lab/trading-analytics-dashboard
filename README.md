# Deriverse Trading Analytics

Professional Solana trading analytics MVP: PnL tracking, equity curves, trade journal, and performance insights.

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. (Optional) Set Solana RPC in `.env.local`:

```
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

3. Run the dev server (port 3220):

```bash
pnpm dev
```

Open [http://localhost:3220](http://localhost:3220). Use **Demo Mode** on the landing page to view sample data without connecting a wallet.

## Pages

- **/** – Landing: Hero, wallet connection, Demo toggle, feature preview grid
- **/dashboard** – Main analytics: PnL, performance grid, equity curve, long/short ratio, fee analysis, recent trades. Supports `?symbol=SOL&timeframe=7d`
- **/journal** – Trade journal (filters + table). Supports `?trade_id=xyz`
- **/settings** – Display, notifications, API keys

## Stack

Next.js 16, React 19, Tailwind 4, Solana wallet-adapter, Recharts, Zustand. Design: Deep Navy / Electric Blue / Emerald / Rose palette, Inter + JetBrains Mono.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
