import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { verifyPassword, hashPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user?.email;
  const db = (process.env as unknown as { DB: D1Database }).DB;

  // 1. POST /api/user/password (Self-reset)
  if (slug?.[0] === 'password') {
    try {
      const { currentPassword, newPassword } = await req.json();
      const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first() as { password_hash: string } | null;
      if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }
      const newHash = await hashPassword(newPassword);
      await db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").bind(newHash, email).run();
      return NextResponse.json({ success: true });
    } catch (e: unknown) {
      if (e instanceof Error) console.error("User API error:", e.message);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
