
// Núcleo compartilhado de ingestão de intimações (usado pelos canais DJEN e
// LegalMail): limpeza de HTML e montagem de uma Intimacao já classificada pela
// IA, com prazo calculado por regra fixa e vínculo automático ao cliente.

import { Intimacao, Processo, TipoAto, FonteCaptura } from '../types';
import { PRAZO_REGRAS } from '../constants';
import { calcularPrazoFinal } from '../utils/prazo';
import { classifyIntimacao } from './geminiService';

// Remove marcação HTML e normaliza espaços do teor da publicação/intimação.
export const stripHtml = (html: string): string =>
  (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

const resumoFallback = (texto: string): string =>
  texto.length > 140 ? texto.slice(0, 137).trim() + '...' : texto;

/**
 * Monta uma Intimacao a partir de um teor bruto + metadados: classifica pela IA
 * (tipo/resumo/confiança), calcula o prazo pela regra fixa do tipo e vincula ao
 * Processo por igualdade de número. IA indisponível/baixa confiança => revisão manual.
 */
export const construirIntimacao = async (params: {
  id: string;
  fonte: FonteCaptura;
  numeroProcesso: string;
  tribunal: string;
  orgao: string;
  seguradoFallback: string;
  dataDisponibilizacao: string;
  teorIntegral: string;
  processos: Processo[];
}): Promise<Intimacao> => {
  const { id, fonte, numeroProcesso, tribunal, orgao, seguradoFallback, dataDisponibilizacao, teorIntegral, processos } = params;

  const data = (dataDisponibilizacao || new Date().toISOString()).split('T')[0];
  const classificacao = await classifyIntimacao(teorIntegral);
  const tipoAto: TipoAto = classificacao?.tipoAto ?? 'Outro';
  const prazoDias = PRAZO_REGRAS[tipoAto].prazoDias;

  const processoVinculado = processos.find(p => p.numero === numeroProcesso);

  return {
    id,
    fonte,
    numeroProcesso,
    tribunal: tribunal || 'Justiça Federal',
    orgao: orgao || 'Órgão não identificado',
    segurado: processoVinculado?.cliente ?? seguradoFallback ?? 'Segurado não identificado',
    dataDisponibilizacao: data,
    teorIntegral,
    teorResumido: classificacao?.teorResumido ?? resumoFallback(teorIntegral),
    tipoAto,
    confianca: classificacao?.confianca ?? 'Baixa',
    prazoDias,
    dataPrazoFinal: calcularPrazoFinal(data, prazoDias),
    statusLeitura: 'Não Lida',
    processoVinculadoId: processoVinculado?.id ?? null,
    revisaoManual: !classificacao || classificacao.confianca === 'Baixa',
  };
};
