import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

export const runtime = 'edge';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: "Access Denied: Admin role required" }, { status: 403 });
  }

  try {
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const { id } = params;
    const db = (process.env as unknown as { DB: D1Database }).DB;
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(passwordHash, id)
      .run();

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Admin Password Change Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
