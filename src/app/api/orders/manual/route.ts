import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }
  const data = await req.json() as { order_number: string; customer_name: string; product_name: string; variant: string; image_url: string };
  const db = (process.env as unknown as { DB: { prepare: (s: string) => { bind: (...args: unknown[]) => { run: () => Promise<void> } } } }).DB;
  const orderId = crypto.randomUUID();

  try {
    await db.prepare(`
      INSERT INTO orders (id, order_number, customer_name, product_name, variant, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ORDERED')
    `).bind(
      orderId, 
      data.order_number, 
      data.customer_name, 
      data.product_name, 
      data.variant, 
      data.image_url
    ).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}