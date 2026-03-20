import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  // Whitehack for allowed fields
  const allowedFields = ['notes', 'print_name', 'customer_name', 'product_name', 'variant', 'quantity'];
  const updateEntries = Object.entries(body).filter(([key]) => allowedFields.includes(key));

  if (updateEntries.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const setClause = updateEntries.map(([key]) => `${key} = ?`).join(', ');
  const values = updateEntries.map(([, value]) => value);

  try {
    await db.prepare(`UPDATE orders SET ${setClause} WHERE id = ?`)
      .bind(...values, orderId)
      .run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
