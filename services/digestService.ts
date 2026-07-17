import { Processo } from '../types';

/**
 * Gera o digest semanal da carteira em Markdown.
 * Reutilizável no app (botão "Gerar digest") e por uma rotina agendada.
 *
 * @param processos lista de processos
 * @param referencia data de referência (default: hoje)
 * @param janelaDias janela de "próximos dias" para perícias/prazos (default: 7)
 * @param paradoDias dias sem movimentação para considerar um caso "parado" (default: 30)
 */
export const gerarDigest = (
  processos: Processo[],
  referencia: Date = new Date(),
  janelaDias: number = 7,
  paradoDias: number = 30,
): string => {
  const hoje = new Date(referencia);
  hoje.setHours(0, 0, 0, 0);

  const dias = (s?: string): number =>
    s ? Math.round((new Date(s).getTime() - hoje.getTime()) / 86400000) : NaN;
  const brl = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dt = (s: string) => new Date(s).toLocaleDateString('pt-BR');

  const ativos = processos.filter((p) => p.status !== 'Finalizado');

  const pericias = ativos.filter(
    (p) => !p.periciaRealizada && p.dataPericia &&
      dias(p.dataPericia) >= 0 && dias(p.dataPericia) <= janelaDias,
  ).sort((a, b) => dias(a.dataPericia) - dias(b.dataPericia));

  const prazos = ativos.filter(
    (p) => p.dataPrevista && dias(p.dataPrevista) >= 0 && dias(p.dataPrevista) <= janelaDias,
  ).sort((a, b) => dias(a.dataPrevista) - dias(b.dataPrevista));

  const parados = ativos
    .filter((p) => dias(p.ultimaMovimentacao) <= -paradoDias)
    .sort((a, b) => dias(a.ultimaMovimentacao) - dias(b.ultimaMovimentacao));

  const porStatus: Record<string, number> = {};
  ativos.forEach((p) => (porStatus[p.status] = (porStatus[p.status] || 0) + 1));

  const carteira = ativos.reduce((s, p) => s + (p.valorPrevisto || 0), 0);

  const o: string[] = [];
  o.push(`# 📋 Digest semanal — ${hoje.toLocaleDateString('pt-BR')}`);
  o.push(`Casos ativos: ${ativos.length} · Carteira prevista: ${brl(carteira)}\n`);

  o.push(`## 🩺 Perícias nos próximos ${janelaDias} dias (${pericias.length})`);
  o.push(pericias.length
    ? pericias.map((p) => `- **${p.cliente}** — ${dt(p.dataPericia!)} (em ${dias(p.dataPericia)}d) · ${p.tipoSequela}`).join('\n')
    : '- nenhuma');

  o.push(`\n## ⏰ Prazos/datas previstas nos próximos ${janelaDias} dias (${prazos.length})`);
  o.push(prazos.length
    ? prazos.map((p) => `- **${p.cliente}** — ${dt(p.dataPrevista)} (em ${dias(p.dataPrevista)}d) · ${p.status}`).join('\n')
    : '- nenhum');

  o.push(`\n## 🟠 Casos parados (> ${paradoDias} dias sem movimentação) (${parados.length})`);
  o.push(parados.length
    ? parados.map((p) => `- **${p.cliente}** — ${-dias(p.ultimaMovimentacao)} dias parado · ${p.status}`).join('\n')
    : '- nenhum');

  o.push(`\n## 📊 Por status`);
  o.push(Object.entries(porStatus).map(([k, v]) => `- ${k}: ${v}`).join('\n'));

  return o.join('\n');
};
