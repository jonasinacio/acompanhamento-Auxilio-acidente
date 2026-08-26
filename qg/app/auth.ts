import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true, // atrás do Traefik
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const rows = await query(
          "SELECT id, nome, email, papel, senha_hash FROM usuarios WHERE email = $1",
          [String(creds.email).toLowerCase().trim()]
        );
        const u = rows[0];
        if (!u) return null;
        const ok = await bcrypt.compare(String(creds.password), u.senha_hash);
        if (!ok) return null;
        return { id: String(u.id), name: u.nome, email: u.email, papel: u.papel };
      },
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user; // middleware: sem sessão → redireciona pro /login
    },
    async jwt({ token, user }) {
      if (user) (token as any).papel = (user as any).papel;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).papel = (token as any).papel;
      return session;
    },
  },
});
