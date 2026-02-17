import { TradeRecord } from "@/types";

export class PnLCalculator {
  private trades: TradeRecord[];

  constructor(trades: TradeRecord[]) {
    this.trades = [...trades].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Calculate PnL by pairing entry and exit fills using FIFO.
   *
   * Rules:
   *  • Only discriminator 11 (spotFill) and 19 (perpFill) are matched.
   *  • "Entry"  = buy / long side
   *  • "Exit"   = sell / short side  (closes a long)
   *  •  OR:
   *  • "Entry"  = short / sell side  (opens a short)
   *  • "Exit"   = buy  / long  side  (closes a short)
   *
   * We track open positions per symbol grouped by trade direction so that
   * longs and shorts are matched independently.
   *
   * Fees recorded on each fill are proportionally allocated to the matched
   * quantity so a partial close only charges the correct fraction of fees.
   */
  calculatePnL(): TradeRecord[] {
    const result: TradeRecord[] = [];

    // openPositions[symbol][direction] = queue of open positions
    // direction: "long" | "short"
    const openPositions: Map<
      string,
      Map<"long" | "short", Array<{ trade: TradeRecord; remainingQty: number }>>
    > = new Map();

    const getQueue = (symbol: string, dir: "long" | "short") => {
      if (!openPositions.has(symbol)) {
        openPositions.set(symbol, new Map());
      }
      const symMap = openPositions.get(symbol)!;
      if (!symMap.has(dir)) symMap.set(dir, []);
      return symMap.get(dir)!;
    };

    for (const trade of this.trades) {
      // Pass non-fill events through unchanged
      if (trade.discriminator !== 11 && trade.discriminator !== 19) {
        result.push({ ...trade });
        continue;
      }

      const isBuyOrLong = trade.side === "buy" || trade.side === "long";

      if (isBuyOrLong) {
        // ── Opening a long (or closing a short) ──────────────────────────
        const shortQueue = getQueue(trade.symbol, "short");

        if (shortQueue.length > 0) {
          // Closing an existing short position
          result.push(...this.matchAgainstQueue(trade, shortQueue, "short"));
        } else {
          // New long entry
          getQueue(trade.symbol, "long").push({
            trade,
            remainingQty: trade.quantity,
          });
          result.push({
            ...trade,
            pnl: 0,
            pnlPercentage: 0,
            status: "breakeven",
          });
        }
      } else {
        // ── Opening a short (or closing a long) ──────────────────────────
        const longQueue = getQueue(trade.symbol, "long");

        if (longQueue.length > 0) {
          // Closing an existing long position
          result.push(...this.matchAgainstQueue(trade, longQueue, "long"));
        } else {
          // New short entry
          getQueue(trade.symbol, "short").push({
            trade,
            remainingQty: trade.quantity,
          });
          result.push({
            ...trade,
            pnl: 0,
            pnlPercentage: 0,
            status: "breakeven",
          });
        }
      }
    }

    return result;
  }

  /**
   * Match an exit trade against a queue of open positions (FIFO).
   * Returns one TradeRecord per matched segment (usually just one).
   */
  private matchAgainstQueue(
    exitTrade: TradeRecord,
    queue: Array<{ trade: TradeRecord; remainingQty: number }>,
    openDirection: "long" | "short",
  ): TradeRecord[] {
    const results: TradeRecord[] = [];
    let remainingExitQty = exitTrade.quantity;
    let totalPnl = 0;
    let totalMatchedValue = 0;

    while (remainingExitQty > 0 && queue.length > 0) {
      const head = queue[0];
      const matchedQty = Math.min(head.remainingQty, remainingExitQty);

      const entryPrice = head.trade.entryPrice;
      const exitPrice = exitTrade.entryPrice || exitTrade.exitPrice || 0;

      const entryValue = matchedQty * entryPrice;
      const exitValue = matchedQty * exitPrice;

      // Proportional fee allocation
      const entryFee =
        (head.trade.fees?.total || 0) *
        (matchedQty / Math.max(head.trade.quantity, 1e-18));
      const exitFee =
        (exitTrade.fees?.total || 0) *
        (matchedQty / Math.max(exitTrade.quantity, 1e-18));

      // PnL direction:
      //  • closing a long  → exitValue - entryValue  (sell price minus buy price)
      //  • closing a short → entryValue - exitValue  (short entry minus buy-back)
      const rawPnl =
        openDirection === "long"
          ? exitValue - entryValue
          : entryValue - exitValue;

      const pnl = rawPnl - entryFee - exitFee;

      totalPnl += pnl;
      totalMatchedValue += exitValue;

      head.remainingQty -= matchedQty;
      remainingExitQty -= matchedQty;

      if (head.remainingQty <= 1e-12) queue.shift();
    }

    const pnlStatus: TradeRecord["status"] =
      totalPnl > 0 ? "win" : totalPnl < 0 ? "loss" : "breakeven";

    results.push({
      ...exitTrade,
      pnl: totalPnl,
      pnlPercentage:
        totalMatchedValue > 0 ? (totalPnl / totalMatchedValue) * 100 : 0,
      status: pnlStatus,
    });

    if (remainingExitQty > 1e-12) {
      console.warn(
        `⚠️ Unmatched exit quantity for ${exitTrade.symbol}: ${remainingExitQty.toFixed(6)}`,
      );
    }

    return results;
  }

  /**
   * Quick net summary: total realised PnL, fees paid, and net (PnL − fees + funding).
   */
  calculatePnLSummary(): {
    totalPnL: number;
    totalFees: number;
    totalFunding: number;
    netPnL: number;
  } {
    const detailed = this.calculatePnL();
    const totalPnL = detailed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalFees = this.trades.reduce(
      (sum, t) => sum + (t.fees?.total || 0),
      0,
    );
    const totalFunding = this.trades.reduce(
      (sum, t) => sum + (t.fundingPayments || 0),
      0,
    );
    return {
      totalPnL,
      totalFees,
      totalFunding,
      netPnL: totalPnL - totalFees + totalFunding,
    };
  }

  /**
   * Alternative PnL using the average-cost method (good for positions built
   * up in multiple legs).
   */
  calculateAverageCostPnL(): TradeRecord[] {
    const result: TradeRecord[] = [];
    // avgCosts[symbol][direction]
    const avgCosts: Map<
      string,
      Map<"long" | "short", { avgPrice: number; totalQty: number }>
    > = new Map();

    const getCost = (symbol: string, dir: "long" | "short") => {
      if (!avgCosts.has(symbol)) avgCosts.set(symbol, new Map());
      const m = avgCosts.get(symbol)!;
      if (!m.has(dir)) m.set(dir, { avgPrice: 0, totalQty: 0 });
      return m.get(dir)!;
    };

    for (const trade of this.trades) {
      if (trade.discriminator !== 11 && trade.discriminator !== 19) {
        result.push({ ...trade });
        continue;
      }

      const isBuyOrLong = trade.side === "buy" || trade.side === "long";
      const openDir: "long" | "short" = isBuyOrLong ? "long" : "short";
      const closeDir: "long" | "short" = isBuyOrLong ? "short" : "long";

      const closeCost = getCost(trade.symbol, closeDir);

      if (closeCost.totalQty > 1e-12) {
        // Closing an opposite position
        const exitPrice = trade.entryPrice;
        const rawPnl =
          closeDir === "long"
            ? (exitPrice - closeCost.avgPrice) * trade.quantity
            : (closeCost.avgPrice - exitPrice) * trade.quantity;
        const fee = trade.fees?.total || 0;
        const pnl = rawPnl - fee;
        const exitValue = exitPrice * trade.quantity;

        const pnlStatus: TradeRecord["status"] =
          pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven";

        result.push({
          ...trade,
          pnl,
          pnlPercentage: exitValue > 0 ? (pnl / exitValue) * 100 : 0,
          status: pnlStatus,
        });

        closeCost.totalQty = Math.max(0, closeCost.totalQty - trade.quantity);
        if (closeCost.totalQty < 1e-12) {
          closeCost.avgPrice = 0;
          closeCost.totalQty = 0;
        }
      } else {
        // Opening / adding to a position
        const cost = getCost(trade.symbol, openDir);
        const newTotalValue =
          cost.avgPrice * cost.totalQty + trade.entryPrice * trade.quantity;
        const newTotalQty = cost.totalQty + trade.quantity;
        cost.avgPrice = newTotalQty > 0 ? newTotalValue / newTotalQty : 0;
        cost.totalQty = newTotalQty;

        result.push({
          ...trade,
          pnl: 0,
          pnlPercentage: 0,
          status: "breakeven",
        });
      }
    }

    return result;
  }
}
