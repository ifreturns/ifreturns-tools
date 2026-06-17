import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KV_KEY = "gitlab-board:column-order";

export async function GET() {
  try {
    const order = await kv.get<string[]>(KV_KEY);
    return NextResponse.json(order ?? []);
  } catch {
    // KV not configured — return empty, Board will use default order
    return NextResponse.json([]);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.order)) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 });
    }
    await kv.set(KV_KEY, body.order);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
