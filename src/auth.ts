import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Module augmentation to add 'role' to the session and user types
declare module "next-auth" {
  interface Session {
    user: {
      role: string;
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("--- AUTHORIZE START ---");
        try {
          console.log(`Authorize: Input Email: [${credentials?.email}]`);
          
          if (!process.env.AUTH_SECRET) {
            console.error("DEBUG: AUTH_SECRET IS MISSING FROM PROCESS.ENV");
          } else {
            console.log("DEBUG: AUTH_SECRET IS PRESENT");
          }
          
          const db = (process.env as unknown as { DB: D1Database }).DB;
          if (!db) {
            console.error("DEBUG: DB BINDING IS MISSING FROM PROCESS.ENV");
            return null;
          }
          console.log("DEBUG: DB BINDING FOUND");

          const userQueryResult = await db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
            .bind(credentials?.email)
            .first();
          
          const user = userQueryResult as { id: string; email: string; role: string; password_hash: string } | null;

          if (!user) {
            console.warn(`DEBUG: No user found for [${credentials?.email}]`);
            return null;
          }
          console.log(`DEBUG: User found in DB: [${user.email}] with role: [${user.role}]`);

          console.log("DEBUG: Comparing passwords with bcryptjs...");
          const isMatch = await bcrypt.compare(credentials?.password as string, user.password_hash);
          console.log(`DEBUG: Password Match Result: ${isMatch}`);

          if (isMatch) {
            console.log("--- AUTHORIZE SUCCESS ---");
            return { id: user.id, email: user.email, role: user.role };
          }
          
          console.warn("--- AUTHORIZE FAILED: PASSWORD MISMATCH ---");
          return null;
        } catch (error: unknown) {
          const err = error as Error;
          console.error("CRITICAL: Authorize Exception:", err.message);
          console.error(err.stack);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});