/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import {
  Signature,
  address, 
  createSolanaRpc, 
  devnet,
} from "@solana/kit";
import { PublicKey } from '@solana/web3.js';
import { 
  Engine, 
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
  PerpOrderRevokeReportModel
} from "@deriverse/kit";
import { TradeRecord } from "@/types";


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
  private engine: Engine | null = null;
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
    maxTransactions: number = 1000
  ) {
    this.rpc = createSolanaRpc(devnet(rpcUrl));
    this.requestDelayMs = requestDelayMs;
    this.maxTransactions = maxTransactions;
    this.programId = process.env.PROGRAM_ID!
    
    if (programId) {
      this.programId = programId;
    }
    
    if (version) {
      this.version = version;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initialize(walletPublicKey: PublicKey): Promise<void> {
    this.walletPublicKey = walletPublicKey;
    
    // Initialize DeRiverse Engine with programId and version
    this.engine = new Engine(this.rpc, { 
      programId: this.programId as any, 
      version: this.version 
    });
    
    try {
      await this.engine.initialize();
      await this.engine.setSigner(address(walletPublicKey.toString()));
      this.engineInitialized = true;
      
      console.log('🔍 Initialized DeRiverse Trade Data Fetcher');
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
  async fetchTransactionsPaginated(options: PaginationOptions = {}): Promise<FetchResult> {
    if (!this.walletPublicKey) {
      throw new Error('Wallet not initialized');
    }

    const limit = options.limit || 100;
    
    console.log('\n📊 Fetching transactions (paginated)...');
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
        console.log('\n🔍 Fetching signatures for wallet...');
        signaturesResponse = await this.rpc.getSignaturesForAddress(
          address(this.walletPublicKey.toString()),
          requestOptions
        ).send();
      } catch (err1: any) {
        console.log("⚠️  Failed to fetch signatures");
        console.error(`  Error: ${err1.message}`);
        return {
          trades: [],
          hasMore: false,
          totalProcessed: 0
        };
      }
      
      // Handle both array response and { value: [] } response
      const signatures = Array.isArray(signaturesResponse) 
        ? signaturesResponse 
        : (signaturesResponse?.value || []);
      
      if (!signatures || signatures.length === 0) {
        console.log("❌ No transactions found");
        return {
          trades: [],
          hasMore: false,
          totalProcessed: 0
        };
      }
      
      console.log(`✅ Found ${signatures.length} transactions`);
      
      // Filter for successful transactions
      const successfulSignatures = signatures.filter((sig: any) => {
        return sig.err === null;
      });
      
      console.log(`📊 Processing ${successfulSignatures.length} successful transactions...`);
      
      const allTradeRecords: TradeRecord[] = [];
      let processedCount = 0;
      
      // Process each transaction
      for (const sigInfo of successfulSignatures) {
        processedCount++;
        
        if (processedCount % 5 === 0) {
          console.log(`   Progress: ${processedCount}/${successfulSignatures.length}`);
        }

        try {
          const tradeRecords = await this.fetchAndParseTransaction(
            sigInfo.signature, 
            sigInfo,
            allTradeRecords.length
          );
          allTradeRecords.push(...tradeRecords);

          await this.delay(this.requestDelayMs);
        } catch (error: any) {
          console.warn(`   ⚠️ Failed to fetch tx ${sigInfo.signature.substring(0, 8)}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Processed ${processedCount} transactions`);
      console.log(`   Extracted trades: ${allTradeRecords.length}`);
      
      // Determine if there are more results
      const hasMore = signatures.length >= limit;
      const lastSignature = signatures.length > 0 ? signatures[signatures.length - 1].signature : undefined;
      
      return {
        trades: allTradeRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        hasMore,
        lastSignature,
        totalProcessed: processedCount
      };
    } catch (error: any) {
      console.error('Error fetching transactions:', error.message);
      throw error;
    }
  }

  async fetchAllTransactions(): Promise<TradeRecord[]> {
    if (!this.walletPublicKey) {
      throw new Error('Wallet not initialized');
    }

    console.log('\n📊 Fetching all transactions...');
    console.log(`   Max transactions: ${this.maxTransactions}`);

    try {
      // Try multiple methods to fetch signatures
      let signaturesResponse: any;
      
      try {
        // Method 1: Try getSignaturesForAddress on the wallet
        console.log('\n🔍 Method 1: Fetching signatures for wallet...');
        signaturesResponse = await this.rpc.getSignaturesForAddress(
          address(this.walletPublicKey.toString()),
          { limit: this.maxTransactions }
        ).send();
      } catch (err1: any) {
        console.log("⚠️  Method 1 failed, trying with program ID...");
        // Method 2: Try querying by program ID
        try {
          signaturesResponse = await this.rpc.getSignaturesForAddress(
            address(this.programId),
            { limit: this.maxTransactions }
          ).send();
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
        : (signaturesResponse?.value || []);
      
      if (!signatures || signatures.length === 0) {
        console.log("❌ No transactions found");
        return [];
      }
      
      console.log(`✅ Found ${signatures.length} transactions`);
      
      // Filter for successful transactions
      const successfulSignatures = signatures.filter((sig: any) => {
        return sig.err === null;
      });
      
      console.log(`📊 Processing ${successfulSignatures.length} successful transactions...`);
      
      const allTradeRecords: TradeRecord[] = [];
      let processedCount = 0;
      
      // Process each transaction
      for (const sigInfo of successfulSignatures) {
        processedCount++;
        
        if (processedCount % 5 === 0) {
          console.log(`   Progress: ${processedCount}/${successfulSignatures.length}`);
        }

        try {
          const tradeRecords = await this.fetchAndParseTransaction(
            sigInfo.signature, 
            sigInfo,
            allTradeRecords.length
          );
          allTradeRecords.push(...tradeRecords);

          await this.delay(this.requestDelayMs);
        } catch (error: any) {
          console.warn(`   ⚠️ Failed to fetch tx ${sigInfo.signature.substring(0, 8)}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Processed ${processedCount} transactions`);
      console.log(`   Extracted trades: ${allTradeRecords.length}`);
      
      return allTradeRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error: any) {
      console.error('Error fetching transactions:', error.message);
      throw error;
    }
  }

  /**
   * Fetch trades for a specific instrument from spot orders
   */
  async fetchTradesForInstrument(instrumentId: number): Promise<TradeRecord[]> {
    if (!this.engineInitialized || !this.engine) {
      console.warn('⚠️ Engine not initialized, cannot fetch instrument trades');
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
      const ordersInfo = await this.engine.getClientSpotOrdersInfo({instrId: instrumentId, clientId: clientData.clientId});
      
      // Get spot orders
      const orders = await this.engine.getClientSpotOrders(
        {
            instrId: instrumentId, 
            bidsCount: ordersInfo.bidsCount,
            asksCount: ordersInfo.asksCount,
            bidsEntry: ordersInfo.bidsEntry,
            asksEntry: ordersInfo.asksEntry
        });     
      
      // Process bids (buy orders)
      if (orders.bids && Array.isArray(orders.bids)) {
        orders.bids.forEach((bid: any, index: number) => {
          trades.push({
            id: `spot-bid-${instrumentId}-${index}-${Date.now()}`,
            timestamp: new Date(),
            section: this.formatSection(new Date()),
            symbol: this.getSymbolFromInstrId(instrumentId),
            instrument: this.getInstrumentFromInstrId(instrumentId),
            side: 'buy',
            entryPrice: Number(bid.price) / 1e9,
            exitPrice: Number(bid.price) / 1e9,
            quantity: Number(bid.qty) / 1e9,
            amount: Number(bid.qty) / 1e9,
            value: (Number(bid.price) * Number(bid.qty)) / 1e18,
            orderType: bid.orderType === 1 ? 'limit' : 'market',
            clientId: spotData.clientId?.toString() || 'unknown',
            orderId: bid.orderId?.toString() || 'unknown',
            transactionHash: 'spot-order',
            fees: {
              maker: 0,
              taker: 0,
              total: 0,
              rebates: 0,
            },
            pnl: 0,
            pnlPercentage: 0,
            duration: 0,
            status: 'open',
            notes: `Spot ${bid.orderType === 1 ? 'Limit' : 'Market'} Buy Order`,
            tradeType: 'spot',
            logType: 'SpotOrder',
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
            symbol: this.getSymbolFromInstrId(instrumentId),
            instrument: this.getInstrumentFromInstrId(instrumentId),
            side: 'sell',
            entryPrice: Number(ask.price) / 1e9,
            exitPrice: Number(ask.price) / 1e9,
            quantity: Number(ask.qty) / 1e9,
            amount: Number(ask.qty) / 1e9,
            value: (Number(ask.price) * Number(ask.qty)) / 1e18,
            orderType: ask.orderType === 1 ? 'limit' : 'market',
            clientId: spotData.clientId?.toString() || 'unknown',
            orderId: ask.orderId?.toString() || 'unknown',
            transactionHash: 'spot-order',
            fees: {
              maker: 0,
              taker: 0,
              total: 0,
              rebates: 0,
            },
            pnl: 0,
            pnlPercentage: 0,
            duration: 0,
            status: 'open',
            notes: `Spot ${ask.orderType === 1 ? 'Limit' : 'Market'} Sell Order`,
            tradeType: 'spot',
            logType: 'SpotOrder',
            discriminator: 10,
          });
        });
      }
      
      return trades;
    } catch (error: any) {
      console.error(`Error fetching trades for instrument ${instrumentId}:`, error.message);
      return [];
    }
  }


  private async fetchAndParseTransaction(
    signature: string, 
    sigInfo: any, 
    startCounter: number
  ): Promise<TradeRecord[]> {
    const tradeRecords: TradeRecord[] = [];
    
    try {
      // Get full transaction details - use same encoding as standalone function
      const txResponse = await this.rpc.getTransaction(
        signature as Signature,
        {
          maxSupportedTransactionVersion: 0,
          encoding: 'jsonParsed'
        }
      ).send();
      
      // Handle both direct response and { value: ... } response
      const tx = (txResponse as any)?.value || txResponse;
      
      if (!tx) {
        console.log(`⚠️  No transaction data for signature: ${signature.substring(0, 16)}...`);
        return tradeRecords;
      }

      const logMessages = tx.meta?.logMessages || [];
      
      if (logMessages.length === 0) return tradeRecords;
      
      // Extract Base64 "Program data" strings from logs
      const programDataLogs: string[] = [];
      for (const log of logMessages) {
        const programDataMatch = log.match(/Program data:\s*([A-Za-z0-9+/=]+)/i);
        if (programDataMatch) {
          programDataLogs.push(programDataMatch[1]);
        }
      }
      
      // Decode Base64 program data using the engine's logsDecode method
      const decodedEvents: DecodedLogMessage[] = [];
      
      // Only try to decode if engine is initialized
      if (this.engineInitialized && this.engine) {
        if (programDataLogs.length > 0) {
          console.log(`\n🔍 Found ${programDataLogs.length} Program data entries for ${signature.substring(0, 16)}...`);
          
          try {
            console.log(`   🔓 Attempting to decode all logs using logsDecode...`);
            const allDecoded = await (this.engine as any).logsDecode(logMessages);
            if (allDecoded && Array.isArray(allDecoded) && allDecoded.length > 0) {
              decodedEvents.push(...allDecoded);
              console.log(`   ✅ Successfully decoded ${allDecoded.length} event(s)`);
              console.log(`   📦 Decoded data:`, JSON.stringify(allDecoded, null, 2));
            } else {
              console.log(`   ⚠️  logsDecode returned empty or invalid result:`, allDecoded);
            }
          } catch (decodeErr: any) {
            console.log(`   ⚠️  Failed to decode all logs: ${decodeErr.message}`);
            if (decodeErr.stack) {
              console.log(`   Stack: ${decodeErr.stack.split('\n')[0]}`);
            }
            
            console.log(`   🔄 Trying individual Base64 decoding...`);
            for (let idx = 0; idx < Math.min(programDataLogs.length, 3); idx++) {
              const base64Data = programDataLogs[idx];
              try {
                const formats = [
                  `Program ${this.programId} data: ${base64Data}`,
                  `Program data: ${base64Data}`,
                  `Program log: ${base64Data}`
                ];
                
                for (const formattedLog of formats) {
                  try {
                    const decoded = await (this.engine as any).logsDecode([formattedLog]);
                    if (decoded && Array.isArray(decoded) && decoded.length > 0) {
                      decodedEvents.push(...decoded);
                      console.log(`   ✅ Decoded entry ${idx + 1} with format: "${formattedLog.substring(0, 50)}..."`);
                      break; 
                    }
                  } catch (fmtErr: any) {
                    console.error(fmtErr)
                    // Try next format silently
                  }
                }
              } catch (entryErr: any) {
                console.log(`   ⚠️  Failed to decode entry ${idx + 1}: ${entryErr.message}`);
              }
            }
          }
        } else {
          console.log(`\n🔓 No Program data entries found, attempting to decode all logs...`);
          try {
            const allDecoded = await (this.engine as any).logsDecode(logMessages);
            if (allDecoded && Array.isArray(allDecoded) && allDecoded.length > 0) {
              decodedEvents.push(...allDecoded);
              console.log(`✅ Decoded ${allDecoded.length} event(s) from all logs`);
              console.log(JSON.stringify(allDecoded, null, 2));
            } else {
              console.log(`⚠️  logsDecode returned empty result`);
            }
          } catch (decodeErr: any) {
            console.log(`⚠️  Could not decode logs: ${decodeErr.message}`);
            if (decodeErr.stack) {
              console.log(`Stack: ${decodeErr.stack.split('\n').slice(0, 3).join('\n')}`);
            }
          }
        }
      } else {
        console.log(`⚠️  Engine not initialized, skipping log decoding`);
      }
      
      // Parse decoded events - ONLY tags 11 and 19 are fill events
      for (const event of decodedEvents) {
        // Be more strict: only tag 11 (spot fill) and tag 19 (perp fill) are actual trade fills
        const isTradeEvent = event.tag === 11 || event.tag === 19;
        
        if (isTradeEvent) {
          const side = (event as any).side === 0 ? "buy" : 
                      (event as any).side === 1 ? "sell" : "unknown";
          
          const price = (event as any).price || null;
          const rawSize = (event as any).qty || (event as any).perps || null;
          const size = rawSize ? Number(rawSize) / 1e9 : null; 
          const rebates = (event as any).rebates || null;
          const fee = rebates ? -Number(rebates) / 1e9 : null; 
          const orderId = (event as any).orderId || null;
          const clientId = (event as any).clientId || null;
          const tag = event.tag || null;
          const instrumentId = this.extractInstrumentId(event);

          
          const tradeRecord: TradeRecord = {
            id: `${tag === 11 ? 'spot' : tag === 19 ? 'perp' : 'trade'}-fill-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
            timestamp: sigInfo.blockTime ? new Date(Number(sigInfo.blockTime) * 1000) : new Date(),
            section: this.formatSection(sigInfo.blockTime ? new Date(Number(sigInfo.blockTime) * 1000) : new Date()),
            symbol: instrumentId !== undefined 
                ? this.getSymbolFromInstrId(instrumentId) 
                : 'UNKNOWN',
            side: side as 'buy' | 'sell',
            instrument: instrumentId !== undefined
                ? this.getInstrumentFromInstrId(instrumentId)
                : 'UNKNOWN',
            entryPrice: price ? Number(price) : 0,
            exitPrice: price ? Number(price) : 0,
            quantity: size || 0,
            amount: size || 0,
            value: price && size ? Number(price) * size : 0,
            orderType: 'market',
            clientId: clientId?.toString() || 'unknown',
            orderId: orderId?.toString() || 'unknown',
            transactionHash: signature,
            fees: {
              maker: 0,
              taker: 0,
              total: fee || 0,
              rebates: fee || 0,
            },
            pnl: 0,
            pnlPercentage: 0,
            duration: 0,
            status: 'breakeven',
            notes: `${tag === 11 ? 'Spot' : tag === 19 ? 'Perp' : 'Trade'} ${side === 'buy' ? 'Buy' : 'Sell'} Fill`,
            tradeType: tag === 11 ? 'spot' : tag === 19 ? 'perp' : 'spot',
            logType: tag === 11 ? 'spotFillOrder' : tag === 19 ? 'perpFillOrder' : 'Unknown',
            discriminator: tag ?? undefined,
          };
          
          tradeRecords.push(tradeRecord);
          
          console.log(`\n💰 Trade Event Found (from decoded data):`);
          console.log(`   Signature: ${signature.substring(0, 16)}...`);
          console.log(`   Tag: ${tag} (${tag === 11 ? 'Spot Fill' : tag === 19 ? 'Perp Fill' : 'Unknown'})`);
          console.log(`   Side: ${side} (raw: ${(event as any).side})`);
          console.log(`   Price: ${price || 'N/A'}`);
          console.log(`   Size: ${size || 'N/A'} (raw: ${rawSize || 'N/A'})`);
          console.log(`   Fee/Rebates: ${fee || 'N/A'} (raw rebates: ${rebates || 'N/A'})`);
          console.log(`   Order ID: ${orderId || 'N/A'}`);
          console.log(`   Client ID: ${clientId || 'N/A'}`);
        }
      }
      
      // Fallback: Parse raw log messages
      if (decodedEvents.length === 0) {
        for (const log of logMessages) {
          const lowerLog = log.toLowerCase();
          if (lowerLog.includes("taker buy") || lowerLog.includes("taker sell") || 
              lowerLog.includes("fill") || lowerLog.includes("trade") ||
              (lowerLog.includes("order") && (lowerLog.includes("executed") || lowerLog.includes("filled"))) ||
              lowerLog.includes("position")) {
            
            const side = lowerLog.includes("buy") || lowerLog.includes("long") ? "buy" : 
                        lowerLog.includes("sell") || lowerLog.includes("short") ? "sell" : "unknown";
            
            const priceMatch = log.match(/price[=:]\s*([\d.]+)/i);
            const sizeMatch = log.match(/size[=:]\s*([\d.]+)/i);
            const feeMatch = log.match(/fee[=:]\s*([\d.]+)/i);
            const amountMatch = log.match(/amount[=:]\s*([\d.]+)/i);
            
            const tradeRecord: TradeRecord = {
              id: `raw-${startCounter + tradeRecords.length + 1}-${signature.substring(0, 8)}`,
              timestamp: sigInfo.blockTime ? new Date(Number(sigInfo.blockTime) * 1000) : new Date(),
              section: this.formatSection(sigInfo.blockTime ? new Date(Number(sigInfo.blockTime) * 1000) : new Date()),
              symbol: 'UNKNOWN',
              side: side as 'buy' | 'sell',
              entryPrice: priceMatch ? parseFloat(priceMatch[1]) : 0,
              exitPrice: priceMatch ? parseFloat(priceMatch[1]) : 0,
              quantity: sizeMatch ? parseFloat(sizeMatch[1]) : (amountMatch ? parseFloat(amountMatch[1]) : 0),
              amount: sizeMatch ? parseFloat(sizeMatch[1]) : (amountMatch ? parseFloat(amountMatch[1]) : 0),
              value: 0,
              orderType: 'unknown',
              clientId: 'unknown',
              orderId: 'unknown',
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
              status: 'breakeven',
              notes: 'Parsed from raw log',
              rawLogMessage: log
            };
            
            tradeRecords.push(tradeRecord);
            
            console.log(`\n💰 Trade Event Found (from raw logs):`);
            console.log(`   Signature: ${signature}`);
            console.log(`   Side: ${side}`);
            console.log(`   Price: ${priceMatch ? priceMatch[1] : 'N/A'}`);
            console.log(`   Size: ${sizeMatch ? sizeMatch[1] : (amountMatch ? amountMatch[1] : 'N/A')}`);
            console.log(`   Fee: ${feeMatch ? feeMatch[1] : 'N/A'}`);
            console.log(`   Log: ${log}`);
          }
        }
      }
      
      if (logMessages.length > 0 && startCounter === 0) {
        console.log("\n📝 Sample Transaction Logs (first transaction):");
        logMessages.forEach((log: string, idx: number) => {
          console.log(`   [${idx}] ${log}`);
        });
      }
      
      return tradeRecords;
    } catch (error: any) {
      console.warn(`   ⚠️ Failed to parse tx ${signature.substring(0, 8)}: ${error.message}`);
      return tradeRecords;
    }
  }

  private parseRawLog(
    log: string, 
    signature: string, 
    sigInfo: any, 
    counter: number
  ): TradeRecord | null {
    const lowerLog = log.toLowerCase();
    const timestamp = sigInfo.blockTime ? new Date(Number(sigInfo.blockTime) * 1000) : new Date();
    
    const side = lowerLog.includes("buy") || lowerLog.includes("long") ? "buy" : 
                 lowerLog.includes("sell") || lowerLog.includes("short") ? "sell" : "unknown";
    
    const priceMatch = log.match(/price[=:]\s*([\d.]+)/i);
    const sizeMatch = log.match(/size[=:]\s*([\d.]+)/i) || log.match(/qty[=:]\s*([\d.]+)/i);
    const feeMatch = log.match(/fee[=:]\s*([\d.]+)/i);
    const amountMatch = log.match(/amount[=:]\s*([\d.]+)/i);
    
    // Try to extract instrument ID
    const instrMatch = log.match(/instrId[=:]\s*(\d+)/i);
    const symbol = instrMatch ? this.getSymbolFromInstrId(parseInt(instrMatch[1])) : 'UNKNOWN';
    const instrument = instrMatch ? this.getInstrumentFromInstrId(parseInt(instrMatch[1])) : 'UNKNOWN';
    
    const quantity = sizeMatch ? parseFloat(sizeMatch[1]) : 
                    (amountMatch ? parseFloat(amountMatch[1]) : 0);
    
    // Scale down if it looks like a large number (likely in lamports/1e9)
    const scaledQuantity = quantity > 1e9 ? quantity / 1e9 : quantity;
    const scaledPrice = priceMatch && parseFloat(priceMatch[1]) > 1e9 ? 
                       parseFloat(priceMatch[1]) / 1e9 : 
                       (priceMatch ? parseFloat(priceMatch[1]) : 0);
    
    return {
      id: `raw-${counter}-${signature.substring(0, 8)}`,
      timestamp,
      section: this.formatSection(timestamp),
      symbol,
      side: side as 'buy' | 'sell',
      entryPrice: scaledPrice,
      exitPrice: scaledPrice,
      quantity: scaledQuantity,
      amount: scaledQuantity,
      value: scaledPrice * scaledQuantity,
      orderType: 'unknown',
      instrument,
      clientId: 'unknown',
      orderId: 'unknown',
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
      status: 'breakeven',
      notes: 'Parsed from raw log',
      tradeType: lowerLog.includes('perp') ? 'perp' : 'spot',
      rawLogMessage: log
    };
  }

  private parseDecodedLog(
    log: DecodedLogMessage, 
    signature: string, 
    blockTime: number | null, 
    counter: number
  ): TradeRecord | null {
    const timestamp = blockTime ? new Date(blockTime * 1000) : new Date();
    const tag = log.tag;
    
    // Get log type name safely
    let logTypeName = 'Unknown';
    for (const key in LogType) {
      if (typeof key === 'string' && !key.match(/^\d/)) {
        const value = (LogType as any)[key];
        if (value === tag) {
          logTypeName = key;
          break;
        }
      }
    }
    
    // Check if this is a trade event (using numeric comparison)
    const isTradeEvent = tag === 11 || tag === 19 || 
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

        const instrumentId = this.extractInstrumentId(spotFill) ?? spotFill.crncy;

        return {
          id: `spot-fill-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: this.getSymbolFromInstrId(instrumentId),
          instrument: this.getInstrumentFromInstrId(instrumentId),   
          side: isBuy ? 'buy' : 'sell',
          entryPrice: price,
          exitPrice: price,
          quantity,
          amount: quantity,
          value: value || price * quantity,
          orderType: 'market',
          clientId: spotFill.clientId?.toString() || 'unknown',
          orderId: spotFill.orderId?.toString() || 'unknown',
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
          status: 'breakeven',
          notes: `Spot ${isBuy ? 'Buy' : 'Sell'} Fill`,
          tradeType: 'spot',
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
        
        const instrumentId = this.extractInstrumentId(perpFill) ?? perpFill.crncy;
        return {
          id: `perp-fill-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: this.getSymbolFromInstrId(instrumentId),
          instrument: this.getInstrumentFromInstrId(instrumentId),
          side: isLong ? 'long' : 'short',
          entryPrice: price,
          exitPrice: price,
          quantity,
          amount: quantity,
          value: value || price * quantity,
          orderType: 'market',
          clientId: perpFill.clientId?.toString() || 'unknown',
          orderId: perpFill.orderId?.toString() || 'unknown',
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
          status: 'breakeven',
          notes: `Perp ${isLong ? 'Long' : 'Short'} Fill`,
          tradeType: 'perp',
          logType: logTypeName,
          discriminator: tag,
        };
      }

      case LogType.perpFunding: {
        const funding = log as PerpFundingReportModel;
        const isReceived = funding.funding > 0;
        const fundingValue = scaleValue(funding.funding || 0);
        
        const instrumentId = this.extractInstrumentId(funding) ?? funding.instrId;
        
        return {
          id: `funding-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: this.getSymbolFromInstrId(instrumentId),
          instrument: this.getInstrumentFromInstrId(instrumentId),
          side: isReceived ? 'long' : 'short',
          entryPrice: 0,
          exitPrice: 0,
          quantity: 0,
          amount: Math.abs(fundingValue),
          value: Math.abs(fundingValue),
          orderType: 'unknown',
          clientId: funding.clientId?.toString() || 'unknown',
          orderId: 'N/A',
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
          status: fundingValue > 0 ? 'win' : 'loss',
          notes: `${fundingValue > 0 ? 'Received' : 'Paid'} Funding`,
          tradeType: 'perp',
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
          symbol: this.getSymbolFromInstrId(socLoss.instrId),
          side: 'short',
          entryPrice: 0,
          exitPrice: 0,
          quantity: 0,
          amount: Math.abs(lossValue),
          value: Math.abs(lossValue),
          orderType: 'unknown',
          instrument: this.getInstrumentFromInstrId(socLoss.instrId),
          clientId: socLoss.clientId?.toString() || 'unknown',
          orderId: 'N/A',
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
          status: 'loss',
          notes: 'Socialized Loss',
          tradeType: 'perp',
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
          symbol: this.getSymbolFromInstrId((log as any).instrId),
          side: 'sell',
          entryPrice: price,
          exitPrice: price,
          quantity,
          amount: quantity,
          value: quantity * price,
          orderType: 'revoke',
          instrument: this.getInstrumentFromInstrId((log as any).instrId),
          clientId: revoke.clientId?.toString() || 'unknown',
          orderId: revoke.orderId?.toString() || 'unknown',
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
          status: 'breakeven',
          notes: `${isPerp ? 'Perp' : 'Spot'} Order Revoke`,
          tradeType: isPerp ? 'perp' : 'spot',
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
          id: `${isDeposit ? 'deposit' : 'withdraw'}-${counter}-${signature.substring(0, 8)}`,
          timestamp,
          section,
          symbol: this.getTokenSymbol(depositWithdraw.tokenId),
          side: isDeposit ? 'buy' : 'sell',
          entryPrice: 0,
          exitPrice: 0,
          quantity: amount,
          amount: amount,
          value: amount,
          orderType: 'unknown',
          instrument: `${this.getTokenSymbol(depositWithdraw.tokenId)}/USD`,
          clientId: depositWithdraw.clientId?.toString() || 'unknown',
          orderId: 'N/A',
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
          status: 'breakeven',
          notes: isDeposit ? 'Deposit' : 'Withdrawal',
          tradeType: 'spot',
          logType: logTypeName,
          discriminator: tag,
        };
      }

      default:
        return null;
    }
  }

  private formatSection(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  private getInstrumentFromInstrId(instrId?: number): string {
    return this.getSymbolFromInstrId(instrId);
  }

  private getTokenSymbol(tokenId?: number): string {
    const tokenMap: Record<number, string> = {
      1: 'SOL',
      2: 'USDC',
      3: 'BTC',
      4: 'ETH',
    };
    return tokenMap[tokenId || 0] || `TOKEN-${tokenId || 'UNKNOWN'}`;
  }

  private extractInstrumentId(event: any): number | undefined {
  if (!event) return undefined;
  
  // Priority order of field names based on Deriverse kit
  // 1. For fill events: crncy (as seen in SpotFillOrderReportModel, PerpFillOrderReportModel)
  // 2. For funding/socLoss: instrId (as seen in PerpFundingReportModel, PerpSocLossReportModel)
  // 3. For deposit/withdraw: tokenId (as seen in DepositReportModel, WithdrawReportModel)
  // 4. For other events: instrumentId, marketId, etc.
  
  const fieldPriority = [
    'crncy',      // Spot/Perp fills
    'instrId',    // Funding, SocLoss, other perp events
    'tokenId',    // Deposits, withdrawals
    'instrumentId',
    'marketId',
    'baseCrncyId'
  ];
  
  for (const field of fieldPriority) {
    if (event[field] !== undefined && event[field] !== null) {
      let value = event[field];
      
      // Handle different value types
      if (typeof value === 'object') {
        if (value?.toNumber) value = value.toNumber();
        else if (value?.toString) value = Number(value.toString());
        else continue;
      }
      
      // Convert to number
      const numValue = Number(value);
      if (isNaN(numValue)) continue;
      
      // Check if it's scaled (most Deriverse values are in 1e9 scale)
      if (numValue > 1e9) {
        return numValue / 1e9;
      }
      
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

// Update the getSymbolFromInstrId with better mapping
private getSymbolFromInstrId(instrId?: number): string {
  if (instrId === undefined || instrId === null) {
    return 'UNKNOWN';
  }

  // Ensure it's a number
  let id: number;
  if (typeof instrId === 'string') {
    id = parseInt(instrId, 10);
    if (isNaN(id)) return `INSTR-${instrId}`;
  } else {
    id = instrId;
  }

  // Deriverse instrument ID mapping (based on common patterns)
  const symbolMap: Record<number, string> = {
    0: 'USDC',      // Sometimes used for USDC
    1: 'SOL/USDC',
    2: 'BTC/USDC',
    3: 'ETH/USDC',
    4: 'APT/USDC',
    5: 'ARB/USDC',
    6: 'OP/USDC',
    7: 'MATIC/USDC',
    8: 'AVAX/USDC',
    9: 'BNB/USDC',
    10: 'LINK/USDC',
    11: 'UNI/USDC',
    12: 'AAVE/USDC',
    13: 'ATOM/USDC',
    14: 'DOT/USDC',
    15: 'NEAR/USDC',
    16: 'FTM/USDC',
    17: 'ALGO/USDC',
    18: 'FLOW/USDC',
    19: 'ICP/USDC',
    20: 'FIL/USDC',
  };

  return symbolMap[id] || `INSTR-${id}`;
}


  // Export to CSV
  exportToCSV(tradeRecords: TradeRecord[]): string {
    const headers = [
      'ID',
      'Section',
      'Timestamp (UTC)',
      'Type',
      'Instrument',
      'Order Side',
      'Price',
      'Quantity',
      'Amount',
      'Value',
      'Order Type',
      'Client ID',
      'Order ID',
      'Transaction Hash',
      'Trade Type',
      'Log Type',
      'Discriminator',
      'Rebates',
      'Funding Payments',
      'Socialized Loss',
      'Total Fee',
      'PNL',
      'Status',
      'Notes'
    ];

    const csvRows = [headers.join(',')];
    
    for (const record of tradeRecords) {
      csvRows.push([
        record.id,
        `"${record.section || ''}"`,
        record.timestamp.toISOString(),
        record.tradeType || '',
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
        record.tradeType || '',
        record.logType || '',
        record.discriminator?.toString() || '',
        (record.fees.rebates || 0).toFixed(9),
        (record.fundingPayments || 0).toFixed(9),
        (record.socializedLoss || 0).toFixed(9),
        record.fees.total.toFixed(9),
        record.pnl.toFixed(6),
        record.status,
        `"${record.notes || ''}"`
      ].join(','));
    }

    return csvRows.join('\n');
  }

  // Export to JSON
  exportToJSON(tradeRecords: TradeRecord[]): string {
    return JSON.stringify(tradeRecords, null, 2);
  }

  // Get summary statistics
  getSummary(tradeRecords: TradeRecord[]): any {
    const spotTrades = tradeRecords.filter(t => t.tradeType === 'spot');
    const perpTrades = tradeRecords.filter(t => t.tradeType === 'perp');
    const fills = tradeRecords.filter(t => 
      t.logType?.includes('FillOrder') || 
      t.logType?.includes('SpotFillOrder') || 
      t.logType?.includes('PerpFillOrder') ||
      t.discriminator === 11 || 
      t.discriminator === 19 ||
      t.discriminator === LogType.spotFillOrder ||
      t.discriminator === LogType.perpFillOrder
    );
    const cancels = tradeRecords.filter(t => 
      t.logType?.includes('Cancel') || 
      t.orderType === 'cancel'
    );
    const revokes = tradeRecords.filter(t => 
      t.logType?.includes('Revoke') || 
      t.orderType === 'revoke'
    );

    const summary: any = {
      totalTrades: tradeRecords.length,
      spotTrades: spotTrades.length,
      perpTrades: perpTrades.length,
      tradeFills: fills.length,
      orderCancels: cancels.length,
      orderRevokes: revokes.length,
      totalVolume: tradeRecords.reduce((sum, t) => sum + (t.value || 0), 0),
      totalFees: tradeRecords.reduce((sum, t) => sum + t.fees.total, 0),
      totalRebates: tradeRecords.reduce((sum, t) => sum + (t.fees.rebates || 0), 0),
      totalFunding: tradeRecords.reduce((sum, t) => sum + (t.fundingPayments || 0), 0),
      totalSocializedLoss: tradeRecords.reduce((sum, t) => sum + (t.socializedLoss || 0), 0),
      winningTrades: tradeRecords.filter(t => t.status === 'win').length,
      losingTrades: tradeRecords.filter(t => t.status === 'loss').length,
      breakevenTrades: tradeRecords.filter(t => t.status === 'breakeven').length,
    };

    summary['netPnl'] = tradeRecords.reduce((sum, t) => sum + t.pnl, 0);
    summary['netFees'] = summary.totalFees - summary.totalRebates;
    
    return summary;
  }
}