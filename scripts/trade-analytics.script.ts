/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicKey } from "@solana/web3.js";
import { TransactionDataFetcher, TradeAnalyticsCalculator, PnLCalculator } from "../services";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// Configuration
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || ""; // Add your wallet address
const PROGRAM_ID = process.env.PROGRAM_ID || ""; // Add your program ID

interface TestResults {
  fetchResults: {
    totalTransactions: number;
    tradesFound: number;
    timeElapsed: number;
  };
  analytics: any;
  exports: {
    csvPath?: string;
    jsonPath?: string;
  };
  validation: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testAnalyticsFeature() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 TRADING ANALYTICS TEST SUITE");
  console.log("=".repeat(80));

  const results: TestResults = {
    fetchResults: {
      totalTransactions: 0,
      tradesFound: 0,
      timeElapsed: 0,
    },
    analytics: {},
    exports: {},
    validation: {
      passed: true,
      errors: [],
      warnings: [],
    },
  };

  // Validate environment
  if (!WALLET_ADDRESS) {
    results.validation.errors.push("WALLET_ADDRESS not set in .env file");
    results.validation.passed = false;
  }
  if (!PROGRAM_ID) {
    results.validation.warnings.push(
      "PROGRAM_ID not set - some features may be limited",
    );
  }

  if (!results.validation.passed) {
    console.error(
      "\n❌ Configuration errors found. Please check your .env file:",
    );
    results.validation.errors.forEach((err) => console.error(`   - ${err}`));
    return results;
  }

  try {
    // Step 1: Initialize Data Fetcher
    console.log("\n🔄 Step 1: Initializing TransactionDataFetcher...");
    const startTime = Date.now();

    const fetcher = new TransactionDataFetcher(
      RPC_URL,
      PROGRAM_ID,
      14, // version
      300, // delay between requests
    );

    const walletPublicKey = new PublicKey(WALLET_ADDRESS);
    await fetcher.initialize(walletPublicKey);

    // Wait for token registry to load
    await sleep(2000);

    console.log("✅ DataFetcher initialized successfully");

    // Step 2: Fetch Transactions
    console.log("\n🔄 Step 2: Fetching transactions...");

    let allTrades: any[] = [];
    let hasMore = true;
    let lastSignature: string | undefined;
    let pageCount = 0;
    const maxPages = 5; // Limit to 5 pages for testing

    while (hasMore && pageCount < maxPages) {
      pageCount++;
      console.log(`\n📄 Fetching page ${pageCount}...`);

      const result = await fetcher.fetchTransactionsPaginated({
        limit: 50,
        before: lastSignature,
      });

      allTrades = [...allTrades, ...result.trades];
      hasMore = result.hasMore;
      lastSignature = result.lastSignature;

      console.log(`   Page ${pageCount}: Found ${result.trades.length} trades`);

      if (hasMore && pageCount < maxPages) {
        console.log("   Waiting before next page...");
        await sleep(1000);
      }
    }

    const fetchTime = (Date.now() - startTime) / 1000;
    results.fetchResults = {
      totalTransactions: pageCount * 50,
      tradesFound: allTrades.length,
      timeElapsed: fetchTime,
    };

    console.log(
      `\n✅ Fetched ${allTrades.length} trades across ${pageCount} pages in ${fetchTime.toFixed(2)}s`,
    );

    if (allTrades.length === 0) {
      results.validation.warnings.push("No trades found to analyze");
      return results;
    }

    console.log("\n🔄 Calculating PnL by pairing entry/exit trades...");

    // Use the PnL calculator
    const pnlCalculator = new PnLCalculator(allTrades);
    const tradesWithPnL = pnlCalculator.calculatePnL(); // or calculateAverageCostPnL()

    // Step 3: Display Sample Trades
    console.log("\n📋 Sample Trades (first 5):");
    console.log("-".repeat(80));
    allTrades.slice(0, 5).forEach((trade, index) => {
      console.log(`\nTrade #${index + 1}:`);
      console.log(`   ID: ${trade.id}`);
      console.log(`   Symbol: ${trade.symbol}`);
      console.log(`   Side: ${trade.side}`);
      console.log(`   Price: $${trade.entryPrice.toFixed(4)}`);
      console.log(`   Quantity: ${trade.quantity.toFixed(4)}`);
      console.log(`   Value: $${trade.value.toFixed(2)}`);
      console.log(`   Type: ${trade.tradeType}`);
      console.log(`   Time: ${trade.timestamp.toLocaleString()}`);
      console.log(
        `   Discriminator: ${trade.discriminator} (${trade.logType})`,
      );
    });

    // Step 4: Run Analytics
    console.log("\n🔄 Step 3: Running Trade Analytics...");
    const analyticsStart = Date.now();

    const calculator = new TradeAnalyticsCalculator(allTrades);
    const report = calculator.generateFullReport();

    const analyticsTime = (Date.now() - analyticsStart) / 1000;
    console.log(`✅ Analytics completed in ${analyticsTime.toFixed(2)}s`);

    // Step 5: Display Analytics Results
    console.log("\n📊 ANALYTICS REPORT");
    console.log("=".repeat(80));

    // Summary
    console.log("\n📈 SUMMARY STATISTICS:");
    console.log("-".repeat(40));
    console.log(`Total Trades:        ${report.summary.totalTrades}`);
    console.log(`Total PnL:           $${report.summary.totalPnl.toFixed(2)}`);
    console.log(
      `Total Volume:        $${report.summary.totalVolume.toFixed(2)}`,
    );
    console.log(`Win Rate:            ${report.summary.winRate.toFixed(2)}%`);
    console.log(
      `Profit Factor:       ${report.summary.profitFactor.toFixed(2)}`,
    );
    console.log(`Average Win:         $${report.summary.avgWin.toFixed(2)}`);
    console.log(`Average Loss:        $${report.summary.avgLoss.toFixed(2)}`);
    console.log(
      `Largest Gain:        $${report.summary.largestGain.toFixed(2)}`,
    );
    console.log(
      `Largest Loss:        $${report.summary.largestLoss.toFixed(2)}`,
    );
    console.log(
      `Max Drawdown:        $${report.summary.maxDrawdown.toFixed(2)}`,
    );
    console.log(
      `Current Drawdown:    $${report.summary.currentDrawdown.toFixed(2)}`,
    );

    // Directional Bias
    console.log("\n🎯 DIRECTIONAL BIAS:");
    console.log("-".repeat(40));
    console.log(`Long Trades:         ${report.directional.long}`);
    console.log(`Short Trades:        ${report.directional.short}`);
    console.log(`Long/Short Ratio:    ${report.directional.ratio.toFixed(2)}`);
    console.log(
      `Long Volume:         $${report.directional.longVolume.toFixed(2)}`,
    );
    console.log(
      `Short Volume:        $${report.directional.shortVolume.toFixed(2)}`,
    );

    // Timing Analysis
    console.log("\n⏰ TIMING ANALYSIS:");
    console.log("-".repeat(40));
    console.log(
      `Avg Trade Duration:  ${(report.timing.avgDuration / 60).toFixed(2)} minutes`,
    );

    console.log("\nSession Performance:");
    Object.entries(report.timing.sessionAnalysis).forEach(
      ([session, stats]: [string, any]) => {
        console.log(`   ${session.toUpperCase()}:`);
        console.log(`      Trades: ${stats.trades}`);
        console.log(`      PnL: $${stats.pnl.toFixed(2)}`);
        console.log(
          `      Win Rate: ${stats.trades > 0 ? ((stats.wins / stats.trades) * 100).toFixed(2) : 0}%`,
        );
      },
    );

    // Symbol Performance
    console.log("\n💰 SYMBOL PERFORMANCE:");
    console.log("-".repeat(40));
    Object.entries(report.symbols).forEach(([symbol, stats]: [string, any]) => {
      console.log(`\n${symbol}:`);
      console.log(`   Trades: ${stats.trades}`);
      console.log(`   PnL: $${stats.pnl.toFixed(2)}`);
      console.log(`   Volume: $${stats.volume.toFixed(2)}`);
      console.log(`   Win Rate: ${stats.winRate.toFixed(2)}%`);
    });

    // Order Type Performance
    console.log("\n📦 ORDER TYPE PERFORMANCE:");
    console.log("-".repeat(40));
    Object.entries(report.orderTypes).forEach(
      ([type, stats]: [string, any]) => {
        if (stats.count > 0) {
          console.log(`\n${type.toUpperCase()}:`);
          console.log(`   Count: ${stats.count}`);
          console.log(`   PnL: $${stats.pnl.toFixed(2)}`);
          console.log(`   Win Rate: ${stats.winRate.toFixed(2)}%`);
        }
      },
    );

    // Fee Analysis
    console.log("\n💸 FEE ANALYSIS:");
    console.log("-".repeat(40));
    console.log(`Total Fees:          $${report.fees.totalFees.toFixed(4)}`);
    console.log(`Total Rebates:       $${report.fees.totalRebates.toFixed(4)}`);
    console.log(`Net Fees:            $${report.fees.netFees.toFixed(4)}`);
    console.log(
      `Funding Payments:    $${report.fees.fundingPayments.toFixed(4)}`,
    );
    console.log(`\nFee Breakdown:`);
    console.log(
      `   Spot Fees:        $${report.fees.feeBreakdown.spot.toFixed(4)}`,
    );
    console.log(
      `   Perp Fees:        $${report.fees.feeBreakdown.perp.toFixed(4)}`,
    );

    // Daily PnL
    console.log("\n📅 DAILY PNL (Last 7 days):");
    console.log("-".repeat(40));
    const dailyEntries = Object.entries(report.timing.dailyPnl).slice(-7);
    dailyEntries.forEach(([date, pnl]) => {
      const pnlNumber = pnl as number;
      const pnlColor = pnlNumber > 0 ? "🟢" : pnlNumber < 0 ? "🔴" : "⚪";
      console.log(`   ${date}: ${pnlColor} $${pnlNumber.toFixed(2)}`);
    });

    // Step 6: Export Data
    console.log("\n🔄 Step 4: Exporting data...");

    // Create exports directory if it doesn't exist
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    // Step 7: Run Validation Tests
    console.log("\n🔄 Step 5: Running validation tests...");

    // Test 1: Check PnL consistency
    const totalPnlFromTrades = allTrades.reduce((sum, t) => sum + t.pnl, 0);
    if (Math.abs(totalPnlFromTrades - report.summary.totalPnl) > 0.01) {
      results.validation.errors.push("PnL calculation mismatch");
    }

    // Test 2: Check win rate calculation
    const calculatedWinRate = report.summary.winRate;
    const expectedWinRate =
      (allTrades.filter((t) => t.pnl > 0).length /
        allTrades.filter(
          (t) => t.discriminator === 11 || t.discriminator === 19,
        ).length) *
      100;

    if (Math.abs(calculatedWinRate - expectedWinRate) > 0.01) {
      results.validation.errors.push("Win rate calculation mismatch");
    }

    // Test 3: Check volume calculation
    const calculatedVolume = report.summary.totalVolume;
    const expectedVolume = allTrades.reduce(
      (sum, t) => sum + (t.value || 0),
      0,
    );

    if (Math.abs(calculatedVolume - expectedVolume) > 0.01) {
      results.validation.errors.push("Volume calculation mismatch");
    }

    // Test 4: Check trade classification
    const spotTrades = allTrades.filter((t) => t.tradeType === "spot").length;
    const perpTrades = allTrades.filter((t) => t.tradeType === "perp").length;

    if (spotTrades + perpTrades !== allTrades.length) {
      results.validation.warnings.push(
        "Some trades missing tradeType classification",
      );
    }

    // Test 5: Check for missing data
    const missingSymbols = allTrades.filter(
      (t) => t.symbol === "UNKNOWN" || t.symbol.includes(".."),
    ).length;
    if (missingSymbols > 0) {
      results.validation.warnings.push(
        `${missingSymbols} trades have unknown symbols`,
      );
    }

    const missingPnL = allTrades.filter(
      (t) => t.pnl === 0 && (t.discriminator === 11 || t.discriminator === 19),
    ).length;
    if (missingPnL > 0) {
      results.validation.warnings.push(
        `${missingPnL} fills have zero PnL (may need entry/exit pairing)`,
      );
    }

    results.validation.passed = results.validation.errors.length === 0;

    // Final Results
    console.log("\n" + "=".repeat(80));
    console.log("✅ TEST RESULTS SUMMARY");
    console.log("=".repeat(80));

    console.log(`\n📊 Data Fetching:`);
    console.log(
      `   ✓ Transactions scanned: ${results.fetchResults.totalTransactions}`,
    );
    console.log(`   ✓ Trades extracted: ${results.fetchResults.tradesFound}`);
    console.log(
      `   ⏱️  Time elapsed: ${results.fetchResults.timeElapsed.toFixed(2)}s`,
    );

    console.log(`\n🔍 Validation:`);
    console.log(`   ${results.validation.passed ? "✓ PASSED" : "❌ FAILED"}`);

    if (results.validation.errors.length > 0) {
      console.log(`\n   Errors:`);
      results.validation.errors.forEach((err) => console.log(`   ❌ ${err}`));
    }

    if (results.validation.warnings.length > 0) {
      console.log(`\n   Warnings:`);
      results.validation.warnings.forEach((warn) =>
        console.log(`   ⚠️  ${warn}`),
      );
    }

    console.log(`\n📁 Exports:`);
    console.log(`   ✓ CSV: ${path.basename(results.exports.csvPath || "")}`);
    console.log(`   ✓ JSON: ${path.basename(results.exports.jsonPath || "")}`);

    return results;
  } catch (error: any) {
    console.error("\n❌ Test failed with error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }

    results.validation.passed = false;
    results.validation.errors.push(error.message);
    return results;
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsFeature().then((results) => {
    console.log("\n" + "=".repeat(80));
    if (results.validation.passed) {
      console.log("🎉 All analytics tests passed successfully!");
    } else {
      console.log("❌ Analytics tests failed. Check the errors above.");
    }
    console.log("=".repeat(80));

    // Exit with appropriate code
    process.exit(results.validation.passed ? 0 : 1);
  });
}

export { testAnalyticsFeature };
