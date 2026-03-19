import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;
  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const logs = await db.prepare(`
      SELECT 
        al.*, 
        o.order_number, 
        o.customer_name, 
        o.product_name 
      FROM audit_logs al
      LEFT JOIN orders o ON al.order_id = o.id
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return NextResponse.json(logs.results);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
