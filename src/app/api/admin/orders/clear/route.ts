import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;
  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { password } = await req.json();
  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    // Verify admin password
    const userEmail = session.user?.email;
    const adminUser = await db.prepare("SELECT password_hash FROM users WHERE email = ?").bind(userEmail).first() as { password_hash: string } | null;
    
    if (!adminUser || !(await bcrypt.compare(password, adminUser.password_hash))) {
      return NextResponse.json({ error: "Invalid password. Action aborted." }, { status: 401 });
    }

    // Clear both tables
    await db.batch([
      db.prepare("DELETE FROM audit_logs"),
      db.prepare("DELETE FROM orders")
    ]);

    return NextResponse.json({ success: true, message: "System cleared." });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Clear orders error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
