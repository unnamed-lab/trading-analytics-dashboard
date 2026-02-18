import "dotenv/config";
import { createSolanaRpc, devnet, getBase64Encoder } from "@solana/kit";

async function discoverVersion(programId: string) {
    console.log(`\n=== Discovering version for: ${programId} ===`);
    const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

    const accounts = await rpc
        .getProgramAccounts(programId as any, {
            encoding: "base64",
            dataSlice: { offset: 0, length: 8 },
        })
        .send();

    console.log(`Total program accounts: ${accounts.length}`);

    const versionsByTag = new Map<number, Set<number>>();

    for (const a of accounts) {
        try {
            const raw = a.account.data[0];
            const data = Buffer.from(getBase64Encoder().encode(raw));
            if (data.length >= 8) {
                const tag = data.readUInt32LE(0);
                const version = data.readUInt32LE(4);

                if (!versionsByTag.has(tag)) versionsByTag.set(tag, new Set());
                versionsByTag.get(tag)!.add(version);

                // Tag 0 = ROOT, Tag 2 = COMMUNITY
                if (tag === 0) {
                    console.log(`  ROOT account found — version: ${version}, address: ${a.pubkey}`);
                }
            }
        } catch (_) { }
    }

    // Find highest ROOT version
    const rootVersions = versionsByTag.get(0);
    if (rootVersions) {
        const sorted = [...rootVersions].sort((a, b) => b - a);
        console.log(`  ROOT versions found: ${sorted.join(", ")}`);
        console.log(`  ✅ Latest (recommended) version: ${sorted[0]}`);
    } else {
        console.log("  ❌ No ROOT accounts found");
    }

    console.log("\n  All tag→versions:");
    for (const [tag, vers] of [...versionsByTag.entries()].sort((a, b) => a[0] - b[0])) {
        console.log(`    tag ${tag}: versions [${[...vers].sort((a, b) => a - b).join(", ")}]`);
    }
}

(async () => {
    await discoverVersion("Drvrseg8AQLP8B96DBGmHRjFGviFNYTkHueY9g3k27Gu");
    await discoverVersion("CDESjex4EDBKLwx9ZPzVbjiHEHatasb5fhSJZMzNfvw2");
})();
