import { NextRequest } from "next/server";
import { log } from "@/utils/logger";

/**
 * Checks if a client is rate limited using D1 database storage.
 * Runs in a single batch to maximize performance and minimize latency.
 *
 * @param db D1Database instance
 * @param req NextRequest context to resolve client IP
 * @param endpoint Identifier for the endpoint (e.g., 'login', 'upload', 'purchase')
 * @param limit Max allowed requests within the window
 * @param durationSeconds Time window in seconds
 * @param failClosed When true, a limiter error blocks the request (use for auth-sensitive
 *   endpoints like 'login' / 'purchase_label'). When false (default), errors fail open.
 * @returns true if rate limited (blocked), false otherwise (allowed)
 */
export async function isRateLimited(
  db: D1Database,
  req: NextRequest,
  endpoint: string,
  limit: number,
  durationSeconds: number,
  failClosed: boolean = false
): Promise<boolean> {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "127.0.0.1";
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - durationSeconds;

  try {
    // Batch: cleanup only this requester's expired rows (not the whole table),
    // record the request, then count within the window. Targeted cleanup keeps
    // the query indexed and avoids full-table scans on every request.
    // INSERT OR IGNORE: (ip, endpoint, timestamp) is the PK at 1-second granularity,
    // so concurrent same-second requests would otherwise collide, abort the whole
    // batch, and (with the fail-open catch) bypass the limit entirely. Ignoring the
    // duplicate keeps the batch intact and the count correct.
    const results = (await db.batch([
      db.prepare("DELETE FROM rate_limits WHERE ip = ? AND endpoint = ? AND timestamp < ?").bind(ip, endpoint, cutoff),
      db.prepare("INSERT OR IGNORE INTO rate_limits (ip, endpoint, timestamp) VALUES (?, ?, ?)").bind(ip, endpoint, now),
      db.prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND endpoint = ? AND timestamp > ?").bind(ip, endpoint, cutoff)
    ])) as Array<{ results?: Array<{ count: number }> }>;

    const count = results[2]?.results?.[0]?.count || 0;

    if (count > limit) {
      await log.warn("Rate limit exceeded", { ip, endpoint, count, limit });
      return true;
    }
    return false;
  } catch (error) {
    // Fail-closed for auth-sensitive endpoints (login/purchase); otherwise allow the
    // request so a transient D1 issue can't lock out legitimate users.
    await log.error("Rate limiter database error", {
      error: error instanceof Error ? error.message : String(error),
      ip,
      endpoint,
      failClosed
    });
    return failClosed;
  }
}
