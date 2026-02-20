# Deriverse Trading Analytics Dashboard

A professional Solana trading analytics MVP offering an immersive user experience with PnL tracking, equity curves, trade journaling capabilities, and AI-powered performance insights.

This project was built for the [Superteam Bounty: Design Trading Analytics Dashboard with Journal & Portfolio Analysis](https://superteam.fun/earn/listing/design-trading-analytics-dashboard-with-journal-and-portfolio-analysis) by Deriverse. 

**Live Demo:** [Hosted Vercel Link](https://deriverse-analytics-unc.vercel.app/)

## Features

- **Portfolio Analytics & PnL Tracking:** Automated calculation of realized/unrealized PnL, fee analysis, drawdown, and win rates mapped out visually using interactive charts and heatmaps.
- **Trade Journal:** In-depth trade review interface allowing users to filter trades, save custom notes, and maintain a chronological diary of their performance.
- **AI Trade Insights:** Embedded LLM capabilities to generate constructive feedback, risk assessment, and actionable insights for individual trades and batch analysis.
- **Sleek UI/UX:** Built with a Deep Navy, Electric Blue, Emerald, and Rose palette on top of modern typography (Inter + JetBrains Mono) to offer a visually distinct, premium analytical tool.

## Getting Started

1. **Install dependencies:**
```bash
pnpm install
```

2. **(Optional) Configure Environment Variables:**
Create a `.env.local` file based on `.env.example`. *Note: Set your preferred RPC or fallback to the provided default.*
```bash
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
```

3. **Run the development server:**
```bash
pnpm dev
```

Open [http://localhost:3220](http://localhost:3220) to view the application. You can use **Demo Mode** on the landing page to view sample data without connecting an external wallet.

## Architecture & Project Structure

The project leverages Next.js 14 App Router and follows a service-oriented architectural separation regarding data handling, calculations, and UI presentation. 

### Key Directories

- `app/`: Next.js routes representing the different pages (Landing, Dashboard, Journal, Settings).
- `components/`: Modular React components styled with Tailwind CSS, organized by feature area (Dashboard, Journal, layout).
- `services/`: Core logic and pure TS modules for Solana data extraction, financial aggregation, and computation.
- `hooks/`: React Query custom hooks managing asynchronous data fetching, local caching, state mutations, and mock integrations.
- `types/`: Shared TypeScript type definitions ensuring type-safety across external APIs and internal modules.

---

## Core Services

The business logic of the app is encapsulated within service classes inside the `services/` directory. They decouple complex transformations from the presentation layer.

### 1. `fetch-data.service.ts`
*(Transaction Ingestion & Data Pipeline)*
- **Purpose:** Acts as the primary data ingress from the Solana blockchain using `@solana/kit`.
- **Functionality:** 
  - Iterates over user transaction histories.
  - Decodes standard format logs and structures them into specific `TradeRecord` interface entities.
  - Extracts comprehensive financial details natively, including cross-margin spots, protocol/network fees, funding payments, and account balance changes.
  - Exposes flexible transaction pagination, cache priming, and rate-limit handling implementations.

### 2. `pnl-calculator.service.ts`
*(Ledger & Valuation Engine)*
- **Purpose:** Centralized logic for determining exactly how much the user is winning or losing.
- **Functionality:** 
  - Implements a precise First-In-First-Out (FIFO) matching algorithm to align entry trades with corresponding exit fills.
  - Reconstructs accurate cost-basis data and separates Realized vs. Unrealized PnL.
  - Dynamically calculates summary aggregations (total volume, funding, total fees, net profit vs. gross profit) based on any provided trading subset.

### 3. `trade-analytics.service.ts`
*(Metrics Derivation & Processing)*
- **Purpose:** Converts raw trade summaries into rich, chart-ready performance datasets.
- **Functionality:** 
  - Orchestrates downstream performance metrics like maximum drawdowns, Sharpe ratios extrapolations, and long/short profitability distributions.
  - Produces aggregated time-series vectors needed for the "Equity Curve" chart.
  - Aggregates the hourly, daily, and weekly mapping data to populate interactive UI Heat Maps.

### 4. `ai-review.service.ts`
*(LLM API Interaction Hub)*
- **Purpose:** Communicates with the AI backend to interpret numerical trading data dynamically.
- **Functionality:** 
  - Translates a trader's execution (entry vs. VWAP, R:R impact) into a textual critique structure.
  - Simulates API interactions for immediate behavioral prompts and trade reviews (e.g., emotional review, actionable insights, risk assessment).

---

## Custom Hooks

React presentation components consume data almost exclusively from the custom hooks wrapped implicitly by `@tanstack/react-query`.

### 1. `use-trade-queries.ts`
- **Purpose:** Exposes all blockchain and statistical fetching operations to React components without leaking core service complexities.
- **Key Hooks Provided:**
  - `useTransactionFetcher()`: Initializer for the `TransactionDataFetcher` singleton ensuring one active RPC line instance at run-time.
  - `useRawTrades()` & `useAllTrades()`: Serves unpaginated records with caching wrappers relying effectively on filtering parameters.
  - `useTradeAnalytics()`: Combines trade histories output passing them through the `TradeAnalyticsCalculator`, delivering final metric shapes to the command center UI components.
  - `useRefreshTrades()`: Handlers for forcing refetches to guarantee synchronous real-time updates.

### 2. `use-trades.ts`
- **Purpose:** Dedicated to localized frontend state processing, mapping filtered trading configurations to UI state schemas.
- **Key Hooks Provided:**
  - `useTrades(filters)`: Combines filter parameters (date ranges, minimum PnL, specific symbols) directly into mock or production trade lists.
  - `usePerformanceMetrics()`: Specifically derives baseline totals—like Win Rate, average win, average loss, and Profit factor calculations specifically mapped to dashboard widgets directly.

### 3. `use-journals.ts`
- **Purpose:** Abstracts backend interactions for the Trade Journal CRUD application model.
- **Key Hooks Provided:**
  - `useJournals()`: Validated state requests to `/api/journal` retrieving stored journals.
  - Features nested query mutations (`create`, `update`, `remove`) paired alongside cryptographically verifiable API routes checking signed Base64 messages ensuring valid Solana wallet possession before modifying databases.

### 4. `use-ai-review.ts`
- **Purpose:** Unifies UI components needing AI evaluations into a streamlined context.
- **Key Hooks Provided:**
  - `useAITradeReview()` & `useGenerateAIReview()`: Handles singular asynchronous generation queries providing critiques directly accessible by specific `TradeRecords`. 
  - Automatically manages context signing checks verifying wallet ownership similar to the Journal logic wrapper.

---

## Stack

- **Framework:** Next.js 14, React 19
- **Styling:** Tailwind CSS 4
- **Web3:** Solana Wallet-Adapter, @solana/kit
- **Visualizations:** Recharts
- **State Management:** Zustand, @tanstack/react-query

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Deriverse Dashboard Bounty details](https://superteam.fun/earn/listing/design-trading-analytics-dashboard-with-journal-and-portfolio-analysis) 
- [Deploying on Vercel](https://nextjs.org/docs/app/building-your-application/deploying)
