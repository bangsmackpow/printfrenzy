import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get('order_number');
  const customerName = searchParams.get('customer_name');
  
  if (!orderNumber || !customerName) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const shipment = await db
        .prepare("SELECT tracking_number, label_url FROM shipments WHERE order_number = ? AND customer_name = ? ORDER BY created_at DESC LIMIT 1")
        .bind(orderNumber, customerName)
        .first();

    return NextResponse.json({ shipment });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
