import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const runtime = 'edge';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const db = (process.env as any).DB;
        const user = await db.prepare("SELECT * FROM users WHERE email = ?")
          .bind(credentials?.email).first();

        if (user && user.password_hash === credentials?.password) {
          return { id: user.id, email: user.email, role: user.role };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    }
  }
});

export { handler as GET, handler as POST };