import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const db = (process.env as unknown as { DB: any }).DB;
        if (!db) return null;

        const user = await db.prepare("SELECT * FROM users WHERE email = ?")
          .bind(credentials?.email)
          .first() as { id: string; email: string; role: string; password_hash: string } | null;

        if (user && await bcrypt.compare(credentials?.password as string, user.password_hash)) {
          return { id: user.id, email: user.email, role: user.role };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { role?: string }).role = token.role as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.AUTH_SECRET,
});