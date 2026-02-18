/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useJournals } from "@/hooks/use-journals";
import bs58 from "bs58";

export default function JournalsPage() {
  const { publicKey, signMessage } = useWallet();
  const publicKeyStr = publicKey?.toBase58() ?? null;

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

  const { list, create } = useJournals(publicKeyStr, signer);

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Journals</h2>

      <div className="mb-6">
        <input
          className="w-full mb-2 p-2 border"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full p-2 border"
          placeholder="Write a journal..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            className="px-3 py-2 bg-primary text-primary-foreground rounded"
            onClick={async () => {
              try {
                await create.mutateAsync({ title, content });
                setTitle("");
                setContent("");
              } catch (e) {}
            }}
            disabled={!publicKeyStr || create.isPending}
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {list.data?.map((j: any) => (
          <div key={j.id} className="p-3 border rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{j.title || "Untitled"}</div>
                <div className="text-sm text-muted-foreground">
                  {j.symbol
                    ? `${j.symbol} • ${j.side}`
                    : j.tradeId
                      ? `Trade ${j.tradeId}`
                      : "General"}
                </div>
              </div>
              <div>
                <Link
                  href={`/journal/${j.id}`}
                  className="text-sm text-primary"
                >
                  Open
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
