#!/usr/bin/env node
// Gera o digest semanal a partir de data/casos.csv e salva em docs/digest-latest.md
// Uso: node scripts/gerar-digest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- parse CSV simples (sem vírgulas dentro dos campos) ---
const raw = readFileSync(join(root, 'data', 'casos.csv'), 'utf8').trim();
const [head, ...linhas] = raw.split(/\r?\n/);
const cols = head.split(',');
const processos = linhas.filter(Boolean).map((l) => {
  const v = l.split(',');
  const o = {};
  cols.forEach((c, i) => (o[c] = v[i]));
  o.valorPrevisto = Number(o.valorPrevisto) || 0;
  o.periciaRealizada = String(o.periciaRealizada).trim() === 'true';
  return o;
});

// --- lógica do digest (espelha services/digestService.ts) ---
const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const dias = (s) => (s ? Math.round((new Date(s).getTime() - hoje.getTime()) / 86400000) : NaN);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (s) => new Date(s).toLocaleDateString('pt-BR');
const J = 7, PARADO = 30;

const ativos = processos.filter((p) => p.status !== 'Finalizado');
const pericias = ativos.filter((p) => !p.periciaRealizada && p.dataPericia && dias(p.dataPericia) >= 0 && dias(p.dataPericia) <= J).sort((a, b) => dias(a.dataPericia) - dias(b.dataPericia));
const prazos = ativos.filter((p) => p.dataPrevista && dias(p.dataPrevista) >= 0 && dias(p.dataPrevista) <= J).sort((a, b) => dias(a.dataPrevista) - dias(b.dataPrevista));
const parados = ativos.filter((p) => dias(p.ultimaMovimentacao) <= -PARADO).sort((a, b) => dias(a.ultimaMovimentacao) - dias(b.ultimaMovimentacao));
const porStatus = {};
ativos.forEach((p) => (porStatus[p.status] = (porStatus[p.status] || 0) + 1));
const carteira = ativos.reduce((s, p) => s + p.valorPrevisto, 0);

const o = [];
o.push(`# 📋 Digest semanal — ${hoje.toLocaleDateString('pt-BR')}`);
o.push(`Casos ativos: ${ativos.length} · Carteira prevista: ${brl(carteira)}\n`);
o.push(`## 🩺 Perícias nos próximos ${J} dias (${pericias.length})`);
o.push(pericias.length ? pericias.map((p) => `- **${p.cliente}** — ${dt(p.dataPericia)} (em ${dias(p.dataPericia)}d) · ${p.tipoSequela}`).join('\n') : '- nenhuma');
o.push(`\n## ⏰ Prazos/datas previstas nos próximos ${J} dias (${prazos.length})`);
o.push(prazos.length ? prazos.map((p) => `- **${p.cliente}** — ${dt(p.dataPrevista)} (em ${dias(p.dataPrevista)}d) · ${p.status}`).join('\n') : '- nenhum');
o.push(`\n## 🟠 Casos parados (> ${PARADO} dias sem movimentação) (${parados.length})`);
o.push(parados.length ? parados.map((p) => `- **${p.cliente}** — ${-dias(p.ultimaMovimentacao)} dias parado · ${p.status}`).join('\n') : '- nenhum');
o.push(`\n## 📊 Por status`);
o.push(Object.entries(porStatus).map(([k, v]) => `- ${k}: ${v}`).join('\n'));

const saida = o.join('\n');
writeFileSync(join(root, 'docs', 'digest-latest.md'), saida + '\n');
console.log(saida);
