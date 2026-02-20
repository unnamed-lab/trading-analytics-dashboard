import nacl from "tweetnacl";
import bs58 from "bs58";

export function verifySolanaSignature(
  publicKeyBase58: string,
  messageBase64: string,
  signatureBase58: string,
): boolean {
  try {
    const messageBytes = Buffer.from(messageBase64, "base64");
    const signature = bs58.decode(signatureBase58);
    const pubkey = bs58.decode(publicKeyBase58);

    return nacl.sign.detached.verify(messageBytes, signature, pubkey);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.debug("signature verify error", e);
    return false;
  }
}
