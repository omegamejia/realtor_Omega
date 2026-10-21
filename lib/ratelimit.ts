/**
 * Shared abuse protection for the public API routes (/api/chat, /api/lead).
 *
 * DURABLE when Upstash Redis REST is configured (env: UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN) — counters then survive across serverless instances
 * and redeploys, which is what makes a per-IP limit actually effective on Vercel.
 * With no Upstash env set, it FALLS BACK to a best-effort in-memory limiter
 * (per instance) so local dev and un-provisioned clones still work — just know
 * that the in-memory mode is not a real ceiling under scaled traffic.
 *
 * No new dependencies: Upstash is called over its REST endpoint with fetch().
 * All store calls FAIL OPEN — a Redis blip must never block a real visitor.
 */

const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const durable = Boolean(UP_URL && UP_TOKEN);

/** Whether a durable store is wired (exposed for GET /api/chat diagnostics). */
export const rateLimitDurable = durable;

// ---- in-memory fallback (per serverless instance) --------------------------
const memWindows = new Map<string, number[]>();
function memLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (memWindows.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  memWindows.set(key, arr);
  return arr.length > limit;
}

const memCounters = new Map<string, { v: number; exp: number }>();
function memIncr(key: string, ttlMs: number): number {
  const now = Date.now();
  const cur = memCounters.get(key);
  if (!cur || cur.exp < now) {
    memCounters.set(key, { v: 1, exp: now + ttlMs });
    return 1;
  }
  cur.v += 1;
  return cur.v;
}

// ---- Upstash REST ----------------------------------------------------------
async function upstash(cmd: (string | number)[]): Promise<number> {
  const res = await fetch(UP_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as { result: number };
  return data.result;
}

// Fixed-window counter: INCR the key, and set its TTL on the first hit only.
async function incrWindow(key: string, windowSec: number): Promise<number> {
  const n = await upstash(["INCR", key]);
  if (n === 1) await upstash(["EXPIRE", key, windowSec]);
  return n;
}

/**
 * Returns true if `key` is OVER `limit` within the last `windowSec` seconds.
 * Durable when Upstash is configured; in-memory best-effort otherwise.
 */
export async function isRateLimited(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  if (!durable) return memLimited(key, limit, windowSec * 1000);
  try {
    return (await incrWindow(`rl:${key}`, windowSec)) > limit;
  } catch {
    return memLimited(key, limit, windowSec * 1000); // fail open + local guard
  }
}

/**
 * Daily circuit breaker. Increments a per-day counter for `bucket` and returns
 * false once it passes `maxPerDay`. Used to cap paid-API spend independent of
 * the per-IP limit, so IP rotation can't produce unbounded cost. Fails open.
 */
export async function withinDailyBudget(
  bucket: string,
  maxPerDay: number
): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `budget:${bucket}:${day}`;
  if (!durable) return memIncr(key, 24 * 3600 * 1000) <= maxPerDay;
  try {
    return (await incrWindow(key, 24 * 3600)) <= maxPerDay;
  } catch {
    return true;
  }
}

/**
 * Best-effort client IP. On Vercel the leftmost `x-forwarded-for` entry is the
 * real client (the platform rewrites the header), which is the case this seed
 * ships for. Behind a different proxy chain, front the app with something that
 * normalizes this header before trusting per-IP limits.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || "anon";
  return req.headers.get("x-real-ip")?.trim() || "anon";
}

// ---- lightweight input validation -----------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validEmail(s: unknown): s is string {
  return typeof s === "string" && s.length <= 254 && EMAIL_RE.test(s);
}

/** Phone is optional; when present it must look like a phone number. */
export function validPhone(s: unknown): boolean {
  if (s == null || s === "") return true;
  return typeof s === "string" && /^[+()\-.\s\d]{7,20}$/.test(s);
}

export function clampStr(s: unknown, max: number): string {
  return typeof s === "string" ? s.slice(0, max) : "";
}
