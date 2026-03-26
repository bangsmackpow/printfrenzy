import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { hashPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
      .bind(passwordHash, id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
