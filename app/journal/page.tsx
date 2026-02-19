/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useJournals } from "@/hooks/use-journals";
import bs58 from "bs58";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Loader2 } from "lucide-react";

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
    <div className="p-6 relative">
      <h2 className="text-lg font-bold mb-4">Journals</h2>

      {list.isError && (
        <ErrorBanner message={(list.error as Error)?.message || "Failed to load journals."} />
      )}

      <div className="mb-6">
        <input
          className="w-full mb-2 p-2 border bg-background"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full p-2 border bg-background"
          placeholder="Write a journal..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            className="px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            onClick={async () => {
              try {
                await create.mutateAsync({ title, content });
                setTitle("");
                setContent("");
              } catch (e) { }
            }}
            disabled={!publicKeyStr || create.isPending}
          >
            {create.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {list.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : list.data?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No journals found. Create one to get started.
          </div>
        ) : (
          list.data?.map((j: any) => (
            <div key={j.id} className="p-3 border rounded hover:border-primary/50 transition-colors">
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
                    className="text-sm text-primary hover:underline"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
