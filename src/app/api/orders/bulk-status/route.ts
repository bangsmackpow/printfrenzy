import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { order_number, status } = await req.json();
  if (!order_number) {
    return NextResponse.json({ error: "No order number provided" }, { status: 400 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const userEmail = session.user?.email || "unknown";

  try {
    // Collect IDs for audit log
    const items = await db.prepare("SELECT id FROM orders WHERE order_number = ?")
      .bind(order_number)
      .all();

    const updateStmt = db.prepare("UPDATE orders SET status = ? WHERE order_number = ?")
      .bind(status, order_number);

    const auditStmts = items.results.map((item: any) => 
      db.prepare("INSERT INTO audit_logs (order_id, user_email, action) VALUES (?, ?, ?)")
        .bind(item.id, userEmail, `Group Status change: ${status}`)
    );

    await db.batch([updateStmt, ...auditStmts]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
