import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from "@/utils/hashUtils";

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const pass = searchParams.get('pass');

  if (!email || !pass) {
    return NextResponse.json({ error: "Provide email and pass params" });
  }

  const db = (process.env as unknown as { DB: D1Database }).DB;

  try {
    const userQueryResult = await db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
      .bind(email)
      .first();
    
    const user = userQueryResult as { email: string; password_hash: string } | null;

    if (!user) {
      return NextResponse.json({ 
        found: false, 
        message: "No user found in D1",
        email_used: email
      });
    }

    const cleanHash = user.password_hash.trim();
    const isMatch = await verifyPassword(pass, cleanHash);
    
    // Generate a fresh hash for comparison
    const edgeHash = await hashPassword(pass);

    return NextResponse.json({
        found: true,
        email_in_db: user.email,
        hash_in_db: user.password_hash,
        hash_length: user.password_hash.length,
        password_provided: pass,
        match_result: isMatch,
        generated_fresh_hash: edgeHash
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
