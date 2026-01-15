
import { Processo } from './types';

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
