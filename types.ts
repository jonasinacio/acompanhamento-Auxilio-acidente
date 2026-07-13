
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

// ============================================================
// Intimações Judiciais (captação DJEN/CNJ + classificação IA)
// ============================================================

// Atos típicos de uma ação previdenciária no rito federal (JEF / Vara Federal).
export type TipoAto =
  | 'Citação/Contestação INSS'
  | 'Decisão Interlocutória'
  | 'Designação de Perícia'
  | 'Laudo Pericial Juntado'
  | 'Sentença'
  | 'Embargos de Declaração'
  | 'Apelação/Recurso Inominado'
  | 'Contrarrazões'
  | 'Acórdão'
  | 'Cumprimento de Sentença'
  | 'Expedição de RPV/Precatório'
  | 'Intimação de Audiência'
  | 'Outro';

export type ConfiancaIA = 'Alta' | 'Média' | 'Baixa';
export type StatusLeitura = 'Não Lida' | 'Lida' | 'Arquivada';

// Regra de prazo cadastrada por tipo de ato. `prazoDias` em dias úteis;
// `null` => ato meramente informativo (sem prazo processual para o escritório).
export interface PrazoRegra {
  prazoDias: number | null;
  descricao: string;
}

export interface Intimacao {
  id: string;
  numeroProcesso: string;
  tribunal: string;   // Ex.: TRF3, TRF4, Turma Recursal
  orgao: string;      // Vara / Juizado / Turma
  segurado: string;   // Nome do segurado (autor)
  dataDisponibilizacao: string; // ISO date (data no DJEN)
  teorIntegral: string;
  teorResumido: string;
  tipoAto: TipoAto;
  confianca: ConfiancaIA;
  prazoDias: number | null;       // dias úteis, derivado da regra do tipo
  dataPrazoFinal: string | null;  // ISO date, calculada por regra fixa
  statusLeitura: StatusLeitura;
  processoVinculadoId: string | null; // vínculo ao Processo (carteira)
  revisaoManual: boolean;             // baixa confiança / vínculo ambíguo
}
