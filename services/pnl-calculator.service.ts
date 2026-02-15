import { TradeRecord } from "@/types";

export class PnLCalculator {
  private trades: TradeRecord[];

  constructor(trades: TradeRecord[]) {
    this.trades = [...trades].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Calculate PnL by pairing entry and exit trades
   * Supports FIFO (First In First Out) matching
   */
  calculatePnL(): TradeRecord[] {
    const result: TradeRecord[] = [];
    const openPositions: Map<string, TradeRecord[]> = new Map();
    const remainingQtyMap: Map<string, number> = new Map();

    // Process trades in chronological order
    for (const trade of this.trades) {
      // Only process fill events
      if (trade.discriminator !== 11 && trade.discriminator !== 19) {
        result.push(trade);
        continue;
      }

      const symbol = trade.symbol;
      const isEntry = trade.side === "buy" || trade.side === "long";

      if (!openPositions.has(symbol)) {
        openPositions.set(symbol, []);
      }

      const positions = openPositions.get(symbol)!;

      if (isEntry) {
        // This is an entry trade - add to open positions
        positions.push(trade);
        remainingQtyMap.set(trade.id, trade.quantity);
        result.push(trade);
      } else {
        // This is an exit trade - match with open positions (FIFO)
        let remainingExitQty = trade.quantity;
        let totalPnl = 0;
        let totalValue = 0;

        while (remainingExitQty > 0 && positions.length > 0) {
          const entry = positions[0];
          const entryRemainingQty =
            remainingQtyMap.get(entry.id) || entry.quantity;
          const matchedQty = Math.min(entryRemainingQty, remainingExitQty);

          // Calculate PnL for this matched quantity
          const entryValue = matchedQty * entry.entryPrice;
          const exitValue = matchedQty * trade.entryPrice;
          const pnl =
            trade.side === "sell"
              ? exitValue - entryValue
              : entryValue - exitValue;

          totalPnl += pnl;
          totalValue += exitValue;

          // Update remaining quantities
          const newRemainingQty = entryRemainingQty - matchedQty;
          remainingQtyMap.set(entry.id, newRemainingQty);
          remainingExitQty -= matchedQty;

          // Remove fully matched entries
          if (newRemainingQty <= 0) {
            positions.shift();
            remainingQtyMap.delete(entry.id);
          }
        }

        // Create the exit trade with calculated PnL
        const pnlStatus: "win" | "loss" | "breakeven" =
          totalPnl > 0 ? "win" : totalPnl < 0 ? "loss" : "breakeven";
        const exitTrade: TradeRecord = {
          ...trade,
          pnl: totalPnl,
          pnlPercentage: totalValue > 0 ? (totalPnl / totalValue) * 100 : 0,
          status: pnlStatus,
        };

        result.push(exitTrade);

        // If there's unmatched exit quantity, it might be a short sale
        if (remainingExitQty > 0) {
          console.log(
            `⚠️ Unmatched exit quantity for ${symbol}: ${remainingExitQty}`,
          );
        }
      }
    }

    return result;
  }

  /**
   * Calculate PnL using average cost method
   */
  calculateAverageCostPnL(): TradeRecord[] {
    const result: TradeRecord[] = [];
    const avgCosts: Map<string, { avgPrice: number; totalQty: number }> =
      new Map();

    for (const trade of this.trades) {
      if (trade.discriminator !== 11 && trade.discriminator !== 19) {
        result.push(trade);
        continue;
      }

      const symbol = trade.symbol;
      const isEntry = trade.side === "buy" || trade.side === "long";

      if (!avgCosts.has(symbol)) {
        avgCosts.set(symbol, { avgPrice: 0, totalQty: 0 });
      }

      const cost = avgCosts.get(symbol)!;

      if (isEntry) {
        // Update average cost
        const newTotalValue =
          cost.avgPrice * cost.totalQty + trade.entryPrice * trade.quantity;
        const newTotalQty = cost.totalQty + trade.quantity;
        cost.avgPrice = newTotalValue / newTotalQty;
        cost.totalQty = newTotalQty;

        result.push(trade);
      } else {
        // Calculate PnL based on average cost
        const pnl = (trade.entryPrice - cost.avgPrice) * trade.quantity;
        const exitValue = trade.entryPrice * trade.quantity;

        const pnlStatus: "win" | "loss" | "breakeven" =
          pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven";
        const exitTrade: TradeRecord = {
          ...trade,
          pnl,
          pnlPercentage: exitValue > 0 ? (pnl / exitValue) * 100 : 0,
          status: pnlStatus,
        };

        result.push(exitTrade);

        // Reduce quantity
        cost.totalQty = Math.max(0, cost.totalQty - trade.quantity);
        if (cost.totalQty === 0) {
          cost.avgPrice = 0;
        }
      }
    }

    return result;
  }
}
