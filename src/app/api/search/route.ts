import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";
import { generateTraceId } from "@/utils/trace";

export const runtime = 'edge';

// Escape a raw user term for use inside a quoted FTS5 phrase and return a
// prefix-match token. Double quotes are escaped by doubling; other FTS5
// operators are neutralized by wrapping the whole token in quotes.
function ftsToken(term: string): string {
  const escaped = term.replace(/"/g, '""');
  return `"${escaped}"*`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q || q.trim().length < 2) return NextResponse.json([]);

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const raw = q.trim();
  const tokens = raw.split(/\s+/).filter(Boolean).map(ftsToken);
  const matchQuery = tokens.join(' AND ');

  try {
    const results = await db.prepare(
      `SELECT o.id, o.order_number, o.customer_name, o.product_name, o.variant, o.notes, o.print_name, o.status, o.quantity, o.image_url, o.created_at
       FROM orders_fts f
       JOIN orders o ON o.id = f.order_id
       WHERE orders_fts MATCH ?
       ORDER BY o.created_at DESC
       LIMIT 50`
    ).bind(matchQuery).all();

    await log.info("search_executed", {
      traceId: generateTraceId(),
      userEmail: session.user?.email,
      query: raw,
      matchQuery,
      resultCount: results.results?.length || 0,
    });

    return NextResponse.json(results.results);
  } catch (e: unknown) {
    await log.error("search_failed", {
      traceId: generateTraceId(),
      userEmail: session.user?.email,
      query: raw,
      error: e instanceof Error ? e.message : 'Unknown',
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
