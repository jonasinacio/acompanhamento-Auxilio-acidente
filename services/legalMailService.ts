
// Ingestão de intimações do canal LegalMail (Certisign) — API pública real.
//
// Modelo da API (https://app.legalmail.com.br/api/docs):
//   • Autenticação: a chave vai como QUERY PARAM `api_key` em toda requisição
//     (não é header Bearer).
//   • Não há endpoint único de "listar intimações". O fluxo de captura é:
//       1. GET /api/v1/lawsuit/all           -> processos do workspace
//       2. GET /api/v1/pleading/notices-to-comply?idprocessos=ID
//                                             -> intimações pendentes do processo
//   • A doc DESACONSELHA polling: 60 req/min por workspace e, ao detectar
//     polling, aplica timeouts progressivos (10 min a 7 dias). O caminho
//     recomendado é WEBHOOK: POST /api/v1/workspace/notifications/endpoint
//     registra uma URL que recebe push de cada nova intimação importada.
//
// Este módulo cobre os dois modos: parser de webhook (recomendado) e captura
// por polling (com avisos de rate limit). A chave NUNCA é embutida no código —
// vem de configuração (env). Em produção, tanto o polling quanto o receiver do
// webhook devem rodar no BACKEND, para não expor a api_key no bundle do browser
// nem esbarrar em CORS.

import { Intimacao, Processo } from '../types';
import { stripHtml, construirIntimacao } from './intimacaoBuilder';

// Reexporta stripHtml para consumidores existentes do módulo.
export { stripHtml };

const LEGALMAIL_BASE_PADRAO = 'https://app.legalmail.com.br';

// ------------------------------------------------------------
// Tipos que refletem os payloads reais da API
// ------------------------------------------------------------

// Item de GET /api/v1/lawsuit/all
export interface LegalMailProcesso {
  idprocessos: number;
  numero_processo: string;
  juizo?: string;
  tribunal?: string;
  sistema_tribunal?: string;
  poloativo_nome?: string;
  polopassivo_nome?: string;
}

// Item de intimação em GET /api/v1/pleading/notices-to-comply
export interface LegalMailNotice {
  idintimacoes: number;
  data_intimacao: string;         // "YYYY-MM-DD"
  hora_intimacao?: string | null; // "HH:MM"
  tipo_intimacao?: string;        // ex.: "Intimação por sistema"
  tipo_prazo?: string;            // "fechado" | "aberto"
  texto_intimacao: string;        // HTML
}

export interface NoticesToComplyResponse {
  intimacoes_prazo_fechado?: LegalMailNotice[];
  intimacoes_prazo_aberto?: LegalMailNotice[];
}

// Payload do webhook POST /api/v1/workspace/notifications/endpoint
export interface LegalMailWebhookDocumento {
  tipo: 'text' | 'pdf';
  link?: string;
  text?: string;
  intimation_date?: string; // "YYYY-MM-DD"
  title?: string;
  id?: string | number;
  movement_date?: string;
}
export interface LegalMailWebhookProcesso {
  inbox_id?: string;
  tribunal?: string;
  sistema_tribunal?: string;
  instancia?: string;
  uf?: string;
  numero_processo: string;
  classe_processo?: string;
  polo_ativo?: string;
  polo_passivo?: string;
  documento?: LegalMailWebhookDocumento[];
}
export interface LegalMailWebhookPayload {
  clientkey?: string;
  params?: LegalMailWebhookProcesso[];
}

// ------------------------------------------------------------
// Webhook (modo recomendado): converte o payload de push em Intimações.
// Uso típico: no backend receiver, chame parseLegalMailWebhook(body, processos).
// ------------------------------------------------------------
export const parseLegalMailWebhook = async (
  payload: LegalMailWebhookPayload,
  processos: Processo[],
): Promise<Intimacao[]> => {
  const intimacoes: Intimacao[] = [];
  for (const proc of payload.params ?? []) {
    for (const doc of proc.documento ?? []) {
      const teor = doc.tipo === 'text'
        ? stripHtml(doc.text ?? '')
        : (doc.title ? `Documento (PDF): ${doc.title}` : 'Documento PDF anexado à movimentação.');
      intimacoes.push(await construirIntimacao({
        fonte: 'LegalMail',
        id: `lm-wh-${doc.id ?? `${proc.numero_processo}-${doc.movement_date ?? ''}`}`,
        numeroProcesso: proc.numero_processo,
        tribunal: proc.tribunal ?? '',
        orgao: proc.classe_processo ?? '',
        seguradoFallback: proc.polo_ativo ?? '',
        dataDisponibilizacao: doc.intimation_date ?? doc.movement_date ?? '',
        teorIntegral: teor,
        processos,
      }));
    }
  }
  return intimacoes;
};

// ------------------------------------------------------------
// Polling (fallback): lawsuit/all + notices-to-comply.
// ATENÇÃO: sujeito a 60 req/min e timeout progressivo por polling. Prefira o
// webhook. `maxProcessos` limita o fan-out de requisições notices-to-comply.
// ------------------------------------------------------------
export interface LegalMailApiConfig {
  apiKey: string;
  base?: string;         // padrão: https://app.legalmail.com.br
  maxProcessos?: number; // limite de processos consultados por sincronização
}

const comApiKey = (url: string, apiKey: string) =>
  url + (url.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(apiKey);

const getJson = async (url: string) => {
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (resp.status === 429) {
    const retry = resp.headers.get('Retry-After');
    throw new Error(`LegalMail: rate limit / bloqueio por polling (429)${retry ? `, aguarde ${retry}s` : ''}.`);
  }
  if (!resp.ok) throw new Error(`LegalMail API respondeu ${resp.status}`);
  return resp.json();
};

export const capturarLegalMailApi = async (
  config: LegalMailApiConfig,
  existentes: Intimacao[],
  processos: Processo[],
): Promise<Intimacao[]> => {
  const base = config.base ?? LEGALMAIL_BASE_PADRAO;
  const limite = config.maxProcessos ?? 25;
  const jaCapturados = new Set(existentes.map(i => i.id));

  const listaProcessos: LegalMailProcesso[] = await getJson(
    comApiKey(`${base}/api/v1/lawsuit/all?offset=0&limit=${limite}`, config.apiKey),
  );

  const novas: Intimacao[] = [];
  for (const proc of listaProcessos) {
    const resp: NoticesToComplyResponse = await getJson(
      comApiKey(`${base}/api/v1/pleading/notices-to-comply?idprocessos=${proc.idprocessos}`, config.apiKey),
    );
    const notices = [
      ...(resp.intimacoes_prazo_fechado ?? []),
      ...(resp.intimacoes_prazo_aberto ?? []),
    ];
    for (const n of notices) {
      const id = `lm-${n.idintimacoes}`;
      if (jaCapturados.has(id)) continue;
      novas.push(await construirIntimacao({
        id,
        fonte: 'LegalMail',
        numeroProcesso: proc.numero_processo,
        tribunal: proc.tribunal ?? '',
        orgao: proc.juizo ?? '',
        seguradoFallback: proc.poloativo_nome ?? '',
        dataDisponibilizacao: n.data_intimacao,
        teorIntegral: stripHtml(n.texto_intimacao),
        processos,
      }));
    }
  }
  return novas;
};

// ------------------------------------------------------------
// Abstração de FONTE usada pela UI (mock ↔ API real)
// ------------------------------------------------------------
export interface LegalMailSource {
  nome: string;
  capturar: (existentes: Intimacao[], processos: Processo[]) => Promise<Intimacao[]>;
}

// Fonte simulada: usa payloads no MESMO formato da API real (notices-to-comply)
// para exercitar todo o pipeline offline.
const MOCK_PROCESSOS_LEGALMAIL: LegalMailProcesso[] = [
  {
    idprocessos: 90001,
    numero_processo: '5044556-12.2024.4.03.6100',
    juizo: '6ª Vara do JEF de São Paulo',
    tribunal: 'TRF3',
    poloativo_nome: 'Patrícia Gomes Ribeiro',
  },
  {
    idprocessos: 90002,
    numero_processo: '5055667-89.2024.4.03.6130',
    juizo: '3ª Vara do JEF de Osasco',
    tribunal: 'TRF3',
    poloativo_nome: 'Marcos Vinícius Prado',
  },
];

const hojeISO = () => new Date().toISOString().split('T')[0];
const diasAtras = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0];
};

const MOCK_NOTICES: Record<number, NoticesToComplyResponse> = {
  90001: {
    intimacoes_prazo_fechado: [{
      idintimacoes: 700001,
      data_intimacao: hojeISO(),
      hora_intimacao: '13:20',
      tipo_intimacao: 'Intimação por sistema',
      tipo_prazo: 'fechado',
      texto_intimacao: '<p>Fica a parte autora intimada da r. <b>sentença</b> que julgou PROCEDENTE o pedido, condenando o INSS na concessão do auxílio-acidente. Abre-se prazo para eventual recurso inominado.</p>',
    }],
  },
  90002: {
    intimacoes_prazo_aberto: [{
      idintimacoes: 700002,
      data_intimacao: diasAtras(2),
      hora_intimacao: null,
      tipo_intimacao: 'Intimação por sistema',
      tipo_prazo: 'aberto',
      texto_intimacao: '<p>Designada perícia médica para o dia 05/08, às 10h. Intime-se a parte autora para comparecimento munida de documentos e exames.</p>',
    }],
  },
};

export const mockLegalMailSource: LegalMailSource = {
  nome: 'LegalMail (simulado)',
  capturar: async (existentes, processos) => {
    const jaCapturados = new Set(existentes.map(i => i.id));
    const novas: Intimacao[] = [];
    for (const proc of MOCK_PROCESSOS_LEGALMAIL) {
      const resp = MOCK_NOTICES[proc.idprocessos] ?? {};
      const notices = [
        ...(resp.intimacoes_prazo_fechado ?? []),
        ...(resp.intimacoes_prazo_aberto ?? []),
      ];
      for (const n of notices) {
        const id = `lm-${n.idintimacoes}`;
        if (jaCapturados.has(id)) continue;
        novas.push(await construirIntimacao({
          id,
          fonte: 'LegalMail',
          numeroProcesso: proc.numero_processo,
          tribunal: proc.tribunal ?? '',
          orgao: proc.juizo ?? '',
          seguradoFallback: proc.poloativo_nome ?? '',
          dataDisponibilizacao: n.data_intimacao,
          teorIntegral: stripHtml(n.texto_intimacao),
          processos,
        }));
      }
    }
    return novas;
  },
};

// Fonte real via API, encapsulada na mesma interface.
export const criarLegalMailApiSource = (config: LegalMailApiConfig): LegalMailSource => ({
  nome: 'LegalMail (API)',
  capturar: (existentes, processos) => capturarLegalMailApi(config, existentes, processos),
});

// Fonte que lê do NOSSO backend de webhook (recomendada para o browser): as
// intimações já chegam classificadas, sem expor a api_key nem consultar a API
// do LegalMail a partir do cliente.
export const criarBackendSource = (backendUrl: string): LegalMailSource => ({
  nome: 'LegalMail (via backend)',
  capturar: async () => {
    const resp = await fetch(`${backendUrl.replace(/\/$/, '')}/intimacoes`, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`Backend respondeu ${resp.status}`);
    const data = await resp.json();
    return (Array.isArray(data) ? data : data.intimacoes ?? []) as Intimacao[];
  },
});

/**
 * Registra a URL de webhook no LegalMail
 * (POST /api/v1/workspace/notifications/endpoint). Deve ser chamado a partir do
 * BACKEND, onde a api_key fica protegida.
 */
export const registrarWebhookLegalMail = async (params: {
  apiKey: string;
  endpoint: string;        // URL pública do seu receiver
  nomeAplicacao: string;
  keyEndpoint?: string;    // chave de segurança opcional (recebida como clientkey)
  base?: string;
}): Promise<{ status: string }> => {
  const base = params.base ?? LEGALMAIL_BASE_PADRAO;
  const qs = new URLSearchParams({
    api_key: params.apiKey,
    endpoint: params.endpoint,
    nome_aplicacao: params.nomeAplicacao,
  });
  if (params.keyEndpoint) qs.set('key_endpoint', params.keyEndpoint);
  const resp = await fetch(`${base}/api/v1/workspace/notifications/endpoint?${qs.toString()}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`Falha ao registrar webhook: HTTP ${resp.status}`);
  return resp.json();
};

/**
 * Resolve a fonte a partir do ambiente, por ordem de preferência:
 *   1. LEGALMAIL_BACKEND_URL  -> lê do nosso backend de webhook (recomendado);
 *   2. LEGALMAIL_API_KEY      -> chama a API do LegalMail direto (polling);
 *   3. fonte simulada.
 */
export const resolverLegalMailSource = (): LegalMailSource => {
  const backendUrl = process.env.LEGALMAIL_BACKEND_URL;
  if (backendUrl) return criarBackendSource(backendUrl);

  const apiKey = process.env.LEGALMAIL_API_KEY;
  if (apiKey) {
    return criarLegalMailApiSource({
      apiKey,
      base: process.env.LEGALMAIL_API_BASE,
      maxProcessos: process.env.LEGALMAIL_MAX_PROCESSOS ? Number(process.env.LEGALMAIL_MAX_PROCESSOS) : undefined,
    });
  }
  return mockLegalMailSource;
};

/**
 * Captura a partir de uma FONTE e deduplica por id contra as já existentes.
 */
export const capturarLegalMailDaFonte = async (
  source: LegalMailSource,
  existentes: Intimacao[],
  processos: Processo[],
): Promise<Intimacao[]> => {
  const novas = await source.capturar(existentes, processos);
  const ids = new Set(existentes.map(i => i.id));
  return novas.filter(i => !ids.has(i.id));
};
