import { NextRequest, NextResponse } from "next/server";
import { getConfig, setConfig } from "@/lib/storage";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    const value = await getConfig<string[]>(key, []);
    return NextResponse.json(value);
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    const body = await request.json();
    if (!Array.isArray(body.order)) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 });
    }
    await setConfig(key, body.order);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
