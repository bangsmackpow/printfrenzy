import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { archiveOrderToR2 } from "@/utils/backupUtils";

export const runtime = 'edge';

export async function POST(
  req: NextRequest,
  // Params must be treated as a Promise in Next.js 15+
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params before using them
  const { id } = await params; 
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { status } = await req.json();
  const db = (process.env as unknown as { DB: D1Database }).DB;
  const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;
  
  const userEmail = session.user?.email || "unknown"; 

  try {
    await db.batch([
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id),
      db.prepare("INSERT INTO audit_logs (order_id, user_email, action) VALUES (?, ?, ?)")
        .bind(id, userEmail, `Status changed to ${status}`)
    ]);

    // If order is COMPLETED, backup to R2
    if (status === 'COMPLETED' && bucket) {
      await archiveOrderToR2(db, bucket, id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}