import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

interface ManualOrderItem {
  product_name: string;
  variant: string;
  quantity: number;
}

interface ManualOrderData {
  order_number: string;
  customer_name: string;
  image_url: string;
  items: ManualOrderItem[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  const { order_number, customer_name, image_url, items } = await req.json() as ManualOrderData;
  const db = (process.env as unknown as { DB: D1Database }).DB;
  const ordered_at = new Date().toISOString();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  try {
    const stmts = items.map(item => {
      const id = crypto.randomUUID();
      return db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, ordered_at, quantity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ORDERED')
      `).bind(
        id, 
        order_number, 
        customer_name, 
        item.product_name, 
        item.variant, 
        image_url,
        ordered_at,
        item.quantity || 1
      );
    });

    await db.batch(stmts);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}