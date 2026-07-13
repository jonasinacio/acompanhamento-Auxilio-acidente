
// Ingestão de intimações eletrônicas do canal LegalMail (Certisign).
//
// O LegalMail entrega citações/intimações por e-mail. Aqui modelamos a
// captura: um e-mail bruto é convertido em uma Intimacao (extração dos
// metadados do processo), classificado pela IA e vinculado ao cliente pela
// regra de número de processo — os mesmos passos do canal DJEN.
//
// A caixa simulada (MOCK_LEGALMAIL_INBOX) representa o que, em produção,
// viria de um inbox real (Gmail/IMAP autorizado ou webhook do LegalMail).

import { Intimacao, Processo, TipoAto } from '../types';
import { PRAZO_REGRAS } from '../constants';
import { calcularPrazoFinal } from '../utils/prazo';
import { classifyIntimacao } from './geminiService';

export interface LegalMailEmail {
  messageId: string;   // ID único da mensagem (dedup)
  recebidoEm: string;  // ISO date de recebimento
  assunto: string;
  remetente: string;
  corpo: string;       // teor integral da intimação
}

// Metadados extraídos do e-mail (antes da classificação pela IA).
interface DadosExtraidos {
  numeroProcesso: string;
  tribunal: string;
  orgao: string;
  segurado: string;
}

const REGEX_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

const extrairCampo = (texto: string, rotulos: string[]): string | null => {
  for (const rotulo of rotulos) {
    const re = new RegExp(`${rotulo}\\s*:?\\s*(.+)`, 'i');
    const m = texto.match(re);
    if (m) return m[1].split(/[\n\r|;]/)[0].trim();
  }
  return null;
};

/** Extrai número do processo, tribunal, órgão e segurado de um e-mail LegalMail. */
export const parseLegalMailEmail = (email: LegalMailEmail): DadosExtraidos => {
  const texto = `${email.assunto}\n${email.corpo}`;

  const numeroProcesso =
    (texto.match(REGEX_CNJ) || [])[0] ?? 'NÃO IDENTIFICADO';

  // Tribunal: TRFx, "Turma Recursal" ou fallback pelo segmento CNJ (.4.03. => TRF3).
  let tribunal = (texto.match(/TRF\s?-?\s?\d/i) || [])[0]?.replace(/\s|-/g, '') ?? '';
  if (!tribunal && /turma recursal/i.test(texto)) tribunal = 'Turma Recursal';
  if (!tribunal && numeroProcesso !== 'NÃO IDENTIFICADO') {
    const seg = numeroProcesso.split('.'); // ...4.03.6100 => regional 03
    tribunal = seg.length >= 4 ? `TRF${Number(seg[3])}` : 'Justiça Federal';
  }

  const orgao =
    extrairCampo(texto, ['Vara', 'Órgão', 'Orgao', 'Juízo', 'Juizo']) ??
    'Órgão não identificado';

  const segurado =
    extrairCampo(texto, ['Autor', 'Parte autora', 'Segurado', 'Requerente', 'Exequente']) ??
    'Segurado não identificado';

  return { numeroProcesso, tribunal, orgao, segurado };
};

/**
 * Captura um lote de e-mails do LegalMail e devolve novas Intimações prontas
 * (parseadas, classificadas pela IA e com prazo calculado por regra fixa).
 *
 * - Deduplica por messageId contra as intimações já existentes.
 * - Vincula automaticamente ao Processo pela igualdade de número (fallback: null).
 * - Se a IA falhar/estiver indisponível, o item entra como "Outro"/Baixa em
 *   revisão manual — mesmo comportamento do canal DJEN.
 */
export const capturarLegalMail = async (
  emails: LegalMailEmail[],
  existentes: Intimacao[],
  processos: Processo[],
): Promise<Intimacao[]> => {
  const jaCapturados = new Set(
    existentes.map(i => i.id).filter(id => id.startsWith('lm-')),
  );

  const novas: Intimacao[] = [];

  for (const email of emails) {
    const id = `lm-${email.messageId}`;
    if (jaCapturados.has(id)) continue;

    const dados = parseLegalMailEmail(email);
    const classificacao = await classifyIntimacao(email.corpo);

    const tipoAto: TipoAto = classificacao?.tipoAto ?? 'Outro';
    const prazoDias = PRAZO_REGRAS[tipoAto].prazoDias;

    const processoVinculado = processos.find(
      p => p.numero === dados.numeroProcesso,
    );

    novas.push({
      id,
      fonte: 'LegalMail',
      numeroProcesso: dados.numeroProcesso,
      tribunal: dados.tribunal,
      orgao: dados.orgao,
      // Prefere o nome do cliente vinculado; senão o extraído do e-mail.
      segurado: processoVinculado?.cliente ?? dados.segurado,
      dataDisponibilizacao: email.recebidoEm,
      teorIntegral: email.corpo,
      teorResumido:
        classificacao?.teorResumido ??
        (email.corpo.length > 120 ? email.corpo.slice(0, 117) + '...' : email.corpo),
      tipoAto,
      confianca: classificacao?.confianca ?? 'Baixa',
      prazoDias,
      dataPrazoFinal: calcularPrazoFinal(email.recebidoEm, prazoDias),
      statusLeitura: 'Não Lida',
      processoVinculadoId: processoVinculado?.id ?? null,
      revisaoManual: !classificacao || classificacao.confianca === 'Baixa',
    });
  }

  return novas;
};

// ============================================================
// Adaptador de FONTE — permite trocar a caixa simulada pela API real
// do LegalMail sem alterar o pipeline de captura/classificação.
// ============================================================

export interface LegalMailSource {
  nome: string;
  fetchNovosEmails: () => Promise<LegalMailEmail[]>;
}

// Fonte simulada (desenvolvimento/demonstração).
export const mockLegalMailSource: LegalMailSource = {
  nome: 'LegalMail (simulado)',
  fetchNovosEmails: async () => MOCK_LEGALMAIL_INBOX,
};

export interface LegalMailApiConfig {
  apiUrl: string;
  apiKey: string;
  authHeader?: string; // padrão: 'Authorization'
  authScheme?: string; // padrão: 'Bearer ' (use '' para chave crua no header)
}

/**
 * AJUSTE AQUI conforme o payload real da API do LegalMail.
 * Mapeia um item bruto da resposta para o nosso LegalMailEmail. Tenta os nomes
 * de campo mais comuns; basta fixar os corretos quando você confirmar o formato.
 */
export const mapRawToLegalMailEmail = (raw: any): LegalMailEmail => ({
  messageId: String(raw.messageId ?? raw.id ?? raw.idMensagem ?? raw.protocolo ?? crypto.randomUUID?.() ?? Math.random()),
  recebidoEm: String(raw.recebidoEm ?? raw.dataRecebimento ?? raw.data ?? new Date().toISOString()).split('T')[0],
  assunto: String(raw.assunto ?? raw.subject ?? raw.titulo ?? ''),
  remetente: String(raw.remetente ?? raw.from ?? raw.origem ?? 'legalmail'),
  corpo: String(raw.corpo ?? raw.body ?? raw.conteudo ?? raw.teor ?? raw.mensagem ?? ''),
});

/**
 * Fonte que consome a API HTTP do LegalMail. A chave NUNCA é embutida no
 * código: vem de configuração (env). Observação de produção: idealmente esta
 * chamada roda no backend/proxy — chamar direto do browser expõe a chave no
 * bundle e pode esbarrar em CORS.
 */
export const criarLegalMailApiSource = (config: LegalMailApiConfig): LegalMailSource => ({
  nome: 'LegalMail (API)',
  fetchNovosEmails: async () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const scheme = config.authScheme ?? 'Bearer ';
    headers[config.authHeader ?? 'Authorization'] = `${scheme}${config.apiKey}`;

    const resp = await fetch(config.apiUrl, { headers });
    if (!resp.ok) throw new Error(`LegalMail API respondeu ${resp.status}`);

    const data = await resp.json();
    const lista: any[] = Array.isArray(data)
      ? data
      : (data.mensagens ?? data.items ?? data.data ?? data.results ?? []);
    return lista.map(mapRawToLegalMailEmail);
  },
});

/**
 * Resolve a fonte a partir do ambiente: usa a API real quando
 * LEGALMAIL_API_URL e LEGALMAIL_API_KEY estiverem definidos; caso contrário,
 * cai na fonte simulada.
 */
export const resolverLegalMailSource = (): LegalMailSource => {
  const apiUrl = process.env.LEGALMAIL_API_URL;
  const apiKey = process.env.LEGALMAIL_API_KEY;
  if (apiUrl && apiKey) {
    return criarLegalMailApiSource({
      apiUrl,
      apiKey,
      authHeader: process.env.LEGALMAIL_AUTH_HEADER,
      authScheme: process.env.LEGALMAIL_AUTH_SCHEME,
    });
  }
  return mockLegalMailSource;
};

/**
 * Captura a partir de uma FONTE (mock ou API): busca os e-mails novos e os
 * processa pelo mesmo pipeline (parse + IA + prazo + vínculo + dedup).
 */
export const capturarLegalMailDaFonte = async (
  source: LegalMailSource,
  existentes: Intimacao[],
  processos: Processo[],
): Promise<Intimacao[]> => {
  const emails = await source.fetchNovosEmails();
  return capturarLegalMail(emails, existentes, processos);
};

const hoje = new Date();
const relDate = (dias: number) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
};

// Caixa de entrada simulada: novos e-mails do LegalMail ainda não capturados.
// Em produção, substituir por leitura do inbox real (Gmail/IMAP) ou webhook.
export const MOCK_LEGALMAIL_INBOX: LegalMailEmail[] = [
  {
    messageId: 'a1b2c3',
    recebidoEm: relDate(0),
    assunto: 'Intimação Eletrônica - Processo 5044556-12.2024.4.03.6100',
    remetente: 'nao-responda@legalmail.com.br',
    corpo:
      'Autor: Patrícia Gomes Ribeiro\nVara: 6ª Vara do JEF de São Paulo\n' +
      'Fica a parte autora intimada da r. sentença que julgou PROCEDENTE o pedido, ' +
      'condenando o INSS na concessão do auxílio-acidente. Abre-se prazo para eventual recurso inominado.',
  },
  {
    messageId: 'd4e5f6',
    recebidoEm: relDate(-2),
    assunto: 'Intimação Eletrônica - Perícia designada',
    remetente: 'nao-responda@legalmail.com.br',
    corpo:
      'Autor: Marcos Vinícius Prado\nVara: 3ª Vara do JEF de Osasco\n' +
      'Processo 5055667-89.2024.4.03.6130. Designada perícia médica para o dia 05/08, às 10h. ' +
      'Intime-se a parte autora para comparecimento munida de documentos e exames.',
  },
];
