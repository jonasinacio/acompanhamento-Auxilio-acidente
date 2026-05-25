
// ─── ENUMS / UNION TYPES ────────────────────────────────────────────────────

export type UserRole = 'gestor' | 'usuario';

export type LeadStatus =
  | 'Novo'
  | 'Contatado'
  | 'Triagem'
  | 'Documentação'
  | 'Análise'
  | 'Convertido'
  | 'Perdido';

export type CanalMarketing =
  | 'Google Ads'
  | 'Facebook/Instagram'
  | 'Indicação'
  | 'Orgânico/SEO'
  | 'WhatsApp'
  | 'Parceiro'
  | 'Outro';

export type FaseAdministrativa =
  | 'Triagem'
  | 'Documentação Pendente'
  | 'Análise Técnica'
  | 'Requerimento Administrativo'
  | 'Aguardando Análise INSS'
  | 'Exigência'
  | 'Recurso Administrativo'
  | 'Deferido'
  | 'Indeferido'
  | 'Encaminhado para Judicial';

export type FaseJudicial =
  | 'Inicial em Elaboração'
  | 'Distribuído'
  | 'Aguardando Citação'
  | 'Contestação'
  | 'Réplica'
  | 'Perícia Designada'
  | 'Perícia Realizada'
  | 'Aguardando Laudo'
  | 'Manifestação sobre Laudo'
  | 'Sentença'
  | 'Recurso'
  | 'Trânsito em Julgado'
  | 'Implantação'
  | 'RPV/Precatório'
  | 'Honorários Cobrados'
  | 'Encerrado';

export type ProcessStatus = 'Inicial' | 'Perícia' | 'Instrução' | 'Sentença' | 'Recurso' | 'Finalizado';
export type ResultadoJulgamento = 'Favorável' | 'Improcedente' | 'Pendente';
export type PrioridadeNivel = 'Urgente' | 'Alta' | 'Média' | 'Baixa';

// ─── ENTIDADES PRINCIPAIS ────────────────────────────────────────────────────

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  dataCriacao: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  cargo: 'Advogado Sênior' | 'Advogado Pleno' | 'Advogado Júnior' | 'Estagiário' | 'Administrativo' | 'Gestor';
  oab?: string;
  email: string;
  telefone?: string;
  casosAtivos: number;
  metaCasosMes: number;
  tarefasConcluidas: number;
  tarefasPendentes: number;
  dataIngresso: string;
  status: 'Ativo' | 'Inativo' | 'Férias';
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  canal: CanalMarketing;
  dataEntrada: string;
  dataContatoInicial?: string;
  tempoAteContatoHoras?: number;
  status: LeadStatus;
  motivoPerda?: string;
  responsavel: string;
  observacoes?: string;
  convertidoCliente: boolean;
  idCliente?: string;
  possuiCAT: boolean;
  possuiAuxilioDoencaAnterior: boolean;
  tipoSequelaPreliminar?: string;
}

export interface Cliente {
  id: string;
  idLead?: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email?: string;
  cidade: string;
  uf: string;
  profissao: string;
  empregador?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
  possuiCAT: boolean;
  possuiAuxilioDoencaAnterior: boolean;
  possuiLaudoMedico: boolean;
  dataUltimoContato?: string;
  diasSemContato: number;
  responsavel: string;
  dataContratacao: string;
  statusRelacionamento: 'Ativo' | 'Inativo' | 'Em Risco' | 'Promotor';
  notaSatisfacao?: number;
  qtdIndicacoes: number;
  observacoes?: string;
}

export interface Contrato {
  id: string;
  idCliente: string;
  numero: string;
  dataAssinatura: string;
  tipoHonorario: 'Êxito' | 'Misto' | 'Fixo';
  percentualExito: number;
  valorFixo?: number;
  valorEstimadoCausa: number;
  valorEstimadoHonorario: number;
  status: 'Ativo' | 'Encerrado' | 'Suspenso';
  observacoes?: string;
}

export interface DadosTecnicosAuxilio {
  id: string;
  idCliente: string;
  idCaso: string;
  tipoSequela: string;
  membrosAfetados: string;
  cid: string;
  dataAcidente: string;
  localAcidente: 'Ambiente de Trabalho' | 'A Serviço' | 'Trajeto';
  possuiCAT: boolean;
  numeroCATINSS?: string;
  dataCAT?: string;
  possuiAuxilioDoencaAnterior: boolean;
  periodoAuxilioDoenca?: string;
  possuiLaudoMedico: boolean;
  medicoResponsavel?: string;
  grauIncapacidade: 'Parcial Permanente' | 'Total Permanente' | 'Parcial Temporária';
  reducaoCapacidadeTrabalhativa: number;
  observacoesTecnicas?: string;
}

export interface Caso {
  id: string;
  idCliente: string;
  idContrato: string;
  numero?: string;
  tipo: 'Administrativo' | 'Judicial';
  faseAdministrativa?: FaseAdministrativa;
  faseJudicial?: FaseJudicial;
  dataAbertura: string;
  dataUltimaMovimentacao: string;
  diasSemMovimentacao: number;
  responsavel: string;
  prioridade: PrioridadeNivel;
  pontuacaoPrioridade: number;
  valorCausa: number;
  valorPrevisto: number;
  probabilidadeExito: number;
  receitaFuturaPonderada: number;
  status: 'Ativo' | 'Suspenso' | 'Encerrado' | 'Arquivado';
  resultadoFinal?: 'Procedente' | 'Improcedente' | 'Acordo' | 'Desistência';
  dataPericia?: string;
  periciaRealizada: boolean;
  resultadoPericia?: 'Favorável' | 'Desfavorável' | 'Parcialmente Favorável';
  dataSentenca?: string;
  dataTransitoJulgado?: string;
  dataImplantacao?: string;
  valorRPV?: number;
  dataRPV?: string;
  valorHonorariosRecebidos?: number;
  observacoes?: string;
  // campos de compatibilidade com ProcessTable existente
  cliente?: string;
  tipoSequela?: string;
  resultadoJulgamento?: ResultadoJulgamento;
  valorRPVLegacy?: number;
  dataPrevista?: string;
  statusLegacy?: ProcessStatus;
  probabilidadeLegacy?: 'Alta' | 'Média' | 'Baixa';
}

// Compatibilidade com o tipo legado Processo
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

export interface Tarefa {
  id: string;
  idCaso?: string;
  idCliente?: string;
  titulo: string;
  descricao?: string;
  tipo: 'Prazo' | 'Audiência' | 'Documento' | 'Contato' | 'Petição' | 'Perícia' | 'Protocolo' | 'Outro';
  dataVencimento: string;
  dataConclusao?: string;
  responsavel: string;
  prioridade: PrioridadeNivel;
  status: 'Pendente' | 'Em Andamento' | 'Concluída' | 'Vencida';
  alertaDias: number;
  nomeCliente?: string;
  numeroCaso?: string;
  observacoes?: string;
}

export interface EventoProcessual {
  id: string;
  idCaso: string;
  data: string;
  tipo: string;
  descricao: string;
  fase: string;
  responsavel: string;
  resultado?: string;
  proximoPasso?: string;
  observacoes?: string;
}

export interface Lancamento {
  id: string;
  idCaso?: string;
  idCliente: string;
  idContrato?: string;
  nomeCliente: string;
  tipo: 'Honorário Êxito' | 'Honorário Fixo' | 'RPV' | 'Custo Operacional' | 'Custo Captação' | 'Outros';
  natureza: 'Receita' | 'Despesa';
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Previsto' | 'A Vencer' | 'Pago' | 'Vencido' | 'Cancelado';
  formaPagamento?: string;
  canal?: CanalMarketing;
  observacoes?: string;
}

export interface Atendimento {
  id: string;
  idCliente: string;
  idCaso?: string;
  nomeCliente: string;
  data: string;
  tipo: 'Telefone' | 'WhatsApp' | 'Email' | 'Presencial' | 'Videoconferência';
  assunto: string;
  duracao?: number;
  responsavel: string;
  satisfacao?: number;
  observacoes?: string;
  followUpNecessario: boolean;
  dataFollowUp?: string;
  reclamacao: boolean;
}

export interface CanalPerformance {
  id: string;
  nome: CanalMarketing;
  mesAno: string;
  custoMes: number;
  leadsGerados: number;
  conversoes: number;
  taxaConversao: number;
  custoPorlead: number;
  custoPorConversao: number;
}

// ─── INTERFACES DE DASHBOARD ─────────────────────────────────────────────────

export interface KPIComercial {
  leadsTotal: number;
  leadsPorCanal: Record<string, number>;
  taxaConversao: number;
  contratosFechadosMes: number;
  ticketMedioContratado: number;
  tempoMedioPrimeiroContato: number;
  motivosPerdaPrincipal: string;
}

export interface KPIJuridico {
  casosAtivos: number;
  casosPorFase: Record<string, number>;
  taxaViabilidade: number;
  taxaJudicializacao: number;
  taxaPericiaFavoravel: number;
  taxaSentencaProcedente: number;
  taxaExito: number;
  valorMedioAtrasados: number;
  tempoMedioAtePericia: number;
  tempoMedioAteSentenca: number;
}

export interface KPIFinanceiro {
  honorariosContratados: number;
  honorariosRecebidos: number;
  honorariosAReceber: number;
  receitaPrevista: number;
  receitaRealizada: number;
  ticketMedio: number;
  inadimplencia: number;
  receitaFuturaEstimada: number;
  custoAquisicaoCliente: number;
}

export interface DashboardStats {
  total: number;
  ativos: number;
  periciasRealizadas: number;
  sentencasFavoraveis: number;
  sentencasImprocedentes: number;
  valorTotalPrevisto: number;
}
