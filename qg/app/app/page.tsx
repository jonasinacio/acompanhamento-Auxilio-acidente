import { auth } from "@/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic"; // lê o banco a cada request, não no build

async function kpi(sql: string): Promise<number> {
  try {
    const r = await query(sql);
    return Number(r[0]?.n ?? 0);
  } catch {
    return 0; // banco ainda vazio / indisponível → mostra 0
  }
}

export default async function Home() {
  const session = await auth();
  const [leads, clientes, tarefas, prazos] = await Promise.all([
    kpi("SELECT count(*) n FROM clientes WHERE status='novo'"),
    kpi("SELECT count(*) n FROM clientes WHERE status='cliente'"),
    kpi("SELECT count(*) n FROM tarefas WHERE status='aberta'"),
    kpi("SELECT count(*) n FROM publicacoes WHERE resolvido=false AND data_fatal IS NOT NULL AND data_fatal <= current_date + 7"),
  ]);

  const nome = session?.user?.name ?? "";
  const papel = (session?.user as any)?.papel ?? "";

  return (
    <>
      <div className="top">
        <b>⚖️ QG do Escritório</b>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="who">{nome}{papel ? ` · ${papel}` : ""}</span>
          <a className="logout" href="/api/auth/signout">Sair</a>
        </div>
      </div>
      <div className="wrap">
        <div className="eyebrow">Visão geral</div>
        <h2 className="page">Dashboard</h2>
        <div className="kpis">
          <div className="kpi"><div className="n">{leads}</div><div className="l">Leads novos</div></div>
          <div className="kpi"><div className="n">{clientes}</div><div className="l">Clientes</div></div>
          <div className="kpi"><div className="n">{tarefas}</div><div className="l">Tarefas abertas</div></div>
          <div className="kpi"><div className="n">{prazos}</div><div className="l">Prazos ≤ 7 dias</div></div>
        </div>
        <div className="soon">
          <b>Sprint 0 no ar ✅</b> — login, banco (Postgres+pgvector) e as métricas já ligadas.
          As próximas sprints ligam a ingestão do SENTINELA (os números se preenchem sozinhos)
          e deixam cada card clicável: métrica → registros.
        </div>
      </div>
    </>
  );
}
