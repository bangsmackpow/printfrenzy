import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { archiveOrderToR2 } from "@/utils/backupUtils";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { order_number, status, customer_name } = await req.json();
  if (!order_number) {
    return NextResponse.json({ error: "No order number provided" }, { status: 400 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;
  const userEmail = session.user?.email || "unknown";

  try {
    let whereClause = "WHERE order_number = ?";
    const params: (string | number)[] = [order_number];

    if (customer_name) {
      whereClause += " AND customer_name = ?";
      params.push(String(customer_name));
    }

    const items = await db.prepare(`SELECT id FROM orders ${whereClause}`)
      .bind(...params)
      .all();

    const updateStmt = db.prepare(`UPDATE orders SET status = ? ${whereClause}`)
      .bind(status, ...params);

    const auditStmts = items.results.map((item) => 
      db.prepare("INSERT INTO audit_logs (order_id, user_email, action) VALUES (?, ?, ?)")
        .bind(String(item.id), userEmail, `Group Status change: ${status}`)
    );

    await db.batch([updateStmt, ...auditStmts]);

    // Archive all items to R2 if completed
    if (status === 'COMPLETED' && bucket) {
      for (const item of items.results) {
        await archiveOrderToR2(db, bucket, String(item.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
