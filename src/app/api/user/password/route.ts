import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { verifyPassword, hashPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user?.email;
  if (!email) {
    return NextResponse.json({ error: "User email not found in session" }, { status: 400 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Get current user from DB
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first() as { password_hash: string } | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isMatch = await verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    // Hash and update
    const newHash = await hashPassword(newPassword);
    await db.prepare("UPDATE users SET password_hash = ? WHERE email = ?")
      .bind(newHash, email)
      .run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
