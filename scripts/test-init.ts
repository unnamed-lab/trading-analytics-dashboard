
import "dotenv/config";
import { PublicKey } from "@solana/web3.js";
import { TransactionDataFetcher } from "../services/fetch-data.service";

async function testInit() {
    const rpc = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC;
    const wallet = process.env.DEBUG_SOLANA_WALLET;
    const version = parseInt(process.env.NEXT_PUBLIC_ENGINE_VERSION || "14");

    console.log(`Testing with RPC: ${rpc}`);
    console.log(`Wallet: ${wallet}`);
    console.log(`Version: ${version}`);

    const fetcher = new TransactionDataFetcher(rpc!, undefined, version);
    try {
        await fetcher.initialize(new PublicKey(wallet!));
        console.log("✅ Initialization successful!");
    } catch (e: any) {
        console.error("❌ Initialization failed:", e);
    }
}

testInit();
