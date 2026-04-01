import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { theme } = await req.json();
    if (!theme) {
      return NextResponse.json({ error: "Theme required" }, { status: 400 });
    }

    const db = (process.env as unknown as { DB: D1Database }).DB;
    await db.prepare("UPDATE users SET theme = ? WHERE email = ?")
      .bind(theme, session.user.email)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Theme update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
