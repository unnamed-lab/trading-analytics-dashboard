#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * test-transaction-fetcher.ts
 * 
 * Real-time test script for TransactionDataFetcher
 * Run with: npx tsx test-transaction-fetcher.ts
 * 
 * Environment variables:
 * - SOLANA_RPC_URL: RPC endpoint (default: https://api.devnet.solana.com)
 * - WALLET_ADDRESS: Wallet to fetch transactions for (required)
 * - PROGRAM_ID: Deriverse program ID (optional)
 * - ENGINE_VERSION: Engine version (default: 14)
 * - MAX_TRANSACTIONS: Max transactions to fetch (default: 100)
 * - REQUEST_DELAY: Delay between requests in ms (default: 300)
 * - EXPORT_FORMAT: Export format - csv, json, or both (default: console)
 */

import 'dotenv/config';
import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TradeRecord } from '@/types';
import { TransactionDataFetcher } from '@/services/fetch-data.service';

// Configuration from environment variables
const CONFIG = {
  rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  walletAddress: process.env.DEBUG_SOLANA_WALLET,
  programId: process.env.PROGRAM_ID,
  version: process.env.ENGINE_VERSION ? parseInt(process.env.ENGINE_VERSION) : 14,
  maxTransactions: process.env.MAX_TRANSACTIONS ? parseInt(process.env.MAX_TRANSACTIONS) : 100,
  requestDelay: process.env.REQUEST_DELAY ? parseInt(process.env.REQUEST_DELAY) : 300,
  exportFormat: (process.env.EXPORT_FORMAT || 'console') as 'console' | 'csv' | 'json' | 'both',
  exportDir: process.env.EXPORT_DIR || './exports'
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

async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function exportTrades(
  trades: TradeRecord[], 
  format: 'csv' | 'json' | 'both',
  dir: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const walletShort = CONFIG.walletAddress?.slice(0, 8) || 'unknown';
  
  await ensureDirectory(dir);
  
  if (format === 'csv' || format === 'both') {
    const csvPath = path.join(dir, `trades-${walletShort}-${timestamp}.csv`);
    const csvContent = new TransactionDataFetcher(CONFIG.rpcUrl).exportToCSV(trades);
    await fs.writeFile(csvPath, csvContent);
    console.log(colorize(`✅ CSV export saved to: ${csvPath}`, 'green'));
  }
  
  if (format === 'json' || format === 'both') {
    const jsonPath = path.join(dir, `trades-${walletShort}-${timestamp}.json`);
    const jsonContent = new TransactionDataFetcher(CONFIG.rpcUrl).exportToJSON(trades);
    await fs.writeFile(jsonPath, jsonContent);
    console.log(colorize(`✅ JSON export saved to: ${jsonPath}`, 'green'));
  }
}

function printSummary(trades: TradeRecord[], summary: any): void {
  console.log('\n' + colorize('='.repeat(80), 'cyan'));
  console.log(colorize('📊 TRADING SUMMARY', 'bright', 'cyan'));
  console.log(colorize('='.repeat(80), 'cyan'));
  
  console.log(`\n${colorize('📈 Overview:', 'bright', 'white')}`);
  console.log(`   Total Transactions Processed: ${colorize(summary.totalTrades.toString(), 'yellow')}`);
  console.log(`   ├─ Spot Trades: ${colorize(summary.spotTrades.toString(), 'blue')}`);
  console.log(`   └─ Perp Trades: ${colorize(summary.perpTrades.toString(), 'magenta')}`);
  
  console.log(`\n${colorize('🔄 Order Types:', 'bright', 'white')}`);
  console.log(`   Fills: ${colorize(summary.tradeFills.toString(), 'green')}`);
  console.log(`   Cancels: ${colorize(summary.orderCancels.toString(), 'yellow')}`);
  console.log(`   Revokes: ${colorize(summary.orderRevokes.toString(), 'red')}`);
  
  console.log(`\n${colorize('💰 Financial Summary:', 'bright', 'white')}`);
  console.log(`   Total Volume: ${colorize(summary.totalVolume.toFixed(4), 'cyan')} USDC`);
  console.log(`   Total Fees: ${colorize(summary.totalFees.toFixed(6), 'red')} USDC`);
  console.log(`   Total Rebates: ${colorize(summary.totalRebates.toFixed(6), 'green')} USDC`);
  console.log(`   Net Fees: ${colorize(summary.netFees.toFixed(6), summary.netFees > 0 ? 'red' : 'green')} USDC`);
  
  if (summary.totalFunding !== 0) {
    console.log(`   Total Funding: ${colorize(summary.totalFunding.toFixed(6), summary.totalFunding > 0 ? 'green' : 'red')} USDC`);
  }
  
  if (summary.totalSocializedLoss !== 0) {
    console.log(`   Socialized Loss: ${colorize(summary.totalSocializedLoss.toFixed(6), 'red')} USDC`);
  }
  
  console.log(`   Net PnL: ${colorize(summary.netPnl.toFixed(4), summary.netPnl > 0 ? 'green' : 'red')} USDC`);
  
  console.log(`\n${colorize('🎯 Performance:', 'bright', 'white')}`);
  console.log(`   Winning Trades: ${colorize(summary.winningTrades.toString(), 'green')}`);
  console.log(`   Losing Trades: ${colorize(summary.losingTrades.toString(), 'red')}`);
  console.log(`   Breakeven: ${colorize(summary.breakevenTrades.toString(), 'yellow')}`);
  
  if (summary.totalTrades > 0) {
    const winRate = (summary.winningTrades / summary.totalTrades * 100).toFixed(1);
    console.log(`   Win Rate: ${colorize(`${winRate}%`, parseFloat(winRate) > 50 ? 'green' : 'red')}`);
  }
}

function printTradesTable(trades: TradeRecord[]): void {
  if (trades.length === 0) return;
  
  console.log('\n' + colorize('='.repeat(120), 'cyan'));
  console.log(colorize('📋 RECENT TRADES', 'bright', 'cyan'));
  console.log(colorize('='.repeat(120), 'cyan'));
  
  // Header
  console.log(
    colorize('Date'.padEnd(20), 'dim') +
    colorize('Type'.padEnd(10), 'dim') +
    colorize('Side'.padEnd(8), 'dim') +
    colorize('Symbol'.padEnd(12), 'dim') +
    colorize('Price'.padEnd(14), 'dim') +
    colorize('Quantity'.padEnd(14), 'dim') +
    colorize('Value'.padEnd(14), 'dim') +
    colorize('Fee'.padEnd(12), 'dim') +
    colorize('Status'.padEnd(10), 'dim') +
    colorize('Order ID'.substring(0, 8).padEnd(10), 'dim')
  );
  console.log(colorize('-'.repeat(120), 'dim'));
  
  // Show last 10 trades
  trades.slice(0, 10).forEach(trade => {
    const date = trade.timestamp.toLocaleString().slice(0, 16);
    const type = (trade.tradeType || '').padEnd(10);
    const side = colorize(
      trade.side.padEnd(8),
      trade.side === 'buy' || trade.side === 'long' ? 'green' : 'red'
    );
    const symbol = (trade.symbol || 'UNKNOWN').padEnd(12);
    const price = trade.entryPrice.toFixed(4).padEnd(14);
    const qty = trade.quantity.toFixed(4).padEnd(14);
    const value = (trade?.value || 0).toFixed(4).padEnd(14);
    const fee = (trade.fees.total || 0).toFixed(6).padEnd(12);
    const status = colorize(
      trade.status.padEnd(10),
      trade.status === 'win' ? 'green' : trade.status === 'loss' ? 'red' : 'yellow'
    );
    const orderId = (trade.orderId || '').slice(0, 8).padEnd(10);
    
    console.log(
      date.padEnd(20) +
      type +
      side +
      symbol +
      price +
      qty +
      value +
      fee +
      status +
      orderId
    );
  });
}

async function runTest() {
  console.log(colorize('\n🚀 TransactionDataFetcher Test Script', 'bright', 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));
  
  // Validate required configuration
  if (!CONFIG.walletAddress) {
    console.error(colorize('❌ Error: WALLET_ADDRESS environment variable is required', 'red'));
    console.log('\nUsage:');
    console.log('  WALLET_ADDRESS=your_wallet_address npx tsx test-transaction-fetcher.ts');
    console.log('\nOptional:');
    console.log('  SOLANA_RPC_URL=your_rpc_url            # Default: https://api.devnet.solana.com');
    console.log('  PROGRAM_ID=your_program_id             # Default: Drvrseg8AQLP8B96DBGmHRjFGviFNYTkHueY9g3k27Gu');
    console.log('  MAX_TRANSACTIONS=100                   # Default: 100');
    console.log('  EXPORT_FORMAT=console|csv|json|both    # Default: console');
    process.exit(1);
  }

  try {
    // Initialize fetcher
    console.log(colorize('\n🔧 Initializing TransactionDataFetcher...', 'yellow'));
    console.log(`   RPC URL: ${colorize(CONFIG.rpcUrl, 'blue')}`);
    console.log(`   Wallet: ${colorize(CONFIG.walletAddress, 'cyan')}`);
    console.log(`   Program ID: ${colorize(CONFIG.programId || 'default', 'magenta')}`);
    console.log(`   Version: ${colorize(CONFIG.version.toString(), 'yellow')}`);
    console.log(`   Max Transactions: ${colorize(CONFIG.maxTransactions.toString(), 'yellow')}`);
    
    const fetcher = new TransactionDataFetcher(
      CONFIG.rpcUrl,
      CONFIG.programId,
      CONFIG.version,
      CONFIG.requestDelay,
      CONFIG.maxTransactions
    );
    
    const walletPublicKey = new PublicKey(CONFIG.walletAddress);
    
    // Measure performance
    const startTime = Date.now();
    
    await fetcher.initialize(walletPublicKey);
    
    // Fetch transactions
    console.log(colorize('\n📡 Fetching transactions...', 'yellow'));
    const trades = await fetcher.fetchAllTransactions();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(colorize(`\n✅ Test completed in ${duration}s`, 'green'));
    
    // Results
    console.log(colorize('\n📦 RESULTS', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));
    console.log(`   Total trades found: ${colorize(trades.length.toString(), trades.length > 0 ? 'green' : 'red')}`);
    
    if (trades.length > 0) {
      // Calculate summary
      const summary = fetcher.getSummary(trades);
      
      // Print summary
      printSummary(trades, summary);
      
      // Print trades table
      printTradesTable(trades);
      
      // Export if configured
      if (CONFIG.exportFormat !== 'console') {
        await exportTrades(trades, CONFIG.exportFormat, CONFIG.exportDir);
      }
      
      // Print sample of decoded data
      console.log('\n' + colorize('🔍 SAMPLE DECODED EVENT', 'bright', 'cyan'));
      console.log(colorize('='.repeat(60), 'cyan'));
      
      const sampleTrade = trades[0];
      console.log(`   Transaction: ${colorize(sampleTrade.transactionHash.slice(0, 32) + '...', 'dim')}`);
      console.log(`   Log Type: ${colorize(sampleTrade.logType || 'Unknown', 'yellow')}`);
      console.log(`   Discriminator: ${colorize(sampleTrade.discriminator?.toString() || 'N/A', 'cyan')}`);
      
      if (sampleTrade.rawLogMessage) {
        console.log(`   Raw Log: ${colorize(sampleTrade.rawLogMessage.slice(0, 100) + '...', 'dim')}`);
      }
      
      // Group trades by date
      const tradesByDate = trades.reduce((acc, trade) => {
        const date = trade.timestamp.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n' + colorize('📅 TRADES BY DATE', 'bright', 'cyan'));
      console.log(colorize('='.repeat(60), 'cyan'));
      Object.entries(tradesByDate)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 5)
        .forEach(([date, count]: any) => {
          console.log(`   ${date}: ${colorize(count.toString(), count > 5 ? 'green' : 'yellow')} trades`);
        });
      
    } else {
      console.log(colorize('\n⚠️  No trades found. This could mean:', 'yellow'));
      console.log('   1. The wallet has no trading activity');
      console.log('   2. The program ID is incorrect');
      console.log('   3. Transactions are on a different network');
      console.log('   4. Need to increase MAX_TRANSACTIONS limit');
    }
    
    // Configuration summary
    console.log('\n' + colorize('⚙️  TEST CONFIGURATION', 'bright', 'cyan'));
    console.log(colorize('='.repeat(60), 'cyan'));
    console.log(`   RPC URL: ${CONFIG.rpcUrl}`);
    console.log(`   Wallet: ${CONFIG.walletAddress}`);
    console.log(`   Program ID: ${CONFIG.programId || 'default'}`);
    console.log(`   Version: ${CONFIG.version}`);
    console.log(`   Max Transactions: ${CONFIG.maxTransactions}`);
    console.log(`   Request Delay: ${CONFIG.requestDelay}ms`);
    console.log(`   Export Format: ${CONFIG.exportFormat}`);
    console.log(`   Duration: ${duration}s`);
    
  } catch (error: any) {
    console.error(colorize('\n❌ Test failed:', 'red'));
    console.error(`   ${error.message}`);
    
    if (error.stack) {
      console.log(colorize('\n📋 Stack trace:', 'dim'));
      console.error(error.stack.split('\n').slice(0, 3).join('\n'));
    }
    
    // Helpful error messages
    if (error.message.includes('Invalid public key')) {
      console.log(colorize('\n💡 Tip: The WALLET_ADDRESS format appears invalid', 'yellow'));
      console.log('   Make sure it\'s a valid Solana public key (base58)');
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      console.log(colorize('\n💡 Tip: Network connection issue', 'yellow'));
      console.log('   Check your RPC URL and internet connection');
    } else if (error.message.includes('initialized')) {
      console.log(colorize('\n💡 Tip: Engine initialization failed', 'yellow'));
      console.log('   Verify PROGRAM_ID and ENGINE_VERSION are correct');
    }
    
    process.exit(1);
  }
}

// Add script description
if (require.main === module) {
  console.log(colorize('\n📘 TransactionDataFetcher Test Script', 'bright', 'white'));
  console.log(colorize('   This script tests the Deriverse transaction fetching functionality', 'dim'));
  console.log(colorize('   in real-time against Solana devnet/mainnet.', 'dim'));
  
  runTest().catch(console.error);
}

export { runTest };