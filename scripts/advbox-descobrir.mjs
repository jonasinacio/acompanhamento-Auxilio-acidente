#!/usr/bin/env node
// Ferramenta de descoberta da API do ADVBOX.
// RODAR NA SESSÃO NOVA (com a rede liberada e ADVBOX_TOKEN no ambiente):
//   node scripts/advbox-descobrir.mjs
// Ela confirma a conexão e imprime a ESTRUTURA (chaves) das respostas,
// para finalizarmos o mapeamento do digest com os campos reais.

import { getSettings, listLawsuits, listPublications, listPosts, advboxGet } from '../services/advboxService.mjs';

const chaves = (obj, prefix = '') => {
  if (Array.isArray(obj)) return obj.length ? chaves(obj[0], prefix + '[0].') : `${prefix} (array vazio)`;
  if (obj && typeof obj === 'object') return Object.keys(obj).map((k) => prefix + k).join(', ');
  return `${prefix} = ${obj}`;
};

const testar = async (nome, fn) => {
  try {
    const r = await fn();
    console.log(`\n✅ ${nome}`);
    console.log('   chaves:', chaves(r));
    const arr = Array.isArray(r) ? r : r?.data ?? r?.items;
    if (Array.isArray(arr) && arr.length) console.log('   item[0]:', chaves(arr[0]));
  } catch (e) {
    console.log(`\n❌ ${nome}: ${e.message}`);
    if (String(e.message).includes('CONNECT') || String(e.message).includes('fetch')) {
      console.log('   → parece bloqueio de REDE. Confirme que app.advbox.com.br está liberado E que esta é uma SESSÃO NOVA.');
    }
  }
};

console.log('Descobrindo a API do ADVBOX...');
if (!process.env.ADVBOX_TOKEN) {
  console.log('⚠️  ADVBOX_TOKEN ausente no ambiente. Defina antes de rodar.');
  process.exit(1);
}
await testar('GET /settings', getSettings);
await testar('GET /lawsuits?page=1', () => listLawsuits(1));
await testar('GET /publications?page=1', () => listPublications(1));
await testar('GET /posts?page=1', () => listPosts(1));
console.log('\nPronto. Com essas chaves eu finalizo o mapeamento do digest.');
