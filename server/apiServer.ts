
// API central do Sistema de Intimações.
//
// Centraliza captura, persistência e leitura das intimações para que o
// escritório compartilhe os mesmos dados (o front deixa de depender de
// localStorage) e para que a captura rode no SERVIDOR — onde alcança o CNJ e o
// LegalMail sem CORS e sem expor chaves no browser.
//
// Endpoints:
//   GET   /health                    -> healthcheck.
//   GET   /intimacoes                -> lista as intimações persistidas.
//   PATCH /intimacoes/:id            -> atualiza campos (ex.: statusLeitura).
//   POST  /intimacoes/sync/djen      -> captura no DJEN/CNJ (server-side) e persiste.
//   POST  /intimacoes/sync/legalmail -> captura no LegalMail (server-side) e persiste.
//   POST  /legalmail/webhook         -> recebe o push do LegalMail e persiste.
//   POST  /legalmail/register        -> registra a URL de webhook no LegalMail.
//
// Autenticação: se APP_TOKEN estiver definido, as rotas que alteram dados exigem
// o header `X-Auth-Token: <APP_TOKEN>` (o webhook usa sua própria clientkey).
//
// Sem dependências externas (node:http). Rode: `npx tsx server/apiServer.ts`.
// Para serverless, reaproveite `handleRequest` no handler da plataforma.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseLegalMailWebhook,
  registrarWebhookLegalMail,
  capturarLegalMailDaFonte,
  resolverLegalMailSource,
  type LegalMailWebhookPayload,
} from '../services/legalMailService';
import { capturarDjenDaFonte, resolverDjenSource } from '../services/djenService';
import type { Intimacao } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE = path.join(DATA_DIR, 'intimacoes.json');
const DIST_DIR = path.join(__dirname, '..', 'dist'); // front compilado (npm run build)

// -------------------- Servir o front compilado (deploy único) --------------------
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
};
// Serve um arquivo de dist/ com fallback para index.html (SPA). Retorna true se atendeu.
const servirEstatico = (pathname: string, res: http.ServerResponse): boolean => {
  if (!fs.existsSync(DIST_DIR)) return false;
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let alvo = path.join(DIST_DIR, rel);
  // Impede path traversal e cai para o index em rotas do SPA.
  if (!alvo.startsWith(DIST_DIR) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) {
    alvo = path.join(DIST_DIR, 'index.html');
  }
  if (!fs.existsSync(alvo)) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(alvo)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(alvo));
  return true;
};

// -------------------- Persistência (JSON local; troque por um BD em produção) --------------------
const lerStore = (): Intimacao[] => {
  try {
    return JSON.parse(fs.readFileSync(STORE, 'utf-8'));
  } catch {
    return [];
  }
};
const salvarStore = (itens: Intimacao[]) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(itens, null, 2));
};
// Faz merge deduplicando por id (as já existentes prevalecem; novas entram no topo).
const mergeIntimacoes = (novas: Intimacao[]): { total: number; adicionadas: number } => {
  const atuais = lerStore();
  const ids = new Set(atuais.map(i => i.id));
  const adicionadas = novas.filter(i => !ids.has(i.id));
  const merged = [...adicionadas, ...atuais];
  salvarStore(merged);
  return { total: merged.length, adicionadas: adicionadas.length };
};

// -------------------- Helpers HTTP --------------------
const CORS = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Auth-Token',
};
const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(JSON.stringify(body));
};
const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 5_000_000) reject(new Error('payload grande demais')); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

// Exige X-Auth-Token quando APP_TOKEN está configurado. Retorna true se autorizado.
const autorizado = (req: http.IncomingMessage): boolean => {
  const token = process.env.APP_TOKEN;
  if (!token) return true; // sem token configurado, aberto (defina APP_TOKEN em produção)
  return req.headers['x-auth-token'] === token;
};

// -------------------- Roteamento --------------------
export const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const { method = 'GET', url = '/' } = req;
  const pathname = url.split('?')[0];

  if (method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  if (method === 'GET' && pathname === '/health') {
    return json(res, 200, { ok: true, armazenadas: lerStore().length });
  }

  // Leitura das intimações (o front carrega daqui em vez do localStorage).
  if (method === 'GET' && pathname === '/intimacoes') {
    return json(res, 200, { intimacoes: lerStore() });
  }

  // Atualização de uma intimação (status de leitura, revisão, tipo reclassificado…).
  if (method === 'PATCH' && pathname.startsWith('/intimacoes/')) {
    if (!autorizado(req)) return json(res, 401, { error: 'não autorizado' });
    const id = decodeURIComponent(pathname.slice('/intimacoes/'.length));
    try {
      const patch = JSON.parse((await readBody(req)) || '{}') as Partial<Intimacao>;
      const itens = lerStore();
      const idx = itens.findIndex(i => i.id === id);
      if (idx === -1) return json(res, 404, { error: 'intimação não encontrada' });
      itens[idx] = { ...itens[idx], ...patch, id: itens[idx].id }; // id imutável
      salvarStore(itens);
      return json(res, 200, { status: 'success', intimacao: itens[idx] });
    } catch (e: any) {
      return json(res, 400, { error: e?.message ?? 'payload inválido' });
    }
  }

  // Captura server-side no DJEN/CNJ.
  if (method === 'POST' && pathname === '/intimacoes/sync/djen') {
    if (!autorizado(req)) return json(res, 401, { error: 'não autorizado' });
    try {
      const novas = await capturarDjenDaFonte(resolverDjenSource(), lerStore(), []);
      const r = mergeIntimacoes(novas);
      return json(res, 200, { status: 'success', canal: 'DJEN', ...r, novas: novas.length });
    } catch (e: any) {
      return json(res, 502, { error: e?.message ?? 'falha na captura DJEN' });
    }
  }

  // Captura server-side no LegalMail (polling; o webhook é o modo recomendado).
  if (method === 'POST' && pathname === '/intimacoes/sync/legalmail') {
    if (!autorizado(req)) return json(res, 401, { error: 'não autorizado' });
    try {
      const novas = await capturarLegalMailDaFonte(resolverLegalMailSource(), lerStore(), []);
      const r = mergeIntimacoes(novas);
      return json(res, 200, { status: 'success', canal: 'LegalMail', ...r, novas: novas.length });
    } catch (e: any) {
      return json(res, 502, { error: e?.message ?? 'falha na captura LegalMail' });
    }
  }

  // Recebe o push do LegalMail (modo recomendado, sem polling).
  if (method === 'POST' && pathname === '/legalmail/webhook') {
    try {
      const payload = JSON.parse((await readBody(req)) || '{}') as LegalMailWebhookPayload;
      const esperado = process.env.LEGALMAIL_WEBHOOK_KEY;
      if (esperado && payload.clientkey !== esperado) {
        return json(res, 401, { error: 'clientkey inválida' });
      }
      const novas = await parseLegalMailWebhook(payload, []);
      const r = mergeIntimacoes(novas);
      return json(res, 200, { status: 'success', recebidas: novas.length, ...r });
    } catch (e: any) {
      return json(res, 400, { error: e?.message ?? 'payload inválido' });
    }
  }

  // Registra este receiver no LegalMail.
  if (method === 'POST' && pathname === '/legalmail/register') {
    if (!autorizado(req)) return json(res, 401, { error: 'não autorizado' });
    try {
      const apiKey = process.env.LEGALMAIL_API_KEY;
      const endpoint = process.env.LEGALMAIL_WEBHOOK_ENDPOINT;
      if (!apiKey || !endpoint) {
        return json(res, 400, { error: 'Defina LEGALMAIL_API_KEY e LEGALMAIL_WEBHOOK_ENDPOINT.' });
      }
      const resultado = await registrarWebhookLegalMail({
        apiKey,
        endpoint,
        nomeAplicacao: process.env.LEGALMAIL_APP_NAME ?? 'Sistema de Intimações',
        keyEndpoint: process.env.LEGALMAIL_WEBHOOK_KEY,
      });
      return json(res, 200, resultado);
    } catch (e: any) {
      return json(res, 502, { error: e?.message ?? 'falha ao registrar' });
    }
  }

  // Front compilado (deploy único): serve dist/ para GETs que não são de API.
  if (method === 'GET' && servirEstatico(pathname, res)) return;

  return json(res, 404, { error: 'rota não encontrada' });
};

// -------------------- Bootstrap (quando executado diretamente) --------------------
const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (executadoDireto) {
  const port = Number(process.env.PORT ?? 8787);
  http.createServer(handleRequest).listen(port, () => {
    console.log(`API do Sistema de Intimações ouvindo em http://localhost:${port}`);
    console.log('  GET /intimacoes · PATCH /intimacoes/:id · POST /intimacoes/sync/{djen,legalmail}');
    console.log('  POST /legalmail/webhook · POST /legalmail/register · GET /health');
  });
}
