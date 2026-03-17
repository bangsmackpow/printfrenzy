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
        const db = (process.env as unknown as { 
          DB: { 
            prepare: (s: string) => { 
              bind: (...args: unknown[]) => { 
                first: <T>() => Promise<T | null> 
              } 
            } 
          } 
        }).DB;
        if (!db) return null;

        const user = await db.prepare("SELECT * FROM users WHERE email = ?")
          .bind(credentials?.email)
          .first<{ id: string; email: string; role: string; password_hash: string }>();

        if (user && await bcrypt.compare(credentials?.password as string, user.password_hash)) {
          return { id: user.id, email: user.email, role: user.role };
        }
        return null;
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
  secret: process.env.AUTH_SECRET,
});