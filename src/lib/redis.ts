// Thin Upstash Redis REST wrapper — plain fetch(), no SDK install, same
// fail-soft shape as telegram.ts/ai.ts: every function degrades to "no
// caching / no limit" instead of throwing when Redis isn't configured or a
// call fails, so it's always an optional speed/cost layer, never a
// dependency of core functionality.
//
// Setup: create a free database at https://console.upstash.com, copy the
// REST URL and token into UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.

const BASE = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function isRedisConfigured(): boolean {
  return !!BASE && !!TOKEN;
}

async function cmd(...args: string[]): Promise<unknown> {
  if (!BASE || !TOKEN) return null;
  try {
    const path = args.map((a) => encodeURIComponent(a)).join("/");
    const res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown };
    return data.result ?? null;
  } catch (err) {
    console.error("Redis call failed", err);
    return null;
  }
}

/** Cache read — returns null on a miss, on any failure, or if unconfigured. */
export async function redisGetJSON<T>(key: string): Promise<T | null> {
  const raw = await cmd("get", key);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Cache write with expiry. Silently no-ops if unconfigured — callers never
    need to branch on whether caching is actually available. */
export async function redisSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await cmd("set", key, JSON.stringify(value), "EX", String(ttlSeconds));
}

/**
 * Fixed-window counter for simple rate limiting — increments `key` and sets
 * its expiry on the first hit of a fresh window. Returns the count AFTER
 * incrementing, or null if Redis isn't configured/reachable (callers should
 * treat null as "allow" — never block a request just because the optional
 * rate-limit layer is unavailable).
 */
export async function redisIncrWithTtl(key: string, ttlSeconds: number): Promise<number | null> {
  const count = await cmd("incr", key);
  if (typeof count !== "number") return null;
  if (count === 1) await cmd("expire", key, String(ttlSeconds));
  return count;
}

/** true = under the limit (allowed), false = rate-limited. Fails open. */
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const count = await redisIncrWithTtl(key, windowSeconds);
  if (count === null) return true;
  return count <= max;
}
