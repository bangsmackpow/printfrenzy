import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const data = await req.json();
  const db = (process.env as any).DB;
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}