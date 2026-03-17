import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { status } = await req.json();
  const db = (process.env as any).DB;
  
  // In Phase 2, we will get the real email from the Auth session
  const userEmail = "printer_operator@builtnetworks.com"; 

  try {
    // We use a batch to ensure both the update and the log happen together
    await db.batch([
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, id),
      db.prepare("INSERT INTO audit_logs (order_id, user_email, action) VALUES (?, ?, ?)")
        .bind(id, userEmail, `Status changed to ${status}`)
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}