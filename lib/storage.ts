import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".board-data");

function isKvConfigured(): boolean {
  return (
    (!!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (!!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN)
  );
}

export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  if (isKvConfigured()) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
      token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
    });
    try {
      const value = await redis.get<T>(`gitlab-board:${key}`);
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
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
      token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
    });
    try {
      await redis.set(`gitlab-board:${key}`, value);
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
