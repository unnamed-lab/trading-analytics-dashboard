/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { Signature, address, createSolanaRpc, devnet } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";
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
import { TradeRecord } from "@/types";
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
  | { tag: number; [key: string]: any };

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
    this.requestDelayMs = requestDelayMs;
    this.maxTransactions = maxTransactions;
    this.programId = process.env.PROGRAM_ID!;
    if (programId) this.programId = programId;
    if (version) this.version = version;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
        signaturesResponse = await this.rpc
          .getSignaturesForAddress(
            address(this.walletPublicKey.toString()),
            requestOptions,
          )
          .send();
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

      const relevantSignatures = await this.filterProgramSignatures(signatures);
      console.log(
        `\n📊 Found ${relevantSignatures.length} program-related transactions out of ${signatures.length}`,
      );

      await this.primeClientData();

      const rawTrades = await this.processSignatures(relevantSignatures);

      // ── Apply PnL calculation across all collected trades ──────────────
      const tradesWithPnL = this.applyPnL(rawTrades);

      const hasMore = signatures.length > limit;
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
        totalProcessed: relevantSignatures.length,
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
        signaturesResponse = await this.rpc
          .getSignaturesForAddress(address(this.walletPublicKey.toString()), {
            limit: this.maxTransactions,
          })
          .send();
      } catch (err1: any) {
        console.log("⚠️  Method 1 failed, trying with program ID...");
        try {
          signaturesResponse = await this.rpc
            .getSignaturesForAddress(address(this.programId), {
              limit: this.maxTransactions,
            })
            .send();
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
      const relevantSignatures = await this.filterProgramSignatures(signatures);
      console.log(
        `\n📊 Processing ${relevantSignatures.length} program-related transactions...`,
      );

      const rawTrades = await this.processSignatures(relevantSignatures);

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
    "spotFees",
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

  private async filterProgramSignatures(signatures: any[]): Promise<any[]> {
    const relevant: any[] = [];
    console.log(
      `\n🔍 Filtering transactions for program ID: ${this.programId}`,
    );

    for (const sigInfo of signatures) {
      if (sigInfo.err !== null) continue;
      try {
        const txResponse = await this.rpc
          .getTransaction(sigInfo.signature as Signature, {
            maxSupportedTransactionVersion: 0,
            encoding: "jsonParsed",
          })
          .send();
        const tx = (txResponse as any)?.value ?? txResponse;
        if (!tx) continue;

        if (this.transactionInvolvesProgram(tx)) {
          relevant.push(sigInfo);
          console.log(
            `   ✅ ${sigInfo.signature.substring(0, 8)}... involves program`,
          );
        }
        await this.delay(50);
      } catch (_) {
        continue;
      }
    }
    return relevant;
  }

  private async processSignatures(signatures: any[]): Promise<TradeRecord[]> {
    const allTrades: TradeRecord[] = [];
    let processedCount = 0;

    for (const sigInfo of signatures) {
      processedCount++;
      if (processedCount % 5 === 0) {
        console.log(`   Progress: ${processedCount}/${signatures.length}`);
      }
      try {
        const records = await this.fetchAndParseTransaction(
          sigInfo.signature,
          sigInfo,
          allTrades.length,
        );
        allTrades.push(...records);
        await this.delay(this.requestDelayMs);
      } catch (error: any) {
        console.warn(
          `   ⚠️ Failed to fetch tx ${sigInfo.signature.substring(0, 8)}: ${error.message}`,
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

  private async fetchAndParseTransaction(
    signature: string,
    sigInfo: any,
    _startCounter: number,
  ): Promise<TradeRecord[]> {
    const tradeRecords: TradeRecord[] = [];

    try {
      const txResponse = await this.rpc
        .getTransaction(signature as Signature, {
          maxSupportedTransactionVersion: 0,
          encoding: "jsonParsed",
        })
        .send();

      const tx = (txResponse as any)?.value ?? txResponse;
      if (!tx) return tradeRecords;

      const logMessages: string[] = tx.meta?.logMessages ?? [];
      if (!logMessages.length) return tradeRecords;

      const decodedEvents: DecodedLogMessage[] = [];

      if (this.engineInitialized && this.engine) {
        try {
          const allDecoded = await (this.engine as any).logsDecode(logMessages);
          if (Array.isArray(allDecoded) && allDecoded.length > 0) {
            decodedEvents.push(...allDecoded);
          }
        } catch (_) {
          // ignore decode errors — no fallback raw parsing needed here
        }
      }

      const blockTs = sigInfo.blockTime
        ? new Date(Number(sigInfo.blockTime) * 1000)
        : new Date();

      for (const event of decodedEvents) {
        const tag = event.tag;

        switch (tag) {
          // ── Deposit ───────────────────────────────────────────────────
          case LogType.deposit: {
            const deposit = event as DepositReportModel;
            const tokenId = toNum(deposit.tokenId);
            const tokenSymbol = this.getTokenSymbol(tokenId);
            const amount = toNum(deposit.amount);
            console.log("Deposit:: ", deposit);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol: tokenSymbol,
              side: "buy",
              instrument: `${tokenSymbol}/USD`,
              entryPrice: 0,
              exitPrice: 0,
              quantity: amount,
              amount,
              value: amount,
              orderType: "deposit",
              clientId: toStr(deposit.clientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Deposit ${(amount)} ${tokenSymbol}`,
              tradeType: "spot",
              logType: "deposit",
              discriminator: tag,
            });
            break;
          }

          // ── Withdraw ──────────────────────────────────────────────────
          case LogType.withdraw: {
            const withdraw = event as WithdrawReportModel;
            const tokenId = toNum(withdraw.tokenId);
            const tokenSymbol = this.getTokenSymbol(tokenId);
            const amount = toNum(withdraw.amount);
            console.log("Withdraw:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol: tokenSymbol,
              side: "sell",
              instrument: `${tokenSymbol}/USD`,
              entryPrice: 0,
              exitPrice: 0,
              quantity: amount,
              amount,
              value: 0,
              orderType: "withdraw",
              clientId: toStr(withdraw.clientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Withdraw ${(amount)} ${tokenSymbol}`,
              tradeType: "spot",
              logType: "withdraw",
              discriminator: tag,
            });
            break;
          }

          // ── Perp Deposit ──────────────────────────────────────────────
          case LogType.perpDeposit: {
            const perpDeposit = event as any;
            const instrId = toNum(perpDeposit.instrId);
            const instrumentSymbol = this.getInstrumentSymbol(instrId);
            const amount = toNum(perpDeposit.amount);
            const perpDetails = await this.resolveInstrumentDetails(instrId);
            const symbol = perpDetails.symbol || instrumentSymbol;
            console.log("PerpDeposit:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: "buy",
              instrument: symbol,
              entryPrice: 0,
              exitPrice: 0,
              quantity: amount,
              amount,
              value: 0,
              orderType: "deposit",
              clientId: toStr(perpDeposit.clientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Perp Deposit ${(amount)} to ${symbol}`,
              tradeType: "perp",
              logType: "perpDeposit",
              discriminator: tag,
            });
            break;
          }

          // ── Spot Place Order ──────────────────────────────────────────
          case LogType.spotPlaceOrder: {
            const placeOrder = event as any;
            const instrId = toNum(placeOrder.instrId);
            const instrumentSymbol = this.getInstrumentSymbol(instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol = details.symbol || instrumentSymbol;
            const side = placeOrder.side === 0 ? "buy" : "sell";
            const quantity = toNum(placeOrder.qty);
            const price = toNum(placeOrder.price);
            console.log("SpotPlaceOrder:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: side as "buy" | "sell",
              instrument: symbol,
              entryPrice: price,
              exitPrice: price,
              quantity,
              amount: quantity,
              value: price * quantity,
              orderType: placeOrder.orderType === 1 ? "limit" : "market",
              clientId: toStr(placeOrder.clientId) || "unknown",
              orderId: toStr(placeOrder.orderId) || "unknown",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "open",
              notes: `Place ${side === "buy" ? "Buy" : "Sell"} Order for ${quantity} ${symbol} @ ${price}`,
              tradeType: "spot",
              logType: "spotPlaceOrder",
              discriminator: tag,
            });
            break;
          }

          // ── Spot Fill (Trade) — discriminator 11 ─────────────────────
          case LogType.spotFillOrder: {
            const fill = event as SpotFillOrderReportModel;
            const symbol = "SOL";

            const side = fill.side === 0 ? "buy" : "sell";
            const quantity = toNum(fill.qty);
            // price is already human-readable (engine scales it)
            const price = toNum(fill.price);
            // crncy here = USDC value of the fill
            const value = toNum((fill as any).crncy);
            const rebates = fill.rebates ? -toNum(fill.rebates) : 0;
            console.log("SpotFillOrder:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: side as "buy" | "sell",
              instrument: symbol,
              entryPrice: price,
              exitPrice: price,
              quantity,
              amount: quantity,
              value: value || price * quantity,
              orderType: "market",
              clientId: toStr(fill.clientId) || "unknown",
              orderId: toStr(fill.orderId) || "unknown",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: rebates, rebates },
              pnl: 0, // computed by PnLCalculator after collection
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `${side === "buy" ? "Bought" : "Sold"} ${quantity.toFixed(6)} ${symbol} @ ${price}`,
              tradeType: "spot",
              logType: "spotFillOrder",
              discriminator: tag,
            });
            break;
          }

          // ── Spot New Order ────────────────────────────────────────────
          case LogType.spotNewOrder: {
            const newOrder = event as any;
            const symbol = "SOL";
            const side = newOrder.side === 0 ? "buy" : "sell";
            const quantity = toNum(newOrder.qty);
            const crncyValue = toNum(newOrder.crncy);
            const price = quantity > 0 ? crncyValue / quantity : 0;
            console.log("SpotNewOrder:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: side as "buy" | "sell",
              instrument: symbol,
              entryPrice: price,
              exitPrice: price,
              quantity,
              amount: quantity,
              value: crncyValue,
              orderType: "new",
              clientId: "unknown",
              orderId: "unknown",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "open",
              notes: `New ${side} Order`,
              tradeType: "spot",
              logType: "spotNewOrder",
              discriminator: tag,
            });
            break;
          }

          // ── Spot Fees ─────────────────────────────────────────────────
          case LogType.spotFees: {
            const fees = event as SpotFeesReportModel;
            const feeAmount = toNum(fees.fees);
            const refPayment = toNum(fees.refPayment);
            console.log("SpotFees:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol: "SOL",
              side: "sell",
              instrument: "Fees",
              entryPrice: 0,
              exitPrice: 0,
              quantity: feeAmount,
              amount: feeAmount,
              value: feeAmount,
              orderType: "fee",
              clientId: toStr(fees.refClientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: feeAmount,
                rebates: refPayment,
              },
              pnl: -feeAmount,
              pnlPercentage: 0,
              duration: 0,
              status: feeAmount > 0 ? "loss" : "breakeven",
              notes: `Trading Fees: ${(feeAmount)} SOL, Ref Payment: ${refPayment.toFixed(6)}`,
              tradeType: "spot",
              logType: "spotFees",
              discriminator: tag,
            });
            break;
          }

          // ── Perp Fill — discriminator 19 ──────────────────────────────
          case LogType.perpFillOrder: {
            const perpFill = event as PerpFillOrderReportModel;
            const instrId =
              this.extractInstrumentId(perpFill) ??
              toNum((perpFill as any).instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol =
              details.symbol ||
              (instrId !== undefined ? `PERP-${instrId}` : "PERP-UNKNOWN");

            const isLong = perpFill.side === 0;
            const quantity = toNum(perpFill.perps);
            const price = toNum(perpFill.price);
            const crncyValue = toNum((perpFill as any).crncy);
            const rebates = perpFill.rebates ? -toNum(perpFill.rebates) : 0;
            console.log("PerpFillOrder:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: isLong ? "long" : "short",
              instrument: symbol,
              entryPrice: price,
              exitPrice: price,
              quantity,
              amount: quantity,
              value: crncyValue || price * quantity,
              orderType: "market",
              clientId: toStr(perpFill.clientId) || "unknown",
              orderId: toStr(perpFill.orderId) || "unknown",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: rebates, rebates },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Perp ${isLong ? "Long" : "Short"} Fill — ${quantity.toFixed(6)} ${symbol} @ ${price}`,
              tradeType: "perp",
              logType: "perpFillOrder",
              discriminator: tag,
            });
            break;
          }

          // ── Perp Funding ──────────────────────────────────────────────
          case LogType.perpFunding: {
            const funding = event as PerpFundingReportModel;
            const instrId =
              this.extractInstrumentId(funding) ?? toNum(funding.instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol = details.symbol || `PERP-${instrId}`;
            const fundingValue = toNum(funding.funding);
            console.log("PerpFunding:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: fundingValue >= 0 ? "long" : "short",
              instrument: symbol,
              entryPrice: 0,
              exitPrice: 0,
              quantity: 0,
              amount: Math.abs(fundingValue),
              value: Math.abs(fundingValue),
              orderType: "funding",
              clientId: toStr(funding.clientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: fundingValue,
              pnlPercentage: 0,
              duration: 0,
              status: fundingValue > 0 ? "win" : "loss",
              notes: `${fundingValue > 0 ? "Received" : "Paid"} Funding: ${(Math.abs(fundingValue))} SOL`,
              tradeType: "perp",
              fundingPayments: fundingValue,
              logType: "perpFunding",
              discriminator: tag,
            });
            break;
          }

          // ── Perp Fees ─────────────────────────────────────────────────
          case LogType.perpFees: {
            const perpFees = event as PerpFeesReportModel;
            const feeAmount = toNum((perpFees as any).fees);
            console.log("PerpFees:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol: "SOL",
              side: "sell",
              instrument: "Perp Fees",
              entryPrice: 0,
              exitPrice: 0,
              quantity: feeAmount,
              amount: feeAmount,
              value: feeAmount,
              orderType: "fee",
              clientId: toStr((perpFees as any).clientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: feeAmount, rebates: 0 },
              pnl: -feeAmount,
              pnlPercentage: 0,
              duration: 0,
              status: feeAmount > 0 ? "loss" : "breakeven",
              notes: `Perp Trading Fees: ${(feeAmount)} SOL`,
              tradeType: "perp",
              logType: "perpFees",
              discriminator: tag,
            });
            break;
          }

          // ── Perp Socialized Loss ──────────────────────────────────────
          case LogType.perpSocLoss: {
            const socLoss = event as PerpSocLossReportModel;
            const instrId = toNum(socLoss.instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol = details.symbol || `PERP-${instrId}`;
            const lossValue = toNum(socLoss.socLoss);
            console.log("Perp Socialized Loss:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: "short",
              instrument: symbol,
              entryPrice: 0,
              exitPrice: 0,
              quantity: 0,
              amount: Math.abs(lossValue),
              value: Math.abs(lossValue),
              orderType: "socLoss",
              clientId: toStr(socLoss.clientId) || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: -lossValue,
              pnlPercentage: 0,
              duration: 0,
              status: "loss",
              notes: `Socialized Loss: ${(lossValue)} USDC`,
              tradeType: "perp",
              socializedLoss: lossValue,
              logType: "perpSocLoss",
              discriminator: tag,
            });
            break;
          }

          // ── Spot / Perp Order Revoke ──────────────────────────────────
          case LogType.spotOrderRevoke:
          case LogType.perpOrderRevoke: {
            const revoke = event as SpotOrderRevokeReportModel;
            const isPerp = tag === LogType.perpOrderRevoke;
            const instrId =
              this.extractInstrumentId(event) ?? toNum((event as any).instrId);
            const details = await this.resolveInstrumentDetails(instrId);
            const symbol =
              details.symbol ||
              (instrId !== undefined
                ? isPerp
                  ? `PERP-${instrId}`
                  : this.getInstrumentSymbol(instrId)
                : "UNKNOWN");
            const quantity = toNum(revoke.qty);
            const price = toNum((revoke as any).price);
            console.log(isPerp ? "Perp" : "Spot", "OrderRevoked:: ", event);

            tradeRecords.push({
              id: signature,
              timestamp: blockTs,
              section: this.formatSection(blockTs),
              symbol,
              side: "sell",
              instrument: symbol,
              entryPrice: price,
              exitPrice: price,
              quantity,
              amount: quantity,
              value: quantity * price,
              orderType: "revoke",
              clientId: toStr(revoke.clientId) || "unknown",
              orderId: toStr(revoke.orderId) || "unknown",
              transactionHash: signature,
              fees: { maker: 0, taker: 0, total: 0, rebates: 0 },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `${isPerp ? "Perp" : "Spot"} Order Revoked`,
              tradeType: isPerp ? "perp" : "spot",
              logType: isPerp ? "perpOrderRevoke" : "spotOrderRevoke",
              discriminator: tag,
            });
            break;
          }

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
