
// Captura de intimações no canal DJEN/CNJ via API pública "Comunica"
// (Diário de Justiça Eletrônico Nacional).
//
// Endpoint público (sem chave):
//   GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
//   Filtros: numeroOab, ufOab, nomeAdvogado, dataDisponibilizacaoInicio,
//            dataDisponibilizacaoFim, meio (D=Diário), pagina, itensPorPagina,
//            siglaTribunal.
//
// A consulta é feita por advogado (OAB+UF) cadastrado como monitorado, trazendo
// as publicações dos processos em que o escritório figura como procurador.
// Cada item é limpo (HTML), classificado pela IA e vinculado ao cliente.

import { Intimacao, Processo } from '../types';
import { construirIntimacao, stripHtml } from './intimacaoBuilder';

const DJEN_BASE_PADRAO = 'https://comunicaapi.pje.jus.br';

// Advogado monitorado (chave de consulta ao DJEN).
export interface AdvogadoMonitorado {
  numeroOab: string;
  ufOab: string;
  nome?: string;
}

// Item retornado por /api/v1/comunicacao (campos usados; a API traz mais).
export interface DjenComunicacao {
  id?: number | string;
  hash?: string;
  data_disponibilizacao?: string;   // "YYYY-MM-DD"
  siglaTribunal?: string;
  tipoComunicacao?: string;
  nomeOrgao?: string;
  texto?: string;                   // HTML
  numero_processo?: string;
  numeroprocessocommascara?: string;
  nomeClasse?: string;
  meio?: string;
  destinatarios?: Array<{ nome?: string; polo?: string }>;
  destinatarioadvogados?: Array<{ advogado?: { nome?: string; numero_oab?: string; uf_oab?: string } }>;
}

export interface DjenResponse {
  status?: string;
  count?: number;
  items?: DjenComunicacao[];
}

// Nome do segurado = destinatário do polo ativo (autor), quando disponível.
const seguradoDaComunicacao = (c: DjenComunicacao): string => {
  const ativo = (c.destinatarios ?? []).find(d => (d.polo ?? '').toUpperCase().startsWith('A'));
  return ativo?.nome ?? (c.destinatarios ?? [])[0]?.nome ?? 'Segurado a identificar';
};

const mapComunicacaoToIntimacao = (
  c: DjenComunicacao,
  processos: Processo[],
): Promise<Intimacao> =>
  construirIntimacao({
    id: `djen-${c.hash ?? c.id ?? `${c.numero_processo}-${c.data_disponibilizacao}`}`,
    fonte: 'DJEN',
    numeroProcesso: c.numeroprocessocommascara ?? c.numero_processo ?? 'NÃO IDENTIFICADO',
    tribunal: c.siglaTribunal ?? '',
    orgao: c.nomeOrgao ?? '',
    seguradoFallback: seguradoDaComunicacao(c),
    dataDisponibilizacao: c.data_disponibilizacao ?? '',
    teorIntegral: stripHtml(c.texto ?? ''),
    processos,
  });

// ------------------------------------------------------------
// Captura pela API real
// ------------------------------------------------------------
export interface DjenConfig {
  advogados: AdvogadoMonitorado[];
  base?: string;
  diasRetroativos?: number; // janela de disponibilização (padrão: 7)
}

const fmtData = (d: Date) => d.toISOString().split('T')[0];

export const capturarDjenApi = async (
  config: DjenConfig,
  existentes: Intimacao[],
  processos: Processo[],
): Promise<Intimacao[]> => {
  const base = config.base ?? DJEN_BASE_PADRAO;
  const dias = config.diasRetroativos ?? 7;
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);

  const jaCapturados = new Set(existentes.map(i => i.id));
  const novas: Intimacao[] = [];
  const vistos = new Set<string>();

  for (const adv of config.advogados) {
    const qs = new URLSearchParams({
      numeroOab: adv.numeroOab,
      ufOab: adv.ufOab,
      dataDisponibilizacaoInicio: fmtData(inicio),
      dataDisponibilizacaoFim: fmtData(fim),
      meio: 'D',
      pagina: '1',
      itensPorPagina: '100',
    });
    if (adv.nome) qs.set('nomeAdvogado', adv.nome);

    const resp = await fetch(`${base}/api/v1/comunicacao?${qs.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`DJEN respondeu ${resp.status}`);
    const data: DjenResponse = await resp.json();
    const items = data.items ?? (Array.isArray(data) ? (data as DjenComunicacao[]) : []);

    for (const c of items) {
      const id = `djen-${c.hash ?? c.id ?? `${c.numero_processo}-${c.data_disponibilizacao}`}`;
      if (jaCapturados.has(id) || vistos.has(id)) continue; // dedup entre advogados
      vistos.add(id);
      novas.push(await mapComunicacaoToIntimacao(c, processos));
    }
  }
  return novas;
};

// ------------------------------------------------------------
// Abstração de FONTE (mock ↔ API real), espelhando o canal LegalMail
// ------------------------------------------------------------
export interface DjenSource {
  nome: string;
  capturar: (existentes: Intimacao[], processos: Processo[]) => Promise<Intimacao[]>;
}

const diasAtras = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0];
};

// Comunicações simuladas no MESMO formato da API Comunica, para exercitar o
// pipeline offline (novas, distintas das já presentes em MOCK_INTIMACOES).
const MOCK_COMUNICACOES: DjenComunicacao[] = [
  {
    id: 810001,
    hash: 'djh-810001',
    data_disponibilizacao: diasAtras(1),
    siglaTribunal: 'TRF3',
    tipoComunicacao: 'Intimação',
    nomeOrgao: '7ª Vara do JEF de São Paulo',
    numeroprocessocommascara: '5077001-22.2024.4.03.6100',
    texto: '<p>Intimada a parte autora para, no prazo legal, manifestar-se sobre o laudo pericial juntado aos autos.</p>',
    destinatarios: [{ nome: 'Helena Martins Rocha', polo: 'ATIVO' }],
  },
  {
    id: 810002,
    hash: 'djh-810002',
    data_disponibilizacao: diasAtras(3),
    siglaTribunal: 'TRF3 — Turma Recursal',
    tipoComunicacao: 'Intimação',
    nomeOrgao: '2ª Turma Recursal de SP',
    numeroprocessocommascara: '5077002-55.2023.4.03.6301',
    texto: '<p>Intimadas as partes do V. Acórdão que negou provimento ao recurso inominado do INSS, mantendo a sentença de procedência.</p>',
    destinatarios: [{ nome: 'Paulo Sérgio Andrade', polo: 'ATIVO' }],
  },
];

export const mockDjenSource: DjenSource = {
  nome: 'DJEN (simulado)',
  capturar: async (existentes, processos) => {
    const jaCapturados = new Set(existentes.map(i => i.id));
    const novas: Intimacao[] = [];
    for (const c of MOCK_COMUNICACOES) {
      const id = `djen-${c.hash}`;
      if (jaCapturados.has(id)) continue;
      novas.push(await mapComunicacaoToIntimacao(c, processos));
    }
    return novas;
  },
};

export const criarDjenApiSource = (config: DjenConfig): DjenSource => ({
  nome: 'DJEN (API CNJ)',
  capturar: (existentes, processos) => capturarDjenApi(config, existentes, processos),
});

// Lê os advogados monitorados de DJEN_ADVOGADOS (JSON) no ambiente. Ex.:
// DJEN_ADVOGADOS='[{"numeroOab":"123456","ufOab":"SP","nome":"Jonas Inácio"}]'
const advogadosDoEnv = (): AdvogadoMonitorado[] => {
  try {
    const raw = process.env.DJEN_ADVOGADOS;
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(a => a?.numeroOab && a?.ufOab) : [];
  } catch {
    return [];
  }
};

/**
 * Resolve a fonte DJEN: usa a API pública do CNJ quando há advogados
 * monitorados configurados (DJEN_ADVOGADOS); caso contrário, a fonte simulada.
 */
export const resolverDjenSource = (): DjenSource => {
  const advogados = advogadosDoEnv();
  if (advogados.length > 0) {
    return criarDjenApiSource({
      advogados,
      base: process.env.DJEN_API_BASE,
      diasRetroativos: process.env.DJEN_DIAS ? Number(process.env.DJEN_DIAS) : undefined,
    });
  }
  return mockDjenSource;
};

/** Captura da fonte DJEN e deduplica por id contra as já existentes. */
export const capturarDjenDaFonte = async (
  source: DjenSource,
  existentes: Intimacao[],
  processos: Processo[],
): Promise<Intimacao[]> => {
  const novas = await source.capturar(existentes, processos);
  const ids = new Set(existentes.map(i => i.id));
  return novas.filter(i => !ids.has(i.id));
};
