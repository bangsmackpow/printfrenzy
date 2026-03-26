import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get('order_number');
  
  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    if (orderNumber) {
        const results = await db
            .prepare("SELECT * FROM orders WHERE order_number = ? ORDER BY customer_name ASC")
            .bind(orderNumber)
            .all();
        return NextResponse.json(results.results);
    } else {
        // Fetch all items currently in PRINTING status
        const results = await db
            .prepare("SELECT * FROM orders WHERE status = 'PRINTING' ORDER BY order_number DESC, customer_name ASC")
            .all();
        return NextResponse.json(results.results);
    }
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
