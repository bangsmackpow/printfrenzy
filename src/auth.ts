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
        try {
          const db = (process.env as unknown as { 
            DB: { 
              prepare: (s: string) => { 
                bind: (...args: unknown[]) => { 
                  first: <T>() => Promise<T | null> 
                } 
              } 
            } 
          }).DB;
          
          if (!db) {
            console.error("Authorize Error: D1 DB binding NOT found on process.env");
            return null;
          }

          const user = await db.prepare("SELECT * FROM users WHERE email = ?")
            .bind(credentials?.email)
            .first<{ id: string; email: string; role: string; password_hash: string }>();

          if (!user) {
            console.warn(`Authorize: User not found with email: ${credentials?.email}`);
            return null;
          }

          const isMatch = await bcrypt.compare(credentials?.password as string, user.password_hash);
          if (isMatch) {
            return { id: user.id, email: user.email, role: user.role };
          }
          
          console.warn(`Authorize: Password MISMATCH for email: ${credentials?.email}`);
          return null;
        } catch (error: unknown) {
          console.error("Authorize Callback Exception:", error);
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
  secret: process.env.AUTH_SECRET,
});