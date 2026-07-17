#!/usr/bin/env node
// @ts-check
/**
 * advbox-descobrir.mjs
 * --------------------------------------------------------------------------
 * Script de DESCOBERTA da API ADVBOX.
 *
 * Objetivo: autenticar na API da ADVBOX e "descobrir" quais dados estão
 * disponíveis para integrar ao dashboard de acompanhamento de Auxílio-Acidente.
 * Ele faz apenas chamadas de LEITURA (GET) e imprime, para cada endpoint,
 * o status HTTP e um resumo da estrutura (shape) da resposta.
 *
 * Nada é criado, atualizado ou apagado na sua conta ADVBOX.
 *
 * Como usar:
 *   1. Gere seu token na ADVBOX (Configurações > API / Integrações).
 *   2. Exporte a variável de ambiente (ou coloque no arquivo .env.local):
 *        export ADVBOX_TOKEN="seu_token_aqui"
 *   3. Rode:
 *        node scripts/advbox-descobrir.mjs
 *
 * Variáveis de ambiente aceitas:
 *   ADVBOX_TOKEN     (ou ADVBOX_API_KEY) - token Bearer da API. Obrigatório.
 *   ADVBOX_BASE_URL  - base da API. Padrão: https://app.advbox.com.br/api/v1
 *   ADVBOX_ENDPOINTS - lista de endpoints separados por vírgula para sobrescrever
 *                      os padrões (ex: "settings,lawsuits").
 *
 * Requer Node 18+ (usa fetch nativo).
 * --------------------------------------------------------------------------
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// --- Carrega .env.local de forma simples (sem dependências) ------------------
function carregarEnvLocal() {
  const caminho = resolve(projectRoot, '.env.local');
  try {
    const conteudo = readFileSync(caminho, 'utf8');
    for (const linhaBruta of conteudo.split('\n')) {
      const linha = linhaBruta.trim();
      if (!linha || linha.startsWith('#')) continue;
      const idx = linha.indexOf('=');
      if (idx === -1) continue;
      const chave = linha.slice(0, idx).trim();
      let valor = linha.slice(idx + 1).trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      if (!(chave in process.env)) process.env[chave] = valor;
    }
  } catch {
    // .env.local é opcional — ignora se não existir.
  }
}

carregarEnvLocal();

// --- Configuração ------------------------------------------------------------
const TOKEN = process.env.ADVBOX_TOKEN || process.env.ADVBOX_API_KEY || '';
const BASE_URL = (process.env.ADVBOX_BASE_URL || 'https://app.advbox.com.br/api/v1').replace(/\/+$/, '');

// Endpoints de LEITURA que serão sondados. O /settings costuma ser o mais
// importante: retorna os IDs da conta (usuários, fases, categorias etc.).
const ENDPOINTS_PADRAO = [
  'settings',   // Configurações e IDs da conta
  'users',      // Usuários do escritório
  'lawsuits',   // Processos judiciais
  'customers',  // Contatos / clientes
  'tasks',      // Tarefas e prazos
  'posts',      // Movimentações / andamentos
];

const endpoints = (process.env.ADVBOX_ENDPOINTS
  ? process.env.ADVBOX_ENDPOINTS.split(',').map((e) => e.trim()).filter(Boolean)
  : ENDPOINTS_PADRAO);

// --- Utilidades de exibição --------------------------------------------------
const cores = {
  reset: '\x1b[0m',
  cinza: '\x1b[90m',
  verde: '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  azul: '\x1b[36m',
  negrito: '\x1b[1m',
};

function titulo(texto) {
  console.log(`\n${cores.negrito}${cores.azul}${texto}${cores.reset}`);
}

/**
 * Resume a "forma" (shape) de um valor JSON: tipos, chaves e amostras,
 * sem despejar todos os dados sensíveis do escritório.
 */
function resumirShape(valor, profundidade = 0, maxProfundidade = 2) {
  const ident = '  '.repeat(profundidade + 1);

  if (Array.isArray(valor)) {
    if (valor.length === 0) return 'array vazio []';
    const primeiro = valor[0];
    const detalhe = resumirShape(primeiro, profundidade + 1, maxProfundidade);
    return `array com ${valor.length} item(ns). Estrutura do 1º item:\n${ident}${detalhe}`;
  }

  if (valor === null) return 'null';

  if (typeof valor === 'object') {
    if (profundidade >= maxProfundidade) return '{…}';
    const chaves = Object.keys(valor);
    if (chaves.length === 0) return 'objeto vazio {}';
    const linhas = chaves.map((chave) => {
      const v = valor[chave];
      let tipo;
      if (Array.isArray(v)) tipo = `array[${v.length}]`;
      else if (v === null) tipo = 'null';
      else if (typeof v === 'object') tipo = 'object';
      else tipo = typeof v;
      return `${ident}${cores.cinza}- ${chave}: ${tipo}${cores.reset}`;
    });
    return `objeto com ${chaves.length} chave(s):\n${linhas.join('\n')}`;
  }

  return `${typeof valor} (ex: ${JSON.stringify(valor)})`;
}

// --- Sondagem de um endpoint -------------------------------------------------
async function sondar(endpoint) {
  const url = `${BASE_URL}/${endpoint}`;
  titulo(`▶ GET ${url}`);

  const inicio = Date.now();
  let resposta;
  try {
    resposta = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/json',
      },
    });
  } catch (erro) {
    console.log(`  ${cores.vermelho}✖ Falha de rede: ${erro?.message || erro}${cores.reset}`);
    return { endpoint, ok: false, status: 0, erro: String(erro?.message || erro) };
  }

  const ms = Date.now() - inicio;
  const status = resposta.status;
  const corStatus = resposta.ok ? cores.verde : cores.vermelho;
  console.log(`  Status: ${corStatus}${status} ${resposta.statusText}${cores.reset} ${cores.cinza}(${ms}ms)${cores.reset}`);

  const contentType = resposta.headers.get('content-type') || '';
  let corpo;
  try {
    corpo = contentType.includes('application/json')
      ? await resposta.json()
      : await resposta.text();
  } catch {
    corpo = await resposta.text().catch(() => '<sem corpo>');
  }

  if (typeof corpo === 'string') {
    const amostra = corpo.slice(0, 300);
    console.log(`  Resposta (texto): ${cores.cinza}${amostra}${corpo.length > 300 ? '…' : ''}${cores.reset}`);
  } else {
    console.log(`  Estrutura: ${resumirShape(corpo)}`);
  }

  return { endpoint, ok: resposta.ok, status, tipo: contentType };
}

// --- Execução principal ------------------------------------------------------
async function main() {
  console.log(`${cores.negrito}=== Descoberta da API ADVBOX ===${cores.reset}`);
  console.log(`Base URL: ${cores.azul}${BASE_URL}${cores.reset}`);
  console.log(`Endpoints a sondar: ${cores.azul}${endpoints.join(', ')}${cores.reset}`);

  if (!TOKEN) {
    console.log(`\n${cores.amarelo}⚠ Nenhum token encontrado.${cores.reset}`);
    console.log('Defina a variável de ambiente ADVBOX_TOKEN (ou ADVBOX_API_KEY) e rode novamente:');
    console.log(`  ${cores.cinza}export ADVBOX_TOKEN="seu_token_aqui"${cores.reset}`);
    console.log(`  ${cores.cinza}node scripts/advbox-descobrir.mjs${cores.reset}`);
    console.log('\nOu adicione ao arquivo .env.local na raiz do projeto:');
    console.log(`  ${cores.cinza}ADVBOX_TOKEN=seu_token_aqui${cores.reset}`);
    process.exitCode = 1;
    return;
  }

  const resultados = [];
  for (const endpoint of endpoints) {
    // sequencial de propósito, para não sobrecarregar a API e manter o log legível
    resultados.push(await sondar(endpoint));
  }

  // Resumo final
  titulo('=== Resumo ===');
  for (const r of resultados) {
    const marca = r.ok ? `${cores.verde}✔${cores.reset}` : `${cores.vermelho}✖${cores.reset}`;
    console.log(`  ${marca} ${r.endpoint.padEnd(12)} → ${r.status || 'erro'}`);
  }

  const houveAuthErro = resultados.some((r) => r.status === 401 || r.status === 403);
  if (houveAuthErro) {
    console.log(`\n${cores.amarelo}⚠ Recebemos 401/403 em algum endpoint. Verifique se o token está correto e ativo.${cores.reset}`);
  }
}

main().catch((erro) => {
  console.error(`${cores.vermelho}Erro inesperado:${cores.reset}`, erro);
  process.exitCode = 1;
});
