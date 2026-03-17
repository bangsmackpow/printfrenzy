import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'ORDERED';
  
  const db = (process.env as any).DB;

  try {
    const { results } = await db
      .prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC")
      .bind(status)
      .all();

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}