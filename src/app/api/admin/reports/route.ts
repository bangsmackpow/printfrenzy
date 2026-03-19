import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;
  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    // 1. Get status counts
    const statusCounts = await db.prepare(`
      SELECT status, COUNT(*) as count, SUM(quantity) as items
      FROM orders
      GROUP BY status
    `).all();

    // 2. Performance throughput (Completed today)
    const today = new Date().toISOString().split('T')[0];
    const performanceToday = await db.prepare(`
      SELECT COUNT(*) as count, SUM(quantity) as items
      FROM orders
      WHERE status = 'COMPLETED' 
      AND id IN (
        SELECT order_id FROM audit_logs 
        WHERE action LIKE 'Status changed to COMPLETED' 
        AND timestamp >= ?
      )
    `).bind(`${today}T00:00:00Z`).first();

    // 3. Pending Products count
    const productPending = await db.prepare(`
        SELECT product_name, SUM(quantity) as items
        FROM orders
        WHERE status = 'ORDERED'
        GROUP BY product_name
        ORDER BY items DESC
        LIMIT 5
    `).all();

    return NextResponse.json({
        statusSummary: statusCounts.results,
        performanceToday,
        productPending: productPending.results
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
