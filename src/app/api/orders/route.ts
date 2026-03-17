import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'ORDERED';
  const query = searchParams.get('q') || '';
  
  const db = (process.env as unknown as { DB: any }).DB;

  try {
    let results;
    if (query) {
      results = await db
        .prepare(`
          SELECT * FROM orders 
          WHERE status = ? 
          AND (order_number LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)
          ORDER BY created_at DESC
        `)
        .bind(status, `%${query}%`, `%${query}%`, `%${query}%`)
        .all();
    } else {
      results = await db
        .prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC")
        .bind(status)
        .all();
    }

    return NextResponse.json(results.results);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}