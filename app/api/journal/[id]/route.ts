import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySolanaSignature } from "@/lib/solana-auth";

type Params = { params: Promise<{ id: string }> };

async function requireOwner(request: Request, id: string) {
  const publicKey = request.headers.get("x-solana-publickey");
  const signature = request.headers.get("x-solana-signature");
  const messageB64 = request.headers.get("x-solana-message");

  if (!publicKey || !signature || !messageB64) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "missing auth headers" },
        { status: 401 },
      ),
    };
  }

  const ok = verifySolanaSignature(publicKey, messageB64, signature);
  if (!ok)
    return {
      ok: false,
      res: NextResponse.json({ error: "invalid signature" }, { status: 401 }),
    };

  const journal = await prisma.journal.findUnique({ where: { id } });
  if (!journal)
    return {
      ok: false,
      res: NextResponse.json({ error: "not found" }, { status: 404 }),
    };
  if (journal.owner !== publicKey)
    return {
      ok: false,
      res: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };

  return { ok: true, publicKey };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const journal = await prisma.journal.findUnique({
      where: { id },
    });
    if (!journal)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(journal);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch journal" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const check = await requireOwner(request, id);
    if (!check.ok) return check.res;

    const body = await request.json();
    const {
      title,
      content,
      tradeId,
      symbol,
      side,
      pnl,
      pnlPercentage,
      transactionHash,
      tradeTimestamp,
      tags,
      aiAnalyzed,
    } = body;

    const updated = await prisma.journal.update({
      where: { id },
      data: {
        title: title ?? undefined,
        content: content ?? undefined,
        tradeId: tradeId ?? undefined,
        symbol: symbol ?? undefined,
        side: side ?? undefined,
        pnl: typeof pnl === "number" ? pnl : undefined,
        pnlPct: typeof pnlPercentage === "number" ? pnlPercentage : undefined,
        transactionHash: transactionHash ?? undefined,
        tradeTimestamp: tradeTimestamp ? new Date(tradeTimestamp) : undefined,
        tags: Array.isArray(tags) ? tags : undefined,
        aiAnalyzed: aiAnalyzed === true ? true : undefined,
        mood: body.mood !== undefined ? body.mood : undefined,
        images: Array.isArray(body.images) ? body.images : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update journal" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const check = await requireOwner(request, id);
    if (!check.ok) return check.res;

    await prisma.journal.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete journal" },
      { status: 500 },
    );
  }
}
