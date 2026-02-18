/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Journal } from "@/types/trades.types";

const base = "/api/journal";

function createAuthHeaders(
  publicKey: string,
  signer: (message: string) => Promise<string>,
) {
  // produce base64 message in a browser-compatible way and sign it
  return async (extraMessage = "") => {
    const payload = JSON.stringify({ ts: Date.now(), extra: extraMessage });
    let messageB64: string;
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      messageB64 = window.btoa(
        encodeURIComponent(payload)
          .split("")
          .map((c) => String.fromCharCode(c.charCodeAt(0)))
          .join(""),
      );
    } else {
      // node fallback
      messageB64 = Buffer.from(payload).toString("base64");
    }
    const signature = await signer(messageB64);
    return {
      "Content-Type": "application/json",
      "x-solana-publickey": publicKey,
      "x-solana-message": messageB64,
      "x-solana-signature": signature,
    };
  };
}

export function useJournals(
  publicKey: string | null,
  signer?: (message: string) => Promise<string>,
  tradeId?: string,
) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["journals", publicKey, tradeId],
    queryFn: async (): Promise<Journal[]> => {
      const url = tradeId
        ? `${base}?tradeId=${encodeURIComponent(tradeId)}`
        : base;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch journals");
      return res.json();
    },
    // listing is public — allow even without wallet
    enabled: true,
  });

  const create = useMutation({
    mutationFn: async (payload: Partial<Journal>) => {
      if (!publicKey || !signer) throw new Error("wallet not connected");
      const headers = await createAuthHeaders(publicKey, signer)();
      const res = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["journals", publicKey] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      if (!publicKey || !signer) throw new Error("wallet not connected");
      const headers = await createAuthHeaders(publicKey, signer)();
      const res = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["journals", publicKey] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!publicKey || !signer) throw new Error("wallet not connected");
      const headers = await createAuthHeaders(publicKey, signer)();
      const res = await fetch(`${base}/${id}`, { method: "DELETE", headers });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      return true;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["journals", publicKey] }),
  });

  return { list, create, update, remove };
}
