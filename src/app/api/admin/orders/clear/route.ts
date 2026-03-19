import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { password } = await req.json();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    // Verify admin password
    const userEmail = session.user?.email;
    const adminUser = await db.prepare("SELECT password FROM users WHERE email = ?").bind(userEmail).first() as any;
    
    if (!adminUser || !(await bcrypt.compare(password, adminUser.password))) {
      return NextResponse.json({ error: "Invalid password. Action aborted." }, { status: 401 });
    }

    // Clear both tables
    await db.batch([
      db.prepare("DELETE FROM audit_logs"),
      db.prepare("DELETE FROM orders")
    ]);

    return NextResponse.json({ success: true, message: "System cleared." });
  } catch (error: any) {
    console.error("Clear orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
