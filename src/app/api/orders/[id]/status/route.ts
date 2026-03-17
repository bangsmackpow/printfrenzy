import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(
  req: NextRequest,
  // Params must be treated as a Promise in Next.js 15+
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params before using them
  const { id } = await params; 
  
  const { status } = await req.json();
  const db = (process.env as any).DB;
  
  const userEmail = "printer_operator@builtnetworks.com"; 

  try {
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