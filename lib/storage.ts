import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".board-data");

function isKvConfigured(): boolean {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    try {
      const value = await kv.get<T>(`gitlab-board:${key}`);
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  // Local file fallback
  try {
    const file = join(DATA_DIR, `${key}.json`);
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export async function setConfig<T>(key: string, value: T): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import("@vercel/kv");
    try {
      await kv.set(`gitlab-board:${key}`, value);
    } catch {
      // ignore
    }
    return;
  }

  // Local file fallback
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2), "utf-8");
  } catch (err) {
    console.error("[storage] Failed to save config:", key, err);
  }
}
