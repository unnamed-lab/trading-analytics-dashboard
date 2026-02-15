import { LogType } from "@deriverse/kit";

// These directly affect PnL and should be your primary focus
export const TRADE_FILLS = [
  LogType.spotFillOrder, // 11 - Spot market/limit fills
  LogType.perpFillOrder, // 19 - Perpetual fills
  LogType.swapOrder, // 31 - Direct swaps
];

// Track these for position management
export const ORDER_EVENTS = [
  LogType.spotPlaceOrder, // 10 - Order placement (for tracking intent)
  LogType.perpPlaceOrder, // 18 - Order placement
  LogType.spotOrderCancel, // 13 - Cancelled orders
  LogType.perpOrderCancel, // 21 - Cancelled orders
  LogType.spotOrderRevoke, // 14 - Revoked orders
  LogType.perpOrderRevoke, // 22 - Revoked orders
  LogType.spotMassCancel, // 17 - Mass cancellations
  LogType.perpMassCancel, // 26 - Mass cancellations
];

// These impact PnL indirectly and should be included
export const PNL_AFFECTING = [
    LogType.perpFunding,        // 24 - Funding payments (direct PnL impact)
    LogType.perpSocLoss,        // 27 - Socialized losses (direct PnL impact)
    LogType.spotFees,           // 15 - Fee payments
    LogType.perpFees,           // 23 - Fee payments
];

export const CAPITAL_EVENTS = [
  LogType.deposit, // 1 - Deposits (affects available capital)
  LogType.withdraw, // 2 - Withdrawals (affects available capital)
  LogType.perpDeposit, // 3 - Perp collateral changes
  LogType.perpWithdraw, // 4 - Perp collateral changes
  LogType.feesDeposit, // 5 - Fee payments
  LogType.feesWithdraw, // 6 - Fee withdrawals
];

export const POSITION_EVENTS = [
  LogType.perpChangeLeverage, // 28 - Leverage changes (risk management)
  LogType.spotLpTrade, // 7 - LP trades (if applicable)
  LogType.moveSpot, // 32 - Position moves
];