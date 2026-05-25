
import { Processo, Lead, Cliente, Contrato, Caso, Tarefa, Lancamento, Atendimento, CanalPerformance, Colaborador } from './types';

const today = new Date();
const d = (offsetDays: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  return dt.toISOString().split('T')[0];
};
const diffDays = (dateStr: string) => {
  return Math.floor((today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
};

// ─── PROCESSOS (legado) ───────────────────────────────────────────────────────
export const MOCK_PROCESSOS: Processo[] = [
  { id: '1', numero: '5001234-45.2023.4.03.6100', cliente: 'João da Silva Santos', dataInicio: '2023-01-15', ultimaMovimentacao: d(-15), status: 'Perícia', valorCausa: 45000, probabilidade: 'Alta', tipoSequela: 'Limitativa - Membro Superior', valorRPV: 0, valorPrevisto: 38000, dataPrevista: d(20), dataPericia: d(2), periciaRealizada: false, resultadoJulgamento: 'Pendente' },
  { id: '2', numero: '5005678-12.2022.4.03.6100', cliente: 'Maria Oliveira Ferreira', dataInicio: '2022-11-20', ultimaMovimentacao: d(-5), status: 'Finalizado', valorCausa: 32000.50, probabilidade: 'Média', tipoSequela: 'Auditiva', valorRPV: 28000, valorPrevisto: 28000, dataPrevista: d(-10), dataPericia: d(-40), periciaRealizada: true, resultadoJulgamento: 'Favorável' },
  { id: '3', numero: '5012345-99.2023.4.03.6100', cliente: 'Ricardo Pereira Lima', dataInicio: '2023-06-05', ultimaMovimentacao: d(-33), status: 'Instrução', valorCausa: 58000, probabilidade: 'Alta', tipoSequela: 'Coluna - Hérnia', valorRPV: 0, valorPrevisto: 52000, dataPrevista: d(45), dataPericia: d(-15), periciaRealizada: true, resultadoJulgamento: 'Pendente' },
  { id: '4', numero: '5009876-33.2021.4.03.6100', cliente: 'Sônia Maria Ribeiro', dataInicio: '2021-08-10', ultimaMovimentacao: d(-55), status: 'Sentença', valorCausa: 25000, probabilidade: 'Baixa', tipoSequela: 'Visão Monocular', valorRPV: 0, valorPrevisto: 0, dataPrevista: d(5), dataPericia: d(-60), periciaRealizada: true, resultadoJulgamento: 'Improcedente' },
  { id: '5', numero: '5011122-88.2024.4.03.6100', cliente: 'Antônio Marcos Souza', dataInicio: '2024-02-14', ultimaMovimentacao: d(-22), status: 'Perícia', valorCausa: 15000, probabilidade: 'Alta', tipoSequela: 'Amputação Parcial de Dedo', valorRPV: 0, valorPrevisto: 12500, dataPrevista: d(30), dataPericia: d(1), periciaRealizada: false, resultadoJulgamento: 'Pendente' },
  { id: '6', numero: '5020011-77.2024.4.03.6100', cliente: 'Fernanda Costa Alves', dataInicio: '2024-04-01', ultimaMovimentacao: d(-8), status: 'Inicial', valorCausa: 42000, probabilidade: 'Alta', tipoSequela: 'Membro Inferior - Joelho', valorRPV: 0, valorPrevisto: 36000, dataPrevista: d(90), dataPericia: d(14), periciaRealizada: false, resultadoJulgamento: 'Pendente' },
  { id: '7', numero: '5031100-22.2023.4.03.6100', cliente: 'Paulo Roberto Mendes', dataInicio: '2023-09-10', ultimaMovimentacao: d(-70), status: 'Recurso', valorCausa: 67000, probabilidade: 'Média', tipoSequela: 'Coluna Cervical', valorRPV: 0, valorPrevisto: 55000, dataPrevista: d(120), dataPericia: d(-90), periciaRealizada: true, resultadoJulgamento: 'Pendente' },
];

// ─── LEADS ────────────────────────────────────────────────────────────────────
export const MOCK_LEADS: Lead[] = [
  { id: 'L001', nome: 'Carlos Eduardo Mota', telefone: '(11) 99871-2233', email: 'carlos.mota@email.com', canal: 'Google Ads', dataEntrada: d(-3), dataContatoInicial: d(-3), tempoAteContatoHoras: 1.5, status: 'Triagem', responsavel: 'Ana Souza', convertidoCliente: false, possuiCAT: true, possuiAuxilioDoencaAnterior: true, tipoSequelaPreliminar: 'Membro Superior' },
  { id: 'L002', nome: 'Rosana Freitas Leal', telefone: '(11) 98765-4321', canal: 'Facebook/Instagram', dataEntrada: d(-1), tempoAteContatoHoras: 0, status: 'Novo', responsavel: 'Bruno Lima', convertidoCliente: false, possuiCAT: false, possuiAuxilioDoencaAnterior: false },
  { id: 'L003', nome: 'José Augusto Pinto', telefone: '(21) 97654-3210', canal: 'Indicação', dataEntrada: d(-7), dataContatoInicial: d(-7), tempoAteContatoHoras: 0.5, status: 'Documentação', responsavel: 'Ana Souza', convertidoCliente: false, possuiCAT: true, possuiAuxilioDoencaAnterior: true, tipoSequelaPreliminar: 'Coluna - Hérnia' },
  { id: 'L004', nome: 'Márcia Aparecida Teles', telefone: '(11) 96543-2109', canal: 'WhatsApp', dataEntrada: d(-14), dataContatoInicial: d(-14), tempoAteContatoHoras: 3.2, status: 'Convertido', responsavel: 'Bruno Lima', convertidoCliente: true, idCliente: 'C001', possuiCAT: true, possuiAuxilioDoencaAnterior: false, tipoSequelaPreliminar: 'Amputação Parcial' },
  { id: 'L005', nome: 'Rodrigo Neves Carvalho', telefone: '(11) 95432-1098', canal: 'Google Ads', dataEntrada: d(-21), dataContatoInicial: d(-20), tempoAteContatoHoras: 26, status: 'Perdido', motivoPerda: 'Sem viabilidade jurídica', responsavel: 'Ana Souza', convertidoCliente: false, possuiCAT: false, possuiAuxilioDoencaAnterior: false },
  { id: 'L006', nome: 'Eliane Ferreira Braga', telefone: '(11) 94321-0987', canal: 'Orgânico/SEO', dataEntrada: d(-5), dataContatoInicial: d(-5), tempoAteContatoHoras: 2, status: 'Análise', responsavel: 'Jonas Inácio', convertidoCliente: false, possuiCAT: false, possuiAuxilioDoencaAnterior: true, tipoSequelaPreliminar: 'Auditiva' },
  { id: 'L007', nome: 'Davi Luiz Santos', telefone: '(41) 93210-9876', canal: 'Indicação', dataEntrada: d(-10), dataContatoInicial: d(-10), tempoAteContatoHoras: 1, status: 'Convertido', responsavel: 'Ana Souza', convertidoCliente: true, idCliente: 'C002', possuiCAT: true, possuiAuxilioDoencaAnterior: true, tipoSequelaPreliminar: 'Visão' },
  { id: 'L008', nome: 'Cristina Lima Porto', telefone: '(11) 92109-8765', canal: 'Facebook/Instagram', dataEntrada: d(-30), dataContatoInicial: d(-29), tempoAteContatoHoras: 18, status: 'Perdido', motivoPerda: 'Contratou outro escritório', responsavel: 'Bruno Lima', convertidoCliente: false, possuiCAT: true, possuiAuxilioDoencaAnterior: false },
  { id: 'L009', nome: 'Wanderson Alves Cruz', telefone: '(31) 91098-7654', canal: 'Google Ads', dataEntrada: d(-2), dataContatoInicial: d(-2), tempoAteContatoHoras: 0.8, status: 'Contatado', responsavel: 'Bruno Lima', convertidoCliente: false, possuiCAT: false, possuiAuxilioDoencaAnterior: true },
  { id: 'L010', nome: 'Patrícia Gomes Nunes', telefone: '(11) 90987-6543', canal: 'Parceiro', dataEntrada: d(-4), dataContatoInicial: d(-4), tempoAteContatoHoras: 1.2, status: 'Triagem', responsavel: 'Jonas Inácio', convertidoCliente: false, possuiCAT: true, possuiAuxilioDoencaAnterior: true, tipoSequelaPreliminar: 'Coluna Lombar' },
];

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
export const MOCK_CLIENTES: Cliente[] = [
  { id: 'C001', idLead: 'L004', nome: 'Márcia Aparecida Teles', cpf: '***.***.491-**', dataNascimento: '1978-05-12', telefone: '(11) 96543-2109', cidade: 'São Paulo', uf: 'SP', profissao: 'Operadora de Máquinas', empregador: 'Metalúrgica Boa Parte Ltda', possuiCAT: true, possuiAuxilioDoencaAnterior: false, possuiLaudoMedico: true, dataUltimoContato: d(-12), diasSemContato: 12, responsavel: 'Bruno Lima', dataContratacao: d(-14), statusRelacionamento: 'Ativo', notaSatisfacao: 5, qtdIndicacoes: 1 },
  { id: 'C002', idLead: 'L007', nome: 'Davi Luiz Santos', cpf: '***.***.382-**', dataNascimento: '1965-11-30', telefone: '(41) 93210-9876', cidade: 'Curitiba', uf: 'PR', profissao: 'Motorista', empregador: 'Transportadora Rota Sul', possuiCAT: true, possuiAuxilioDoencaAnterior: true, possuiLaudoMedico: true, dataUltimoContato: d(-5), diasSemContato: 5, responsavel: 'Ana Souza', dataContratacao: d(-10), statusRelacionamento: 'Ativo', notaSatisfacao: 4, qtdIndicacoes: 2 },
  { id: 'C003', nome: 'João da Silva Santos', cpf: '***.***.271-**', dataNascimento: '1975-03-22', telefone: '(11) 99123-4567', cidade: 'São Paulo', uf: 'SP', profissao: 'Mecânico', empregador: 'Auto Peças Central', possuiCAT: true, possuiAuxilioDoencaAnterior: true, possuiLaudoMedico: false, dataUltimoContato: d(-45), diasSemContato: 45, responsavel: 'Jonas Inácio', dataContratacao: '2023-01-10', statusRelacionamento: 'Em Risco', notaSatisfacao: 3, qtdIndicacoes: 0 },
  { id: 'C004', nome: 'Maria Oliveira Ferreira', cpf: '***.***.162-**', dataNascimento: '1968-09-15', telefone: '(11) 98765-0001', cidade: 'Guarulhos', uf: 'SP', profissao: 'Auxiliar de Produção', possuiCAT: false, possuiAuxilioDoencaAnterior: true, possuiLaudoMedico: true, dataUltimoContato: d(-8), diasSemContato: 8, responsavel: 'Ana Souza', dataContratacao: '2022-11-15', statusRelacionamento: 'Promotor', notaSatisfacao: 5, qtdIndicacoes: 3 },
  { id: 'C005', nome: 'Ricardo Pereira Lima', cpf: '***.***.053-**', dataNascimento: '1980-07-04', telefone: '(11) 97654-3333', cidade: 'São Bernardo do Campo', uf: 'SP', profissao: 'Eletricista', empregador: 'Construtora Horizonte', possuiCAT: true, possuiAuxilioDoencaAnterior: false, possuiLaudoMedico: true, dataUltimoContato: d(-33), diasSemContato: 33, responsavel: 'Jonas Inácio', dataContratacao: '2023-06-01', statusRelacionamento: 'Em Risco', notaSatisfacao: 4, qtdIndicacoes: 1 },
  { id: 'C006', nome: 'Antônio Marcos Souza', cpf: '***.***.944-**', dataNascimento: '1990-12-18', telefone: '(11) 96543-1111', cidade: 'Osasco', uf: 'SP', profissao: 'Operador de Prensa', empregador: 'Plásticos do Sul Ltda', possuiCAT: true, possuiAuxilioDoencaAnterior: false, possuiLaudoMedico: false, dataUltimoContato: d(-3), diasSemContato: 3, responsavel: 'Bruno Lima', dataContratacao: '2024-02-10', statusRelacionamento: 'Ativo', notaSatisfacao: 5, qtdIndicacoes: 0 },
];

// ─── CONTRATOS ────────────────────────────────────────────────────────────────
export const MOCK_CONTRATOS: Contrato[] = [
  { id: 'CT001', idCliente: 'C001', numero: 'CONT-2024-001', dataAssinatura: d(-14), tipoHonorario: 'Êxito', percentualExito: 30, valorEstimadoCausa: 40000, valorEstimadoHonorario: 12000, status: 'Ativo' },
  { id: 'CT002', idCliente: 'C002', numero: 'CONT-2024-002', dataAssinatura: d(-10), tipoHonorario: 'Êxito', percentualExito: 30, valorEstimadoCausa: 55000, valorEstimadoHonorario: 16500, status: 'Ativo' },
  { id: 'CT003', idCliente: 'C003', numero: 'CONT-2023-001', dataAssinatura: '2023-01-10', tipoHonorario: 'Êxito', percentualExito: 30, valorEstimadoCausa: 45000, valorEstimadoHonorario: 13500, status: 'Ativo' },
  { id: 'CT004', idCliente: 'C004', numero: 'CONT-2022-001', dataAssinatura: '2022-11-15', tipoHonorario: 'Êxito', percentualExito: 25, valorEstimadoCausa: 32000, valorEstimadoHonorario: 8000, status: 'Encerrado' },
  { id: 'CT005', idCliente: 'C005', numero: 'CONT-2023-002', dataAssinatura: '2023-06-01', tipoHonorario: 'Êxito', percentualExito: 30, valorEstimadoCausa: 58000, valorEstimadoHonorario: 17400, status: 'Ativo' },
  { id: 'CT006', idCliente: 'C006', numero: 'CONT-2024-003', dataAssinatura: '2024-02-10', tipoHonorario: 'Misto', percentualExito: 25, valorFixo: 500, valorEstimadoCausa: 15000, valorEstimadoHonorario: 4250, status: 'Ativo' },
];

// ─── CASOS ────────────────────────────────────────────────────────────────────
export const MOCK_CASOS: Caso[] = [
  { id: 'CA001', idCliente: 'C003', idContrato: 'CT003', numero: '5001234-45.2023.4.03.6100', tipo: 'Judicial', faseJudicial: 'Perícia Designada', dataAbertura: '2023-01-15', dataUltimaMovimentacao: d(-15), diasSemMovimentacao: 15, responsavel: 'Jonas Inácio', prioridade: 'Alta', pontuacaoPrioridade: 82, valorCausa: 45000, valorPrevisto: 38000, probabilidadeExito: 72, receitaFuturaPonderada: 9720, status: 'Ativo', dataPericia: d(2), periciaRealizada: false, cliente: 'João da Silva Santos', tipoSequela: 'Limitativa - Membro Superior', resultadoJulgamento: 'Pendente', statusLegacy: 'Perícia', probabilidadeLegacy: 'Alta' },
  { id: 'CA002', idCliente: 'C004', idContrato: 'CT004', numero: '5005678-12.2022.4.03.6100', tipo: 'Judicial', faseJudicial: 'Encerrado', dataAbertura: '2022-11-20', dataUltimaMovimentacao: d(-5), diasSemMovimentacao: 5, responsavel: 'Ana Souza', prioridade: 'Baixa', pontuacaoPrioridade: 30, valorCausa: 32000, valorPrevisto: 28000, probabilidadeExito: 100, receitaFuturaPonderada: 8000, status: 'Encerrado', resultadoFinal: 'Procedente', dataPericia: d(-40), periciaRealizada: true, resultadoPericia: 'Favorável', dataTransitoJulgado: d(-15), valorRPV: 28000, dataRPV: d(-8), valorHonorariosRecebidos: 8000, cliente: 'Maria Oliveira Ferreira', tipoSequela: 'Auditiva', resultadoJulgamento: 'Favorável', statusLegacy: 'Finalizado', probabilidadeLegacy: 'Média' },
  { id: 'CA003', idCliente: 'C005', idContrato: 'CT005', numero: '5012345-99.2023.4.03.6100', tipo: 'Judicial', faseJudicial: 'Manifestação sobre Laudo', dataAbertura: '2023-06-05', dataUltimaMovimentacao: d(-33), diasSemMovimentacao: 33, responsavel: 'Jonas Inácio', prioridade: 'Alta', pontuacaoPrioridade: 88, valorCausa: 58000, valorPrevisto: 52000, probabilidadeExito: 80, receitaFuturaPonderada: 13920, status: 'Ativo', dataPericia: d(-15), periciaRealizada: true, resultadoPericia: 'Favorável', cliente: 'Ricardo Pereira Lima', tipoSequela: 'Coluna - Hérnia', resultadoJulgamento: 'Pendente', statusLegacy: 'Instrução', probabilidadeLegacy: 'Alta' },
  { id: 'CA004', idCliente: 'C006', idContrato: 'CT006', numero: '5011122-88.2024.4.03.6100', tipo: 'Judicial', faseJudicial: 'Perícia Designada', dataAbertura: '2024-02-14', dataUltimaMovimentacao: d(-22), diasSemMovimentacao: 22, responsavel: 'Bruno Lima', prioridade: 'Alta', pontuacaoPrioridade: 75, valorCausa: 15000, valorPrevisto: 12500, probabilidadeExito: 72, receitaFuturaPonderada: 3060, status: 'Ativo', dataPericia: d(1), periciaRealizada: false, cliente: 'Antônio Marcos Souza', tipoSequela: 'Amputação Parcial de Dedo', resultadoJulgamento: 'Pendente', statusLegacy: 'Perícia', probabilidadeLegacy: 'Alta' },
  { id: 'CA005', idCliente: 'C001', idContrato: 'CT001', tipo: 'Administrativo', faseAdministrativa: 'Análise Técnica', dataAbertura: d(-14), dataUltimaMovimentacao: d(-3), diasSemMovimentacao: 3, responsavel: 'Bruno Lima', prioridade: 'Média', pontuacaoPrioridade: 55, valorCausa: 40000, valorPrevisto: 12000, probabilidadeExito: 30, receitaFuturaPonderada: 3600, status: 'Ativo', periciaRealizada: false, cliente: 'Márcia Aparecida Teles', tipoSequela: 'Amputação Parcial', resultadoJulgamento: 'Pendente', statusLegacy: 'Inicial', probabilidadeLegacy: 'Média' },
  { id: 'CA006', idCliente: 'C002', idContrato: 'CT002', tipo: 'Administrativo', faseAdministrativa: 'Requerimento Administrativo', dataAbertura: d(-10), dataUltimaMovimentacao: d(-2), diasSemMovimentacao: 2, responsavel: 'Ana Souza', prioridade: 'Média', pontuacaoPrioridade: 60, valorCausa: 55000, valorPrevisto: 16500, probabilidadeExito: 25, receitaFuturaPonderada: 4125, status: 'Ativo', periciaRealizada: false, cliente: 'Davi Luiz Santos', tipoSequela: 'Visão', resultadoJulgamento: 'Pendente', statusLegacy: 'Inicial', probabilidadeLegacy: 'Alta' },
];

// ─── TAREFAS ──────────────────────────────────────────────────────────────────
export const MOCK_TAREFAS: Tarefa[] = [
  { id: 'T001', idCaso: 'CA001', idCliente: 'C003', titulo: 'Confirmar presença na perícia', tipo: 'Perícia', dataVencimento: d(1), responsavel: 'Jonas Inácio', prioridade: 'Urgente', status: 'Pendente', alertaDias: 2, nomeCliente: 'João da Silva Santos', numeroCaso: '5001234-45.2023.4.03.6100' },
  { id: 'T002', idCaso: 'CA003', idCliente: 'C005', titulo: 'Manifestação sobre laudo pericial', tipo: 'Petição', dataVencimento: d(5), responsavel: 'Jonas Inácio', prioridade: 'Alta', status: 'Em Andamento', alertaDias: 3, nomeCliente: 'Ricardo Pereira Lima', numeroCaso: '5012345-99.2023.4.03.6100' },
  { id: 'T003', idCaso: 'CA005', idCliente: 'C001', titulo: 'Coletar documentos faltantes (laudo médico)', tipo: 'Documento', dataVencimento: d(-2), responsavel: 'Bruno Lima', prioridade: 'Alta', status: 'Vencida', alertaDias: 5, nomeCliente: 'Márcia Aparecida Teles' },
  { id: 'T004', idCliente: 'C003', titulo: 'Entrar em contato com cliente (45 dias sem retorno)', tipo: 'Contato', dataVencimento: d(0), responsavel: 'Jonas Inácio', prioridade: 'Alta', status: 'Pendente', alertaDias: 1, nomeCliente: 'João da Silva Santos' },
  { id: 'T005', idCaso: 'CA004', idCliente: 'C006', titulo: 'Acompanhar laudo da perícia amanhã', tipo: 'Perícia', dataVencimento: d(2), responsavel: 'Bruno Lima', prioridade: 'Alta', status: 'Pendente', alertaDias: 3, nomeCliente: 'Antônio Marcos Souza', numeroCaso: '5011122-88.2024.4.03.6100' },
  { id: 'T006', idCaso: 'CA006', idCliente: 'C002', titulo: 'Protocolar requerimento no INSS', tipo: 'Protocolo', dataVencimento: d(3), responsavel: 'Ana Souza', prioridade: 'Alta', status: 'Em Andamento', alertaDias: 2, nomeCliente: 'Davi Luiz Santos' },
  { id: 'T007', idCaso: 'CA002', idCliente: 'C004', titulo: 'Cobrar honorários - RPV recebida', tipo: 'Outro', dataVencimento: d(-5), dataConclusao: d(-3), responsavel: 'Jonas Inácio', prioridade: 'Alta', status: 'Concluída', alertaDias: 1, nomeCliente: 'Maria Oliveira Ferreira', numeroCaso: '5005678-12.2022.4.03.6100' },
  { id: 'T008', idCliente: 'C005', titulo: 'Atualizar cliente sobre andamento do processo', tipo: 'Contato', dataVencimento: d(-1), responsavel: 'Jonas Inácio', prioridade: 'Média', status: 'Vencida', alertaDias: 2, nomeCliente: 'Ricardo Pereira Lima' },
  { id: 'T009', idCaso: 'CA003', idCliente: 'C005', titulo: 'Agendar reunião para estratégia recursal', tipo: 'Audiência', dataVencimento: d(10), responsavel: 'Jonas Inácio', prioridade: 'Média', status: 'Pendente', alertaDias: 3, nomeCliente: 'Ricardo Pereira Lima' },
  { id: 'T010', idCaso: 'CA005', idCliente: 'C001', titulo: 'Preencher formulário requerimento INSS', tipo: 'Protocolo', dataVencimento: d(7), responsavel: 'Bruno Lima', prioridade: 'Média', status: 'Pendente', alertaDias: 3, nomeCliente: 'Márcia Aparecida Teles' },
];

// ─── FINANCEIRO ────────────────────────────────────────────────────────────────
export const MOCK_LANCAMENTOS: Lancamento[] = [
  { id: 'F001', idCaso: 'CA002', idCliente: 'C004', idContrato: 'CT004', nomeCliente: 'Maria Oliveira Ferreira', tipo: 'Honorário Êxito', natureza: 'Receita', descricao: 'Honorários de êxito - RPV recebida', valor: 8000, dataVencimento: d(-8), dataPagamento: d(-3), status: 'Pago' },
  { id: 'F002', idCaso: 'CA001', idCliente: 'C003', idContrato: 'CT003', nomeCliente: 'João da Silva Santos', tipo: 'Honorário Êxito', natureza: 'Receita', descricao: 'Honorários estimados - aguardando sentença', valor: 13500, dataVencimento: d(90), status: 'Previsto' },
  { id: 'F003', idCaso: 'CA003', idCliente: 'C005', idContrato: 'CT005', nomeCliente: 'Ricardo Pereira Lima', tipo: 'Honorário Êxito', natureza: 'Receita', descricao: 'Honorários estimados - laudo favorável', valor: 17400, dataVencimento: d(60), status: 'Previsto' },
  { id: 'F004', idCaso: 'CA004', idCliente: 'C006', idContrato: 'CT006', nomeCliente: 'Antônio Marcos Souza', tipo: 'Honorário Fixo', natureza: 'Receita', descricao: 'Parcela fixa contrato misto', valor: 500, dataVencimento: d(-20), dataPagamento: d(-18), status: 'Pago' },
  { id: 'F005', idCaso: 'CA004', idCliente: 'C006', idContrato: 'CT006', nomeCliente: 'Antônio Marcos Souza', tipo: 'Honorário Êxito', natureza: 'Receita', descricao: 'Honorários estimados - contrato misto', valor: 3750, dataVencimento: d(120), status: 'Previsto' },
  { id: 'F006', idCliente: 'C001', idContrato: 'CT001', nomeCliente: 'Márcia Aparecida Teles', tipo: 'Honorário Êxito', natureza: 'Receita', descricao: 'Honorários estimados - fase administrativa', valor: 12000, dataVencimento: d(180), status: 'Previsto' },
  { id: 'F007', idCliente: 'C002', idContrato: 'CT002', nomeCliente: 'Davi Luiz Santos', tipo: 'Honorário Êxito', natureza: 'Receita', descricao: 'Honorários estimados - fase administrativa', valor: 16500, dataVencimento: d(240), status: 'Previsto' },
  { id: 'F008', idCliente: 'GERAL', nomeCliente: 'Escritório', tipo: 'Custo Captação', natureza: 'Despesa', descricao: 'Google Ads - Maio/2025', valor: 3200, dataVencimento: d(-2), dataPagamento: d(-2), status: 'Pago', canal: 'Google Ads' },
  { id: 'F009', idCliente: 'GERAL', nomeCliente: 'Escritório', tipo: 'Custo Captação', natureza: 'Despesa', descricao: 'Meta Ads (Facebook/Instagram) - Maio/2025', valor: 1800, dataVencimento: d(-2), dataPagamento: d(-2), status: 'Pago', canal: 'Facebook/Instagram' },
  { id: 'F010', idCliente: 'GERAL', nomeCliente: 'Escritório', tipo: 'Custo Operacional', natureza: 'Despesa', descricao: 'Honorários equipe - Maio/2025', valor: 12000, dataVencimento: d(5), status: 'A Vencer' },
  { id: 'F011', idCaso: 'CA002', idCliente: 'C004', idContrato: 'CT004', nomeCliente: 'Maria Oliveira Ferreira', tipo: 'RPV', natureza: 'Receita', descricao: 'RPV recebida - caso encerrado', valor: 28000, dataVencimento: d(-8), dataPagamento: d(-8), status: 'Pago' },
  { id: 'F012', idCliente: 'GERAL', nomeCliente: 'Escritório', tipo: 'Custo Operacional', natureza: 'Despesa', descricao: 'Despesas processuais diversas', valor: 850, dataVencimento: d(-10), dataPagamento: d(-9), status: 'Pago' },
];

// ─── ATENDIMENTOS ─────────────────────────────────────────────────────────────
export const MOCK_ATENDIMENTOS: Atendimento[] = [
  { id: 'AT001', idCliente: 'C003', idCaso: 'CA001', nomeCliente: 'João da Silva Santos', data: d(-45), tipo: 'Telefone', assunto: 'Atualização sobre perícia', duracao: 10, responsavel: 'Jonas Inácio', satisfacao: 3, followUpNecessario: true, dataFollowUp: d(-30), reclamacao: false, observacoes: 'Cliente ansioso com demora' },
  { id: 'AT002', idCliente: 'C004', idCaso: 'CA002', nomeCliente: 'Maria Oliveira Ferreira', data: d(-8), tipo: 'WhatsApp', assunto: 'Confirmação do recebimento da RPV', duracao: 5, responsavel: 'Ana Souza', satisfacao: 5, followUpNecessario: false, reclamacao: false },
  { id: 'AT003', idCliente: 'C005', idCaso: 'CA003', nomeCliente: 'Ricardo Pereira Lima', data: d(-33), tipo: 'Telefone', assunto: 'Status do processo - cliente solicitou retorno', duracao: 8, responsavel: 'Jonas Inácio', satisfacao: 3, followUpNecessario: true, dataFollowUp: d(-15), reclamacao: false, observacoes: 'Prometeu retorno sobre laudo' },
  { id: 'AT004', idCliente: 'C006', idCaso: 'CA004', nomeCliente: 'Antônio Marcos Souza', data: d(-3), tipo: 'WhatsApp', assunto: 'Confirmação de horário da perícia', duracao: 3, responsavel: 'Bruno Lima', satisfacao: 5, followUpNecessario: false, reclamacao: false },
  { id: 'AT005', idCliente: 'C001', idCaso: 'CA005', nomeCliente: 'Márcia Aparecida Teles', data: d(-12), tipo: 'Presencial', assunto: 'Assinatura de contrato e entrega de documentos', duracao: 45, responsavel: 'Bruno Lima', satisfacao: 5, followUpNecessario: true, dataFollowUp: d(-5), reclamacao: false },
  { id: 'AT006', idCliente: 'C003', idCaso: 'CA001', nomeCliente: 'João da Silva Santos', data: d(-15), tipo: 'WhatsApp', assunto: 'Envio de orientações para a perícia', duracao: 5, responsavel: 'Jonas Inácio', satisfacao: 4, followUpNecessario: false, reclamacao: false },
  { id: 'AT007', idCliente: 'C005', nomeCliente: 'Ricardo Pereira Lima', data: d(-20), tipo: 'Email', assunto: 'Reclamação sobre falta de retorno', duracao: 0, responsavel: 'Jonas Inácio', satisfacao: 2, followUpNecessario: true, dataFollowUp: d(-18), reclamacao: true, observacoes: 'Cliente insatisfeito com demora na atualização' },
];

// ─── CANAIS DE MARKETING ──────────────────────────────────────────────────────
export const MOCK_CANAIS: CanalPerformance[] = [
  { id: 'CM001', nome: 'Google Ads', mesAno: '2025-05', custoMes: 3200, leadsGerados: 18, conversoes: 4, taxaConversao: 22.2, custoPorlead: 177.78, custoPorConversao: 800 },
  { id: 'CM002', nome: 'Facebook/Instagram', mesAno: '2025-05', custoMes: 1800, leadsGerados: 10, conversoes: 1, taxaConversao: 10, custoPorlead: 180, custoPorConversao: 1800 },
  { id: 'CM003', nome: 'Indicação', mesAno: '2025-05', custoMes: 0, leadsGerados: 5, conversoes: 3, taxaConversao: 60, custoPorlead: 0, custoPorConversao: 0 },
  { id: 'CM004', nome: 'Orgânico/SEO', mesAno: '2025-05', custoMes: 500, leadsGerados: 3, conversoes: 1, taxaConversao: 33.3, custoPorlead: 166.67, custoPorConversao: 500 },
  { id: 'CM005', nome: 'Parceiro', mesAno: '2025-05', custoMes: 0, leadsGerados: 2, conversoes: 1, taxaConversao: 50, custoPorlead: 0, custoPorConversao: 0 },
];

// ─── COLABORADORES ────────────────────────────────────────────────────────────
export const MOCK_COLABORADORES: Colaborador[] = [
  { id: 'COL001', nome: 'Jonas Inácio', cargo: 'Gestor', oab: 'SP 123456', email: 'jonas@advocacia.com', telefone: '(11) 99999-0001', casosAtivos: 3, metaCasosMes: 5, tarefasConcluidas: 12, tarefasPendentes: 4, dataIngresso: '2018-03-01', status: 'Ativo' },
  { id: 'COL002', nome: 'Ana Souza', cargo: 'Advogado Pleno', oab: 'SP 234567', email: 'ana@advocacia.com', telefone: '(11) 99999-0002', casosAtivos: 3, metaCasosMes: 8, tarefasConcluidas: 18, tarefasPendentes: 3, dataIngresso: '2021-06-15', status: 'Ativo' },
  { id: 'COL003', nome: 'Bruno Lima', cargo: 'Advogado Júnior', oab: 'SP 345678', email: 'bruno@advocacia.com', telefone: '(11) 99999-0003', casosAtivos: 3, metaCasosMes: 6, tarefasConcluidas: 9, tarefasPendentes: 5, dataIngresso: '2023-02-01', status: 'Ativo' },
  { id: 'COL004', nome: 'Lúcia Fernandes', cargo: 'Administrativo', email: 'lucia@advocacia.com', casosAtivos: 0, metaCasosMes: 0, tarefasConcluidas: 22, tarefasPendentes: 2, dataIngresso: '2022-08-10', status: 'Ativo' },
];

// ─── FASES PROCESSUAIS ────────────────────────────────────────────────────────
export const FASES_ADMINISTRATIVAS = [
  'Triagem', 'Documentação Pendente', 'Análise Técnica', 'Requerimento Administrativo',
  'Aguardando Análise INSS', 'Exigência', 'Recurso Administrativo', 'Deferido', 'Indeferido', 'Encaminhado para Judicial'
];

export const FASES_JUDICIAIS = [
  'Inicial em Elaboração', 'Distribuído', 'Aguardando Citação', 'Contestação', 'Réplica',
  'Perícia Designada', 'Perícia Realizada', 'Aguardando Laudo', 'Manifestação sobre Laudo',
  'Sentença', 'Recurso', 'Trânsito em Julgado', 'Implantação', 'RPV/Precatório', 'Honorários Cobrados', 'Encerrado'
];

// ─── PROBABILIDADES POR FASE ──────────────────────────────────────────────────
export const PROBABILIDADE_POR_FASE: Record<string, number> = {
  'Triagem': 0.10,
  'Documentação Pendente': 0.15,
  'Análise Técnica': 0.20,
  'Requerimento Administrativo': 0.25,
  'Aguardando Análise INSS': 0.25,
  'Deferido': 1.00,
  'Indeferido': 0.05,
  'Encaminhado para Judicial': 0.40,
  'Inicial em Elaboração': 0.35,
  'Distribuído': 0.40,
  'Contestação': 0.45,
  'Perícia Designada': 0.55,
  'Perícia Realizada': 0.60,
  'Aguardando Laudo': 0.60,
  'Manifestação sobre Laudo': 0.70,
  'Sentença': 0.72,
  'Recurso': 0.65,
  'Trânsito em Julgado': 1.00,
  'Implantação': 1.00,
  'RPV/Precatório': 1.00,
  'Honorários Cobrados': 1.00,
  'Encerrado': 1.00,
};

// ─── CORES DE STATUS ──────────────────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  'Inicial': '#94a3b8',
  'Perícia': '#fbbf24',
  'Instrução': '#60a5fa',
  'Sentença': '#34d399',
  'Recurso': '#f87171',
  'Finalizado': '#4ade80',
  'Novo': '#94a3b8',
  'Contatado': '#60a5fa',
  'Triagem': '#fbbf24',
  'Documentação': '#fb923c',
  'Análise': '#a78bfa',
  'Convertido': '#4ade80',
  'Perdido': '#f87171',
};

export const PRIORIDADE_COLORS: Record<string, string> = {
  'Urgente': '#dc2626',
  'Alta': '#ea580c',
  'Média': '#d97706',
  'Baixa': '#65a30d',
};
