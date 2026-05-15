import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { verifyPassword, hashPassword } from "@/utils/hashUtils";
import { log } from "@/utils/logger";
import { generateTraceId } from "@/utils/trace";

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
        await log.warn("user_password_change_rejected", {
          traceId: generateTraceId(),
          userEmail: email,
          reason: "incorrect_current_password",
        });
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }
      const newHash = await hashPassword(newPassword);
      await db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").bind(newHash, email).run();
      await log.info("user_password_changed", {
        traceId: generateTraceId(),
        userEmail: email,
      });
      return NextResponse.json({ success: true });
    } catch (e: unknown) {
      await log.error("user_password_change_failed", {
        traceId: generateTraceId(),
        userEmail: email,
        error: e instanceof Error ? e.message : 'Unknown',
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
