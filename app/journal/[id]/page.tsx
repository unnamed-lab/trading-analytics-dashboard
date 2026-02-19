/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useJournals } from "@/hooks/use-journals";

export default function JournalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { publicKey, signMessage } = useWallet();
  const publicKeyStr = publicKey?.toBase58() ?? null;
  const router = useRouter();

  const signer = async (messageB64: string) => {
    if (!signMessage) throw new Error("wallet cannot sign messages");
    let msgBytes: Uint8Array;
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = window.atob(messageB64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      msgBytes = arr;
    } else {
      msgBytes = new Uint8Array(Buffer.from(messageB64, "base64"));
    }
    const signed = await signMessage(msgBytes as Uint8Array);
    const sigBytes = (signed as any)?.signature ?? signed;
    return bs58.encode(Buffer.from(sigBytes));
  };

  const { list, update, remove } = useJournals(publicKeyStr, signer);
  const [item, setItem] = useState<any>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    // try to read from list cache first
    const found = list.data?.find((j: any) => j.id === id);
    if (found) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItem(found);
      setContent(found.content ?? "");
    } else {
      // fetch single
      fetch(`/api/journal/${id}`)
        .then((r) => r.json())
        .then((j) => {
          setItem(j);
          setContent(j.content ?? "");
        })
        .catch(() => {});
    }
  }, [list.data, id]);

  if (!item) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-lg font-bold mb-2">{item.title || "Journal"}</h2>
      <div className="mb-4 text-sm text-muted-foreground">
        {item.symbol
          ? `${item.symbol} • ${item.side}`
          : item.tradeId
            ? `Trade ${item.tradeId}`
            : "General"}
      </div>

      <textarea
        className="w-full p-2 border mb-4 min-h-50"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          className="px-3 py-2 bg-primary text-primary-foreground rounded"
          onClick={async () => {
            try {
              await update.mutateAsync({ id: item.id, content });
              router.refresh();
            } catch (e) {
              // ignore
            }
          }}
          disabled={update.isPending}
        >
          {update.isPending ? "Saving..." : "Save"}
        </button>
        <button
          className="px-3 py-2 border rounded"
          onClick={async () => {
            try {
              await remove.mutateAsync(item.id);
              router.push("/journal");
            } catch (e) {
              // ignore
            }
          }}
          disabled={remove.isPending}
        >
          {remove.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
