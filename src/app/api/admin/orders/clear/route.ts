import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    // Clear both tables
    await db.batch([
      db.prepare("DELETE FROM audit_logs"),
      db.prepare("DELETE FROM orders")
    ]);

    return NextResponse.json({ success: true, message: "All orders and logs cleared." });
  } catch (error: any) {
    console.error("Clear orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
