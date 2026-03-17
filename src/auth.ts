import NextAuth from "@auth/nextjs";
import Credentials from "@auth/nextjs/providers/credentials";

// Note: We do NOT use 'import NextAuth from ...' as a default if it fails.
// If the build still complains, use: import { NextAuth } from "@auth/nextjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const db = (process.env as any).DB;
        const user = await db.prepare("SELECT * FROM users WHERE email = ?")
          .bind(credentials?.email).first();

        if (user && user.password_hash === credentials?.password) {
          return { id: user.id, email: user.email, role: user.role as string };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as any).role = token.role as string;
      return session;
    },
  },
  pages: { signIn: "/login" },
});