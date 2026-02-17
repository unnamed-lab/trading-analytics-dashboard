import { TradeRecord } from "@/types";

export class PnLCalculator {
  private trades: TradeRecord[];

  constructor(trades: TradeRecord[]) {
    // Sort chronologically for FIFO matching
    this.trades = [...trades].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Calculate PnL by matching entry and exit fills using FIFO.
   * Supports both spot (discriminator 11) and perp (discriminator 19) fills.
   */
  calculatePnL(): TradeRecord[] {
    const result: TradeRecord[] = [];

    // Track open positions per symbol: Map<symbol, Array<open positions>>
    const openPositions: Map<
      string,
      Array<{
        trade: TradeRecord;
        remainingQty: number;
        direction: "long" | "short";
      }>
    > = new Map();

    for (const trade of this.trades) {
      // Only process fill events
      if (trade.discriminator !== 11 && trade.discriminator !== 19) {
        result.push({ ...trade });
        continue;
      }

      // Normalize side to "long" or "short"
      const isLong = trade.side === "long" || trade.side === "buy";
      const direction = isLong ? "long" : "short";
      const oppositeDirection = isLong ? "short" : "long";

      // Get or create position queue for this symbol
      if (!openPositions.has(trade.symbol)) {
        openPositions.set(trade.symbol, []);
      }
      const positions = openPositions.get(trade.symbol)!;

      // Check if we have any opposite-direction positions to close
      const oppositePositions = positions.filter(
        (p) => p.direction === oppositeDirection,
      );

      if (oppositePositions.length > 0) {
        // Closing existing position(s)
        result.push(
          ...this.matchAgainstQueue(
            trade,
            oppositePositions,
            oppositeDirection,
          ),
        );

        // Remove fully closed positions
        const remainingPositions = positions.filter(
          (p) => p.remainingQty > 1e-12,
        );
        openPositions.set(trade.symbol, remainingPositions);
      } else {
        // Opening new position
        positions.push({
          trade,
          remainingQty: trade.quantity,
          direction,
        });

        // Return trade with zero PnL (opening)
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

  /**
   * Match an exit trade against open positions using FIFO
   */
  private matchAgainstQueue(
    exitTrade: TradeRecord,
    positions: Array<{
      trade: TradeRecord;
      remainingQty: number;
      direction: string;
    }>,
    closingDirection: "long" | "short",
  ): TradeRecord[] {
    const results: TradeRecord[] = [];
    let remainingExitQty = exitTrade.quantity;
    let totalPnl = 0;
    let totalExitValue = 0;

    // Process positions in FIFO order (as they appear in the array)
    for (let i = 0; i < positions.length && remainingExitQty > 1e-12; i++) {
      const position = positions[i];
      const matchedQty = Math.min(position.remainingQty, remainingExitQty);

      const entryPrice = position.trade.entryPrice || 0;
      const exitPrice = exitTrade.entryPrice || exitTrade.exitPrice || 0;

      // Calculate PnL based on direction being closed
      let rawPnl: number;
      if (closingDirection === "long") {
        // Closing a long: exit price - entry price
        rawPnl = (exitPrice - entryPrice) * matchedQty;
      } else {
        // Closing a short: entry price - exit price
        rawPnl = (entryPrice - exitPrice) * matchedQty;
      }

      // Calculate proportional fees
      const entryFee =
        (position.trade.fees?.total || 0) *
        (matchedQty / position.trade.quantity);
      const exitFee =
        (exitTrade.fees?.total || 0) * (matchedQty / exitTrade.quantity);

      // Net PnL after fees
      const pnl = rawPnl - entryFee - exitFee;

      totalPnl += pnl;
      totalExitValue += exitPrice * matchedQty;

      // Update remaining quantities
      position.remainingQty -= matchedQty;
      remainingExitQty -= matchedQty;
    }

    // Create result trade with calculated PnL
    const pnlStatus: TradeRecord["status"] =
      totalPnl > 1e-12 ? "win" : totalPnl < -1e-12 ? "loss" : "breakeven";

    results.push({
      ...exitTrade,
      pnl: totalPnl,
      pnlPercentage: totalExitValue > 0 ? (totalPnl / totalExitValue) * 100 : 0,
      status: pnlStatus,
    });

    // Log warning for unmatched quantity
    if (remainingExitQty > 1e-12) {
      console.warn(
        `⚠️ Unmatched exit quantity for ${exitTrade.symbol}: ${remainingExitQty.toFixed(6)}`,
      );
    }

    return results;
  }

  /**
   * Calculate PnL using average cost method (alternative approach)
   */
  calculateAverageCostPnL(): TradeRecord[] {
    const result: TradeRecord[] = [];

    // Track average cost per symbol: Map<symbol, { avgPrice: number; totalQty: number }>
    const avgCosts: Map<string, { avgPrice: number; totalQty: number }> =
      new Map();

    for (const trade of this.trades) {
      if (trade.discriminator !== 11 && trade.discriminator !== 19) {
        result.push({ ...trade });
        continue;
      }

      const isLong = trade.side === "long" || trade.side === "buy";

      if (!avgCosts.has(trade.symbol)) {
        avgCosts.set(trade.symbol, { avgPrice: 0, totalQty: 0 });
      }

      const cost = avgCosts.get(trade.symbol)!;

      if ((isLong && cost.totalQty < 0) || (!isLong && cost.totalQty > 0)) {
        // Closing trade - opposite direction of current position
        const closingQty = Math.min(Math.abs(cost.totalQty), trade.quantity);
        const entryPrice = cost.avgPrice;
        const exitPrice = trade.entryPrice || 0;

        // Calculate PnL based on position direction
        const rawPnl =
          cost.totalQty > 0
            ? (exitPrice - entryPrice) * closingQty // Closing long
            : (entryPrice - exitPrice) * closingQty; // Closing short

        const fee = trade.fees?.total || 0;
        const pnl = rawPnl - fee;
        const exitValue = exitPrice * closingQty;

        result.push({
          ...trade,
          pnl,
          pnlPercentage: exitValue > 0 ? (pnl / exitValue) * 100 : 0,
          status: pnl > 1e-12 ? "win" : pnl < -1e-12 ? "loss" : "breakeven",
        });

        // Update average cost
        cost.totalQty =
          cost.totalQty > 0
            ? cost.totalQty - closingQty
            : cost.totalQty + closingQty;

        if (Math.abs(cost.totalQty) < 1e-12) {
          cost.avgPrice = 0;
          cost.totalQty = 0;
        }
      } else {
        // Opening trade - same direction as current position
        const newTotalValue =
          cost.avgPrice * Math.abs(cost.totalQty) +
          (trade.entryPrice || 0) * trade.quantity;
        const newTotalQty = Math.abs(cost.totalQty) + trade.quantity;

        cost.avgPrice = newTotalQty > 0 ? newTotalValue / newTotalQty : 0;
        cost.totalQty = isLong ? newTotalQty : -newTotalQty;

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

  /**
   * Calculate summary statistics
   */
  calculatePnLSummary(): {
    totalPnL: number;
    totalFees: number;
    totalFunding: number;
    netPnL: number;
    totalVolume: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  } {
    const tradesWithPnL = this.calculatePnL();

    const totalPnL = tradesWithPnL.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalFees = this.trades.reduce(
      (sum, t) => sum + (t.fees?.total || 0),
      0,
    );
    const totalFunding = this.trades.reduce(
      (sum, t) => sum + (t.fundingPayments || 0),
      0,
    );
    const totalVolume = this.trades.reduce(
      (sum, t) => sum + (t.entryPrice || 0) * t.quantity,
      0,
    );

    const winningTrades = tradesWithPnL.filter((t) => t.pnl > 1e-12).length;
    const losingTrades = tradesWithPnL.filter((t) => t.pnl < -1e-12).length;

    return {
      totalPnL,
      totalFees,
      totalFunding,
      netPnL: totalPnL - totalFees + totalFunding,
      totalVolume,
      totalTrades: tradesWithPnL.length,
      winningTrades,
      losingTrades,
    };
  }
}
