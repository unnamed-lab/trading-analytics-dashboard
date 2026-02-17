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
import { PerformanceAnalyzer } from "@/lib/analyzers/performance-analyzer";

// Define a type for decoded log messages
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
  | { tag: number; [key: string]: any }; // Fallback for unknown types

export interface PaginationOptions {
  /** Maximum number of transactions to fetch per page */
  limit?: number;
  /** Signature to start fetching from (for pagination) */
  before?: string;
  /** Signature to fetch until (for pagination) */
  until?: string;
}

export interface FetchResult {
  trades: TradeRecord[];
  hasMore: boolean;
  lastSignature?: string;
  totalProcessed: number;
}

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
    requestDelayMs: number = 300,
    maxTransactions: number = 1000,
  ) {
    this.rpc = createSolanaRpc(devnet(rpcUrl));
    this.requestDelayMs = requestDelayMs;
    this.maxTransactions = maxTransactions;
    this.programId = process.env.PROGRAM_ID!;

    if (programId) {
      this.programId = programId;
    }

    if (version) {
      this.version = version;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async initialize(walletPublicKey: PublicKey): Promise<void> {
    this.walletPublicKey = walletPublicKey;

    // Initialize DeRiverse Engine (adapter) with programId and version
    const adapter = new EngineAdapter(this.rpc, {
      programId: this.programId as any,
      version: this.version,
    });
    // If adapter created an underlying engine (e.g. real Engine or mocked Engine in tests), expose it
    this.engine = (adapter as any).engine ? (adapter as any).engine : adapter;

    try {
      await this.engine.initialize();
      await this.engine.setSigner(address(walletPublicKey.toString()));
      // Ensure engine client data is primed during initialization (helps tests/mocks)
      try {
        if (
          this.engine &&
          typeof (this.engine as any).getClientData === "function"
        ) {
          await (this.engine as any).getClientData();
        }
      } catch (e) {
        // ignore
      }
      this.engineInitialized = true;

      console.log("🔍 Initialized DeRiverse Trade Data Fetcher");
      console.log(`📝 Wallet: ${walletPublicKey.toString()}`);
      console.log(`🎯 Program ID: ${this.programId}`);
      console.log(`📋 Version: ${this.version}`);
    } catch (err: any) {
      console.warn(`⚠️  Engine initialization warning: ${err.message}`);
      console.warn(`   Continuing without full engine initialization...`);
      this.engineInitialized = false;
    }
  }

  /**
   * Fetch transactions with pagination support
   * @param options Pagination options
   * @returns FetchResult with trades and pagination info
   */
  /**
   * Fetch transactions with pagination support
   * @param options Pagination options
   * @returns FetchResult with trades and pagination info
   */
  async fetchTransactionsPaginated(
    options: PaginationOptions = {},
  ): Promise<FetchResult> {
    if (!this.walletPublicKey) {
      throw new Error("Wallet not initialized");
    }

    const limit = options.limit || 100;

    console.log("\n📊 Fetching transactions (paginated)...");
    console.log(`   Limit: ${limit}`);
    if (options.before) console.log(`   Before: ${options.before}`);
    if (options.until) console.log(`   Until: ${options.until}`);

    try {
      // Fetch signatures with pagination
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
        return {
          trades: [],
          hasMore: false,
          totalProcessed: 0,
        };
      }

      // If engine present, fetch client data early so analyzers can be primed
      if (
        this.engine &&
        typeof (this.engine as any).getClientData === "function"
      ) {
        try {
          await (this.engine as any).getClientData();
        } catch (err) {
          // ignore
        }
      }

      // Handle both array response and { value: [] } response
      const signatures = Array.isArray(signaturesResponse)
        ? signaturesResponse
        : signaturesResponse?.value || [];

      if (!signatures || signatures.length === 0) {
        console.log("❌ No transactions found");
        return {
          trades: [],
          hasMore: false,
          totalProcessed: 0,
        };
      }

      console.log(`✅ Found ${signatures.length} transactions`);

      // Filter for successful transactions AND get full transaction details to check program involvement
      const relevantSignatures = [];

      console.log(
        `\n🔍 Filtering transactions for program ID: ${this.programId}`,
      );

      for (const sigInfo of signatures) {
        // Skip failed transactions
        if (sigInfo.err !== null) continue;

        try {
          // Get transaction details to check if it involves our program
          const txResponse = await this.rpc
            .getTransaction(sigInfo.signature as Signature, {
              maxSupportedTransactionVersion: 0,
              encoding: "jsonParsed",
            })
            .send();

          const tx = (txResponse as any)?.value || txResponse;

          if (!tx) continue;

          // Check if transaction involves our program ID
          const involvesProgram = this.transactionInvolvesProgram(tx);

          if (involvesProgram) {
            relevantSignatures.push(sigInfo);
            console.log(
              `   ✅ ${sigInfo.signature.substring(0, 8)}... involves program`,
            );
          }

          // Add small delay to avoid rate limiting
          await this.delay(50);
        } catch (error) {
          console.log(
            `   ⚠️ Failed to check ${sigInfo.signature.substring(0, 8)}...`,
          );
          continue;
        }
      }

      console.log(
        `\n📊 Found ${relevantSignatures.length} program-related transactions out of ${signatures.length}`,
      );

      // Ensure engine client data is refreshed before processing transactions
      if (this.engineInitialized && this.engine) {
        try {
          await this.engine.getClientData();
        } catch (err) {
          // ignore
        }
      }

      const allTradeRecords: TradeRecord[] = [];
      let processedCount = 0;

      // Process each transaction
      for (const sigInfo of relevantSignatures) {
        processedCount++;

        if (processedCount % 5 === 0) {
          console.log(
            `   Progress: ${processedCount}/${relevantSignatures.length}`,
          );
        }

        try {
          const tradeRecords = await this.fetchAndParseTransaction(
            sigInfo.signature,
            sigInfo,
            allTradeRecords.length,
          );
          allTradeRecords.push(...tradeRecords);

          await this.delay(this.requestDelayMs);
        } catch (error: any) {
          console.warn(
            `   ⚠️ Failed to fetch tx ${sigInfo.signature.substring(0, 8)}: ${error.message}`,
          );
        }
      }

      console.log(`\n✅ Processed ${processedCount} transactions`);
      console.log(`   Extracted trades: ${allTradeRecords.length}`);

      // Determine if there are more results
      const hasMore = signatures.length > limit;
      const lastSignature =
        signatures.length > 0
          ? signatures[signatures.length - 1].signature
          : undefined;

      return {
        trades: allTradeRecords.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        ),
        hasMore,
        lastSignature,
        totalProcessed: processedCount,
      };
    } catch (error: any) {
      console.error("Error fetching transactions:", error.message);
      throw error;
    }
  }

  /**
   * Check if a transaction involves the program ID
   */
  private transactionInvolvesProgram(tx: any): boolean {
    if (!tx) return false;

    // Check transaction message accounts
    if (tx.transaction?.message?.accountKeys) {
      const accountKeys = tx.transaction.message.accountKeys;
      for (const account of accountKeys) {
        const accountStr =
          typeof account === "string" ? account : account.pubkey?.toString();
        if (accountStr === this.programId) {
          return true;
        }
      }
    }

    // Check transaction instructions
    if (tx.transaction?.message?.instructions) {
      for (const ix of tx.transaction.message.instructions) {
        // Check programId in instruction
        if (ix.programId?.toString() === this.programId) {
          return true;
        }

        // Check if it's a nested instruction (for CPI)
        if (ix.instructions) {
          for (const innerIx of ix.instructions) {
            if (innerIx.programId?.toString() === this.programId) {
              return true;
            }
          }
        }
      }
    }

    // Check log messages for program invocation
    if (tx.meta?.logMessages) {
      for (const log of tx.meta.logMessages) {
        if (log.includes(`Program ${this.programId} invoke`)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Also update the fetchAllTransactions method similarly
   */
  async fetchAllTransactions(): Promise<TradeRecord[]> {
    if (!this.walletPublicKey) {
      console.warn("Wallet not initialized");
      return [];
    }

    console.log("\n📊 Fetching all transactions...");
    console.log(`   Max transactions: ${this.maxTransactions}`);

    try {
      // Try multiple methods to fetch signatures
      let signaturesResponse: any;

      try {
        // Method 1: Try getSignaturesForAddress on the wallet
        console.log("\n🔍 Method 1: Fetching signatures for wallet...");
        signaturesResponse = await this.rpc
          .getSignaturesForAddress(address(this.walletPublicKey.toString()), {
            limit: this.maxTransactions,
          })
          .send();
      } catch (err1: any) {
        console.log("⚠️  Method 1 failed, trying with program ID...");
        // Method 2: Try querying by program ID
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

      // Handle both array response and { value: [] } response
      const signatures = Array.isArray(signaturesResponse)
        ? signaturesResponse
        : signaturesResponse?.value || [];

      if (!signatures || signatures.length === 0) {
        console.log("❌ No transactions found");
        return [];
      }

      console.log(`✅ Found ${signatures.length} transactions`);

      // Filter for successful transactions AND program involvement
      const relevantSignatures = [];

      console.log(
        `\n🔍 Filtering transactions for program ID: ${this.programId}`,
      );

      for (const sigInfo of signatures) {
        // Skip failed transactions
        if (sigInfo.err !== null) continue;

        try {
          const txResponse = await this.rpc
            .getTransaction(sigInfo.signature as Signature, {
              maxSupportedTransactionVersion: 0,
              encoding: "jsonParsed",
            })
            .send();

          const tx = (txResponse as any)?.value || txResponse;

          if (!tx) continue;

          if (this.transactionInvolvesProgram(tx)) {
            relevantSignatures.push(sigInfo);
          }

          await this.delay(50);
        } catch (error) {
          continue;
        }
      }

      console.log(
        `\n📊 Processing ${relevantSignatures.length} program-related transactions...`,
      );

      const allTradeRecords: TradeRecord[] = [];
      let processedCount = 0;

      // Process each transaction
      for (const sigInfo of relevantSignatures) {
        processedCount++;

        if (processedCount % 5 === 0) {
          console.log(
            `   Progress: ${processedCount}/${relevantSignatures.length}`,
          );
        }

        try {
          const tradeRecords = await this.fetchAndParseTransaction(
            sigInfo.signature,
            sigInfo,
            allTradeRecords.length,
          );
          allTradeRecords.push(...tradeRecords);

          await this.delay(this.requestDelayMs);
        } catch (error: any) {
          console.warn(
            `   ⚠️ Failed to fetch tx ${sigInfo.signature.substring(0, 8)}: ${error.message}`,
          );
        }
      }

      console.log(`\n✅ Processed ${processedCount} transactions`);
      console.log(`   Extracted trades: ${allTradeRecords.length}`);

      return allTradeRecords.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    } catch (error: any) {
      console.error("Error fetching transactions:", error.message);
      throw error;
    }
  }

  /**
   * Also update the extractInstrumentId method to be more robust
   */
  private extractInstrumentId(event: any): number | undefined {
    if (!event) return undefined;

    // Priority order of field names based on Deriverse kit
    const fieldPriority = [
      "crncy", // Spot/Perp fills
      "instrId", // Funding, SocLoss, other perp events
      "tokenId", // Deposits, withdrawals
      "instrumentId",
      "marketId",
      "baseCrncyId",
    ];

    for (const field of fieldPriority) {
      if (event[field] !== undefined && event[field] !== null) {
        let value = event[field];

        // Handle different value types
        if (typeof value === "object") {
          if (value?.toNumber) value = value.toNumber();
          else if (value?.toString) value = Number(value.toString());
          else continue;
        }

        // Convert to number
        const numValue = Number(value);
        if (isNaN(numValue)) continue;

        // Return the raw instrument ID without scaling
        // The instrument ID itself is not scaled, only monetary values are
        return numValue;
      }
    }

    // Try to extract from raw log as fallback
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

  /**
   * Fetch trades for a specific instrument from spot orders
   */
  async fetchTradesForInstrument(instrumentId: number): Promise<TradeRecord[]> {
    if (!this.engineInitialized || !this.engine) {
      console.warn("⚠️ Engine not initialized, cannot fetch instrument trades");
      return [];
    }

    try {
      const trades: TradeRecord[] = [];

      // Get client data for this instrument
      const clientData = await this.engine.getClientData();
      const spotData = clientData.spot?.get(instrumentId);

      if (!spotData) {
        return [];
      }

      // Get spot orders info
      const ordersInfo = await this.engine.getClientSpotOrdersInfo({
        instrId: instrumentId,
        clientId: clientData.clientId,
      });

      // Get spot orders
      const orders = await this.engine.getClientSpotOrders({
        instrId: instrumentId,
        bidsCount: ordersInfo.bidsCount,
        asksCount: ordersInfo.asksCount,
        bidsEntry: ordersInfo.bidsEntry,
        asksEntry: ordersInfo.asksEntry,
      });

      // Process bids (buy orders)
      if (orders.bids && Array.isArray(orders.bids)) {
        orders.bids.forEach((bid: any, index: number) => {
          trades.push({
            id: `spot-bid-${instrumentId}-${index}-${Date.now()}`,
            timestamp: new Date(),
            section: this.formatSection(new Date()),
            symbol: String(instrumentId),
            instrument: String(instrumentId),
            side: "buy",
            entryPrice: Number(bid.price) / 1e9,
            exitPrice: Number(bid.price) / 1e9,
            quantity: Number(bid.qty) / 1e9,
            amount: Number(bid.qty) / 1e9,
            value: (Number(bid.price) * Number(bid.qty)) / 1e18,
            orderType: bid.orderType === 1 ? "limit" : "market",
            clientId: spotData.clientId?.toString() || "unknown",
            orderId: bid.orderId?.toString() || "unknown",
            transactionHash: "spot-order",
            fees: {
              maker: 0,
              taker: 0,
              total: 0,
              rebates: 0,
            },
            pnl: 0,
            pnlPercentage: 0,
            duration: 0,
            status: "open",
            notes: `Spot ${bid.orderType === 1 ? "Limit" : "Market"} Buy Order`,
            tradeType: "spot",
            logType: "SpotOrder",
            discriminator: 10,
          });
        });
      }

      // Process asks (sell orders)
      if (orders.asks && Array.isArray(orders.asks)) {
        orders.asks.forEach((ask: any, index: number) => {
          trades.push({
            id: `spot-ask-${instrumentId}-${index}-${Date.now()}`,
            timestamp: new Date(),
            section: this.formatSection(new Date()),
            symbol: String(instrumentId),
            instrument: String(instrumentId),
            side: "sell",
            entryPrice: Number(ask.price) / 1e9,
            exitPrice: Number(ask.price) / 1e9,
            quantity: Number(ask.qty) / 1e9,
            amount: Number(ask.qty) / 1e9,
            value: (Number(ask.price) * Number(ask.qty)) / 1e18,
            orderType: ask.orderType === 1 ? "limit" : "market",
            clientId: spotData.clientId?.toString() || "unknown",
            orderId: ask.orderId?.toString() || "unknown",
            transactionHash: "spot-order",
            fees: {
              maker: 0,
              taker: 0,
              total: 0,
              rebates: 0,
            },
            pnl: 0,
            pnlPercentage: 0,
            duration: 0,
            status: "open",
            notes: `Spot ${ask.orderType === 1 ? "Limit" : "Market"} Sell Order`,
            tradeType: "spot",
            logType: "SpotOrder",
            discriminator: 10,
          });
        });
      }

      return trades;
    } catch (error: any) {
      console.error(
        `Error fetching trades for instrument ${instrumentId}:`,
        error.message,
      );
      return [];
    }
  }

  private async fetchAndParseTransaction(
    signature: string,
    sigInfo: any,
    startCounter: number,
  ): Promise<TradeRecord[]> {
    const tradeRecords: TradeRecord[] = [];

    try {
      // Get full transaction details
      const txResponse = await this.rpc
        .getTransaction(signature as Signature, {
          maxSupportedTransactionVersion: 0,
          encoding: "jsonParsed",
        })
        .send();

      const tx = (txResponse as any)?.value || txResponse;

      if (!tx) {
        return tradeRecords;
      }

      const logMessages = tx.meta?.logMessages || [];
      if (logMessages.length === 0) return tradeRecords;

      // Decode logs using the engine
      const decodedEvents: DecodedLogMessage[] = [];

      if (this.engineInitialized && this.engine) {
        try {
          const allDecoded = await (this.engine as any).logsDecode(logMessages);
          if (
            allDecoded &&
            Array.isArray(allDecoded) &&
            allDecoded.length > 0
          ) {
            decodedEvents.push(...allDecoded);
          }
        } catch (decodeErr) {
          // Use fallback
        }
      }

      // Process all decoded events
      for (const event of decodedEvents) {
        const tag = event.tag;

        switch (tag) {
          case 1: // Deposit
          case LogType.deposit: {
            const deposit = event as DepositReportModel;
            const tokenSymbol = this.getTokenSymbol(deposit.tokenId);
            const amount = Number(deposit.amount) / 1e9; // Scale down

            tradeRecords.push({
              id: `deposit-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime
                ? new Date(Number(sigInfo.blockTime) * 1000)
                : new Date(),
              section: this.formatSection(
                sigInfo.blockTime
                  ? new Date(Number(sigInfo.blockTime) * 1000)
                  : new Date(),
              ),
              symbol: tokenSymbol,
              side: "buy",
              instrument: `${tokenSymbol}/USD`,
              entryPrice: 0,
              exitPrice: 0,
              quantity: amount,
              amount: amount,
              value: 0,
              orderType: "deposit",
              clientId: deposit.clientId?.toString() || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: 0,
                rebates: 0,
              },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Deposit ${amount} ${tokenSymbol}`,
              tradeType: "spot",
              logType: "deposit",
              discriminator: tag,
            });
            break;
          }

          case 3: // Perp Deposit
          case LogType.perpDeposit: {
            const perpDeposit = event as any;
            const instrumentSymbol = this.getInstrumentSymbol(
              perpDeposit.instrId,
            );
            const amount = Number(perpDeposit.amount) / 1e9;

            tradeRecords.push({
              id: `perp-deposit-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime
                ? new Date(Number(sigInfo.blockTime) * 1000)
                : new Date(),
              section: this.formatSection(
                sigInfo.blockTime
                  ? new Date(Number(sigInfo.blockTime) * 1000)
                  : new Date(),
              ),
              symbol: instrumentSymbol,
              side: "buy",
              instrument: instrumentSymbol,
              entryPrice: 0,
              exitPrice: 0,
              quantity: amount,
              amount: amount,
              value: 0,
              orderType: "deposit",
              clientId: perpDeposit.clientId?.toString() || "unknown",
              orderId: "N/A",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: 0,
                rebates: 0,
              },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `Perp Deposit ${amount} to ${instrumentSymbol}`,
              tradeType: "perp",
              logType: "perpDeposit",
              discriminator: tag,
            });
            break;
          }

          case 10: // Spot Place Order
          case LogType.spotPlaceOrder: {
            const placeOrder = event as any;
            const instrumentSymbol = this.getInstrumentSymbol(
              placeOrder.instrId,
            );
            const side = placeOrder.side === 0 ? "buy" : "sell";
            const quantity = Number(placeOrder.qty) / 1e9;
            const price = placeOrder.price; // Already scaled by engine

            tradeRecords.push({
              id: `place-order-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime
                ? new Date(Number(sigInfo.blockTime) * 1000)
                : new Date(),
              section: this.formatSection(
                sigInfo.blockTime
                  ? new Date(Number(sigInfo.blockTime) * 1000)
                  : new Date(),
              ),
              symbol: instrumentSymbol,
              side: side as "buy" | "sell",
              instrument: instrumentSymbol,
              entryPrice: price,
              exitPrice: price,
              quantity: quantity,
              amount: quantity,
              value: price * quantity,
              orderType: placeOrder.orderType === 1 ? "limit" : "market",
              clientId: placeOrder.clientId?.toString() || "unknown",
              orderId: placeOrder.orderId?.toString() || "unknown",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: 0,
                rebates: 0,
              },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "open",
              notes: `Place ${side === "buy" ? "Buy" : "Sell"} Order for ${quantity} ${instrumentSymbol} @ ${price}`,
              tradeType: "spot",
              logType: "spotPlaceOrder",
              discriminator: tag,
            });
            break;
          }

          case 11: // Spot Fill (Trade)
          case LogType.spotFillOrder: {
            const fill = event as SpotFillOrderReportModel;
            const instrumentSymbol = this.getInstrumentSymbol(fill.crncy);
            const side = fill.side === 0 ? "buy" : "sell";
            const quantity = Number(fill.qty) / 1e9;
            const price = fill.price; // Already scaled by engine
            const rebates = fill.rebates ? -Number(fill.rebates) / 1e9 : 0;

            tradeRecords.push({
              id: `trade-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime
                ? new Date(Number(sigInfo.blockTime) * 1000)
                : new Date(),
              section: this.formatSection(
                sigInfo.blockTime
                  ? new Date(Number(sigInfo.blockTime) * 1000)
                  : new Date(),
              ),
              symbol: instrumentSymbol,
              side: side as "buy" | "sell",
              instrument: instrumentSymbol,
              entryPrice: price,
              exitPrice: price,
              quantity: quantity,
              amount: quantity,
              value: price * quantity,
              orderType: "market",
              clientId: fill.clientId?.toString() || "unknown",
              orderId: fill.orderId?.toString() || "unknown",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: rebates,
                rebates: rebates,
              },
              pnl: 0,
              pnlPercentage: 0,
              duration: 0,
              status: "breakeven",
              notes: `${side === "buy" ? "Bought" : "Sold"} ${quantity} ${instrumentSymbol} @ ${price}`,
              tradeType: "spot",
              logType: "spotFillOrder",
              discriminator: tag,
            });
            break;
          }

          case 12: // Spot New Order
          case LogType.spotNewOrder: {
            const newOrder = event as any;
            const side = newOrder.side === 0 ? "buy" : "sell";
            const quantity = Number(newOrder.qty) / 1e9;
            const crncy = Number(newOrder.crncy) / 1e9;

            tradeRecords.push({
              id: `new-order-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime
                ? new Date(Number(sigInfo.blockTime) * 1000)
                : new Date(),
              section: this.formatSection(
                sigInfo.blockTime
                  ? new Date(Number(sigInfo.blockTime) * 1000)
                  : new Date(),
              ),
              symbol: "SOL/USDC", // You might want to derive this from context
              side: side as "buy" | "sell",
              instrument: "SOL/USDC",
              entryPrice: crncy / quantity,
              exitPrice: crncy / quantity,
              quantity: quantity,
              amount: quantity,
              value: crncy,
              orderType: "new",
              clientId: "unknown",
              orderId: "unknown",
              transactionHash: signature,
              fees: {
                maker: 0,
                taker: 0,
                total: 0,
                rebates: 0,
              },
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

          case 15: // Spot Fees
          case LogType.spotFees: {
            const fees = event as SpotFeesReportModel;
            const feeAmount = Number(fees.fees) / 1e9;
            const refPayment = Number(fees.refPayment) / 1e9;

            tradeRecords.push({
              id: `fees-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime
                ? new Date(Number(sigInfo.blockTime) * 1000)
                : new Date(),
              section: this.formatSection(
                sigInfo.blockTime
                  ? new Date(Number(sigInfo.blockTime) * 1000)
                  : new Date(),
              ),
              symbol: "USDC",
              side: "sell",
              instrument: "Fees",
              entryPrice: 0,
              exitPrice: 0,
              quantity: feeAmount,
              amount: feeAmount,
              value: feeAmount,
              orderType: "fee",
              clientId: fees.refClientId?.toString() || "unknown",
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
              status: "loss",
              notes: `Trading Fees: ${feeAmount} USDC, Ref Payment: ${refPayment}`,
              tradeType: "spot",
              logType: "spotFees",
              discriminator: tag,
            });
            break;
          }
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

  // Add these helper methods to your class
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
    return tokenMap[tokenId] || `TOKEN-${tokenId}`;
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
    return instrumentMap[instrId] || `INSTR-${instrId}`;
  }

  private parseRawLog(
    log: string,
    signature: string,
    sigInfo: any,
    counter: number,
  ): TradeRecord | null {
    const lowerLog = log.toLowerCase();
    const timestamp = sigInfo.blockTime
      ? new Date(Number(sigInfo.blockTime) * 1000)
      : new Date();

    // Attempt to extract side from explicit numeric field like `side: 0` or by keywords
    let side: string = "unknown";
    const sideMatch = lowerLog.match(/side\s*[:=]\s*(\d+)/i);
    if (sideMatch) {
      const sideNum = Number(sideMatch[1]);
      side = sideNum === 0 ? "buy" : sideNum === 1 ? "sell" : "unknown";
    } else {
      side =
        lowerLog.includes("buy") || lowerLog.includes("long")
          ? "buy"
          : lowerLog.includes("sell") || lowerLog.includes("short")
            ? "sell"
            : "unknown";
    }

    const priceMatch = log.match(/price[=:]\s*([\d.]+)/i);
    const sizeMatch =
      log.match(/size[=:]\s*([\d.]+)/i) || log.match(/qty[=:]\s*([\d.]+)/i);
    const feeMatch = log.match(/fee[=:]\s*([\d.]+)/i);
    const amountMatch = log.match(/amount[=:]\s*([\d.]+)/i);

    // Try to extract instrument ID
    const instrMatch = log.match(/instrId[=:]\s*(\d+)/i);
    const symbol = instrMatch ? parseInt(instrMatch[1]).toString() : "UNKNOWN";
    const instrument = instrMatch
      ? parseInt(instrMatch[1]).toString()
      : "UNKNOWN";

    const quantity = sizeMatch
      ? parseFloat(sizeMatch[1])
      : amountMatch
        ? parseFloat(amountMatch[1])
        : 0;

    // Scale down if it looks like a large number (likely in lamports/1e9)
    const scaledQuantity = quantity > 1e9 ? quantity / 1e9 : quantity;
    const scaledPrice =
      priceMatch && parseFloat(priceMatch[1]) > 1e9
        ? parseFloat(priceMatch[1]) / 1e9
        : priceMatch
          ? parseFloat(priceMatch[1])
          : 0;

    return {
      id: `raw-${counter}-${signature.substring(0, 8)}`,
      timestamp,
      section: this.formatSection(timestamp),
      symbol,
      side: side as "buy" | "sell",
      entryPrice: scaledPrice,
      exitPrice: scaledPrice,
      quantity: scaledQuantity,
      amount: scaledQuantity,
      value: scaledPrice * scaledQuantity,
      orderType: "unknown",
      instrument,
      clientId: "unknown",
      orderId: "unknown",
      transactionHash: signature,
      fees: {
        maker: 0,
        taker: 0,
        total: feeMatch ? parseFloat(feeMatch[1]) : 0,
        rebates: 0,
      },
      pnl: 0,
      pnlPercentage: 0,
      duration: 0,
      status: "breakeven",
      notes: "Parsed from raw log",
      tradeType: lowerLog.includes("perp") ? "perp" : "spot",
      rawLogMessage: log,
    };
  }

  private parseDecodedLog(
    log: DecodedLogMessage,
    signature: string,
    blockTime: number | null,
    counter: number,
  ): TradeRecord | null {
    const timestamp = blockTime ? new Date(blockTime * 1000) : new Date();
    const tag = log.tag;

    // Get log type name safely
    let logTypeName = "Unknown";
    for (const key in LogType) {
      if (typeof key === "string" && !key.match(/^\d/)) {
        const value = (LogType as any)[key];
        if (value === tag) {
          logTypeName = key;
          break;
        }
      }
    }

    // Check if this is a trade event (using numeric comparison)
    const isTradeEvent =
      tag === 11 ||
      tag === 19 ||
      tag === LogType.spotFillOrder ||
      tag === LogType.perpFillOrder ||
      (log as any).price !== undefined ||
      (log as any).qty !== undefined ||
      (log as any).perps !== undefined;

    if (!isTradeEvent) {
      return null;
    }

    const section = this.formatSection(timestamp);

    // Scale values
    const scaleValue = (value: any): number => {
      if (!value) return 0;
      const num = Number(value);
      return num > 1e9 ? num / 1e9 : num;
    };

    // Handle different event types by their numeric tag
    switch (tag) {
      case 11: // Spot fill
      case LogType.spotFillOrder: {
        const spotFill = log as SpotFillOrderReportModel;
        const isBuy = spotFill.side === 0;
        const quantity = scaleValue(spotFill.qty || 0);
        const price = scaleValue(spotFill.price || 0);
        const value = scaleValue(spotFill.crncy || 0);
        const rebates = spotFill.rebates ? -Number(spotFill.rebates) / 1e9 : 0;

        const instrumentId =
          this.extractInstrumentId(spotFill) ?? spotFill.crncy;

        return {
          id: `spot-fill-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: String(instrumentId),
          instrument: String(instrumentId),
          side: isBuy ? "buy" : "sell",
          entryPrice: price,
          exitPrice: price,
          quantity,
          amount: quantity,
          value: value || price * quantity,
          orderType: "market",
          clientId: spotFill.clientId?.toString() || "unknown",
          orderId: spotFill.orderId?.toString() || "unknown",
          transactionHash: signature,
          fees: {
            maker: 0,
            taker: 0,
            total: rebates,
            rebates: rebates,
          },
          pnl: 0,
          pnlPercentage: 0,
          duration: 0,
          status: "breakeven",
          notes: `Spot ${isBuy ? "Buy" : "Sell"} Fill`,
          tradeType: "spot",
          logType: logTypeName,
          discriminator: tag,
        };
      }

      case 19: // Perp fill
      case LogType.perpFillOrder: {
        const perpFill = log as PerpFillOrderReportModel;
        const isLong = perpFill.side === 0;
        const quantity = scaleValue(perpFill.perps || 0);
        const price = scaleValue(perpFill.price || 0);
        const value = scaleValue(perpFill.crncy || 0);
        const rebates = perpFill.rebates ? -Number(perpFill.rebates) / 1e9 : 0;

        const instrumentId =
          this.extractInstrumentId(perpFill) ?? perpFill.crncy;
        return {
          id: `perp-fill-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: instrumentId.toString(),
          instrument: instrumentId.toString(),
          side: isLong ? "long" : "short",
          entryPrice: price,
          exitPrice: price,
          quantity,
          amount: quantity,
          value: value || price * quantity,
          orderType: "market",
          clientId: perpFill.clientId?.toString() || "unknown",
          orderId: perpFill.orderId?.toString() || "unknown",
          transactionHash: signature,
          fees: {
            maker: 0,
            taker: 0,
            total: rebates,
            rebates: rebates,
          },
          pnl: 0,
          pnlPercentage: 0,
          duration: 0,
          status: "breakeven",
          notes: `Perp ${isLong ? "Long" : "Short"} Fill`,
          tradeType: "perp",
          logType: logTypeName,
          discriminator: tag,
        };
      }

      case LogType.perpFunding: {
        const funding = log as PerpFundingReportModel;
        const isReceived = funding.funding > 0;
        const fundingValue = scaleValue(funding.funding || 0);

        const instrumentId =
          this.extractInstrumentId(funding) ?? funding.instrId;

        return {
          id: `funding-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: instrumentId.toString(),
          instrument: instrumentId.toString(),
          side: isReceived ? "long" : "short",
          entryPrice: 0,
          exitPrice: 0,
          quantity: 0,
          amount: Math.abs(fundingValue),
          value: Math.abs(fundingValue),
          orderType: "unknown",
          clientId: funding.clientId?.toString() || "unknown",
          orderId: "N/A",
          transactionHash: signature,
          fees: {
            maker: 0,
            taker: 0,
            total: 0,
            rebates: 0,
          },
          pnl: fundingValue,
          pnlPercentage: 0,
          duration: 0,
          status: fundingValue > 0 ? "win" : "loss",
          notes: `${fundingValue > 0 ? "Received" : "Paid"} Funding`,
          tradeType: "perp",
          fundingPayments: fundingValue,
          logType: logTypeName,
          discriminator: tag,
        };
      }

      case LogType.perpSocLoss: {
        const socLoss = log as PerpSocLossReportModel;
        const lossValue = scaleValue(socLoss.socLoss || 0);

        return {
          id: `socloss-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: socLoss.instrId?.toString(),
          side: "short",
          entryPrice: 0,
          exitPrice: 0,
          quantity: 0,
          amount: Math.abs(lossValue),
          value: Math.abs(lossValue),
          orderType: "unknown",
          instrument: socLoss.instrId?.toString(),
          clientId: socLoss.clientId?.toString() || "unknown",
          orderId: "N/A",
          transactionHash: signature,
          fees: {
            maker: 0,
            taker: 0,
            total: 0,
            rebates: 0,
          },
          pnl: -lossValue,
          pnlPercentage: 0,
          duration: 0,
          status: "loss",
          notes: "Socialized Loss",
          tradeType: "perp",
          socializedLoss: lossValue,
          logType: logTypeName,
          discriminator: tag,
        };
      }

      case LogType.spotOrderRevoke:
      case LogType.perpOrderRevoke: {
        const revoke = log as SpotOrderRevokeReportModel;
        const isPerp = tag === LogType.perpOrderRevoke;
        const quantity = scaleValue(revoke.qty || 0);
        const price = scaleValue((revoke as any).price || 0);

        return {
          id: `order-revoke-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: (log as any)?.instrId,
          side: "sell",
          entryPrice: price,
          exitPrice: price,
          quantity,
          amount: quantity,
          value: quantity * price,
          orderType: "revoke",
          instrument: (log as any).instrId,
          clientId: revoke.clientId?.toString() || "unknown",
          orderId: revoke.orderId?.toString() || "unknown",
          transactionHash: signature,
          fees: {
            maker: 0,
            taker: 0,
            total: 0,
            rebates: 0,
          },
          pnl: 0,
          pnlPercentage: 0,
          duration: 0,
          status: "breakeven",
          notes: `${isPerp ? "Perp" : "Spot"} Order Revoke`,
          tradeType: isPerp ? "perp" : "spot",
          logType: logTypeName,
          discriminator: tag,
        };
      }

      case LogType.deposit:
      case LogType.withdraw: {
        const depositWithdraw = log as DepositReportModel | WithdrawReportModel;
        const isDeposit = tag === LogType.deposit;
        const amount = scaleValue(depositWithdraw.amount || 0);

        return {
          id: `${isDeposit ? "deposit" : "withdraw"}-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: String(depositWithdraw.tokenId),
          side: isDeposit ? "buy" : "sell",
          entryPrice: 0,
          exitPrice: 0,
          quantity: amount,
          amount: amount,
          value: amount,
          orderType: "unknown",
          instrument: `${String(depositWithdraw.tokenId)}/USD`,
          clientId: depositWithdraw.clientId?.toString() || "unknown",
          orderId: "N/A",
          transactionHash: signature,
          fees: {
            maker: 0,
            taker: 0,
            total: 0,
            rebates: 0,
          },
          pnl: 0,
          pnlPercentage: 0,
          duration: 0,
          status: "breakeven",
          notes: isDeposit ? "Deposit" : "Withdrawal",
          tradeType: "spot",
          logType: logTypeName,
          discriminator: tag,
        };
      }

      default:
        return null;
    }
  }

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
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  // Exposed helper for tests: resolve instrument details using engine/instruments or token registry
  async resolveInstrumentDetails(instrId?: number) {
    const result: any = {
      symbol: `INSTR-${instrId}`,
      base: "UNKNOWN",
      quote: "UNKNOWN",
    };

    try {
      if (
        this.engine &&
        this.engine.instruments &&
        typeof this.engine.instruments.get === "function"
      ) {
        const meta = this.engine.instruments.get(instrId as any);
        if (meta && meta.header) {
          const header = meta.header as any;
          // Prefer asset/quote mints
          if (header.assetMint && header.crncyMint) {
            // Try to resolve token symbols from engine.tokens map
            const baseMint = header.assetMint;
            const quoteMint = header.crncyMint;
            let base = "UNKNOWN";
            let quote = "UNKNOWN";

            if (this.engine.tokens && this.engine.tokens instanceof Map) {
              const baseToken = this.engine.tokens.get(baseMint);
              const quoteToken = this.engine.tokens.get(quoteMint);
              base = typeof baseToken === "string" ? baseToken : base;
              quote = typeof quoteToken === "string" ? quoteToken : quote;
            }

            // Fallback to TokenListProvider
            if (base === "UNKNOWN" || quote === "UNKNOWN") {
              try {
                // dynamic import to reuse existing mocks in tests
                const {
                  TokenListProvider,
                  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
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
              } catch (err) {
                // ignore
              }
            }

            result.symbol = `${base}/${quote}`;
            result.base = base;
            result.quote = quote;
            return result;
          }
          if (header.assetTokenId && header.crncyTokenId) {
            // map numeric token ids to symbols if possible
            const base =
              (this.engine.tokens &&
                this.engine.tokens.get(header.assetTokenId)) ||
              `TOKEN-${header.assetTokenId}`;
            const quote =
              (this.engine.tokens &&
                this.engine.tokens.get(header.crncyTokenId)) ||
              `TOKEN-${header.crncyTokenId}`;
            result.symbol = `${base}/${quote}`;
            result.base = base;
            result.quote = quote;
            return result;
          }
        }
      }
    } catch (err) {
      // ignore and fallback
    }

    return result;
  }

  // Export to CSV
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
          record.status,
          `"${record.notes || ""}"`,
        ].join(","),
      );
    }

    return csvRows.join("\n");
  }

  // Export to JSON
  exportToJSON(tradeRecords: TradeRecord[]): string {
    return JSON.stringify(tradeRecords, null, 2);
  }

  // Get summary statistics
  getSummary(tradeRecords: TradeRecord[]): any {
    const spotTrades = tradeRecords.filter((t) => t.tradeType === "spot");
    const perpTrades = tradeRecords.filter((t) => t.tradeType === "perp");
    const fills = tradeRecords.filter(
      (t) =>
        t.logType?.includes("FillOrder") ||
        t.logType?.includes("SpotFillOrder") ||
        t.logType?.includes("PerpFillOrder") ||
        t.discriminator === 11 ||
        t.discriminator === 19 ||
        t.discriminator === LogType.spotFillOrder ||
        t.discriminator === LogType.perpFillOrder,
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
        tradeRecords.reduce((sum, t) => sum + t.fees.total, 0).toFixed(2),
      ),
      totalRebates: parseFloat(
        tradeRecords
          .reduce((sum, t) => sum + (t.fees.rebates || 0), 0)
          .toFixed(2),
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

    summary["netPnl"] = tradeRecords.reduce((sum, t) => sum + t.pnl, 0);
    summary["netFees"] = parseFloat(
      (summary.totalFees - summary.totalRebates).toFixed(2),
    );

    return summary;
  }
}
