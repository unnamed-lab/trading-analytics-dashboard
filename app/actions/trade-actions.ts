"use server";

import { TradeDBService } from "@/services/trade-db.service";
import { TradeRecord } from "@/types";

export async function getTradesAction(owner: string) {
    return TradeDBService.getTrades(owner);
}

export async function getLastSignatureAction(owner: string) {
    return TradeDBService.getLastSignature(owner);
}

export async function upsertTradesAction(owner: string, trades: TradeRecord[]) {
    return TradeDBService.upsertTrades(owner, trades);
}

export async function updateLastSignatureAction(owner: string, signature: string) {
    return TradeDBService.updateLastSignature(owner, signature);
}
