/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              @deriverse/kit — Comprehensive Debug Script               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Tests all relevant public methods of the @deriverse/kit SDK.          ║
 * ║  Read-only — no transactions are submitted (instruction builders       ║
 * ║  are tested but the resulting instructions are only inspected).         ║
 * ║                                                                        ║
 * ║  Usage:  npx tsx scripts/debug-deriverse-kit.ts                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { address, createSolanaRpc, devnet, type Signature } from "@solana/kit";
import {
    Engine,
    VERSION,
    PROGRAM_ID,
    MARKET_DEPTH,
    LogType,
    AccountType,
    getSpotPriceStep,
    getPerpPriceStep,
} from "@deriverse/kit";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    "https://api.devnet.solana.com";

const PROG_ID =
    process.env.PROGRAM_ID ||
    process.env.NEXT_PUBLIC_PROGRAM_ID ||
    "Drvrseg8AQLP8B96DBGmHRjFGviFNYTkHueY9g3k27Gu";

const ENG_VERSION = parseInt(
    process.env.ENGINE_VERSION || process.env.NEXT_PUBLIC_ENGINE_VERSION || "14",
    10
);

const WALLET =
    process.env.WALLET_ADDRESS ||
    process.env.DEBUG_SOLANA_WALLET ||
    "FK4ugTURYRR2hbSDZr1Q1kqU4xX4UQP7o28cr3wUpG2q";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const passed: string[] = [];
const failed: { name: string; error: string }[] = [];
const skipped: string[] = [];

function header(title: string) {
    console.log(`\n${"═".repeat(72)}`);
    console.log(`  ${title}`);
    console.log(`${"═".repeat(72)}`);
}

function section(title: string) {
    console.log(`\n── ${title} ${"─".repeat(60 - title.length)}`);
}

async function test(name: string, fn: () => Promise<void>) {
    try {
        await fn();
        passed.push(name);
        console.log(`  ✅ ${name}`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ name, error: msg });
        console.log(`  ❌ ${name}`);
        console.log(`     → ${msg}`);
    }
}

function skip(name: string, reason: string) {
    skipped.push(`${name} (${reason})`);
    console.log(`  ⏭️  ${name} — ${reason}`);
}

function mapToObj(m: Map<any, any> | undefined): Record<string, any> | string {
    if (!m) return "(undefined)";
    const result: Record<string, any> = {};
    for (const [k, v] of m.entries()) {
        result[String(k)] = v;
    }
    return result;
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║         @deriverse/kit Debug Script — Starting             ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`  RPC URL   : ${RPC_URL}`);
    console.log(`  Program ID: ${PROG_ID}`);
    console.log(`  Version   : ${ENG_VERSION}`);
    console.log(`  Wallet    : ${WALLET}`);
    console.log();

    const rpc = createSolanaRpc(devnet(RPC_URL));

    // ═══════════════════════════════════════════════════════════════════════════
    //  1. CONSTANTS & ENUMS
    // ═══════════════════════════════════════════════════════════════════════════
    header("1. Constants & Enums");

    await test("VERSION is defined", async () => {
        console.log(`     VERSION = ${VERSION}`);
        if (typeof VERSION !== "number") throw new Error("VERSION is not a number");
    });

    await test("PROGRAM_ID is defined", async () => {
        console.log(`     PROGRAM_ID = ${PROGRAM_ID}`);
        if (!PROGRAM_ID) throw new Error("PROGRAM_ID is falsy");
    });

    await test("MARKET_DEPTH is defined", async () => {
        console.log(`     MARKET_DEPTH = ${MARKET_DEPTH}`);
        if (typeof MARKET_DEPTH !== "number") throw new Error("MARKET_DEPTH is not a number");
    });

    await test("LogType enum has expected members", async () => {
        const expected = [
            "deposit", "withdraw", "spotFillOrder", "perpFillOrder",
            "spotFees", "perpFees", "perpFunding", "perpSocLoss",
            "spotPlaceOrder", "perpPlaceOrder", "swapOrder",
        ];
        for (const key of expected) {
            if ((LogType as any)[key] === undefined) {
                throw new Error(`LogType.${key} is missing`);
            }
        }
        console.log(`     LogType keys: ${Object.keys(LogType).filter(k => isNaN(Number(k))).join(", ")}`);
    });

    await test("AccountType enum has expected members", async () => {
        const expected = [
            "CLIENT_PRIMARY", "CLIENT_COMMUNITY", "COMMUNITY", "ROOT",
            "INSTR", "TOKEN", "SPOT_MAPS", "PERP_MAPS",
        ];
        for (const key of expected) {
            if ((AccountType as any)[key] === undefined) {
                throw new Error(`AccountType.${key} is missing`);
            }
        }
        console.log(`     AccountType keys: ${Object.keys(AccountType).filter(k => isNaN(Number(k))).join(", ")}`);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  2. UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    header("2. Utility Functions");

    await test("getSpotPriceStep returns valid steps", async () => {
        const prices = [0.01, 0.1, 1, 10, 100, 1000, 10000, 50000];
        for (const px of prices) {
            const step = getSpotPriceStep(px);
            console.log(`     getSpotPriceStep(${px}) = ${step}`);
            if (typeof step !== "number" || isNaN(step) || step <= 0) {
                throw new Error(`Invalid step for price ${px}: ${step}`);
            }
        }
    });

    await test("getPerpPriceStep returns valid steps", async () => {
        const prices = [0.01, 0.1, 1, 10, 100, 1000, 10000, 50000];
        for (const px of prices) {
            const step = getPerpPriceStep(px);
            console.log(`     getPerpPriceStep(${px}) = ${step}`);
            if (typeof step !== "number" || isNaN(step) || step <= 0) {
                throw new Error(`Invalid step for price ${px}: ${step}`);
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  3. ENGINE CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    header("3. Engine Constructor");

    let engine: any = null;

    await test("Engine constructor (with custom args)", async () => {
        engine = new Engine(rpc as any, {
            programId: address(PROG_ID) as any,
            version: ENG_VERSION,
        });
        console.log(`     engine.programId = ${engine.programId}`);
        console.log(`     engine.version   = ${engine.version}`);
    });

    if (!engine) {
        console.error("\n🛑  Engine constructor failed — cannot continue.\n");
        process.exit(1);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  4. ENGINE INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    header("4. Engine Initialization");

    let initSuccess = false;

    await test("engine.initialize()", async () => {
        const result = await engine!.initialize();
        initSuccess = true;
        console.log(`     initialized = ${result}`);
        console.log(`     rootAccount     = ${engine!.rootAccount}`);
        console.log(`     communityAccount = ${engine!.communityAccount}`);
    });

    if (!initSuccess) {
        console.error("\n🛑  Engine initialization failed — subsequent tests may fail.\n");
    }

    // ── Root & Community state ─────────────────────────────────────────────────
    section("4a. Root State (after initialize)");

    await test("rootStateModel is populated", async () => {
        const root = engine!.rootStateModel;
        if (!root) throw new Error("rootStateModel is null/undefined");
        console.log(`     rootStateModel.tag     = ${root.tag}`);
        console.log(`     rootStateModel.version = ${root.version}`);
        console.log(`     rootStateModel keys: ${Object.keys(root).join(", ")}`);
    });

    await test("community data is populated", async () => {
        const community = engine!.community;
        if (!community) throw new Error("community is null/undefined");
        console.log(`     community.header.tag   = ${community.header?.tag}`);
        console.log(`     community.data.size    = ${community.data?.size}`);
    });

    // ── Tokens & Instruments (after initialize) ────────────────────────────────
    section("4b. Tokens & Instruments (after initialize)");

    await test("tokens map is available", async () => {
        const tokens = engine!.tokens;
        console.log(`     tokens.size = ${tokens?.size ?? "N/A"}`);
        if (tokens && tokens.size > 0) {
            let count = 0;
            for (const [id, tok] of tokens.entries()) {
                if (count >= 5) { console.log(`     ... and ${tokens.size - 5} more`); break; }
                console.log(`     token ${id}: mint=${(tok as any).mint ?? "?"}, decimals=${(tok as any).decimals ?? "?"}`);
                count++;
            }
        }
    });

    await test("instruments map is available", async () => {
        const instrs = engine!.instruments;
        console.log(`     instruments.size = ${instrs?.size ?? "N/A"}`);
        if (instrs && instrs.size > 0) {
            let count = 0;
            for (const [id, instr] of instrs.entries()) {
                if (count >= 5) { console.log(`     ... and ${instrs.size - 5} more`); break; }
                console.log(`     instr ${id}: address=${instr.address}`);
                count++;
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  5. SET SIGNER
    // ═══════════════════════════════════════════════════════════════════════════
    header("5. Set Signer");

    await test("engine.setSigner(wallet)", async () => {
        await engine!.setSigner(address(WALLET) as any);
        console.log(`     signer set to: ${WALLET}`);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  6. UPDATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    header("6. Update Methods");

    await test("engine.updateRoot()", async () => {
        await engine!.updateRoot();
        console.log(`     rootStateModel.version = ${engine!.rootStateModel?.version}`);
    });

    await delay(500);

    await test("engine.updateCommunity()", async () => {
        await engine!.updateCommunity();
        console.log(`     community.header.tag = ${engine!.community?.header?.tag}`);
    });

    await delay(500);

    // ═══════════════════════════════════════════════════════════════════════════
    //  7. ACCOUNT QUERIES
    // ═══════════════════════════════════════════════════════════════════════════
    header("7. Account Queries");

    await test("engine.getAccountByTag(AccountType.ROOT)", async () => {
        const addr = await engine!.getAccountByTag(AccountType.ROOT);
        console.log(`     ROOT account = ${addr}`);
    });

    await delay(300);

    await test("engine.getAccountByTag(AccountType.COMMUNITY)", async () => {
        const addr = await engine!.getAccountByTag(AccountType.COMMUNITY);
        console.log(`     COMMUNITY account = ${addr}`);
    });

    await delay(300);

    // ── Token queries ──────────────────────────────────────────────────────────
    section("7a. Token Queries");

    // Try to find a known token mint. Use the first token from the tokens map.
    let sampleTokenId: number | null = null;
    if (engine!.tokens && engine!.tokens.size > 0) {
        sampleTokenId = engine!.tokens.keys().next().value ?? null;
    }

    if (sampleTokenId !== null) {
        const sampleTok = engine!.tokens.get(sampleTokenId);
        const sampleMint = (sampleTok as any)?.mint;
        if (sampleMint) {
            await test(`engine.getTokenAccount(mint=${String(sampleMint).slice(0, 12)}...)`, async () => {
                const account = await engine!.getTokenAccount(sampleMint);
                console.log(`     token account = ${account}`);
            });

            await delay(300);

            await test(`engine.getTokenId(mint=${String(sampleMint).slice(0, 12)}...)`, async () => {
                const tokenId = await engine!.getTokenId(sampleMint);
                console.log(`     token id = ${tokenId}`);
            });
        }
    } else {
        skip("engine.getTokenAccount / getTokenId", "no tokens found in engine.tokens");
    }

    await delay(300);

    // ── Instrument queries ─────────────────────────────────────────────────────
    section("7b. Instrument Queries");

    let sampleInstrId: number | null = null;
    if (engine!.instruments && engine!.instruments.size > 0) {
        sampleInstrId = engine!.instruments.keys().next().value ?? null;
    }

    if (sampleInstrId !== null) {
        await test(`engine.instrLut(instrId=${sampleInstrId})`, async () => {
            const lut = engine!.instrLut({ instrId: sampleInstrId! });
            console.log(`     instrLut = ${lut}`);
        });

        await test(`engine.updateInstrData(instrId=${sampleInstrId})`, async () => {
            await engine!.updateInstrData({ instrId: sampleInstrId! });
            const instr = engine!.instruments.get(sampleInstrId!);
            console.log(`     instrument header tag = ${instr?.header?.tag}`);
            console.log(`     spotBids length = ${instr?.spotBids?.length}`);
            console.log(`     spotAsks length = ${instr?.spotAsks?.length}`);
            console.log(`     perpBids length = ${instr?.perpBids?.length}`);
            console.log(`     perpAsks length = ${instr?.perpAsks?.length}`);
        });

        await delay(300);

        // getInstrId via token IDs from the instrument header
        const instrData = engine!.instruments.get(sampleInstrId);
        if (instrData?.header) {
            const h = instrData.header as any;
            if (h.assetTokenId !== undefined && h.crncyTokenId !== undefined) {
                await test(`engine.getInstrId(asset=${h.assetTokenId}, crncy=${h.crncyTokenId})`, async () => {
                    const id = await engine!.getInstrId({
                        assetTokenId: h.assetTokenId,
                        crncyTokenId: h.crncyTokenId,
                    });
                    console.log(`     instrId = ${id}`);
                });
            }

            await delay(300);

            await test(`engine.getInstrAccountByTag(instr ${sampleInstrId}, tag=SPOT_MAPS)`, async () => {
                const addr = await engine!.getInstrAccountByTag({
                    assetTokenId: h.assetTokenId,
                    crncyTokenId: h.crncyTokenId,
                    tag: AccountType.SPOT_MAPS,
                });
                console.log(`     SPOT_MAPS account = ${addr}`);
            });
        }
    } else {
        skip("instrument queries", "no instruments found in engine.instruments");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  8. CLIENT DATA
    // ═══════════════════════════════════════════════════════════════════════════
    header("8. Client Data");

    let clientData: any = null;

    await test("engine.getClientData()", async () => {
        clientData = await engine!.getClientData();
        console.log(`     clientId    = ${clientData.clientId}`);
        console.log(`     points      = ${clientData.points}`);
        console.log(`     spotTrades  = ${clientData.spotTrades}`);
        console.log(`     lpTrades    = ${clientData.lpTrades}`);
        console.log(`     perpTrades  = ${clientData.perpTrades}`);
        console.log(`     mask        = ${clientData.mask}`);
        console.log(`     slot        = ${clientData.slot}`);
        console.log(`     tokens size = ${clientData.tokens?.size ?? "N/A"}`);
        console.log(`     lp size     = ${clientData.lp?.size ?? "N/A"}`);
        console.log(`     spot size   = ${clientData.spot?.size ?? "N/A"}`);
        console.log(`     perp size   = ${clientData.perp?.size ?? "N/A"}`);
        if (clientData.refProgram) {
            console.log(`     refProgram.address  = ${clientData.refProgram.address}`);
            console.log(`     refProgram.clientId = ${clientData.refProgram.clientId}`);
        }
        if (clientData.refLinks?.length > 0) {
            console.log(`     refLinks count = ${clientData.refLinks.length}`);
        }
    });

    await delay(300);

    // ── Client Spot / Perp Orders Info ─────────────────────────────────────────
    section("8a. Client Spot & Perp Orders");

    if (clientData && sampleInstrId !== null) {
        const cid = clientData.clientId ?? 0;

        await test(`engine.getClientSpotOrdersInfo(instrId=${sampleInstrId})`, async () => {
            const info = await engine!.getClientSpotOrdersInfo({
                instrId: sampleInstrId!,
                clientId: cid,
            });
            console.log(`     bidsCount       = ${info.bidsCount}`);
            console.log(`     asksCount       = ${info.asksCount}`);
            console.log(`     tempAssetTokens = ${info.tempAssetTokens}`);
            console.log(`     tempCrncyTokens = ${info.tempCrncyTokens}`);
        });

        await delay(300);

        await test(`engine.getClientPerpOrdersInfo(instrId=${sampleInstrId})`, async () => {
            const info = await engine!.getClientPerpOrdersInfo({
                instrId: sampleInstrId!,
                clientId: cid,
            });
            console.log(`     bidsCount    = ${info.bidsCount}`);
            console.log(`     asksCount    = ${info.asksCount}`);
            console.log(`     perps        = ${info.perps}`);
            console.log(`     funds        = ${info.funds}`);
            console.log(`     result (PnL) = ${info.result}`);
            console.log(`     fees         = ${info.fees}`);
            console.log(`     rebates      = ${info.rebates}`);
            console.log(`     leverage     = ${info.mask & 0xff}`);
        });

        await delay(300);

        await test(`engine.getClientSpotOrders(instrId=${sampleInstrId})`, async () => {
            const spotInfo = await engine!.getClientSpotOrdersInfo({
                instrId: sampleInstrId!,
                clientId: cid,
            });
            const orders = await engine!.getClientSpotOrders({
                instrId: sampleInstrId!,
                bidsCount: spotInfo.bidsCount,
                asksCount: spotInfo.asksCount,
                bidsEntry: spotInfo.bidsEntry,
                asksEntry: spotInfo.asksEntry,
            });
            console.log(`     contextSlot = ${orders.contextSlot}`);
            console.log(`     bids count  = ${orders.bids.length}`);
            console.log(`     asks count  = ${orders.asks.length}`);
            if (orders.bids.length > 0) {
                console.log(`     first bid: price=${orders.bids[0].px}, qty=${orders.bids[0].qty}`);
            }
        });

        await delay(300);

        await test(`engine.getClientPerpOrders(instrId=${sampleInstrId})`, async () => {
            const perpInfo = await engine!.getClientPerpOrdersInfo({
                instrId: sampleInstrId!,
                clientId: cid,
            });
            const orders = await engine!.getClientPerpOrders({
                instrId: sampleInstrId!,
                bidsCount: perpInfo.bidsCount,
                asksCount: perpInfo.asksCount,
                bidsEntry: perpInfo.bidsEntry,
                asksEntry: perpInfo.asksEntry,
            });
            console.log(`     contextSlot = ${orders.contextSlot}`);
            console.log(`     bids count  = ${orders.bids.length}`);
            console.log(`     asks count  = ${orders.asks.length}`);
        });
    } else {
        skip("getClientSpotOrdersInfo / getClientPerpOrdersInfo", "no clientData or instruments");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  9. LOG DECODING
    // ═══════════════════════════════════════════════════════════════════════════
    header("9. Log Decoding");

    await test("engine.logsDecode() with real transaction logs", async () => {
        // Fetch a recent confirmed transaction from the wallet to get real logs
        let realLogs: readonly string[] | null = null;

        try {
            const sigs = await rpc
                .getSignaturesForAddress(address(WALLET) as any, { limit: 20 })
                .send();

            for (const sig of sigs) {
                if (sig.err !== null) continue;
                const tx = await rpc
                    .getTransaction(sig.signature as Signature, {
                        maxSupportedTransactionVersion: 0,
                        encoding: "jsonParsed",
                    })
                    .send();

                const txVal = (tx as any)?.value ?? tx;
                const logs = txVal?.meta?.logMessages as string[] | undefined;
                if (logs && logs.length > 5) {
                    // Look for program invocation in logs
                    if (logs.some((l: string) => l.includes(PROG_ID))) {
                        realLogs = logs;
                        console.log(`     Found transaction: ${sig.signature.slice(0, 20)}...`);
                        console.log(`     Log lines: ${logs.length}`);
                        break;
                    }
                }
                await delay(200);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(`     ⚠️ Could not fetch transaction logs: ${msg}`);
        }

        if (realLogs) {
            const decoded = engine!.logsDecode(realLogs);
            console.log(`     Decoded events: ${decoded.length}`);
            for (const event of decoded) {
                const tag = (event as any).tag;
                const typeName = LogType[tag] || `unknown(${tag})`;
                console.log(`       → tag=${tag} (${typeName}): ${JSON.stringify(event).slice(0, 120)}`);
            }
        } else {
            console.log(`     ⚠️ No program-related transactions found — testing with empty array`);
            const decoded = engine!.logsDecode([]);
            console.log(`     Decoded events: ${decoded.length}`);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  10. INSTRUCTION BUILDERS (read-only — inspect output, don't send)
    // ═══════════════════════════════════════════════════════════════════════════
    header("10. Instruction Builders (read-only)");

    if (sampleTokenId !== null) {
        await test(`depositInstruction(tokenId=${sampleTokenId}, amount=1)`, async () => {
            const ix = await engine!.depositInstruction({
                tokenId: sampleTokenId!,
                amount: 1,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
            console.log(`     data length    = ${ix.data?.length ?? "N/A"}`);
        });

        await delay(300);

        await test(`withdrawInstruction(tokenId=${sampleTokenId}, amount=1)`, async () => {
            const ix = await engine!.withdrawInstruction({
                tokenId: sampleTokenId!,
                amount: 1,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
        });
    } else {
        skip("depositInstruction / withdrawInstruction", "no tokens available");
    }

    await delay(300);

    if (sampleInstrId !== null) {
        await test(`newSpotOrderInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.newSpotOrderInstruction({
                instrId: sampleInstrId!,
                price: 100,
                qty: 1,
                side: 0, // buy
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
        });

        await delay(300);

        await test(`spotOrderCancelInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.spotOrderCancelInstruction({
                instrId: sampleInstrId!,
                orderId: 0,
                side: 0,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
        });

        await delay(300);

        await test(`spotMassCancelInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.spotMassCancelInstruction({
                instrId: sampleInstrId!,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
        });

        await delay(300);

        await test(`spotLpInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.spotLpInstruction({
                instrId: sampleInstrId!,
                side: 0,
                amount: 1,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
        });

        await delay(300);

        // ── Perp instructions ────────────────────────────────────────────────────
        section("10a. Perp Instruction Builders");

        await test(`newPerpOrderInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.newPerpOrderInstruction({
                instrId: sampleInstrId!,
                qty: 1,
                price: 100,
                side: 0,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
            console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
        });

        await delay(300);

        await test(`perpOrderCancelInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpOrderCancelInstruction({
                instrId: sampleInstrId!,
                orderId: 0,
                side: 0,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });

        await delay(300);

        await test(`perpMassCancelInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpMassCancelInstruction({
                instrId: sampleInstrId!,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });

        await delay(300);

        await test(`perpDepositInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpDepositInstruction({
                instrId: sampleInstrId!,
                amount: 1,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });

        await delay(300);

        await test(`perpChangeLeverageInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpChangeLeverageInstruction({
                instrId: sampleInstrId!,
                leverage: 5,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });

        await delay(300);

        await test(`perpStatisticsResetInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpStatisticsResetInstruction({
                instrId: sampleInstrId!,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });

        await delay(300);

        await test(`perpBuySeatInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpBuySeatInstruction({
                instrId: sampleInstrId!,
                amount: 1,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });

        await delay(300);

        await test(`perpSellSeatInstruction(instrId=${sampleInstrId})`, async () => {
            const ix = await engine!.perpSellSeatInstruction({
                instrId: sampleInstrId!,
            });
            console.log(`     programAddress = ${ix.programAddress}`);
        });
    } else {
        skip("spot/perp instruction builders", "no instruments available");
    }

    await delay(300);

    // ── Other instruction builders ─────────────────────────────────────────────
    section("10b. Other Instruction Builders");

    await test("newRefLinkInstruction()", async () => {
        const ix = await engine!.newRefLinkInstruction();
        console.log(`     programAddress = ${ix.programAddress}`);
        console.log(`     accounts count = ${ix.accounts?.length ?? "N/A"}`);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  11. ORDERBOOK / CONTEXT METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    header("11. Orderbook / Context Methods");

    if (sampleInstrId !== null) {
        const instrData = engine!.instruments.get(sampleInstrId!);
        if (instrData) {
            await test(`engine.getSpotContext(instrHeader)`, async () => {
                const ctx = await engine!.getSpotContext(instrData!.header);
                console.log(`     spot context accounts = ${ctx.length}`);
            });

            await delay(300);

            await test(`engine.getPerpContext(instrHeader)`, async () => {
                const ctx = await engine!.getPerpContext(instrData!.header);
                console.log(`     perp context accounts = ${ctx.length}`);
            });

            await delay(300);

            await test(`engine.getSpotCandles(instrHeader)`, async () => {
                const candles = await engine!.getSpotCandles(instrData!.header);
                console.log(`     candle accounts = ${candles.length}`);
            });
        }

        await delay(300);

        await test(`engine.upgradeToPerpInstructions(instrId=${sampleInstrId})`, async () => {
            const ixs = await engine!.upgradeToPerpInstructions({ instrId: sampleInstrId! });
            console.log(`     instruction count = ${ixs.length}`);
            for (const ix of ixs) {
                console.log(`       → programAddress = ${ix.programAddress}, accounts = ${ix.accounts?.length ?? 0}`);
            }
        });
    } else {
        skip("orderbook/context methods", "no instruments available");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  REPORT
    // ═══════════════════════════════════════════════════════════════════════════
    header("RESULTS SUMMARY");

    console.log(`\n  ✅ Passed:  ${passed.length}`);
    console.log(`  ❌ Failed:  ${failed.length}`);
    console.log(`  ⏭️  Skipped: ${skipped.length}`);

    if (failed.length > 0) {
        console.log("\n  ── Failed Tests ──");
        for (const f of failed) {
            console.log(`     ❌ ${f.name}`);
            console.log(`        ${f.error}`);
        }
    }

    if (skipped.length > 0) {
        console.log("\n  ── Skipped Tests ──");
        for (const s of skipped) {
            console.log(`     ⏭️  ${s}`);
        }
    }

    console.log(`\n${"═".repeat(72)}`);
    const allOk = failed.length === 0;
    console.log(allOk ? "  🎉 All tests passed!" : "  ⚠️  Some tests failed — see details above.");
    console.log(`${"═".repeat(72)}\n`);

    process.exit(allOk ? 0 : 1);
})();
