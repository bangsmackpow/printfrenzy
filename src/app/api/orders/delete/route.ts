import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;
  if (!session || (userRole !== 'ADMIN' && userRole !== 'MANAGER')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const orderNumber = searchParams.get('order_number');
  const customerName = searchParams.get('customer_name');

  if (!id && !orderNumber) {
    return NextResponse.json({ error: "No ID or Order Number provided" }, { status: 400 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const stmts: unknown[] = [];

    if (orderNumber) {
      // 1. Delete audit logs referencing these orders
      stmts.push(db.prepare(`
        DELETE FROM audit_logs 
        WHERE order_id IN (
          SELECT id FROM orders 
          WHERE order_number = ? ${customerName ? 'AND customer_name = ?' : ''}
        )
      `).bind(...(customerName ? [orderNumber, customerName] : [orderNumber])));

      // 2. Delete the orders
      if (customerName) {
        stmts.push(db.prepare("DELETE FROM orders WHERE order_number = ? AND customer_name = ?")
          .bind(orderNumber, customerName));
      } else {
        stmts.push(db.prepare("DELETE FROM orders WHERE order_number = ?").bind(orderNumber));
      }
    } else {
      // Single item delete
      stmts.push(db.prepare("DELETE FROM audit_logs WHERE order_id = ?").bind(id));
      stmts.push(db.prepare("DELETE FROM orders WHERE id = ?").bind(id));
    }

    await db.batch(stmts as any);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
