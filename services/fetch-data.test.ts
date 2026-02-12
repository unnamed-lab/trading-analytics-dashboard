/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { PublicKey } from "@solana/web3.js";
import { Engine } from '@deriverse/kit';
import { TransactionDataFetcher } from "./fetch-data.service";

const dotenv = require("dotenv"); 
dotenv.config();

// --- MOCKS ---

// Mock PerformanceAnalyzer
const mockAddTrades = jest.fn();
const mockFilterTrades = jest.fn().mockReturnValue([]);
const mockCalculateMetrics = jest.fn().mockReturnValue({});
const mockCalculateTimeBasedMetrics = jest.fn().mockReturnValue([]);
const mockAnalyzeFees = jest.fn().mockReturnValue({});
const mockAnalyzeOrderTypes = jest.fn().mockReturnValue({});
const mockCalculateDrawdown = jest.fn().mockReturnValue({});

const mockPerformanceAnalyzerInstances: any[] = [];

jest.mock('@/lib/analyzers/performance-analyzer', () => {
  return {
    PerformanceAnalyzer: jest.fn().mockImplementation(() => {
      const mockInstance = {
        addTrades: mockAddTrades,
        filterTrades: mockFilterTrades,
        calculateMetrics: mockCalculateMetrics,
        calculateTimeBasedMetrics: mockCalculateTimeBasedMetrics,
        analyzeFees: mockAnalyzeFees,
        analyzeOrderTypes: mockAnalyzeOrderTypes,
        calculateDrawdown: mockCalculateDrawdown,
        trades: []
      };
      mockPerformanceAnalyzerInstances.push(mockInstance);
      return mockInstance;
    })
  };
});

// Mock @deriverse/kit
jest.mock('@deriverse/kit', () => {
  return {
    Engine: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        setSigner: jest.fn().mockResolvedValue(undefined),
        getClientData: jest.fn().mockResolvedValue({ 
          spot: new Map(),
          perp: new Map() 
        }),
        getClientSpotOrdersInfo: jest.fn().mockResolvedValue({}),
        getClientSpotOrders: jest.fn().mockResolvedValue({ 
          bids: [], 
          asks: [] 
        }),
        updateInstrData: jest.fn().mockResolvedValue(undefined),
        logsDecode: jest.fn().mockResolvedValue([]),
        originalClientId: 'mock-client-id',
        instruments: {
          get: jest.fn().mockReturnValue({
            header: { lastPx: 100, symbol: 'SOL-PERP' }
          })
        }
      };
    }),
    LogType: {
      spotFillOrder: 11,
      perpFillOrder: 19,
      perpFunding: 24,
      perpSocLoss: 27,
      deposit: 1,
      withdraw: 2,
      spotOrderRevoke: 14,
      perpOrderRevoke: 22,
    }
  };
});

// Mock @solana/kit
jest.mock('@solana/kit', () => ({
  devnet: jest.fn().mockImplementation((url) => url),
  address: jest.fn().mockImplementation((addr) => addr),
  createSolanaRpc: jest.fn().mockReturnValue({
    getTransaction: jest.fn().mockReturnThis(),
    getSignaturesForAddress: jest.fn().mockReturnThis(),
    send: jest.fn().mockResolvedValue([])
  })
}));

describe('Test the TransactionDataFetcher Class', () => {
  let tradeFetcher: TransactionDataFetcher;
  const mockWallet = new PublicKey(process.env.DEBUG_SOLANA_WALLET || "11111111111111111111111111111111");
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
  const programId = process.env.NEXT_PUBLIC_DERIVERSE_PROGRAM_ID || "11111111111111111111111111111111";
  const version = Number(process.env.NEXT_PUBLIC_ENGINE_VERSION) || 14;

  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(global.console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(global.console, 'warn').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should have wallet test address', () => {
    expect(mockWallet).toBeDefined();
    expect(mockWallet.toString()).toBeDefined();
  });

  it('should have env loaded', () => {
    const isLoaded = !!rpcUrl && !!programId;
    expect(isLoaded).toBeTruthy();
  });

  it('should create an instance', () => {
    tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
    expect(tradeFetcher).toBeInstanceOf(TransactionDataFetcher);
  });

  it('should initialize the engine with mocked dependencies', async () => {
    tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
    
    await tradeFetcher.initialize(mockWallet);
    
    expect(logSpy).toHaveBeenCalledWith('🔍 Initialized DeRiverse Trade Data Fetcher');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Wallet:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Program ID:'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Version:'));
    
    // Verify engine is initialized
    expect((tradeFetcher as any).engineInitialized).toBe(true);
  });

  it('should handle engine initialization errors', async () => {
    tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
    
    // Mock Engine to throw on initialize
    (Engine as unknown as jest.Mock).mockImplementationOnce(() => {
      return {
        initialize: jest.fn().mockRejectedValue(new Error('Initialization failed')),
        setSigner: jest.fn(),
        originalClientId: 'fail-client-id'
      };
    });

    await tradeFetcher.initialize(mockWallet);
    
    // Should log warning but not throw
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Engine initialization warning'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Continuing without full engine initialization'));
    
    // Verify engineInitialized flag is false
    expect((tradeFetcher as any).engineInitialized).toBe(false);
  });

  describe('fetchAllTransactions', () => {
    let mockEngine: any;

    beforeEach(async () => {
      tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
      await tradeFetcher.initialize(mockWallet);
      mockEngine = (tradeFetcher as any).engine;
    });

    it('should return empty array if wallet not initialized', async () => {
      const freshFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
      const trades = await freshFetcher.fetchAllTransactions();
      expect(trades).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Wallet not initialized'));
    });

    it('should fetch and parse transactions', async () => {
      // Setup mocks
      const mockRpc = (tradeFetcher as any).rpc;
      
      // Mock signatures response
      mockRpc.send.mockResolvedValueOnce([{ 
        signature: 'sig123', 
        err: null, 
        blockTime: 1620000000 
      }]);

      // Mock transaction response with fill event
      mockRpc.send.mockResolvedValueOnce({
        meta: { 
          logMessages: [
            'Program data: test-base64-data'
          ],
          err: null
        },
        blockTime: 1620000000,
        transaction: { signatures: ['sig123'] }
      });

      // Mock logsDecode to return a fill event
      mockEngine.logsDecode.mockResolvedValueOnce([{
        tag: 11, // Spot fill
        side: 0, // Buy
        price: 100000000000, // 100 * 1e9
        qty: 5000000000, // 5 * 1e9
        crncy: 1, // SOL/USDC
        rebates: 1000000, // 0.001 * 1e9
        orderId: 12345,
        clientId: 67890
      }]);

      const trades = await tradeFetcher.fetchAllTransactions();

      expect(mockEngine.getClientData).toHaveBeenCalled();
      expect(trades.length).toBeGreaterThan(0);
      expect(trades[0].symbol).toBe('SOL/USDC');
      expect(trades[0].side).toBe('buy');
      expect(trades[0].entryPrice).toBe(100);
      expect(trades[0].quantity).toBe(5);
      
      // Verify analyzer received trades
      expect(mockAddTrades).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should handle RPC errors gracefully', async () => {
      const mockRpc = (tradeFetcher as any).rpc;
      mockRpc.send.mockRejectedValue(new Error('RPC Fail'));
      
      const trades = await tradeFetcher.fetchAllTransactions();
      expect(trades).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('fetchTradesForInstrument', () => {
    beforeEach(async () => {
      tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
      await tradeFetcher.initialize(mockWallet);
      // Set engine initialized to true
      (tradeFetcher as any).engineInitialized = true;
    });

    it('should return empty if no spot data for instrument', async () => {
      const mockEngine = (tradeFetcher as any).engine;
      mockEngine.getClientData.mockResolvedValue({ 
        spot: new Map(),
        perp: new Map() 
      });

      const trades = await tradeFetcher.fetchTradesForInstrument(999);
      expect(trades).toEqual([]);
    });

    it('should process both bids and asks', async () => {
      const mockEngine = (tradeFetcher as any).engine;
      const spotMap = new Map();
      spotMap.set(1, { clientId: 123 });
      
      mockEngine.getClientData.mockResolvedValue({ 
        spot: spotMap,
        perp: new Map() 
      });
      
      mockEngine.getClientSpotOrdersInfo.mockResolvedValue({});
      
      mockEngine.getClientSpotOrders.mockResolvedValue({
        bids: [{ 
          orderId: 1, 
          qty: 10000000000, // 10 * 1e9
          price: 50000000000, // 50 * 1e9
          orderType: 1 
        }],
        asks: [{ 
          orderId: 2, 
          qty: 5000000000, // 5 * 1e9
          price: 60000000000, // 60 * 1e9
          orderType: 1 
        }]
      });

      const trades = await tradeFetcher.fetchTradesForInstrument(1);
      
      expect(trades).toHaveLength(2);
      
      const buyOrder = trades.find(t => t.side === 'buy');
      expect(buyOrder).toBeDefined();
      expect(buyOrder?.quantity).toBe(10);
      expect(buyOrder?.entryPrice).toBe(50);
      
      const sellOrder = trades.find(t => t.side === 'sell');
      expect(sellOrder).toBeDefined();
      expect(sellOrder?.quantity).toBe(5);
      expect(sellOrder?.entryPrice).toBe(60);
    });

    it('should handle engine not initialized', async () => {
      const freshFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
      (freshFetcher as any).engineInitialized = false;
      
      const trades = await freshFetcher.fetchTradesForInstrument(1);
      expect(trades).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Engine not initialized'));
    });
  });

  describe('Log Parsing', () => {
    beforeEach(async () => {
      tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
      await tradeFetcher.initialize(mockWallet);
      (tradeFetcher as any).engineInitialized = true;
    });

    it('should parse raw logs correctly', async () => {
      const mockRpc = (tradeFetcher as any).rpc;
      
      // Mock signatures
      mockRpc.send.mockResolvedValueOnce([{ 
        signature: 'sig123',
        err: null,
        blockTime: 1620000000
      }]);

      // Mock transaction with raw log
      const rawLog = "Program log: Order filled. side: 0, price: 100000000000, qty: 5000000000, instrId: 1";
      
      mockRpc.send.mockResolvedValueOnce({
        meta: { 
          logMessages: [rawLog],
          err: null
        },
        blockTime: 1620000000,
        transaction: { signatures: ['sig123'] }
      });

      // Mock logsDecode to return empty (trigger raw parsing)
      const mockEngine = (tradeFetcher as any).engine;
      mockEngine.logsDecode.mockResolvedValue([]);

      const trades = await tradeFetcher.fetchAllTransactions();

      expect(trades).toHaveLength(1);
      expect(trades[0].side).toBe('buy');
      expect(trades[0].entryPrice).toBe(100);
      expect(trades[0].quantity).toBe(5);
      expect(trades[0].symbol).toBe('SOL/USDC');
      expect(trades[0].transactionHash).toBe('sig123');
    });

    it('should parse decoded logs correctly', async () => {
      const mockRpc = (tradeFetcher as any).rpc;
      
      // Mock signatures
      mockRpc.send.mockResolvedValueOnce([{ 
        signature: 'sig123',
        err: null,
        blockTime: 1620000000
      }]);

      // Mock transaction with program data
      mockRpc.send.mockResolvedValueOnce({
        meta: { 
          logMessages: ['Program data: test-base64'],
          err: null
        },
        blockTime: 1620000000,
        transaction: { signatures: ['sig123'] }
      });

      // Mock logsDecode to return a perp fill event
      const mockEngine = (tradeFetcher as any).engine;
      mockEngine.logsDecode.mockResolvedValue([{
        tag: 19, // Perp fill
        side: 0, // Long
        price: 100000000000,
        perps: 5000000000,
        crncy: 1,
        rebates: -1000000,
        orderId: 12345,
        clientId: 67890
      }]);

      const trades = await tradeFetcher.fetchAllTransactions();

      expect(trades).toHaveLength(1);
      expect(trades[0].tradeType).toBe('perp');
      expect(trades[0].side).toBe('long');
      expect(trades[0].entryPrice).toBe(100);
      expect(trades[0].quantity).toBe(5);
      expect(trades[0].fees.total).toBe(0.001); // -(-1000000/1e9)
      expect(trades[0].symbol).toBe('SOL/USDC');
    });
  });

  describe('Export and Summary Functions', () => {
    let sampleTrades: any[];

    beforeEach(async () => {
      tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version);
      
      sampleTrades = [
        {
          id: 'spot-fill-1',
          timestamp: new Date(),
          section: '01-Jan-2024 12:00:00',
          symbol: 'SOL/USDC',
          instrument: 'SOL/USDC',
          side: 'buy',
          entryPrice: 100,
          exitPrice: 100,
          quantity: 10,
          amount: 10,
          value: 1000,
          orderType: 'market',
          clientId: '123',
          orderId: '456',
          transactionHash: 'tx1',
          fees: { maker: 0, taker: 0, total: 0.1, rebates: 0 },
          pnl: 0,
          pnlPercentage: 0,
          duration: 0,
          status: 'breakeven',
          notes: 'Spot Buy Fill',
          tradeType: 'spot',
          logType: 'spotFillOrder',
          discriminator: 11
        },
        {
          id: 'perp-fill-2',
          timestamp: new Date(),
          section: '01-Jan-2024 12:00:00',
          symbol: 'SOL/USDC',
          instrument: 'SOL/USDC',
          side: 'long',
          entryPrice: 101,
          exitPrice: 101,
          quantity: 5,
          amount: 5,
          value: 505,
          orderType: 'market',
          clientId: '123',
          orderId: '789',
          transactionHash: 'tx2',
          fees: { maker: 0, taker: 0, total: 0.05, rebates: 0.01 },
          pnl: 50,
          pnlPercentage: 10,
          duration: 3600,
          status: 'win',
          notes: 'Perp Long Fill',
          tradeType: 'perp',
          logType: 'perpFillOrder',
          discriminator: 19,
          fundingPayments: 5
        }
      ];
    });

    it('should export to CSV', () => {
      const csv = tradeFetcher.exportToCSV(sampleTrades);
      expect(csv).toContain('ID,Section,Timestamp');
      expect(csv).toContain('spot-fill-1');
      expect(csv).toContain('perp-fill-2');
    });

    it('should export to JSON', () => {
      const json = tradeFetcher.exportToJSON(sampleTrades);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('spot-fill-1');
    });

    it('should get summary statistics', () => {
      const summary = tradeFetcher.getSummary(sampleTrades);
      
      expect(summary.totalTrades).toBe(2);
      expect(summary.spotTrades).toBe(1);
      expect(summary.perpTrades).toBe(1);
      expect(summary.tradeFills).toBe(2);
      expect(summary.totalVolume).toBe(1505);
      expect(summary.totalFees).toBe(0.15);
      expect(summary.totalRebates).toBe(0.01);
      expect(summary.netFees).toBe(0.14);
      expect(summary.totalFunding).toBe(5);
      expect(summary.winningTrades).toBe(1);
      expect(summary.losingTrades).toBe(0);
      expect(summary.breakevenTrades).toBe(1);
      expect(summary.netPnl).toBe(50);
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      tradeFetcher = new TransactionDataFetcher(rpcUrl, programId, version, 0, 100);
      await tradeFetcher.initialize(mockWallet);
    });

    it('should fetch paginated transactions', async () => {
      const mockRpc = (tradeFetcher as any).rpc;
      
      // Mock signatures response with 2 signatures
      mockRpc.send.mockResolvedValueOnce([
        { signature: 'sig1', err: null, blockTime: 1620000000 },
        { signature: 'sig2', err: null, blockTime: 1620000000 }
      ]);

      // Mock transaction responses
      mockRpc.send.mockResolvedValueOnce({
        meta: { logMessages: [], err: null },
        blockTime: 1620000000
      });
      mockRpc.send.mockResolvedValueOnce({
        meta: { logMessages: [], err: null },
        blockTime: 1620000000
      });

      const result = await tradeFetcher.fetchTransactionsPaginated({ limit: 2 });
      
      expect(result.trades).toBeDefined();
      expect(result.hasMore).toBe(false);
      expect(result.totalProcessed).toBe(2);
      expect(result.lastSignature).toBe('sig2');
    });

    it('should handle before parameter', async () => {
      const mockRpc = (tradeFetcher as any).rpc;
      const getSignaturesSpy = mockRpc.getSignaturesForAddress;
      
      mockRpc.send.mockResolvedValueOnce([]);
      
      await tradeFetcher.fetchTransactionsPaginated({ 
        limit: 10, 
        before: 'prevSig' 
      });
      
      expect(getSignaturesSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ before: 'prevSig' })
      );
    });
  });
});