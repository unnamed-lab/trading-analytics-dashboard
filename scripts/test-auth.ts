import { verifySolanaSignature } from "../lib/solana-auth";
import bs58 from "bs58";
import nacl from "tweetnacl";

async function test() {
    const keypair = nacl.sign.keyPair();
    const publicKey = bs58.encode(Buffer.from(keypair.publicKey));
    const message = "test-message";
    const messageBytes = Buffer.from(message);
    const messageB64 = messageBytes.toString("base64");
    const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
    const signature = bs58.encode(Buffer.from(signatureBytes));

    console.log("Testing verifySolanaSignature...");
    try {
        const ok = verifySolanaSignature(publicKey, messageB64, signature);
        console.log("Result:", ok);
        if (!ok) {
            console.error("Verification failed unexpectedly!");
            process.exit(1);
        }
    } catch (err) {
        console.error("Caught error:", err);
        process.exit(1);
    }
}

test();
