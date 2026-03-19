import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

interface ManualOrderItem {
  product_name: string;
  variant: string;
  quantity: number;
  customer_name?: string;
}

interface ManualOrderData {
  order_number: string;
  customer_name: string; // Fallback
  image_url: string;
  items: ManualOrderItem[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  const { order_number, customer_name, items } = await req.json() as { 
    order_number: string, 
    customer_name: string, 
    items: (ManualOrderItem & { image_url: string })[] 
  };
  const db = (process.env as unknown as { DB: D1Database }).DB;
  const ordered_at = new Date().toISOString();

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  try {
    const stmts = items.map(item => {
      const id = crypto.randomUUID();
      const finalCustomer = item.customer_name || customer_name || "Unknown Customer";
      
      return db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, ordered_at, quantity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ORDERED')
      `).bind(
        id, 
        order_number, 
        finalCustomer, 
        item.product_name, 
        item.variant, 
        item.image_url, // Use the row-specific image
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