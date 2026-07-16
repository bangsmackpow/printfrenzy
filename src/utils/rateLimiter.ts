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
 * @returns true if rate limited (blocked), false otherwise (allowed)
 */
export async function isRateLimited(
  db: D1Database,
  req: NextRequest,
  endpoint: string,
  limit: number,
  durationSeconds: number
): Promise<boolean> {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "127.0.0.1";
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - durationSeconds;

  try {
    const results = (await db.batch([
      db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").bind(cutoff),
      db.prepare("INSERT INTO rate_limits (ip, endpoint, timestamp) VALUES (?, ?, ?)").bind(ip, endpoint, now),
      db.prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND endpoint = ? AND timestamp > ?").bind(ip, endpoint, cutoff)
    ])) as Array<{ results?: Array<{ count: number }> }>;

    const count = results[2]?.results?.[0]?.count || 0;

    if (count > limit) {
      await log.warn("Rate limit exceeded", { ip, endpoint, count, limit });
      return true;
    }
    return false;
  } catch (error) {
    // Fail-open strategy: log rate limiter errors but allow request to proceed
    await log.error("Rate limiter database error", {
      error: error instanceof Error ? error.message : String(error),
      ip,
      endpoint
    });
    return false;
  }
}
