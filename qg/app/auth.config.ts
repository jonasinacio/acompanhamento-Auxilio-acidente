import type { NextAuthConfig } from "next-auth";

// Config LEVE (compatível com o edge runtime do middleware): só sessão,
// páginas e callbacks. NADA de pg/bcrypt aqui — o provider "pesado"
// (Credentials) entra só no auth.ts, que roda em Node.
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true, // atrás do Caddy
  pages: { signIn: "/login" },
  providers: [], // preenchido no auth.ts (Node)
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user; // sem sessão → o middleware manda pro /login
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
} satisfies NextAuthConfig;
