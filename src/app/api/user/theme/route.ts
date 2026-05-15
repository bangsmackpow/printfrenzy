import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { log } from "@/utils/logger";
import { generateTraceId } from "@/utils/trace";

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

    await log.info("user_theme_changed", {
      traceId: generateTraceId(),
      userEmail: session.user.email,
      theme,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await log.error("user_theme_change_failed", {
      traceId: generateTraceId(),
      userEmail: session.user?.email,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
