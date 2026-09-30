/**
 * Tiny in-memory sliding-window limiter for the local AI routes. It protects the provider quota from a runaway
 * client loop; it is not a security boundary (the site runs locally).
 */
const hits = new Map<string, number[]>();
let lastSweep = 0;

export function rateLimit(key: string, limit = 20, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  // Keys come from a client-supplied header, so drop idle ones (at most once per window) before the map can grow
  // without bound.
  if (hits.size > 1000 && now - lastSweep >= windowMs) {
    lastSweep = now;
    for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k);
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfter: 0 };
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
