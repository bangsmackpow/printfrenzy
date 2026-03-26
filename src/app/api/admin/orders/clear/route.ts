import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { verifyPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const { password } = await req.json();
    const adminEmail = session.user?.email;

    // Verify admin password before destructive action
    const adminUser = await db.prepare("SELECT password_hash FROM users WHERE email = ?").bind(adminEmail).first() as { password_hash: string } | null;

    if (!adminUser || !(await verifyPassword(password, adminUser.password_hash))) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }

    // DELETE ALL ORDERS
    await db.prepare("DELETE FROM orders").run();
    // DELETE ALL SHIPMENTS
    await db.prepare("DELETE FROM shipments").run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
