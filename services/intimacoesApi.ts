
// Cliente do front para a API central (server/apiServer.ts).
// Quando INTIMACOES_API_URL está definido, o app compartilha os dados via
// backend; caso contrário, opera só com localStorage (modo offline/individual).

import { Intimacao } from '../types';

const base = (): string => (process.env.INTIMACOES_API_URL || '').replace(/\/$/, '');

export const intimacoesBackendAtivo = (): boolean => !!base();

const headers = (): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.APP_TOKEN) h['X-Auth-Token'] = process.env.APP_TOKEN;
  return h;
};

export const listarIntimacoes = async (): Promise<Intimacao[]> => {
  const resp = await fetch(`${base()}/intimacoes`, { headers: { Accept: 'application/json' } });
  if (!resp.ok) throw new Error(`Backend respondeu ${resp.status}`);
  const data = await resp.json();
  return (Array.isArray(data) ? data : data.intimacoes ?? []) as Intimacao[];
};

export const patchIntimacao = async (id: string, patch: Partial<Intimacao>): Promise<void> => {
  const resp = await fetch(`${base()}/intimacoes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(patch),
  });
  if (!resp.ok) throw new Error(`Falha ao atualizar (HTTP ${resp.status})`);
};

// Dispara a captura server-side e retorna quantas intimações foram adicionadas.
export const sincronizarCanalBackend = async (canal: 'DJEN' | 'LegalMail'): Promise<number> => {
  const rota = canal === 'DJEN' ? 'djen' : 'legalmail';
  const resp = await fetch(`${base()}/intimacoes/sync/${rota}`, { method: 'POST', headers: headers() });
  if (!resp.ok) throw new Error(`Falha na captura ${canal} (HTTP ${resp.status})`);
  const data = await resp.json();
  return data.adicionadas ?? 0;
};
