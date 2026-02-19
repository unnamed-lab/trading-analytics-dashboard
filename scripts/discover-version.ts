#!/usr/bin/env tsx
/**
 * discover-version.ts
 *
 * Discovers the correct ENGINE_VERSION for a given Deriverse program ID
 * by reading the on-chain ROOT account headers.
 *
 * Usage:
 *   npx tsx scripts/discover-version.ts [PROGRAM_ID]
 *
 * If no PROGRAM_ID is given, reads from PROGRAM_ID env var.
 */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { createSolanaRpc, devnet, getBase64Encoder } from "@solana/kit";
import bs58 from "bs58";

// AccountType enum from @deriverse/kit
const TAG_ROOT = 2;
const TAG_COMMUNITY = 34; // eslint-disable-line @typescript-eslint/no-unused-vars
const TAG_TOKEN = 4; // eslint-disable-line @typescript-eslint/no-unused-vars

async function discoverVersion(programId: string, rpcUrl: string) {
    console.log(`\nProgram ID : ${programId}`);
    console.log(`RPC        : ${rpcUrl}\n`);

    const rpc = createSolanaRpc(devnet(rpcUrl));

    // Build a memcmp filter for tag = ROOT (2) at offset 0
    const tagBuf = Buffer.alloc(4);
    tagBuf.writeUInt32LE(TAG_ROOT, 0);

    const accounts: any = await rpc
        .getProgramAccounts(programId as any, {
            encoding: "base64",
            dataSlice: { offset: 0, length: 8 }, // only read tag + version
            filters: [
                {
                    memcmp: {
                        offset: 0,
                        encoding: "base58",
                        bytes: bs58.encode(tagBuf),
                    },
                } as any,
            ],
        })
        .send();

    if (!accounts.length) {
        console.log("❌ No ROOT accounts found for this program ID.");
        console.log("   The program may not be deployed or the RPC may be wrong.");
        process.exit(1);
    }

    console.log(`Found ${accounts.length} ROOT account(s):\n`);

    const versions: { version: number; address: string }[] = [];

    for (const a of accounts) {
        const data = Buffer.from(getBase64Encoder().encode(a.account.data[0]));
        const version = data.readUInt32LE(4);
        versions.push({ version, address: a.pubkey as string });
        console.log(`  v${version}  →  ${a.pubkey}`);
    }

    const latest = versions.reduce((max, v) => (v.version > max.version ? v : max), versions[0]);

    console.log(`\n✅ Latest ROOT version: ${latest.version}`);
    console.log(`   Set ENGINE_VERSION=${latest.version} in your .env\n`);

    return latest.version;
}

const programId =
    process.argv[2] || process.env.PROGRAM_ID || process.env.NEXT_PUBLIC_PROGRAM_ID;
const rpcUrl =
    process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";

if (!programId) {
    console.error("Usage: npx tsx scripts/discover-version.ts [PROGRAM_ID]");
    console.error("  or set PROGRAM_ID in .env");
    process.exit(1);
}

discoverVersion(programId, rpcUrl);
