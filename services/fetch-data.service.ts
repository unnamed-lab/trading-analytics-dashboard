/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { Signature, address, createSolanaRpc, devnet } from "@solana/kit";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  LogType,
  SpotFillOrderReportModel,
  PerpFillOrderReportModel,
  PerpFundingReportModel,
  SpotFeesReportModel,
  PerpFeesReportModel,
  PerpSocLossReportModel,
  DepositReportModel,
  WithdrawReportModel,
  SpotOrderRevokeReportModel,
  PerpOrderRevokeReportModel,
} from "@deriverse/kit";
import EngineAdapter from "@/lib/deriverse-engine-adapter";
import { TradeRecord, FinancialDetails } from "@/types";
import { PnLCalculator } from "@/services/pnl-calculator.service";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Safely converts any numeric-ish value (BN, BigInt, number, string) to a
 * plain JS number.  Returns NaN if the conversion is not meaningful.
 */
function toNum(value: any): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  // BN.js / anchor BN
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    const n = Number(value.toString());
    return isNaN(n) ? NaN : n;
  }
  return Number(value);
}

/**
 * Safely coerce any value to a string (avoids "[object Object]").
 */
function toStr(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object" && typeof value.toString === "function") {
    const s = value.toString();
    // BN / PublicKey toString are fine; plain objects give "[object Object]"
    return s === "[object Object]" ? JSON.stringify(value) : s;
  }
  return String(value);
}

// ─── types ───────────────────────────────────────────────────────────────────

export type DecodedLogMessage =
  | SpotFillOrderReportModel
  | PerpFillOrderReportModel
  | PerpFundingReportModel
  | SpotFeesReportModel
  | PerpFeesReportModel
  | PerpSocLossReportModel
  | DepositReportModel
  | WithdrawReportModel
  | SpotOrderRevokeReportModel
  | PerpOrderRevokeReportModel
  | { tag: number;[key: string]: any };

export interface PaginationOptions {
  limit?: number;
  before?: string;
  until?: string;
}

export interface FetchResult {
  trades: TradeRecord[];
  hasMore: boolean;
  lastSignature?: string;
  totalProcessed: number;
}

// ─── class ───────────────────────────────────────────────────────────────────

export class TransactionDataFetcher {
  private rpc: ReturnType<typeof createSolanaRpc>;
  private connection: Connection;
  private walletPublicKey: PublicKey | null = null;
  private engine: any = null;
  private requestDelayMs: number = 300;
  private maxTransactions: number = 1000;
  private programId: string;
  private version: number = 14;
  private engineInitialized: boolean = false;

  constructor(
    rpcUrl: string,
    programId?: string,
    version?: number,
    requestDelayMs = 300,
    maxTransactions = 1000,
  ) {
    this.rpc = createSolanaRpc(devnet(rpcUrl));
    this.connection = new Connection(rpcUrl, "confirmed");
    this.requestDelayMs = requestDelayMs;
    this.maxTransactions = maxTransactions;
    this.programId = process.env.PROGRAM_ID!;
    if (programId) this.programId = programId;
    if (version) this.version = version;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchWithRetries<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5,
    baseDelay: number = 2000,
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isRateLimit =
          error?.message?.includes("429") ||
          error?.toString().includes("429") ||
          (error?.code === 429);

        if (isRateLimit) {
          const delayTime = baseDelay * Math.pow(2, i) + Math.random() * 1000;
          console.warn(
            `⚠️ Rate Limit (429). Retrying in ${(delayTime / 1000).toFixed(2)}s... (Attempt ${i + 1}/${maxRetries})`,
          );
          await this.delay(delayTime);
          continue;
        }
        throw error;
      }
    }
    console.error(`❌ Max retries (${maxRetries}) exceeded.`);
    throw lastError;
  }

  async initialize(walletPublicKey: PublicKey): Promise<void> {
    this.walletPublicKey = walletPublicKey;

    const adapter = new EngineAdapter(this.rpc, {
      programId: this.programId as any,
      version: this.version,
    });
    this.engine = (adapter as any).engine ? (adapter as any).engine : adapter;

    try {
      await this.engine.initialize();
      await this.engine.setSigner(address(walletPublicKey.toString()));
      try {
        if (typeof (this.engine as any).getClientData === "function") {
          await (this.engine as any).getClientData();
        }
      } catch (_) {
        // ignore
      }
      this.engineInitialized = true;
      console.log("🔍 Initialized DeRiverse Trade Data Fetcher");
      console.log(`📝 Wallet: ${walletPublicKey.toString()}`);
      console.log(`🎯 Program ID: ${this.programId}`);
      console.log(`📋 Version: ${this.version}`);
    } catch (err: any) {
      console.warn(`⚠️  Engine initialization warning: ${err.message}`);
      this.engineInitialized = false;
    }
  }

  // ── public fetch methods ─────────────────────────────────────────────────

  async fetchTransactionsPaginated(
    options: PaginationOptions = {},
  ): Promise<FetchResult> {
    if (!this.walletPublicKey) throw new Error("Wallet not initialized");

    const limit = options.limit || 100;
    console.log("\n📊 Fetching transactions (paginated)...");
    console.log(`   Limit: ${limit}`);
    if (options.before) console.log(`   Before: ${options.before}`);
    if (options.until) console.log(`   Until: ${options.until}`);

    try {
      const requestOptions: any = { limit };
      if (options.before) requestOptions.before = options.before as any;
      if (options.until) requestOptions.until = options.until as any;

      let signaturesResponse: any;
      try {
        console.log("\n🔍 Fetching signatures for wallet...");
        signaturesResponse = await this.fetchWithRetries(() =>
          this.rpc
            .getSignaturesForAddress(
              address(this.walletPublicKey!.toString()),
              requestOptions,
            )
            .send(),
        );
      } catch (err1: any) {
        console.log("⚠️  Failed to fetch signatures");
        console.error(`  Error: ${err1.message}`);
        return { trades: [], hasMore: false, totalProcessed: 0 };
      }

      await this.primeClientData();

      const signatures = Array.isArray(signaturesResponse)
        ? signaturesResponse
        : signaturesResponse?.value || [];

      if (!signatures.length) {
        console.log("❌ No transactions found");
        return { trades: [], hasMore: false, totalProcessed: 0 };
      }

      console.log(`✅ Found ${signatures.length} transactions`);

      const relevantTransactions =
        await this.filterProgramSignatures(signatures);
      console.log(
        `\n📊 Found ${relevantTransactions.length} program-related transactions out of ${signatures.length}`,
      );

      await this.primeClientData();

      const rawTrades = await this.processSignatures(relevantTransactions);

      // ── Apply PnL calculation across all collected trades ──────────────
      const tradesWithPnL = this.applyPnL(rawTrades);

      const hasMore = signatures.length >= limit;
      const lastSignature =
        signatures.length > 0
          ? signatures[signatures.length - 1].signature
          : undefined;

      return {
        trades: tradesWithPnL.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        ),
        hasMore,
        lastSignature,
        totalProcessed: relevantTransactions.length,
      };
    } catch (error: any) {
      console.error("Error fetching transactions:", error.message);
      throw error;
    }
  }

  async fetchAllTransactions({
    fees,
  }: { fees?: boolean } | undefined = {}): Promise<TradeRecord[]> {
    if (!this.walletPublicKey) {
      console.warn("Wallet not initialized");
      return [];
    }

    console.log("\n📊 Fetching all transactions...");
    console.log(`   Max transactions: ${this.maxTransactions}`);

    try {
      let signaturesResponse: any;
      try {
        console.log("\n🔍 Method 1: Fetching signatures for wallet...");
        signaturesResponse = await this.fetchWithRetries(() =>
          this.rpc
            .getSignaturesForAddress(address(this.walletPublicKey!.toString()), {
              limit: this.maxTransactions,
            })
            .send(),
        );
      } catch (err1: any) {
        console.log("⚠️  Method 1 failed, trying with program ID...");
        try {
          signaturesResponse = await this.fetchWithRetries(() =>
            this.rpc
              .getSignaturesForAddress(address(this.programId), {
                limit: this.maxTransactions,
              })
              .send(),
          );
        } catch (err2: any) {
          console.error("❌ Both methods failed:");
          console.error(`  Method 1 error: ${err1.message}`);
          console.error(`  Method 2 error: ${err2.message}`);
          return [];
        }
      }

      const signatures = Array.isArray(signaturesResponse)
        ? signaturesResponse
        : signaturesResponse?.value || [];

      if (!signatures.length) {
        console.log("❌ No transactions found");
        return [];
      }

      console.log(`✅ Found ${signatures.length} transactions`);
      const relevantTransactions =
        await this.filterProgramSignatures(signatures);
      console.log(
        `\n📊 Processing ${relevantTransactions.length} program-related transactions...`,
      );

      const rawTrades = await this.processSignatures(relevantTransactions);

      // ── Apply PnL calculation ──────────────────────────────────────────
      const tradesWithPnL = this.applyPnL(rawTrades);

      return tradesWithPnL
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .filter((t) =>
          fees
            ? true
            : !t.logType?.includes("Fees") || !t.orderType?.includes("fee"),
        );
    } catch (error: any) {
      console.error("Error fetching transactions:", error.message);
      throw error;
    }
  }

  /**
   * NEW METHOD: Extract comprehensive financial details from ALL transactions
   * This processes every transaction type to gather:
   * - Total fees paid (protocol + network)
   * - Funding payments received/paid
   * - Deposits and withdrawals
   * - Account balance changes
   */
  async extractFinancialDetails(): Promise<FinancialDetails> {
    if (!this.walletPublicKey) {
      throw new Error("Wallet not initialized");
    }

    console.log("\n💰 Extracting comprehensive financial details...");

    const financials: FinancialDetails = {
      totalProtocolFees: 0,
      totalNetworkFees: 0,
      totalFees: 0,
      totalFundingReceived: 0,
      totalFundingPaid: 0,
      netFunding: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      netDeposits: 0,
      socializedLosses: 0,
      feeBreakdown: {
        spotFees: 0,
        perpFees: 0,
        makerRebates: 0,
        takerFees: 0,
      },
      fundingBreakdown: new Map<string, number>(), // symbol -> net funding
      dailySummary: new Map<string, any>(), // date -> daily totals
    };

    try {
      // Fetch all signatures
      const signaturesResponse = await this.fetchWithRetries(() =>
        this.rpc
          .getSignaturesForAddress(address(this.walletPublicKey!.toString()), {
            limit: this.maxTransactions,
          })
          .send(),
      );

      const signatures = Array.isArray(signaturesResponse)
        ? signaturesResponse
        : signaturesResponse?.values || [];

      if (!signatures.length) {
        console.log("❌ No transactions found for financial extraction");
        return financials;
      }

      console.log(`✅ Found ${signatures.length} transactions to analyze`);

      // Filter for program-related transactions
      const relevantTransactions = await this.filterProgramSignatures(signatures as any);
      console.log(`📊 Analyzing ${relevantTransactions.length} program transactions`);

      for (const { sigInfo, tx } of relevantTransactions) {
        try {
          const txFinancials = await this.extractTxFinancialDetails(sigInfo, tx);

          // Aggregate totals
          financials.totalProtocolFees += txFinancials.protocolFees;
          financials.totalNetworkFees += txFinancials.networkFee;
          financials.totalFees += txFinancials.protocolFees + txFinancials.networkFee;

          financials.totalFundingReceived += txFinancials.fundingReceived;
          financials.totalFundingPaid += txFinancials.fundingPaid;

          financials.totalDeposits += txFinancials.deposits;
          financials.totalWithdrawals += txFinancials.withdrawals;

          financials.socializedLosses += txFinancials.socializedLoss;

          // Fee breakdown
          financials.feeBreakdown.spotFees += txFinancials.spotFees;
          financials.feeBreakdown.perpFees += txFinancials.perpFees;
          financials.feeBreakdown.makerRebates += txFinancials.makerRebates;
          financials.feeBreakdown.takerFees += txFinancials.takerFees;

          // Funding breakdown by symbol
          for (const [symbol, amount] of txFinancials.fundingBySymbol) {
            const current = financials.fundingBreakdown.get(symbol) || 0;
            financials.fundingBreakdown.set(symbol, current + amount);
          }

          // Daily summary
          const date = new Date(Number(sigInfo.blockTime) * 1000).toISOString().split('T')[0];
          const daily = financials.dailySummary.get(date) || {
            date,
            fees: 0,
            funding: 0,
            deposits: 0,
            withdrawals: 0,
            trades: 0,
          };
          daily.fees += txFinancials.protocolFees + txFinancials.networkFee;
          daily.funding += txFinancials.fundingReceived - txFinancials.fundingPaid;
          daily.deposits += txFinancials.deposits;
          daily.withdrawals += txFinancials.withdrawals;
          daily.trades += txFinancials.tradeCount;
          financials.dailySummary.set(date, daily);

        } catch (error: any) {
          console.warn(`⚠️ Failed to extract financials from tx: ${error.message}`);
        }
        await this.delay(5);
      }

      // Calculate net values
      financials.netFunding = financials.totalFundingReceived - financials.totalFundingPaid;
      financials.netDeposits = financials.totalDeposits - financials.totalWithdrawals;

      // Convert Maps to arrays for easier consumption
      financials.fundingBreakdownArray = Array.from(financials.fundingBreakdown.entries())
        .map(([symbol, amount]) => ({ symbol, amount }))
        .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

      financials.dailySummaryArray = Array.from(financials.dailySummary.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      console.log("\n✅ Financial extraction complete:");
      console.log(`   Total Fees: ${financials.totalFees.toFixed(6)} USDC`);
      console.log(`   Net Funding: ${financials.netFunding.toFixed(6)} USDC`);
      console.log(`   Net Deposits: ${financials.netDeposits.toFixed(6)} USDC`);

      return financials;

    } catch (error: any) {
      console.error("Error extracting financial details:", error.message);
      throw error;
    }
  }

  /**
   * Fetch current prices using CoinGecko API
   * Caches results for 1 minute to avoid rate limits
   */
  private priceCache: { timestamp: number; prices: Map<string, number> } | null = null;

  async fetchCurrentPrices(): Promise<Map<string, number>> {
    // Return cached prices if less than 60 seconds old
    if (
      this.priceCache &&
      Date.now() - this.priceCache.timestamp < 60000
    ) {
      return this.priceCache.prices;
    }

    try {
      console.log("\n🔄 Fetching current prices from CoinGecko...");

      // Ids for: SOL, USDC, BONK, WIF, JUP, RENDER, etc. based on typical Deriverse markets
      // Adjust these IDs based on actual Coingecko API ids
      const ids = [
        "solana",
        "usd-coin",
        "bonk",
        "dogwifhat",
        "jupiter-exchange-solana",
        "render-token"
      ].join(",");

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();
      const prices = new Map<string, number>();

      // Normalize keys to match symbol names used in app
      if (data.solana) prices.set("SOL", data.solana.usd);
      if (data["usd-coin"]) prices.set("USDC", data["usd-coin"].usd);
      if (data.bonk) prices.set("BONK", data.bonk.usd);
      if (data.dogwifhat) prices.set("WIF", data.dogwifhat.usd);
      if (data["jupiter-exchange-solana"]) prices.set("JUP", data["jupiter-exchange-solana"].usd);
      if (data["render-token"]) prices.set("RNDR", data["render-token"].usd);

      // Cache the result
      this.priceCache = {
        timestamp: Date.now(),
        prices
      };

      console.log("✅ Prices updated:", Object.fromEntries(prices));
      return prices;
    } catch (error: any) {
      console.warn(`⚠️ Failed to fetch prices: ${error.message}`);
      // Return stale cache if available, otherwise empty map
      return this.priceCache?.prices || new Map<string, number>();
    }
  }

  /**
   * Extract financial details from a single transaction
   */
  private async extractTxFinancialDetails(sigInfo: any, tx: any): Promise<{
    protocolFees: number;
    networkFee: number;
    fundingReceived: number;
    fundingPaid: number;
    deposits: number;
    withdrawals: number;
    socializedLoss: number;
    spotFees: number;
    perpFees: number;
    makerRebates: number;
    takerFees: number;
    fundingBySymbol: Map<string, number>;
    tradeCount: number;
  }> {
    const result = {
      protocolFees: 0,
      networkFee: 0,
      fundingReceived: 0,
      fundingPaid: 0,
      deposits: 0,
      withdrawals: 0,
      socializedLoss: 0,
      spotFees: 0,
      perpFees: 0,
      makerRebates: 0,
      takerFees: 0,
      fundingBySymbol: new Map<string, number>(),
      tradeCount: 0,
    };

    const logMessages: string[] = tx.meta?.logMessages ?? [];
    if (!logMessages.length) return result;

    // Network fee (SOL in lamports converted to USDC equivalent - using SOL price)
    const rawFee = tx.meta?.fee || 0;
    result.networkFee = Number(rawFee) / 1e9; // SOL amount

    if (this.engineInitialized && this.engine) {
      try {
        const decodedEvents = await (this.engine as any).logsDecode(logMessages);

        for (const event of decodedEvents) {
          const tag = event.tag;

          // Protocol fees (tag 15 = spotFees, tag 23 = perpFees)
          if (tag === 15 || tag === 23) {
            const feeAmount = Math.abs(toNum(event.fees || 0));
            result.protocolFees += feeAmount;

            if (tag === 15) {
              result.spotFees += feeAmount;
            } else {
              result.perpFees += feeAmount;
            }
          }

          // Rebates (negative fees)
          if (event.rebates) {
            const rebateAmount = Math.abs(toNum(event.rebates));
            result.makerRebates += rebateAmount;
            result.protocolFees -= rebateAmount;
          }

          // Funding payments (tag 16 = perpFunding)
          if (tag === 16) {
            const fundingAmount = toNum(event.funding);
            if (fundingAmount > 0) {
              result.fundingReceived += fundingAmount;
            } else {
              result.fundingPaid += Math.abs(fundingAmount);
            }

            // Track by symbol
            const instrId = toNum(event.instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol = details.symbol || `PERP-${instrId}`;

            const current = result.fundingBySymbol.get(symbol) || 0;
            result.fundingBySymbol.set(symbol, current + fundingAmount);
          }

          // Socialized loss (tag 20 = perpSocLoss)
          if (tag === 20) {
            result.socializedLoss += Math.abs(toNum(event.socLoss));
          }

          // Deposits (tag 0 = deposit, tag 7 = perpDeposit)
          if (tag === 0 || tag === 7) {
            result.deposits += Math.abs(toNum(event.amount));
          }

          // Withdrawals (tag 1 = withdraw)
          if (tag === 1) {
            result.withdrawals += Math.abs(toNum(event.amount));
          }

          // Count trades (tag 19 = perpFillOrder)
          if (tag === 19) {
            result.tradeCount++;
          }

          // Taker fees can be inferred from fills
          if (tag === 19 && event.fees) {
            result.takerFees += Math.abs(toNum(event.fees));
          }
        }
      } catch (_) {
        // ignore decode errors
      }
    }

    return result;
  }

  filterTrades(
    trades: TradeRecord[],
    filters: {
      period?: string;
      customStart?: Date;
      customEnd?: Date;
      symbol?: string; // "All Symbols" or specific symbol
      sides?: { long: boolean; short: boolean };
    },
  ): TradeRecord[] {
    let filtered = [...trades];

    // 1. Time Period
    const now = new Date();
    let startDate: Date | undefined;

    if (filters.period) {
      switch (filters.period) {
        case "7D":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30D":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90D":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "YTD":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case "ALL":
        default:
          startDate = undefined;
          break;
      }
    }

    if (startDate) {
      filtered = filtered.filter((t) => t.timestamp >= startDate!);
    }

    // 2. Symbol
    if (filters.symbol && filters.symbol !== "All Symbols") {
      filtered = filtered.filter((t) => t.symbol === filters.symbol);
    }

    // 3. Side (Long/Short)
    if (filters.sides) {
      const { long, short } = filters.sides;
      if (!long && !short) {
        return []; // No sides selected
      }
      if (!long || !short) {
        filtered = filtered.filter((t) => {
          const isLong = t.side === "buy" || t.side === "long";
          const isShort = t.side === "sell" || t.side === "short";
          if (long && isLong) return true;
          if (short && isShort) return true;
          return false;
        });
      }
    }

    return filtered;
  }

  // ── private helpers ──────────────────────────────────────────────────────

  // ─── PnL helpers ──────────────────────────────────────────────────────────

  /**
   * Compute pnlPercentage for a single trade record.
   *
   * Percentage = (pnl / cost-basis) * 100
   * Cost-basis  = entryPrice × quantity (i.e. what was risked on the trade).
   * Falls back to `value` when entryPrice or quantity is 0 (e.g. fee records).
   */
  private computePnlPercentage(t: TradeRecord): number {
    const costBasis =
      t.entryPrice && t.quantity ? t.entryPrice * t.quantity : t.value || 0;
    return costBasis !== 0 ? (t.pnl / costBasis) * 100 : 0;
  }

  /**
   * Derive a deterministic status string from a numeric pnl value.
   * Never falls through to a stale status.
   */
  private pnlToStatus(pnl: number): TradeRecord["status"] {
    if (pnl > 0) return "win";
    if (pnl < 0) return "loss";
    return "breakeven";
  }

  /**
   * Record types whose `pnl` is set inline and must NOT be recalculated by
   * PnLCalculator (they are not open/close fill pairs).
   */
  private static readonly FIXED_PNL_LOG_TYPES = new Set([
    // "spotFees",
    "perpFees",
    "perpFunding",
    "perpSocLoss",
  ]);

  /** Run PnLCalculator over fill records; preserve pnl for fee/funding/loss records. */
  private applyPnL(trades: TradeRecord[]): TradeRecord[] {
    if (!trades.length) return trades;

    // Partition: fills go through PnLCalculator; the rest keep their inline pnl.
    const fillIndices: number[] = [];
    const fillTrades: TradeRecord[] = [];

    trades.forEach((t, i) => {
      if (!TransactionDataFetcher.FIXED_PNL_LOG_TYPES.has(t.logType ?? "")) {
        fillIndices.push(i);
        fillTrades.push(t);
      }
    });

    // Clone the original array so we can splice results back in.
    const result: TradeRecord[] = trades.map((t) => ({ ...t }));

    // Apply PnL calculator only to fill-type records.
    if (fillTrades.length) {
      try {
        const calc = new PnLCalculator(fillTrades);
        const withPnL = calc.calculatePnL();

        withPnL.forEach((t, idx) => {
          const originalIdx = fillIndices[idx];
          result[originalIdx] = {
            ...t,
            pnlPercentage: this.computePnlPercentage(t),
            status: this.pnlToStatus(t.pnl),
          };
        });
      } catch (err: any) {
        console.warn(`⚠️ PnL calculation failed: ${err.message}`);
        // Fallback: leave fill records as-is but still fix status + percentage.
        fillIndices.forEach((originalIdx) => {
          const t = result[originalIdx];
          result[originalIdx] = {
            ...t,
            pnlPercentage: this.computePnlPercentage(t),
            status: this.pnlToStatus(t.pnl),
          };
        });
      }
    }

    // Always recompute pnlPercentage and status for fixed-pnl records too.
    trades.forEach((_, i) => {
      if (
        TransactionDataFetcher.FIXED_PNL_LOG_TYPES.has(trades[i].logType ?? "")
      ) {
        const t = result[i];
        result[i] = {
          ...t,
          pnlPercentage: this.computePnlPercentage(t),
          status: this.pnlToStatus(t.pnl),
        };
      }
    });

    return result;
  }

  private async primeClientData(): Promise<void> {
    if (
      this.engine &&
      typeof (this.engine as any).getClientData === "function"
    ) {
      try {
        await (this.engine as any).getClientData();
      } catch (_) {
        // ignore
      }
    }
  }

  private async filterProgramSignatures(
    signatures: any[],
  ): Promise<{ sigInfo: any; tx: any }[]> {
    const relevant: { sigInfo: any; tx: any }[] = [];
    console.log(
      `\n🔍 Filtering transactions for program ID: ${this.programId}`,
    );

    // Filter out invalid signatures first
    const validSignatures = signatures.filter(s => s.err === null);

    // Process signatures purely serially to strictly control request rate
    // e.g. 150ms delay = max ~6.6 requests per second (well below 10-40 req/s limits)
    for (let i = 0; i < validSignatures.length; i++) {
      const sigInfo = validSignatures[i];

      if (i % 10 === 0) {
        console.log(`   Processing signature ${i + 1}/${validSignatures.length}...`);
      }

      try {
        const tx = await this.fetchWithRetries(
          () => this.connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed"
          }),
          4, // retries
          2000 // base delay
        );

        if (tx && this.transactionInvolvesProgram(tx)) {
          relevant.push({ sigInfo, tx });
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to fetch ${sigInfo.signature}: ${error.message}`);
      }

      // Strict delay between every single request
      await this.delay(150);
    }

    return relevant;
  }

  private async processSignatures(
    transactions: { sigInfo: any; tx: any }[],
  ): Promise<TradeRecord[]> {
    const allTrades: TradeRecord[] = [];
    let processedCount = 0;

    for (const { sigInfo, tx } of transactions) {
      processedCount++;
      if (processedCount % 5 === 0) {
        console.log(`   Progress: ${processedCount}/${transactions.length}`);
      }
      try {
        const records = await this.parseTransactionData(
          sigInfo.signature,
          sigInfo,
          tx,
        );
        allTrades.push(...records);
        // Reduced delay since we aren't fetching anymore
        await this.delay(5);
      } catch (error: any) {
        console.warn(
          `   ⚠️ Failed to parse tx ${sigInfo.signature.substring(0, 8)}: ${error.message}`,
        );
      }
    }

    console.log(`\n✅ Processed ${processedCount} transactions`);
    console.log(`   Extracted trades: ${allTrades.length}`);
    return allTrades;
  }

  private transactionInvolvesProgram(tx: any): boolean {
    if (!tx) return false;

    if (tx.transaction?.message?.accountKeys) {
      for (const account of tx.transaction.message.accountKeys) {
        const accountStr =
          typeof account === "string" ? account : account.pubkey?.toString();
        if (accountStr === this.programId) return true;
      }
    }

    if (tx.transaction?.message?.instructions) {
      for (const ix of tx.transaction.message.instructions) {
        if (ix.programId?.toString() === this.programId) return true;
        if (ix.instructions) {
          for (const innerIx of ix.instructions) {
            if (innerIx.programId?.toString() === this.programId) return true;
          }
        }
      }
    }

    if (tx.meta?.logMessages) {
      for (const log of tx.meta.logMessages) {
        if (log.includes(`Program ${this.programId} invoke`)) return true;
      }
    }

    return false;
  }

  /**
   * Extract a small integer instrument ID from an event object.
   *
   * KEY FIXES vs original:
   * 1. `crncy` is deprioritised — it can also represent a currency *amount*
   *    (large lamport value).  We only accept it if the resolved number is
   *    small enough to be a valid instrument/token ID (< 1_000_000).
   * 2. Every raw value is run through `toNum()` so BN / BigInt objects do not
   *    produce NaN or "[object Object]".
   */
  private extractInstrumentId(event: any): number | undefined {
    if (!event) return undefined;

    // instrId / tokenId are unambiguous instrument identifiers — try first
    const primaryFields = ["instrId", "tokenId", "instrumentId", "marketId"];
    for (const field of primaryFields) {
      const raw = event[field];
      if (raw === undefined || raw === null) continue;
      const n = toNum(raw);
      if (!isNaN(n)) return n;
    }

    // `crncy` / `baseCrncyId` — only accept if value looks like an ID (< 1e6)
    const ambiguousFields = ["crncy", "baseCrncyId"];
    for (const field of ambiguousFields) {
      const raw = event[field];
      if (raw === undefined || raw === null) continue;
      const n = toNum(raw);
      if (!isNaN(n) && n < 1_000_000) return n;
    }

    // Raw log fallback
    if (event.rawLogMessage) {
      const instrMatch = event.rawLogMessage.match(/instr[Ii]d[=:]\s*(\d+)/i);
      if (instrMatch) return parseInt(instrMatch[1], 10);
      const crncyMatch = event.rawLogMessage.match(/crncy[=:]\s*(\d+)/i);
      if (crncyMatch) return parseInt(crncyMatch[1], 10);
      const tokenMatch = event.rawLogMessage.match(/token[Ii]d[=:]\s*(\d+)/i);
      if (tokenMatch) return parseInt(tokenMatch[1], 10);
    }

    return undefined;
  }

  private async parseTransactionData(
    signature: string,
    sigInfo: any,
    tx: any,
  ): Promise<TradeRecord[]> {
    const tradeRecords: TradeRecord[] = [];

    try {
      if (!tx) return tradeRecords;

      const logMessages: string[] = tx.meta?.logMessages ?? [];
      if (!logMessages.length) return tradeRecords;

      // === PART A: Extract Network Fee (SOL) ===
      const txData = tx as any;
      const rawFee = txData?.meta?.fee || 0;
      const networkFee = Number(rawFee) / 1e9; // Convert Lamports to SOL

      const decodedEvents: DecodedLogMessage[] = [];

      if (this.engineInitialized && this.engine) {
        try {
          const allDecoded = await (this.engine as any).logsDecode(logMessages);
          if (Array.isArray(allDecoded) && allDecoded.length > 0) {
            decodedEvents.push(...allDecoded);
          }
        } catch (_) {
          // ignore decode errors
        }
      }

      const blockTs = sigInfo.blockTime
        ? new Date(Number(sigInfo.blockTime) * 1000)
        : new Date();

      // === PART B: Calculate Protocol Fees (USDC) ===
      let totalProtocolFees = 0;

      decodedEvents.forEach((event: any) => {
        // Check for fee-related events (tag 15 = spotFees, tag 23 = perpFees)
        if (event.tag === 15 || event.tag === 23) {
          const feeAmount = Math.abs(toNum(event.fees || 0));
          totalProtocolFees += feeAmount;
        }
        // Check for rebates (negative fees)
        if (event.rebates && event.rebates !== 0) {
          const rebateAmount = Math.abs(toNum(event.rebates));
          totalProtocolFees -= rebateAmount;
        }
      });

      // Count actual trade fills in this transaction — only perp (19) now
      const tradeFillEvents = decodedEvents.filter(
        (e: any) => e.tag === 19, // perpFillOrder (19)
      );

      const feeDistribution = this.distributeFees(
        tradeFillEvents,
        networkFee,
        totalProtocolFees,
      );

      for (const event of decodedEvents) {
        const tag = event.tag;
        const uniqueId = `${signature}-${tradeRecords.length}`;

        switch (tag) {
          // ── ONLY PERP FILLS ARE ACTIVE ────────────────────────────────
          // All other event types are commented out to ensure only filled trades are returned

          /* ── DEPOSIT ───────────────────────────────────────────────────
          case LogType.deposit: { ... } */

          /* ── WITHDRAW ──────────────────────────────────────────────────
          case LogType.withdraw: { ... } */

          /* ── PERP DEPOSIT ──────────────────────────────────────────────
          case LogType.perpDeposit: { ... } */

          /* ── SPOT PLACE ORDER ──────────────────────────────────────────
          case LogType.spotPlaceOrder: { ... } */

          /* ── SPOT FILL ─────────────────────────────────────────────────
          case LogType.spotFillOrder: {
            const spotFill = event as SpotFillOrderReportModel;
            const instrId = toNum(spotFill.instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol = details.symbol;

            const isBuy = spotFill.side === 0;
            const quantity = toNum(spotFill.qty);
            const price = toNum(spotFill.price);
            const amount = quantity * price;

            const fillIndex = tradeFillEvents.indexOf(event);
            const tradeFee = feeDistribution.get(fillIndex) || 0;

            tradeRecords.push({
              id: uniqueId,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: isBuy ? "buy" : "sell",
              instrument: symbol,
              entryPrice: price,
              exitPrice: price,
              quantity,
              amount,
              value: amount,
              orderType: "limit",
              clientId: toStr(spotFill.clientId) || "unknown",
              orderId: toStr(spotFill.orderId) || "unknown",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: tradeFee,
              },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Spot ${isBuy ? "Buy" : "Sell"} Fill — ${quantity.toFixed(6)} ${symbol.split("/")[0]} @ ${price}`,
              tradeType: "spot",
            });
            break;
          } */

          /* ── SPOT NEW ORDER ────────────────────────────────────────────
          case LogType.spotNewOrder: { ... } */

          /* ── SPOT FEES ─────────────────────────────────────────────────
          case LogType.spotFees: { ... } */

          // ── PERP FILL — discriminator 19 ──────────────────────────────
          case LogType.perpFillOrder: {
            const perpFill = event as PerpFillOrderReportModel;
            const symbol = "SOL/USDC"; // Hardcorded because I don't know how to get the symbol from the event

            // FIXED: Inverted logic based on user observation (PnL signs were flipped)
            // side 0 = Short/Sell, side 1 = Long/Buy
            const isLong = perpFill.side === 1;
            const quantity = toNum(perpFill.perps);
            const price = toNum(perpFill.price);

            // Calculate amount safely, handling undefined price
            let amount = perpFill.perps;
            const rebates = perpFill.rebates ? -toNum(perpFill.rebates) : 0;

            const fillIndex = tradeFillEvents.indexOf(event);
            const tradeFee = feeDistribution.get(fillIndex) || 0;

            // console.log("PerpFillOrder:: ", event); // Commented out for production

            tradeRecords.push({
              id: uniqueId,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: isLong ? "long" : "short",
              instrument: symbol,
              entryPrice: price || 0,
              exitPrice: price || 0,
              quantity,
              amount,
              value: amount,
              orderType: "market",
              clientId: toStr(perpFill.clientId) || "unknown",
              orderId: toStr(perpFill.orderId) || "unknown",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: tradeFee,
                rebates,
              },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Perp ${isLong ? "Long" : "Short"} Fill — ${quantity.toFixed(6)} ${symbol} @ ${price || 0}`,
              tradeType: "perp",
              logType: "perpFillOrder",
              discriminator: tag,
            });
            break;
          }

          /* ── PERP FUNDING ──────────────────────────────────────────────
          case LogType.perpFunding: { ... } */

          /* ── PERP FEES ─────────────────────────────────────────────────
          case LogType.perpFees: { ... } */

          /* ── PERP SOCIALIZED LOSS ──────────────────────────────────────
          case LogType.perpSocLoss: { ... } */

          /* ── PERP ORDER REVOKE ─────────────────────────────────────────
          case LogType.perpOrderRevoke: { ... } */

          default:
            break;
        }
      }

      return tradeRecords;
    } catch (error: any) {
      console.warn(
        `   ⚠️ Failed to parse tx ${signature.substring(0, 8)}: ${error.message}`,
      );
      return tradeRecords;
    }
  }

  // Add to TransactionDataFetcher class

  /**
   * Distribute transaction fees fairly across multiple fills in the same transaction
   */
  private distributeFees(
    fillEvents: any[],
    networkFee: number,
    protocolFees: number,
  ): Map<number, number> {
    const feeMap = new Map<number, number>();

    if (fillEvents.length === 0) return feeMap;

    // Distribute fees proportionally based on trade value
    const totalValue = fillEvents.reduce((sum, event) => {
      const price = toNum(event.price);
      const qty = toNum(event.qty);
      return sum + price * qty;
    }, 0);

    const totalFees = networkFee + protocolFees;

    fillEvents.forEach((event, index) => {
      const price = toNum(event.price);
      const qty = toNum(event.qty);
      const tradeValue = price * qty;

      // Allocate fees proportionally to trade value
      const tradeFee =
        totalValue > 0
          ? (tradeValue / totalValue) * totalFees
          : totalFees / fillEvents.length;

      feeMap.set(index, tradeFee);
    });

    return feeMap;
  }

  // ── instrument / token lookups ───────────────────────────────────────────

  private getTokenSymbol(tokenId: number): string {
    const tokenMap: Record<number, string> = {
      1: "USDC",
      2: "SOL",
      4: "LETTERA",
      6: "VELIT",
      8: "SUN",
      10: "BRSH",
      12: "MSHK",
      14: "SOL",
      16: "trs",
      18: "sad",
      20: "MDVD",
      22: "333",
      24: "BRSH",
      26: "1",
      28: "TST",
      30: "asd",
    };
    return tokenMap[tokenId] ?? `TOKEN-${tokenId}`;
  }

  private getInstrumentSymbol(instrId: number): string {
    const instrumentMap: Record<number, string> = {
      0: "SOL/USDC",
      2: "LETTERA/USDC",
      4: "VELIT/USDC",
      6: "SUN/USDC",
      8: "BRSH/USDC",
      10: "MSHK/USDC",
      12: "SOL/USDC",
      14: "trs/USDC",
      16: "sad/USDC",
      18: "MDVD/USDC",
      20: "333/USDC",
      22: "BRSH/USDC",
      24: "1/USDC",
      26: "TST/USDC",
      28: "asd/USDC",
    };
    return instrumentMap[instrId] ?? `INSTR-${instrId}`;
  }

  /** Resolve a human-readable symbol via engine instrument/token metadata. */
  async resolveInstrumentDetails(instrId?: number): Promise<{
    symbol: string;
    base: string;
    quote: string;
  }> {
    // Safe fallback — never returns "INSTR-undefined"
    const fallbackSymbol =
      instrId !== undefined && instrId !== null && !isNaN(instrId)
        ? this.getInstrumentSymbol(instrId)
        : "UNKNOWN";

    const result = {
      symbol: fallbackSymbol,
      base: "UNKNOWN",
      quote: "UNKNOWN",
    };

    if (instrId === undefined || instrId === null || isNaN(instrId)) {
      return result;
    }

    try {
      if (
        this.engine?.instruments &&
        typeof this.engine.instruments.get === "function"
      ) {
        const meta = this.engine.instruments.get(instrId as any);
        if (meta?.header) {
          const header = meta.header as any;

          if (header.assetMint && header.crncyMint) {
            const baseMint = header.assetMint;
            const quoteMint = header.crncyMint;
            let base = "UNKNOWN";
            let quote = "UNKNOWN";

            if (this.engine.tokens instanceof Map) {
              const baseToken = this.engine.tokens.get(baseMint);
              const quoteToken = this.engine.tokens.get(quoteMint);
              if (typeof baseToken === "string") base = baseToken;
              else if (baseToken && typeof baseToken === "object")
                base = (baseToken.symbol as string) || base;
              if (typeof quoteToken === "string") quote = quoteToken;
              else if (quoteToken && typeof quoteToken === "object")
                quote = (quoteToken.symbol as string) || quote;
            }

            if (base === "UNKNOWN" || quote === "UNKNOWN") {
              try {
                const {
                  TokenListProvider,
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                } = require("@solana/spl-token-registry");
                const list = await new TokenListProvider().resolve();
                const tokens = list.getList();
                const baseEntry = tokens.find(
                  (t: any) => t.address === baseMint,
                );
                const quoteEntry = tokens.find(
                  (t: any) => t.address === quoteMint,
                );
                if (baseEntry) base = baseEntry.symbol;
                if (quoteEntry) quote = quoteEntry.symbol;
              } catch (_) {
                // ignore
              }
            }

            if (base !== "UNKNOWN" || quote !== "UNKNOWN") {
              return {
                symbol: `${base}/${quote}`,
                base,
                quote,
              };
            }
          }

          if (
            header.assetTokenId !== undefined &&
            header.crncyTokenId !== undefined
          ) {
            const baseRaw =
              this.engine.tokens?.get(header.assetTokenId) ||
              this.getTokenSymbol(toNum(header.assetTokenId));
            const quoteRaw =
              this.engine.tokens?.get(header.crncyTokenId) ||
              this.getTokenSymbol(toNum(header.crncyTokenId));

            // normalize to string symbol if token entries are objects
            const base =
              typeof baseRaw === "string"
                ? baseRaw
                : (baseRaw?.symbol ?? String(baseRaw));
            const quote =
              typeof quoteRaw === "string"
                ? quoteRaw
                : (quoteRaw?.symbol ?? String(quoteRaw));

            return {
              symbol: `${base}/${quote}`,
              base: String(base),
              quote: String(quote),
            };
          }
        }
      }
    } catch (_) {
      // ignore — return fallback
    }

    return result;
  }

  // ── format helpers ───────────────────────────────────────────────────────

  private formatSection(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    const ss = date.getSeconds().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hh}:${mm}:${ss}`;
  }

  // ── export helpers ───────────────────────────────────────────────────────

  exportToCSV(tradeRecords: TradeRecord[]): string {
    const headers = [
      "ID",
      "Section",
      "Timestamp (UTC)",
      "Type",
      "Instrument",
      "Order Side",
      "Price",
      "Quantity",
      "Amount",
      "Value",
      "Order Type",
      "Client ID",
      "Order ID",
      "Transaction Hash",
      "Trade Type",
      "Log Type",
      "Discriminator",
      "Rebates",
      "Funding Payments",
      "Socialized Loss",
      "Total Fee",
      "PNL",
      "PNL %",
      "Status",
      "Notes",
    ];

    const csvRows = [headers.join(",")];

    for (const record of tradeRecords) {
      csvRows.push(
        [
          record.id,
          `"${record.section || ""}"`,
          record.timestamp.toISOString(),
          record.tradeType || "",
          `"${record.instrument}"`,
          record.side,
          record.entryPrice.toFixed(6),
          record.quantity.toFixed(6),
          (record.amount || 0).toFixed(6),
          (record.value || 0).toFixed(6),
          record.orderType,
          record.clientId,
          record.orderId,
          record.transactionHash,
          record.tradeType || "",
          record.logType || "",
          record.discriminator?.toString() || "",
          (record.fees.rebates || 0).toFixed(9),
          (record.fundingPayments || 0).toFixed(9),
          (record.socializedLoss || 0).toFixed(9),
          record.fees.total.toFixed(9),
          record.pnl.toFixed(6),
          record.pnlPercentage.toFixed(4),
          record.status,
          `"${record.notes || ""}"`,
        ].join(","),
      );
    }

    return csvRows.join("\n");
  }

  exportToJSON(tradeRecords: TradeRecord[]): string {
    return JSON.stringify(tradeRecords, null, 2);
  }

  getSummary(tradeRecords: TradeRecord[]): any {
    const spotTrades = tradeRecords.filter((t) => t.tradeType === "spot");
    const perpTrades = tradeRecords.filter((t) => t.tradeType === "perp");
    const fills = tradeRecords.filter(
      (t) => t.discriminator === 11 || t.discriminator === 19,
    );
    const cancels = tradeRecords.filter(
      (t) => t.logType?.includes("Cancel") || t.orderType === "cancel",
    );
    const revokes = tradeRecords.filter(
      (t) => t.logType?.includes("Revoke") || t.orderType === "revoke",
    );

    const summary: any = {
      totalTrades: tradeRecords.length,
      spotTrades: spotTrades.length,
      perpTrades: perpTrades.length,
      tradeFills: fills.length,
      orderCancels: cancels.length,
      orderRevokes: revokes.length,
      totalVolume: tradeRecords.reduce((sum, t) => sum + (t.value || 0), 0),
      totalFees: parseFloat(
        tradeRecords.reduce((sum, t) => sum + t.fees.total, 0).toFixed(6),
      ),
      totalRebates: parseFloat(
        tradeRecords
          .reduce((sum, t) => sum + (t.fees.rebates || 0), 0)
          .toFixed(6),
      ),
      totalFunding: tradeRecords.reduce(
        (sum, t) => sum + (t.fundingPayments || 0),
        0,
      ),
      totalSocializedLoss: tradeRecords.reduce(
        (sum, t) => sum + (t.socializedLoss || 0),
        0,
      ),
      winningTrades: tradeRecords.filter((t) => t.status === "win").length,
      losingTrades: tradeRecords.filter((t) => t.status === "loss").length,
      breakevenTrades: tradeRecords.filter((t) => t.status === "breakeven")
        .length,
    };

    summary.netPnL = parseFloat(
      tradeRecords.reduce((sum, t) => sum + t.pnl, 0).toFixed(6),
    );
    summary.netFees = parseFloat(
      (summary.totalFees - summary.totalRebates).toFixed(6),
    );

    return summary;
  }
}