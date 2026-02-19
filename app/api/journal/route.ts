import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySolanaSignature } from "@/lib/solana-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tradeId = url.searchParams.get("tradeId");

  try {
    const owner = url.searchParams.get("owner");

    // Security: Require either tradeId (specific item) or owner (user's items)
    // Do NOT allow fetching all journals for all users
    if (!tradeId && !owner) {
      return NextResponse.json(
        { error: "Missing required parameter: tradeId or owner" },
        { status: 400 }
      );
    }

    const where: any = {};
    if (tradeId) where.tradeId = tradeId;
    if (owner) where.owner = owner;

    const journals = await prisma.journal.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(journals);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch journals" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Enforce wallet signature headers for ownership
    const publicKey = request.headers.get("x-solana-publickey");
    const signature = request.headers.get("x-solana-signature");
    const messageB64 = request.headers.get("x-solana-message");

    if (!publicKey || !signature || !messageB64) {
      return NextResponse.json(
        { error: "missing auth headers" },
        { status: 401 },
      );
    }

    const ok = verifySolanaSignature(publicKey, messageB64, signature);
    if (!ok)
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });

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

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    const created = await prisma.journal.create({
      data: {
        title: title ?? null,
        content,
        tradeId: tradeId ?? null,
        owner: publicKey,
        symbol: symbol ?? null,
        side: side ?? null,
        pnl: typeof pnl === "number" ? pnl : undefined,
        pnlPct: typeof pnlPercentage === "number" ? pnlPercentage : undefined,
        transactionHash: transactionHash ?? null,
        tradeTimestamp: tradeTimestamp ? new Date(tradeTimestamp) : undefined,
        tags: Array.isArray(tags) ? tags : undefined,
        aiAnalyzed: aiAnalyzed === true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create journal" },
      { status: 500 },
    );
  }
}
