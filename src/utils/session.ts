import { auth } from "@/auth";
import { log } from "@/utils/logger";

export type CurrentUser = { id: string; email: string; role: string };

/**
 * Resolves the NextAuth session AND re-validates the user against D1 on every call.
 *
 * The JWT is treated as a hint only: its embedded role/email can go stale when an
 * admin deletes or demotes a user (see the pure JWT strategy in src/auth.ts), so we
 * read the live row here. Returns null when there is no session OR the account no
 * longer exists (deleted / email changed), which callers map to 401/403 — giving
 * immediate revocation instead of waiting for the token to expire.
 *
 * Cost: one indexed lookup on users.email (UNIQUE) per authed request.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const sessionEmail = session?.user?.email;
  if (!sessionEmail) return null;

  const db = (process.env as unknown as { DB: D1Database }).DB;
  if (!db) return null;

  try {
    const row = await db
      .prepare("SELECT id, email, role FROM users WHERE email = ?")
      .bind(sessionEmail)
      .first() as { id: string; email: string; role: string } | null;

    if (!row) return null; // deleted or email-changed → revoke
    return { id: row.id, email: row.email, role: row.role }; // live role, not the JWT's
  } catch (e: unknown) {
    // Fail closed: if we can't confirm the account, treat as unauthenticated.
    await log.error("session_user_lookup_failed", {
      sessionEmail,
      error: e instanceof Error ? e.message : "Unknown",
    });
    return null;
  }
}
