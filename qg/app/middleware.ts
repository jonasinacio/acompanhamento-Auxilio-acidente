import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// O middleware roda no edge runtime: usa SÓ a config leve (sem pg/bcrypt),
// senão o Next quebra com "node-module-in-edge-runtime".
export const { auth: middleware } = NextAuth(authConfig);

// Protege tudo, menos o login, as rotas do Auth.js e os estáticos.
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
