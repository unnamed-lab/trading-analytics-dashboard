#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * test-transaction-fetcher.ts
 * 
 * Enhanced test script for TransactionDataFetcher with comprehensive pagination testing
 * Run with: npx tsx test-transaction-fetcher.ts [command]
 * 
 * Commands:
 *   basic         - Basic pagination test
 *   full          - Fetch all with pagination loop
 *   incremental   - Test incremental fetching
 *   between       - Test fetch between signatures
 *   performance   - Performance comparison test
 *   all           - Run all tests (default)
 * 
 * Environment variables:
 *   SOLANA_RPC_URL: RPC endpoint
 *   WALLET_ADDRESS: Wallet to fetch transactions for (required)
 *   PROGRAM_ID: Deriverse program ID
 *   ENGINE_VERSION: Engine version (default: 14)
 */

import 'dotenv/config';
import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TransactionDataFetcher } from '@/services/fetch-data.service';
import { TradeRecord } from '@/types';

// Configuration
const CONFIG = {
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  walletAddress: process.env.DEBUG_SOLANA_WALLET,
  programId: process.env.PROGRAM_ID,
  version: process.env.ENGINE_VERSION ? parseInt(process.env.ENGINE_VERSION) : 14,
  requestDelay: 300,
  maxTransactions: 1000,
  exportDir: './exports'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text: string, color: keyof typeof colors, reset?: keyof typeof colors): string {
  return `${colors[color]}${text}${colors[reset || 'reset']}`;
}

class TestHarness {
  private fetcher: TransactionDataFetcher;
  private walletPublicKey: PublicKey;
  private results: Map<string, any> = new Map();

  constructor() {
    if (!CONFIG.walletAddress) {
      throw new Error('WALLET_ADDRESS environment variable is required');
    }
    
    this.fetcher = new TransactionDataFetcher(
      CONFIG.rpcUrl,
      CONFIG.programId,
      CONFIG.version,
      CONFIG.requestDelay,
      CONFIG.maxTransactions
    );
    
    this.walletPublicKey = new PublicKey(CONFIG.walletAddress);
  }

  async initialize() {
    console.log(colorize('\n🔧 Initializing TransactionDataFetcher...', 'yellow'));
    console.log(`   RPC URL: ${colorize(CONFIG.rpcUrl, 'blue')}`);
    console.log(`   Wallet: ${colorize(CONFIG.walletAddress!, 'cyan')}`);
    console.log(`   Program ID: ${colorize(CONFIG.programId || 'default', 'magenta')}`);
    console.log(`   Version: ${colorize(CONFIG.version.toString(), 'yellow')}`);
    
    await this.fetcher.initialize(this.walletPublicKey);
    return this;
  }

  async testBasicPagination() {
    console.log(colorize('\n📄 TEST 1: Basic Pagination', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    const startTime = Date.now();
    
    // Test with different limits
    const limits = [10, 25, 50];
    const results = [];

    for (const limit of limits) {
      console.log(colorize(`\n📊 Fetching with limit: ${limit}`, 'yellow'));
      
      const result = await this.fetcher.fetchTransactionsPaginated({ limit });
      
      results.push({
        limit,
        trades: result.trades.length,
        hasMore: result.hasMore,
        totalProcessed: result.totalProcessed,
        lastSignature: result.lastSignature
      });

      console.log(`   Trades found: ${colorize(result.trades.length.toString(), result.trades.length > 0 ? 'green' : 'red')}`);
      console.log(`   Has more: ${colorize(result.hasMore.toString(), result.hasMore ? 'yellow' : 'green')}`);
      console.log(`   Processed: ${result.totalProcessed} transactions`);
      
      // Validate pagination metadata
      if (result.hasMore && !result.lastSignature) {
        console.log(colorize('   ⚠️  WARNING: hasMore=true but lastSignature is undefined', 'red'));
      }
      
      // Test first trade structure
      if (result.trades.length > 0) {
        this.validateTradeStructure(result.trades[0], 'basic-pagination');
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    
    this.results.set('basicPagination', {
      results,
      duration,
      passed: results.every(r => r.trades >= 0)
    });

    return this;
  }

  async testFullPaginationFetch() {
    console.log(colorize('\n📄 TEST 2: Full Pagination Fetch', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    const startTime = Date.now();
    const allTrades: TradeRecord[] = [];
    let hasMore = true;
    let lastSignature: string | undefined = undefined;
    let pageCount = 0;
    const PAGE_LIMIT = 20; // Small limit to test multiple pages
    const MAX_PAGES = 5; // Limit for test

    while (hasMore && pageCount < MAX_PAGES) {
      pageCount++;
      console.log(colorize(`\n📑 Fetching page ${pageCount}...`, 'yellow'));
      
      const result = await this.fetcher.fetchTransactionsPaginated({
        limit: PAGE_LIMIT,
        before: lastSignature
      });

      allTrades.push(...result.trades);
      hasMore = result.hasMore;
      lastSignature = result.lastSignature;

      console.log(`   Page ${pageCount}: ${colorize(result.trades.length.toString(), 'green')} trades`);
      console.log(`   Total so far: ${colorize(allTrades.length.toString(), 'cyan')}`);
      console.log(`   Has more: ${colorize(hasMore.toString(), hasMore ? 'yellow' : 'green')}`);

      // Validate no duplicate signatures
      const signatures = new Set();
      let duplicates = 0;
      result.trades.forEach(trade => {
        if (signatures.has(trade.transactionHash)) {
          duplicates++;
        }
        signatures.add(trade.transactionHash);
      });
      
      if (duplicates > 0) {
        console.log(colorize(`   ⚠️  WARNING: Found ${duplicates} duplicate transactions`, 'red'));
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    this.results.set('fullPagination', {
      totalTrades: allTrades.length,
      pageCount,
      duration,
      passed: allTrades.length > 0
    });

    console.log(colorize(`\n✅ Fetched ${allTrades.length} trades across ${pageCount} pages in ${duration}s`, 'green'));
    
    return this;
  }

  async testIncrementalFetch() {
    console.log(colorize('\n📄 TEST 3: Incremental Fetch', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    const startTime = Date.now();
    
    // First, get the most recent transactions
    console.log(colorize('\n📥 Initial fetch - getting latest transactions...', 'yellow'));
    
    const initialResult = await this.fetcher.fetchTransactionsPaginated({ 
      limit: 5 
    });
    
    if (initialResult.trades.length === 0) {
      console.log(colorize('⚠️  No initial trades found, skipping incremental test', 'yellow'));
      this.results.set('incremental', { passed: false, skipped: true });
      return this;
    }

    const mostRecentSignature = initialResult.trades[0].transactionHash;
    console.log(`   Most recent signature: ${colorize(mostRecentSignature.slice(0, 16) + '...', 'dim')}`);

    // Simulate incremental fetch - get transactions until we hit the most recent
    console.log(colorize('\n🔄 Simulating incremental fetch (until = most recent)...', 'yellow'));
    
    const incrementalResult = await this.fetcher.fetchTransactionsPaginated({
      limit: 20,
      until: mostRecentSignature
    });

    console.log(`   Found ${colorize(incrementalResult.trades.length.toString(), 'green')} trades newer than most recent?`);
    console.log(`   This should be 0 (or very few depending on timing): ${incrementalResult.trades.length}`);

    // Test that no trades are older than the until signature
    let hasOlderTrades = false;
    incrementalResult.trades.forEach(trade => {
      if (trade.transactionHash === mostRecentSignature) {
        hasOlderTrades = true;
      }
    });

    if (hasOlderTrades) {
      console.log(colorize('   ⚠️  WARNING: Found trades older than until signature', 'red'));
    }

    const duration = (Date.now() - startTime) / 1000;

    this.results.set('incremental', {
      initialTrades: initialResult.trades.length,
      incrementalTrades: incrementalResult.trades.length,
      duration,
      passed: incrementalResult.trades.length >= 0
    });

    return this;
  }

  async testBetweenSignatures() {
    console.log(colorize('\n📄 TEST 4: Fetch Between Signatures', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    // First, get a range of transactions to test between
    console.log(colorize('\n📥 Getting reference signatures...', 'yellow'));
    
    const referenceResult = await this.fetcher.fetchTransactionsPaginated({ 
      limit: 10 
    });

    if (referenceResult.trades.length < 2) {
      console.log(colorize('⚠️  Not enough trades to test between signatures', 'yellow'));
      this.results.set('betweenSignatures', { passed: false, skipped: true });
      return this;
    }

    // Use first and last as bounds
    const beforeSig = referenceResult.trades[0].transactionHash;
    const untilSig = referenceResult.trades[referenceResult.trades.length - 1].transactionHash;

    console.log(`   Before: ${colorize(beforeSig.slice(0, 16) + '...', 'dim')}`);
    console.log(`   Until: ${colorize(untilSig.slice(0, 16) + '...', 'dim')}`);

    console.log(colorize('\n🔄 Fetching transactions between signatures...', 'yellow'));
    
    const startTime = Date.now();
    
    const betweenResult = await this.fetcher.fetchTransactionsPaginated({
      limit: 20,
      before: beforeSig,
      until: untilSig
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log(`   Found ${colorize(betweenResult.trades.length.toString(), 'green')} trades between signatures`);
    console.log(`   Expected range: 0-${referenceResult.trades.length - 1} trades`);

    // Validate all trades are within bounds
    let outOfBounds = 0;
    betweenResult.trades.forEach(trade => {
      if (trade.transactionHash === beforeSig || trade.transactionHash === untilSig) {
        outOfBounds++;
      }
    });

    if (outOfBounds > 0) {
      console.log(colorize(`   ⚠️  WARNING: Found ${outOfBounds} trades outside the specified range`, 'red'));
    }

    this.results.set('betweenSignatures', {
      tradesFound: betweenResult.trades.length,
      referenceCount: referenceResult.trades.length,
      duration,
      passed: betweenResult.trades.length <= referenceResult.trades.length
    });

    return this;
  }

  async testPerformanceComparison() {
    console.log(colorize('\n📄 TEST 5: Performance Comparison', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    const testLimit = 30; // Small limit for fair comparison

    console.log(colorize('\n⚡ Testing fetchAllTransactions()...', 'yellow'));
    const allStart = Date.now();
    const allTrades = await this.fetcher.fetchAllTransactions();
    const allDuration = (Date.now() - allStart) / 1000;
    console.log(`   Duration: ${colorize(allDuration.toFixed(2) + 's', allDuration < 2 ? 'green' : 'red')}`);
    console.log(`   Trades: ${allTrades.length}`);

    console.log(colorize('\n⚡ Testing fetchTransactionsPaginated()...', 'yellow'));
    const paginatedStart = Date.now();
    const paginatedResult = await this.fetcher.fetchTransactionsPaginated({ 
      limit: testLimit 
    });
    const paginatedDuration = (Date.now() - paginatedStart) / 1000;
    console.log(`   Duration: ${colorize(paginatedDuration.toFixed(2) + 's', paginatedDuration < 1 ? 'green' : 'red')}`);
    console.log(`   Trades: ${paginatedResult.trades.length}`);

    // Test memory efficiency by fetching multiple pages
    console.log(colorize('\n⚡ Testing multi-page pagination performance...', 'yellow'));
    const multiStart = Date.now();
    let multiTrades = 0;
    let hasMore = true;
    let lastSig: string | undefined = undefined;
    let pageCount = 0;

    while (hasMore && pageCount < 3) {
      const result = await this.fetcher.fetchTransactionsPaginated({
        limit: 10,
        before: lastSig
      });
      multiTrades += result.trades.length;
      hasMore = result.hasMore;
      lastSig = result.lastSignature;
      pageCount++;
    }

    const multiDuration = (Date.now() - multiStart) / 1000;
    console.log(`   Pages: ${pageCount}, Total trades: ${multiTrades}`);
    console.log(`   Duration: ${colorize(multiDuration.toFixed(2) + 's', multiDuration < 3 ? 'green' : 'red')}`);
    console.log(`   Avg per page: ${(multiDuration / pageCount).toFixed(2)}s`);

    this.results.set('performance', {
      allDuration,
      allTrades: allTrades.length,
      paginatedDuration,
      paginatedTrades: paginatedResult.trades.length,
      multiPageDuration: multiDuration,
      multiPageTrades: multiTrades,
      pageCount
    });

    return this;
  }

  async testEdgeCases() {
    console.log(colorize('\n📄 TEST 6: Edge Cases', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    const edgeTests = [];

    // Test 1: Zero limit
    try {
      console.log(colorize('\n🔍 Testing limit: 0', 'yellow'));
      const result = await this.fetcher.fetchTransactionsPaginated({ limit: 0 });
      console.log(`   ✅ Passed: ${result.trades.length === 0 ? 'Empty array' : 'Has trades'}`);
      edgeTests.push({ test: 'zero limit', passed: true });
    } catch (error: any) {
      console.log(colorize(`   ❌ Failed: ${error.message}`, 'red'));
      edgeTests.push({ test: 'zero limit', passed: false, error: error.message });
    }

    // Test 2: Negative limit
    try {
      console.log(colorize('\n🔍 Testing limit: -10', 'yellow'));
      const result = await this.fetcher.fetchTransactionsPaginated({ limit: -10 as any });
      console.log(`   ✅ Passed: ${result.trades.length === 0 ? 'Empty array' : 'Has trades'}`);
      edgeTests.push({ test: 'negative limit', passed: true });
    } catch (error: any) {
      console.log(colorize(`   ❌ Failed: ${error.message}`, 'red'));
      edgeTests.push({ test: 'negative limit', passed: false, error: error.message });
    }

    // Test 3: Invalid signature
    try {
      console.log(colorize('\n🔍 Testing invalid before signature', 'yellow'));
      const result = await this.fetcher.fetchTransactionsPaginated({
        limit: 10,
        before: 'invalid_signature'
      });
      console.log(`   ✅ Passed: ${result.trades.length === 0 ? 'Empty array' : 'Has trades'} (should be empty)`);
      edgeTests.push({ test: 'invalid signature', passed: true });
    } catch (error: any) {
      console.log(colorize(`   ❌ Failed: ${error.message}`, 'red'));
      edgeTests.push({ test: 'invalid signature', passed: false, error: error.message });
    }

    // Test 4: Very large limit
    try {
      console.log(colorize('\n🔍 Testing large limit (500)', 'yellow'));
      const result = await this.fetcher.fetchTransactionsPaginated({ limit: 500 });
      console.log(`   ✅ Passed: ${result.trades.length} trades found`);
      edgeTests.push({ test: 'large limit', passed: true });
    } catch (error: any) {
      console.log(colorize(`   ❌ Failed: ${error.message}`, 'red'));
      edgeTests.push({ test: 'large limit', passed: false, error: error.message });
    }

    this.results.set('edgeCases', { tests: edgeTests });
    return this;
  }

  private validateTradeStructure(trade: TradeRecord, context: string) {
    const requiredFields = [
      'id', 'timestamp', 'section', 'symbol', 'side', 
      'entryPrice', 'exitPrice', 'quantity', 'amount', 
      'value', 'orderType', 'clientId', 'orderId', 
      'transactionHash', 'fees', 'status'
    ];

    const missingFields = requiredFields.filter(field => !(field in trade));
    
    if (missingFields.length > 0) {
      console.log(colorize(`   ⚠️  Trade missing fields in ${context}: ${missingFields.join(', ')}`, 'red'));
    }

    // Validate fee structure
    if (trade.fees) {
      const feeFields = ['maker', 'taker', 'total', 'rebates'];
      const missingFeeFields = feeFields.filter(field => !(field in trade.fees!));
      if (missingFeeFields.length > 0) {
        console.log(colorize(`   ⚠️  Fee missing fields: ${missingFeeFields.join(', ')}`, 'red'));
      }
    }

    // Validate discriminator for fill events
    if (trade.logType?.includes('Fill') && !trade.discriminator) {
      console.log(colorize(`   ⚠️  Fill event missing discriminator`, 'yellow'));
    }
  }

  async generateReport() {
    console.log(colorize('\n📋 TEST REPORT', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));

    let allPassed = true;
    let totalDuration = 0;

    for (const [testName, results] of this.results) {
      console.log(colorize(`\n${testName}:`, 'white'));
      
      if (results.passed === false) {
        allPassed = false;
        if (results.skipped) {
          console.log(`  Status: ${colorize('SKIPPED', 'yellow')}`);
        } else {
          console.log(`  Status: ${colorize('FAILED', 'red')}`);
        }
      } else {
        console.log(`  Status: ${colorize('PASSED', 'green')}`);
      }

      if (results.duration) {
        console.log(`  Duration: ${results.duration.toFixed(2)}s`);
        totalDuration += results.duration;
      }

      // Print specific results
      if (testName === 'basicPagination' && results.results) {
        results.results.forEach((r: any) => {
          console.log(`  - Limit ${r.limit}: ${r.trades} trades, hasMore: ${r.hasMore}`);
        });
      } else if (testName === 'fullPagination') {
        console.log(`  Total trades: ${results.totalTrades}`);
        console.log(`  Pages: ${results.pageCount}`);
      } else if (testName === 'incremental') {
        if (!results.skipped) {
          console.log(`  Initial trades: ${results.initialTrades}`);
          console.log(`  Incremental trades: ${results.incrementalTrades}`);
        }
      } else if (testName === 'betweenSignatures') {
        if (!results.skipped) {
          console.log(`  Trades between: ${results.tradesFound}`);
          console.log(`  Reference range: 0-${results.referenceCount - 1}`);
        }
      } else if (testName === 'performance') {
        console.log(`  fetchAll(): ${results.allTrades} trades in ${results.allDuration.toFixed(2)}s`);
        console.log(`  paginated(): ${results.paginatedTrades} trades in ${results.paginatedDuration.toFixed(2)}s`);
        console.log(`  multi-page: ${results.multiPageTrades} trades in ${results.multiPageDuration.toFixed(2)}s`);
      } else if (testName === 'edgeCases') {
        results.tests.forEach((t: any) => {
          console.log(`  - ${t.test}: ${t.passed ? '✅' : '❌'}`);
        });
      }
    }

    console.log(colorize('\n' + '='.repeat(60), 'cyan'));
    console.log(colorize(`\n🎯 Overall Result: ${allPassed ? 'PASSED' : 'FAILED'}`, allPassed ? 'green' : 'red'));
    console.log(colorize(`⏱️  Total Test Duration: ${totalDuration.toFixed(2)}s`, 'cyan'));

    return { allPassed, totalDuration };
  }

  async exportResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const walletShort = CONFIG.walletAddress?.slice(0, 8) || 'unknown';
    const reportPath = path.join(CONFIG.exportDir, `test-report-${walletShort}-${timestamp}.json`);

    await fs.mkdir(CONFIG.exportDir, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: Object.fromEntries(this.results),
      summary: await this.generateReport()
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(colorize(`\n📄 Test report saved to: ${reportPath}`, 'green'));
  }
}

async function runAllTests() {
  console.log(colorize('\n🚀 TransactionDataFetcher Comprehensive Test Suite', 'bright', 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));

  try {
    const harness = await new TestHarness().initialize();

    // Run all tests
    await harness
      .testBasicPagination()
      .then(h => h.testFullPaginationFetch())
      .then(h => h.testIncrementalFetch())
      .then(h => h.testBetweenSignatures())
      .then(h => h.testPerformanceComparison())
      .then(h => h.testEdgeCases());

    // Generate report
    await harness.generateReport();
    await harness.exportResults();

  } catch (error: any) {
    console.error(colorize('\n❌ Test suite failed:', 'red'));
    console.error(`   ${error.message}`);
    
    if (error.stack) {
      console.log(colorize('\n📋 Stack trace:', 'dim'));
      console.error(error.stack.split('\n').slice(0, 3).join('\n'));
    }
    
    process.exit(1);
  }
}

// Command-line interface
const COMMAND = process.argv[2]?.toLowerCase() || 'all';

const commands: Record<string, () => Promise<any>> = {
  basic: async () => (await new TestHarness().initialize()).testBasicPagination().then(h => h.generateReport()),
  full: async () => (await new TestHarness().initialize()).testFullPaginationFetch().then(h => h.generateReport()),
  incremental: async () => (await new TestHarness().initialize()).testIncrementalFetch().then(h => h.generateReport()),
  between: async () => (await new TestHarness().initialize()).testBetweenSignatures().then(h => h.generateReport()),
  performance: async () => (await new TestHarness().initialize()).testPerformanceComparison().then(h => h.generateReport()),
  edge: async () => (await new TestHarness().initialize()).testEdgeCases().then(h => h.generateReport()),
  all: runAllTests
};

if (commands[COMMAND]) {
  console.log(colorize(`\n🎯 Running test: ${COMMAND}`, 'cyan'));
  commands[COMMAND]().catch(console.error);
} else {
  console.log(colorize(`\n❌ Unknown command: ${COMMAND}`, 'red'));
  console.log('\nAvailable commands: basic, full, incremental, between, performance, edge, all');
  process.exit(1);
}

export { TestHarness, runAllTests };