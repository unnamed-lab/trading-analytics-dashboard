/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { verifySolanaSignature } from "@/lib/solana-auth";

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_URL,
});

// Rate limiting map (simple in-memory)
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 50;

function checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const userLimit = rateLimit.get(identifier);

    if (!userLimit) {
        rateLimit.set(identifier, { count: 1, timestamp: now });
        return true;
    }

    if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
        rateLimit.set(identifier, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    userLimit.count++;
    return true;
}

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get("x-forwarded-for") || "unknown";

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 },
            );
        }

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
        if (!ok) {
            return NextResponse.json({ error: "invalid signature" }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, messages = [], sessionContext } = body as {
            prompt: string;
            messages: { role: "user" | "assistant"; content: string }[];
            sessionContext?: any;
        };

        if (!prompt) {
            return NextResponse.json(
                { error: "Missing required field: prompt" },
                { status: 400 },
            );
        }

        const systemPrompt = `You are a concise, insightful AI trading coach embedded in a dashboard. 
The user's current session context is:
${JSON.stringify(sessionContext, null, 2)}

Provide brief, actionable advice or thoughts based on the user's prompt. Do not provide financial advice. Be encouraging but data-driven. Keep it under 4 sentences. Focus on psychology, risk management, and the metrics provided.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

        try {
            if (!process.env.OPENAI_API_KEY) {
                clearTimeout(timeoutId);
                return NextResponse.json({
                    reply: "I am running in mock mode because no OpenAI API key is set. Based on this session context, remain disciplined and follow your strategy! (Configure OPENAI_API_KEY in .env to enable real analysis)",
                });
            }

            const completion = await openai.chat.completions.create(
                {
                    model: process.env.OPENAI_API_MODEL || "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messages.slice(-5), // Keep last 5 messages for conversation context
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 250,
                },
                { signal: controller.signal },
            );

            clearTimeout(timeoutId);

            const reply = completion.choices[0]?.message?.content;
            if (!reply) {
                throw new Error("No content in OpenAI response");
            }

            return NextResponse.json({ reply });
        } catch (openaiError: any) {
            clearTimeout(timeoutId);
            console.error("OpenAI API error:", openaiError);
            return NextResponse.json({
                reply: "I'm having trouble analyzing the data right now. Keep your sizing small and stick to your plan.",
            });
        }
    } catch (error: any) {
        console.error("AI Chat API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate AI chat response" },
            { status: 500 },
        );
    }
}
