
// Integração com o Diário de Justiça Eletrônico Nacional (DJEN/PJe)
// Documentação pública: https://comunicaapi.pje.jus.br/swagger-ui/index.html

const DJEN_API_BASE = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao';

export interface DjenComunicacao {
  id: number;
  numero_processo: string;
  nomeOrgao: string;
  texto: string;
  data_disponibilizacao: string;
  destinatarios?: { nome: string; polo: string }[];
  destinatarioadvogados?: { advogado: { nome: string; numero_oab: string; uf_oab: string } }[];
  link?: string;
}

interface DjenResponse {
  status: string;
  message: string;
  count: number;
  items: DjenComunicacao[];
}

export interface BuscaDjenParams {
  nomeAdvogado: string;
  numeroOab: string;
  ufOab: string;
  /** Mês/ano a consultar (1-12). Padrão: mês atual. */
  mes?: number;
  ano?: number;
}

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const getIntervaloMes = (mes?: number, ano?: number) => {
  const hoje = new Date();
  const ref = new Date(ano ?? hoje.getFullYear(), (mes ?? hoje.getMonth() + 1) - 1, 1);
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { inicio: formatDate(inicio), fim: formatDate(fim) };
};

export const buscarProcessosDoMesNoDjen = async (params: BuscaDjenParams): Promise<DjenComunicacao[]> => {
  const { numeroOab, ufOab, mes, ano } = params;
  const { inicio, fim } = getIntervaloMes(mes, ano);

  const itensPorPagina = 100;
  let pagina = 1;
  const resultados: DjenComunicacao[] = [];

  while (true) {
    const query = new URLSearchParams({
      numeroOab,
      ufOab,
      dataDisponibilizacaoInicio: inicio,
      dataDisponibilizacaoFim: fim,
      itensPorPagina: String(itensPorPagina),
      pagina: String(pagina),
    });

    const response = await fetch(`${DJEN_API_BASE}?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`Falha ao consultar o DJEN (HTTP ${response.status})`);
    }

    const data: DjenResponse = await response.json();
    resultados.push(...data.items);

    if (data.items.length < itensPorPagina) break;
    pagina += 1;
  }

  return resultados;
};
