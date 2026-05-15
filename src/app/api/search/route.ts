import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { log } from "@/utils/logger";
import { generateTraceId } from "@/utils/trace";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q || q.trim().length < 2) return NextResponse.json([]);

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const term = `%${q.trim()}%`;

  try {
    const results = await db.prepare(
      `SELECT id, order_number, customer_name, product_name, variant, notes, print_name, status, quantity, image_url, created_at
       FROM orders
       WHERE order_number LIKE ?
          OR customer_name LIKE ?
          OR product_name LIKE ?
          OR variant LIKE ?
          OR notes LIKE ?
          OR print_name LIKE ?
          OR status LIKE ?
       ORDER BY created_at DESC
       LIMIT 50`
    ).bind(term, term, term, term, term, term, term).all();

    await log.info("search_executed", {
      traceId: generateTraceId(),
      userEmail: session.user?.email,
      query: q.trim(),
      resultCount: results.results?.length || 0,
    });

    return NextResponse.json(results.results);
  } catch (e: unknown) {
    await log.error("search_failed", {
      traceId: generateTraceId(),
      userEmail: session.user?.email,
      query: q.trim(),
      error: e instanceof Error ? e.message : 'Unknown',
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
