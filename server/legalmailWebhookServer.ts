
// Backend de webhook do LegalMail — recebe os pushes de intimações, classifica
// e persiste, expondo-as ao front SEM que o browser toque na API do LegalMail
// (a api_key nunca sai do servidor) e SEM polling.
//
// Endpoints:
//   POST /legalmail/webhook   -> recebe o payload do LegalMail (push).
//   GET  /intimacoes          -> lista as intimações capturadas (consumido pelo front).
//   POST /legalmail/register  -> registra a URL deste receiver no LegalMail.
//   GET  /health              -> healthcheck.
//
// Sem dependências externas (usa node:http). Rode com: `npx tsx server/legalmailWebhookServer.ts`.
// Para serverless (Vercel/Netlify/Lambda), reaproveite `handleRequest` no handler da plataforma.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseLegalMailWebhook,
  registrarWebhookLegalMail,
  type LegalMailWebhookPayload,
} from '../services/legalMailService';
import type { Intimacao } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE = path.join(DATA_DIR, 'intimacoes.json');

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
// Faz merge deduplicando por id (novas prevalecem).
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
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

// -------------------- Roteamento --------------------
export const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const { method = 'GET', url = '/' } = req;
  const pathname = url.split('?')[0];

  if (method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  if (method === 'GET' && pathname === '/health') {
    return json(res, 200, { ok: true, armazenadas: lerStore().length });
  }

  // Front consome daqui (barato e seguro; sem rate limit do LegalMail).
  if (method === 'GET' && pathname === '/intimacoes') {
    return json(res, 200, { intimacoes: lerStore() });
  }

  // Recebe o push do LegalMail.
  if (method === 'POST' && pathname === '/legalmail/webhook') {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}') as LegalMailWebhookPayload;

      // Validação opcional da chave de segurança (clientkey) configurada no registro.
      const esperado = process.env.LEGALMAIL_WEBHOOK_KEY;
      if (esperado && payload.clientkey !== esperado) {
        return json(res, 401, { error: 'clientkey inválida' });
      }

      // Sem a carteira do front aqui, o vínculo por número é resolvido no cliente.
      const novas = await parseLegalMailWebhook(payload, []);
      const { total, adicionadas } = mergeIntimacoes(novas);
      return json(res, 200, { status: 'success', recebidas: novas.length, adicionadas, total });
    } catch (e: any) {
      return json(res, 400, { error: e?.message ?? 'payload inválido' });
    }
  }

  // Registra este receiver no LegalMail.
  if (method === 'POST' && pathname === '/legalmail/register') {
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

  return json(res, 404, { error: 'rota não encontrada' });
};

// -------------------- Bootstrap (quando executado diretamente) --------------------
const executadoDireto = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (executadoDireto) {
  const port = Number(process.env.PORT ?? 8787);
  http.createServer(handleRequest).listen(port, () => {
    console.log(`LegalMail webhook receiver ouvindo em http://localhost:${port}`);
    console.log(`  POST /legalmail/webhook  · GET /intimacoes  · POST /legalmail/register  · GET /health`);
  });
}
