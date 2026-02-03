/* eslint-disable @typescript-eslint/no-explicit-any */
// services/TradeDataFetcher.ts
import { 
  Address,
  address, 
  createSolanaRpc, 
  devnet 
} from "@solana/kit";
import { Engine } from '@deriverse/kit';
import { PublicKey } from '@solana/web3.js';
import { TradeRecord, TradeFilters } from '@/types';
import { PerformanceAnalyzer } from '@/lib/analyzers/performance-analyzer';


export class TradeDataFetcher {
  private rpc: ReturnType<typeof createSolanaRpc>;
  private engine: Engine | null = null;
  private analyzer: PerformanceAnalyzer;
  private programId: string;
  private walletPublicKey: PublicKey | null = null;
  private version: number;
  
  constructor(
    rpcUrl: string,
    programId: string,
    version: number = 1
  ) {
    this.rpc = createSolanaRpc(devnet(rpcUrl));
    this.programId = programId;
    this.analyzer = new PerformanceAnalyzer([]);
    this.version = version;
  }

  // Initialize the engine with a wallet
  async initializeEngine(walletPublicKey: PublicKey): Promise<void> {
    try {
      this.walletPublicKey = walletPublicKey;
      this.engine = new Engine(this.rpc, { 
        programId: address(this.programId), 
        version: this.version
      });
      
      await this.engine.initialize();
      await this.engine.setSigner(walletPublicKey); // set the signer for the engine
      
      console.log('Engine initialized successfully');
      console.log('Client ID:', this.engine.originalClientId); // log the client id
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      throw error;
    }
  }

  // Fetch all trades for the connected wallet
  async fetchAllTrades(): Promise<TradeRecord[]> {
    if (!this.engine || !this.walletPublicKey) {
      throw new Error('Engine not initialized. Call initializeEngine first.');
    }

    try {
      // Get client data to find all instruments the user has traded
      const clientData = await this.engine.getClientData();
      const trades: TradeRecord[] = [];

      // Iterate through all spot positions
      for (const [instrId, spotData] of clientData.spot.entries()) {
        try {
          const instrumentTrades = await this.fetchTradesForInstrument(instrId);
          trades.push(...instrumentTrades);
        } catch (error) {
          console.warn(`Failed to fetch trades for instrument ${instrId}:`, error);
        }
      }

      // Also check for any historical trades from on-chain data
      const historicalTrades = await this.fetchHistoricalTrades();
      trades.push(...historicalTrades);

      // Remove duplicates and sort by timestamp
      const uniqueTrades = this.removeDuplicateTrades(trades);
      this.analyzer.addTrades(uniqueTrades);

      return uniqueTrades;
    } catch (error) {
      console.error('Error fetching trades:', error);
      throw error;
    }
  }

  // Fetch trades for a specific instrument
  async fetchTradesForInstrument(instrId: number): Promise<TradeRecord[]> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    try {
      // Update instrument data first
      await this.engine.updateInstrData({ instrId });

      // Get client's spot orders info
      const clientData = await this.engine.getClientData();
      const spotData = clientData.spot.get(instrId);
      
      if (!spotData) {
        return [];
      }

      const spotOrdersInfo = await this.engine.getClientSpotOrdersInfo({
        clientId: spotData.clientId,
        instrId: instrId
      });

      // Get all orders for this instrument
      const clientOrders = await this.engine.getClientSpotOrders({
        instrId: instrId,
        bidsCount: spotOrdersInfo.bidsCount,
        bidsEntry: spotOrdersInfo.bidsEntry,
        asksCount: spotOrdersInfo.asksCount,
        asksEntry: spotOrdersInfo.asksEntry,
      });

      const trades: TradeRecord[] = [];
      const instrument = this.engine.instruments.get(instrId);
    //   const symbol = instrument?.header?.symbol || `INSTR_${instrId}`;

      // Process bid orders (buy orders)
      if (clientOrders.bids) {
        for (const bid of clientOrders.bids) {
          const trade = await this.convertOrderToTrade(
            bid,
            'buy',
            instrId,
            instrument?.header?.lastPx || 0
            // symbol,
          );
          if (trade) trades.push(trade);
        }
      }

      // Process ask orders (sell orders)
      if (clientOrders.asks) {
        for (const ask of clientOrders.asks) {
          const trade = await this.convertOrderToTrade(
            ask,
            'sell',
            instrId,
            instrument?.header?.lastPx || 0
            // symbol,
          );
          if (trade) trades.push(trade);
        }
      }

      return trades;
    } catch (error) {
      console.error(`Error fetching trades for instrument ${instrId}:`, error);
      throw error;
    }
  }

  // Convert DeRiverse order to TradeRecord
  private async convertOrderToTrade(
    order: any,
    side: 'buy' | 'sell',
    instrId: number,
    currentPrice: number,
    // symbol?: string,
  ): Promise<TradeRecord | null> {
    try {
      // Parse order data
      const orderId = order.orderId?.toString() || '';
      const quantity = Number(order.qty) || 0;
      const price = Number(order.price) || 0;
      
      if (quantity === 0 || price === 0) {
        return null;
      }

      // Try to get transaction data for timestamp
      let timestamp = new Date();
      let transactionHash = '';
      
      if (order.transactionHash) {
        transactionHash = order.transactionHash;
        try {
          const tx = await this.rpc.getTransaction(order.transactionHash).send();
          if (tx?.blockTime) {
            timestamp = new Date(Number(tx.blockTime) * 1000);
          }
        } catch (error) {
          console.warn('Failed to fetch transaction details:', error);
        }
      }

      // Calculate PnL (simplified - adjust based on your actual PnL calculation)
      const entryPrice = price;
      const exitPrice = currentPrice; // This should be the fill price in reality
      const pnl = side === 'buy' 
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;
      
    //   const pnlPercentage = (pnl / (entryPrice * quantity)) * 100;

      // Calculate fees (adjust based on your exchange's fee structure)
      const volume = entryPrice * quantity;
      const isTaker = order.orderType === 1; // Assuming 1 is market order
      const makerFeeRate = 0.001; // 0.1%
      const takerFeeRate = 0.002; // 0.2%
      
      const makerFee = !isTaker ? volume * makerFeeRate : 0;
      const takerFee = isTaker ? volume * takerFeeRate : 0;
      const totalFee = makerFee + takerFee;

      // Adjust PnL for fees
      const adjustedPnl = pnl - totalFee;

      return {
        id: `${orderId}_${side}`,
        timestamp,
        // symbol,
        side: side === 'buy' ? 'long' : 'short',
        entryPrice,
        exitPrice,
        quantity,
        orderType: isTaker ? 'market' : 'limit',
        fees: {
          maker: makerFee,
          taker: takerFee,
          total: totalFee
        },
        pnl: adjustedPnl,
        pnlPercentage: (adjustedPnl / (entryPrice * quantity)) * 100,
        duration: this.calculateOrderDuration(order, timestamp),
        status: adjustedPnl > 0 ? 'win' : adjustedPnl < 0 ? 'loss' : 'breakeven',
        clientId: this.engine?.originalClientId?.toString() || '',
        instrId,
        orderId,
        transactionHash,
        notes: this.generateOrderNotes(order, side)
      };
    } catch (error) {
      console.error('Error converting order to trade:', error);
      return null;
    }
  }

  // Fetch historical trades from on-chain events
  private async fetchHistoricalTrades(): Promise<TradeRecord[]> {
    if (!this.walletPublicKey) {
      return [];
    }

    try {
      // Use Solana RPC to fetch transaction history
      const signatures = await this.rpc.getSignaturesForAddress(
        this.walletPublicKey.toString() as Address,
        {
          limit: 100, // Adjust based on needs
        }
      ).send();

      const trades: TradeRecord[] = [];
      
      // Parse transactions for DeRiverse trade events
      for (const signature of signatures) {
        try {
          const tx = await this.rpc.getTransaction(signature.signature).send();
          if (tx?.meta?.logMessages) {
            const tradeEvents = this.parseTradeEventsFromLogs(
              tx?.meta?.logMessages as unknown as string[],
              signature.signature,
              tx.blockTime ? new Date(Number(tx?.blockTime) * 1000) : new Date()
            );
            trades.push(...tradeEvents);
          }
        } catch (error) {
          console.warn(`Failed to parse transaction ${signature.signature}:`, error);
        }
      }

      return trades;
    } catch (error) {
      console.error('Error fetching historical trades:', error);
      return [];
    }
  }

  // Parse trade events from transaction logs
  private parseTradeEventsFromLogs(
    logs: string[],
    transactionHash: string,
    timestamp: Date
  ): TradeRecord[] {
    const trades: TradeRecord[] = [];
    const tradePattern = /Order (filled|executed).*side: (\d+).*price: (\d+).*qty: (\d+).*instrId: (\d+)/;

    for (const log of logs) {
      const match = log.match(tradePattern);
      if (match) {
        const [, , sideStr, priceStr, qtyStr, instrIdStr] = match;
        const side = parseInt(sideStr) === 0 ? 'buy' : 'sell';
        const price = parseInt(priceStr) / 1e9; // Adjust decimal places
        const quantity = parseInt(qtyStr) / 1e9; // Adjust decimal places
        const instrId = parseInt(instrIdStr);

        trades.push({
          id: `${transactionHash}_${trades.length}`,
          timestamp,
          symbol: `INSTR_${instrId}`,
          side: side === 'buy' ? 'long' : 'short',
          entryPrice: price,
          exitPrice: price, // Same for now
          quantity,
          orderType: 'unknown',
          fees: { maker: 0, taker: 0, total: 0 },
          pnl: 0,
          pnlPercentage: 0,
          duration: 0,
          status: 'breakeven',
          clientId: this.walletPublicKey?.toString() || '',
          instrId,
          transactionHash,
          notes: 'Parsed from transaction logs'
        });
      }
    }

    return trades;
  }

  // Calculate order duration (simplified)
  private calculateOrderDuration(order: any, timestamp: Date): number {
    // This is a simplified calculation. You might need to store order creation time
    // to calculate actual duration
    return 60; // Default 60 minutes
  }

  // Generate order notes
  private generateOrderNotes(order: any, side: 'buy' | 'sell'): string {
    const notes = [];
    if (order.orderType === 1) notes.push('Market order');
    else notes.push('Limit order');
    
    notes.push(`Side: ${side}`);
    
    if (order.qty) notes.push(`Qty: ${order.qty}`);
    if (order.price) notes.push(`Price: ${order.price}`);
    
    return notes.join(', ');
  }

  // Remove duplicate trades
  private removeDuplicateTrades(trades: TradeRecord[]): TradeRecord[] {
    const seen = new Set<string>();
    return trades
      .filter(trade => {
        const key = `${trade.orderId}_${trade.side}_${trade.timestamp.getTime()}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Newest first
  }

  // Get filtered trades
  getFilteredTrades(filters: TradeFilters): TradeRecord[] {
    return this.analyzer.filterTrades(filters);
  }

  // Get performance metrics
  getPerformanceMetrics(filters?: TradeFilters) {
    return this.analyzer.calculateMetrics(filters);
  }

  // Get time-based metrics
  getTimeBasedMetrics() {
    return this.analyzer.calculateTimeBasedMetrics();
  }

  // Get fee analysis
  getFeeAnalysis() {
    return this.analyzer.analyzeFees();
  }

  // Get order type analysis
  getOrderTypeAnalysis() {
    return this.analyzer.analyzeOrderTypes();
  }

  // Get symbol analysis
//   getSymbolAnalysis() {
//     return this.analyzer.analyzeSymbols();
//   }

  // Get drawdown analysis
  getDrawdownAnalysis(filters?: TradeFilters) {
    const trades = filters ? this.analyzer.filterTrades(filters) : this.analyzer['trades'];
    return this.analyzer.calculateDrawdown(trades);
  }

  // Clear all cached data
  clearCache(): void {
    this.analyzer = new PerformanceAnalyzer([]);
  }

  // Export trades to CSV
  exportToCSV(filters?: TradeFilters): string {
    const trades = filters ? this.getFilteredTrades(filters) : this.analyzer['trades'];
    
    const headers = [
      'ID', 'Timestamp', 'Symbol', 'Side', 'Entry Price', 'Exit Price',
      'Quantity', 'PnL', 'PnL %', 'Duration (min)', 'Fees', 'Order Type', 
      'Status', 'Transaction Hash', 'Notes'
    ];
    
    const csvRows = [
      headers.join(','),
      ...trades.map(trade => [
        trade.id,
        trade.timestamp.toISOString(),
        trade.symbol,
        trade.side,
        trade.entryPrice.toFixed(8),
        trade.exitPrice.toFixed(8),
        trade.quantity.toFixed(8),
        trade.pnl.toFixed(8),
        trade.pnlPercentage.toFixed(2),
        trade.duration.toFixed(2),
        trade.fees.total.toFixed(8),
        trade.orderType,
        trade.status,
        trade.transactionHash || '',
        `"${trade.notes || ''}"`
      ].join(','))
    ];
    
    return csvRows.join('\n');
  }
}