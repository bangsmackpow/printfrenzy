import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { order_number, id, notes } = await req.json();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    if (order_number) {
        // Update batch level notes (all items in the batch)
        await db.prepare("UPDATE orders SET notes = ? WHERE order_number = ?")
            .bind(notes, order_number)
            .run();
    } else if (id) {
        // Update single item notes
        await db.prepare("UPDATE orders SET notes = ? WHERE id = ?")
            .bind(notes, id)
            .run();
    } else {
        return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
