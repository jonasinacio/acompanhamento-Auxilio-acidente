
import { Processo, Intimacao, TipoAto, PrazoRegra } from './types';
import { calcularPrazoFinal } from './utils/prazo';

const getRelativeDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const MOCK_PROCESSOS: Processo[] = [
  {
    id: '1',
    numero: '5001234-45.2023.4.03.6100',
    cliente: 'João da Silva Santos',
    dataInicio: '2023-01-15',
    ultimaMovimentacao: '2024-05-10',
    status: 'Perícia',
    valorCausa: 45000.00,
    probabilidade: 'Alta',
    tipoSequela: 'Limitativa - Membro Superior',
    valorRPV: 0,
    valorPrevisto: 38000.00,
    dataPrevista: getRelativeDate(20),
    dataPericia: getRelativeDate(2), // Perícia em 2 dias
    periciaRealizada: false,
    resultadoJulgamento: 'Pendente'
  },
  {
    id: '2',
    numero: '5005678-12.2022.4.03.6100',
    cliente: 'Maria Oliveira Ferreira',
    dataInicio: '2022-11-20',
    ultimaMovimentacao: '2024-05-15',
    status: 'Finalizado',
    valorCausa: 32000.50,
    probabilidade: 'Média',
    tipoSequela: 'Auditiva',
    valorRPV: 28000.00,
    valorPrevisto: 28000.00,
    dataPrevista: getRelativeDate(-10),
    dataPericia: getRelativeDate(-40),
    periciaRealizada: true,
    resultadoJulgamento: 'Favorável'
  },
  {
    id: '3',
    numero: '5012345-99.2023.4.03.6100',
    cliente: 'Ricardo Pereira Lima',
    dataInicio: '2023-06-05',
    ultimaMovimentacao: '2024-04-22',
    status: 'Instrução',
    valorCausa: 58000.00,
    probabilidade: 'Alta',
    tipoSequela: 'Coluna - Hérnia',
    valorRPV: 0,
    valorPrevisto: 52000.00,
    dataPrevista: getRelativeDate(45),
    dataPericia: getRelativeDate(-15),
    periciaRealizada: true,
    resultadoJulgamento: 'Pendente'
  },
  {
    id: '4',
    numero: '5009876-33.2021.4.03.6100',
    cliente: 'Sônia Maria Ribeiro',
    dataInicio: '2021-08-10',
    ultimaMovimentacao: '2024-03-30',
    status: 'Sentença',
    valorCausa: 25000.00,
    probabilidade: 'Baixa',
    tipoSequela: 'Visão Monocular',
    valorRPV: 0,
    valorPrevisto: 0,
    dataPrevista: getRelativeDate(5),
    dataPericia: getRelativeDate(-60),
    periciaRealizada: true,
    resultadoJulgamento: 'Improcedente'
  },
  {
    id: '5',
    numero: '5011122-88.2024.4.03.6100',
    cliente: 'Antônio Marcos Souza',
    dataInicio: '2024-02-14',
    ultimaMovimentacao: '2024-05-01',
    status: 'Perícia',
    valorCausa: 15000.00,
    probabilidade: 'Alta',
    tipoSequela: 'Amputação Parcial de Dedo',
    valorRPV: 0,
    valorPrevisto: 12500.00,
    dataPrevista: getRelativeDate(30),
    dataPericia: getRelativeDate(1), // Amanhã!
    periciaRealizada: false,
    resultadoJulgamento: 'Pendente'
  }
];

export const STATUS_COLORS: Record<string, string> = {
  'Inicial': '#94a3b8',
  'Perícia': '#fbbf24',
  'Instrução': '#60a5fa',
  'Sentença': '#34d399',
  'Recurso': '#f87171',
  'Finalizado': '#4ade80'
};

// ============================================================
// Intimações Judiciais
// ============================================================

export const TIPOS_ATO: TipoAto[] = [
  'Citação/Contestação INSS',
  'Decisão Interlocutória',
  'Designação de Perícia',
  'Laudo Pericial Juntado',
  'Sentença',
  'Embargos de Declaração',
  'Apelação/Recurso Inominado',
  'Contrarrazões',
  'Acórdão',
  'Cumprimento de Sentença',
  'Expedição de RPV/Precatório',
  'Intimação de Audiência',
  'Outro',
];

// Regras de prazo por tipo de ato, na perspectiva do advogado do SEGURADO
// (prazo comum, em dias úteis). Estes valores são cadastrados/configuráveis;
// o prazo em dobro da Fazenda Pública não se aplica ao escritório.
export const PRAZO_REGRAS: Record<TipoAto, PrazoRegra> = {
  'Citação/Contestação INSS':   { prazoDias: null, descricao: 'Ciência — prazo de contestação é do INSS, não do escritório.' },
  'Decisão Interlocutória':     { prazoDias: null, descricao: 'Ciência; eventual prazo depende do teor da decisão.' },
  'Designação de Perícia':      { prazoDias: null, descricao: 'Comparecimento à perícia — agendar, sem prazo recursal.' },
  'Laudo Pericial Juntado':     { prazoDias: 15,   descricao: 'Manifestação sobre o laudo pericial: 15 dias úteis.' },
  'Sentença':                   { prazoDias: 10,   descricao: 'Recurso inominado no JEF: 10 dias úteis.' },
  'Embargos de Declaração':     { prazoDias: 5,    descricao: 'Embargos de declaração: 5 dias úteis.' },
  'Apelação/Recurso Inominado': { prazoDias: 10,   descricao: 'Interposição de recurso inominado: 10 dias úteis.' },
  'Contrarrazões':              { prazoDias: 10,   descricao: 'Contrarrazões ao recurso: 10 dias úteis.' },
  'Acórdão':                    { prazoDias: 5,    descricao: 'Embargos de declaração do acórdão: 5 dias úteis.' },
  'Cumprimento de Sentença':    { prazoDias: 15,   descricao: 'Manifestação no cumprimento de sentença: 15 dias úteis.' },
  'Expedição de RPV/Precatório':{ prazoDias: null, descricao: 'Ciência — acompanhar liberação do pagamento.' },
  'Intimação de Audiência':     { prazoDias: null, descricao: 'Comparecimento à audiência designada.' },
  'Outro':                      { prazoDias: null, descricao: 'Ato não classificado — revisar manualmente.' },
};

export const TIPO_ATO_COLORS: Record<TipoAto, string> = {
  'Citação/Contestação INSS':   '#64748b',
  'Decisão Interlocutória':     '#60a5fa',
  'Designação de Perícia':      '#fbbf24',
  'Laudo Pericial Juntado':     '#f59e0b',
  'Sentença':                   '#8b5cf6',
  'Embargos de Declaração':     '#ef4444',
  'Apelação/Recurso Inominado': '#ec4899',
  'Contrarrazões':              '#f472b6',
  'Acórdão':                    '#7c3aed',
  'Cumprimento de Sentença':    '#10b981',
  'Expedição de RPV/Precatório':'#059669',
  'Intimação de Audiência':     '#0ea5e9',
  'Outro':                      '#94a3b8',
};

// Constrói uma intimação já com prazo calculado pela regra fixa do tipo.
const buildIntimacao = (
  base: Omit<Intimacao, 'prazoDias' | 'dataPrazoFinal'>,
): Intimacao => {
  const prazoDias = PRAZO_REGRAS[base.tipoAto].prazoDias;
  return {
    ...base,
    prazoDias,
    dataPrazoFinal: calcularPrazoFinal(base.dataDisponibilizacao, prazoDias),
  };
};

export const MOCK_INTIMACOES: Intimacao[] = [
  buildIntimacao({
    id: 'i1',
    numeroProcesso: '5001234-45.2023.4.03.6100',
    tribunal: 'TRF3',
    orgao: '1ª Vara do JEF de São Paulo',
    segurado: 'João da Silva Santos',
    dataDisponibilizacao: getRelativeDate(-1),
    teorIntegral: 'Fica a parte autora intimada da r. sentença que julgou PROCEDENTE o pedido, condenando o INSS à concessão do auxílio-acidente. Prazo para recurso inominado na forma da lei.',
    teorResumido: 'Sentença de procedência — concessão de auxílio-acidente; abre prazo para recurso inominado.',
    tipoAto: 'Sentença',
    confianca: 'Alta',
    statusLeitura: 'Não Lida',
    processoVinculadoId: '1',
    revisaoManual: false,
  }),
  buildIntimacao({
    id: 'i2',
    numeroProcesso: '5012345-99.2023.4.03.6100',
    tribunal: 'TRF3',
    orgao: '2ª Vara do JEF de São Paulo',
    segurado: 'Ricardo Pereira Lima',
    dataDisponibilizacao: getRelativeDate(-2),
    teorIntegral: 'Juntado aos autos o laudo pericial. Ficam as partes intimadas para, querendo, manifestarem-se sobre o laudo no prazo legal.',
    teorResumido: 'Laudo pericial juntado — intimação para manifestação das partes.',
    tipoAto: 'Laudo Pericial Juntado',
    confianca: 'Alta',
    statusLeitura: 'Não Lida',
    processoVinculadoId: '3',
    revisaoManual: false,
  }),
  buildIntimacao({
    id: 'i3',
    numeroProcesso: '5011122-88.2024.4.03.6100',
    tribunal: 'TRF3',
    orgao: '3ª Vara do JEF de Campinas',
    segurado: 'Antônio Marcos Souza',
    dataDisponibilizacao: getRelativeDate(0),
    teorIntegral: 'Designada perícia médica para o dia 25/07, às 14h, no consultório do perito nomeado. Intime-se a parte autora para comparecimento.',
    teorResumido: 'Designação de perícia médica — comparecimento do autor.',
    tipoAto: 'Designação de Perícia',
    confianca: 'Alta',
    statusLeitura: 'Não Lida',
    processoVinculadoId: '5',
    revisaoManual: false,
  }),
  buildIntimacao({
    id: 'i4',
    numeroProcesso: '5009876-33.2021.4.03.6100',
    tribunal: 'TRF3 — Turma Recursal',
    orgao: '1ª Turma Recursal de SP',
    segurado: 'Sônia Maria Ribeiro',
    dataDisponibilizacao: getRelativeDate(-6),
    teorIntegral: 'Intimada a parte recorrente do V. Acórdão que negou provimento ao recurso inominado, mantendo a sentença de improcedência.',
    teorResumido: 'Acórdão — negado provimento ao recurso; mantida improcedência.',
    tipoAto: 'Acórdão',
    confianca: 'Média',
    statusLeitura: 'Lida',
    processoVinculadoId: '4',
    revisaoManual: false,
  }),
  buildIntimacao({
    id: 'i5',
    numeroProcesso: '5005678-12.2022.4.03.6100',
    tribunal: 'TRF3',
    orgao: '1ª Vara do JEF de São Paulo',
    segurado: 'Maria Oliveira Ferreira',
    dataDisponibilizacao: getRelativeDate(-3),
    teorIntegral: 'Expeça-se RPV em favor da parte autora, no valor apurado. Intimem-se as partes.',
    teorResumido: 'Expedição de RPV em favor da segurada — acompanhar pagamento.',
    tipoAto: 'Expedição de RPV/Precatório',
    confianca: 'Alta',
    statusLeitura: 'Lida',
    processoVinculadoId: '2',
    revisaoManual: false,
  }),
  buildIntimacao({
    id: 'i6',
    numeroProcesso: '5033445-10.2024.4.03.6183',
    tribunal: 'TRF3',
    orgao: '4ª Vara do JEF de São Paulo',
    segurado: 'Carlos Eduardo Nunes',
    dataDisponibilizacao: getRelativeDate(-1),
    teorIntegral: 'Manifeste-se a parte autora, no prazo legal, acerca da petição e documentos juntados pela autarquia previdenciária.',
    teorResumido: 'Intimação genérica para manifestação — teor ambíguo, classificação incerta.',
    tipoAto: 'Outro',
    confianca: 'Baixa',
    statusLeitura: 'Não Lida',
    processoVinculadoId: null,
    revisaoManual: true,
  }),
];
