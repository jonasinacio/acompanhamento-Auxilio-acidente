// Integração com a API do ADVBOX (https://app.advbox.com.br/api/v1)
// Autenticação: Bearer token lido de process.env.ADVBOX_TOKEN (NUNCA no código/repo).
//
// IMPORTANTE: os hosts do ADVBOX precisam estar liberados na política de rede do
// ambiente, e a mudança só vale em SESSÃO NOVA. Se você receber erro de CONNECT/403,
// o problema é a rede do ambiente, não o token.

const BASE = 'https://app.advbox.com.br/api/v1';

const token = () => {
  const t = process.env.ADVBOX_TOKEN;
  if (!t) throw new Error('ADVBOX_TOKEN ausente — defina a variável de ambiente (nunca no código).');
  return t;
};

/** GET genérico na API do ADVBOX. Retorna o JSON já parseado. */
export async function advboxGet(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)));
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ADVBOX ${res.status} em ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// --- Endpoints (nomes conforme a doc: Settings, Processes/Lawsuits, Publications, Posts, Transactions) ---
export const getSettings = () => advboxGet('/settings');
export const listLawsuits = (page = 1) => advboxGet('/lawsuits', { page });
export const listPublications = (page = 1) => advboxGet('/publications', { page });
export const listPosts = (page = 1) => advboxGet('/posts', { page });
export const listTransactions = (page = 1) => advboxGet('/transactions', { page });

/**
 * Extrai um array de itens de uma resposta que pode vir como [] ou { data: [] }.
 * (o formato exato se confirma rodando scripts/advbox-descobrir.mjs na sessão liberada)
 */
export const itens = (resp) =>
  Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : resp?.items ?? [];
