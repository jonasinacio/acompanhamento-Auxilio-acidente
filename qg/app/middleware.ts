export { auth as middleware } from "@/auth";

// Protege tudo, menos o login, as rotas do Auth.js e os estáticos.
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
