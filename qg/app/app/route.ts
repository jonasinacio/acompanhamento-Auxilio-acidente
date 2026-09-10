import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/auth";

// A raiz "/" serve o Painel do QG — protegida pelo login (o middleware.ts
// redireciona quem não está autenticado para /login). O painel é um HTML
// completo (abas, dados e a IA do Manual).
//
// A aba Financeiro é sensível (RPVs, honorários) — só o papel "admin" pode
// vê-la. Para quem não é admin, o bloco é removido do HTML NO SERVIDOR antes
// de responder: não fica escondido por CSS, simplesmente não é enviado.
export const dynamic = "force-dynamic";

let painelBruto: string | null = null;

function removerAbaFinanceiro(html: string): string {
  // remove o botão da aba…
  let out = html.replace(
    /<button class="tab" role="tab" id="tab-fin"[\s\S]*?<\/button>\n?/,
    ""
  );
  // …e o painel da aba (a section inteira, até a próxima <!-- ===== -->)
  out = out.replace(
    /<!-- ================= FINANCEIRO[\s\S]*?<\/section>\n?/,
    ""
  );
  // no script: apaga a entrada da aba do array TABS (senão o seletor de abas quebra)
  out = out.replace('["tab-fin","p-fin"],', "");
  // e todo o bloco que monta os dados do Financeiro (entre os marcadores de seção)
  out = out.replace(
    /\/\* ================= FINANCEIRO[\s\S]*?(?=\/\* ================= PRAZOS)/,
    ""
  );
  return out;
}

export async function GET() {
  if (painelBruto === null) {
    painelBruto = readFileSync(join(process.cwd(), "painel.html"), "utf-8");
  }
  const session = await auth();
  const papel = (session?.user as any)?.papel;
  const html = papel === "admin" ? painelBruto : removerAbaFinanceiro(painelBruto);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
