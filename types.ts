
export type ProcessStatus = 'Inicial' | 'Perícia' | 'Instrução' | 'Sentença' | 'Recurso' | 'Finalizado';
export type ResultadoJulgamento = 'Favorável' | 'Improcedente' | 'Pendente';
export type UserRole = 'gestor' | 'usuario';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  dataCriacao: string;
}

export interface Processo {
  id: string;
  numero: string;
  cliente: string;
  dataInicio: string;
  ultimaMovimentacao: string;
  status: ProcessStatus;
  valorCausa: number;
  probabilidade: 'Alta' | 'Média' | 'Baixa';
  observacoes?: string;
  tipoSequela: string;
  valorRPV?: number;
  valorPrevisto: number;
  dataPrevista: string;
  dataPericia?: string;
  periciaRealizada: boolean;
  resultadoJulgamento: ResultadoJulgamento;
}

export interface DashboardStats {
  total: number;
  ativos: number;
  periciasRealizadas: number;
  sentencasFavoraveis: number;
  sentencasImprocedentes: number;
  valorTotalPrevisto: number;
}
