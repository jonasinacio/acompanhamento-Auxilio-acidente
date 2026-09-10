import { readFileSync } from "fs";
import { join } from "path";

// A raiz "/" serve o Painel do QG — protegida pelo login (o middleware.ts
// redireciona quem não está autenticado para /login). O painel é um HTML
// completo (abas, dados e a IA do Manual), servido como está.
export const dynamic = "force-dynamic";

let cache: string | null = null;

export function GET() {
  if (cache === null) {
    cache = readFileSync(join(process.cwd(), "painel.html"), "utf-8");
  }
  return new Response(cache, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
