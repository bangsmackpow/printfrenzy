import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/utils/hashUtils";

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
        try {
          const db = (process.env as unknown as { DB: D1Database }).DB;
          if (!db) return null;

          const email = (credentials?.email as string || "").trim();
          const userQueryResult = await db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
            .bind(email)
            .first();
          
          const user = userQueryResult as { id: string; email: string; role: string; password_hash: string } | null;

          if (!user) return null;

          const inputPass = (credentials?.password as string || "").trim();
          const isMatch = await verifyPassword(inputPass, user.password_hash);

          if (isMatch) {
            return { id: user.id, email: user.email, role: user.role };
          }
          
          return null;
        } catch (error) {
          console.error("Auth error:", error);
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