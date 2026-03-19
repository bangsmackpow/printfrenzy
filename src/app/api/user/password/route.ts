import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Invalid password requirements" }, { status: 400 });
    }

    const email = session.user.email as string;
    const db = (process.env as unknown as { DB: D1Database }).DB;

    // 1. Verify current password
    const userQueryResult = await db.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    const user = userQueryResult as { id: string; password_hash: string } | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
    }

    // 2. Hash and update
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(newHash, user.id)
      .run();

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    console.error("Password change error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
