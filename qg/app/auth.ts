import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { authConfig } from "@/auth.config";

// Instância COMPLETA (Node): herda a config leve e acrescenta o provider
// pesado (Credentials + bcrypt + Postgres). É esta que o /api/auth usa.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
});
