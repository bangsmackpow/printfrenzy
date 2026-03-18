import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      has_db: !!(process.env as any).DB,
      has_auth_secret: !!process.env.AUTH_SECRET,
    },
    tests: {}
  };

  try {
    const db = (process.env as any).DB;
    if (db) {
      const start = Date.now();
      const userCount = await db.prepare("SELECT count(*) as count FROM users").first();
      results.tests.db_query = {
        success: true,
        count: userCount?.count,
        duration: `${Date.now() - start}ms`
      };
    }
  } catch (e: any) {
    results.tests.db_query = { success: false, error: e.message };
  }

  try {
    const pass = "admin123";
    const hash = "$2a$10$7RQxLzIiVGXlel3Qn4tBBedvLk9PINr4sqljxq/IHpIrCRD2xS17i"; // The one we set
    const start = Date.now();
    const isMatch = await bcrypt.compare(pass, hash);
    results.tests.bcrypt_compare = {
      success: true,
      match: isMatch,
      duration: `${Date.now() - start}ms`
    };
  } catch (e: any) {
    results.tests.bcrypt_compare = { success: false, error: e.message };
  }

  return NextResponse.json(results);
}
