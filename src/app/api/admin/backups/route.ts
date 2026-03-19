import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { createFullDatabaseBackup } from "@/utils/backupUtils";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // 1. Auth check (Manual or Cron with secret)
  const session = await auth();
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  const userRole = (session?.user as { role?: string })?.role;
  const isAuthorized = 
    userRole === 'ADMIN' || 
    (Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;
  const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;

  if (!db || !bucket) {
    return NextResponse.json({ error: "DB or Bucket not found" }, { status: 500 });
  }

  try {
    const result = await createFullDatabaseBackup(db, bucket);
    return NextResponse.json({ 
      success: true, 
      message: "Database backup completed successfully",
      ...result 
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;
  if (!session || userRole !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const bucket = (process.env as unknown as { BUCKET: R2Bucket }).BUCKET;
  if (!bucket) {
    return NextResponse.json({ error: "Bucket not found" }, { status: 500 });
  }

  try {
    // Double cast to bypass missing 'list' in some R2 types
    const backupList = await (bucket as unknown as { list: (o: unknown) => Promise<{ objects: unknown[] }> }).list({ prefix: "backups/sql-nightly/" });
    return NextResponse.json(backupList.objects);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
