import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
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
    if (orderNumber) {
      if (customerName) {
        await db.prepare("DELETE FROM orders WHERE order_number = ? AND customer_name = ?")
          .bind(orderNumber, customerName)
          .run();
      } else {
        await db.prepare("DELETE FROM orders WHERE order_number = ?").bind(orderNumber).run();
      }
    } else {
      await db.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
