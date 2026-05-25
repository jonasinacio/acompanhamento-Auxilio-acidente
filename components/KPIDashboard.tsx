
import React, { useMemo } from 'react';
import { Caso, Lead, Lancamento, Tarefa, Atendimento, Cliente } from '../types';
import { PROBABILIDADE_POR_FASE } from '../constants';

interface KPIDashboardProps {
  casos: Caso[];
  leads: Lead[];
  lancamentos: Lancamento[];
  tarefas: Tarefa[];
  atendimentos: Atendimento[];
  clientes: Cliente[];
}

const Metric: React.FC<{ label: string; value: string | number; sub?: string; color?: string; alerta?: boolean }> = ({ label, value, sub, color = 'text-[#001529]', alerta }) => (
  <div className={`bg-white rounded-2xl border ${alerta ? 'border-red-200 bg-red-50/40' : 'border-gray-100'} p-5 shadow-sm`}>
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</p>
    <p className={`text-2xl font-black ${alerta ? 'text-red-600' : color}`}>{value}</p>
    {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
  </div>
);

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ casos, leads, lancamentos, tarefas, atendimentos, clientes }) => {
  const hoje = new Date();

  const comercial = useMemo(() => {
    const total = leads.length;
    const convertidos = leads.filter(l => l.status === 'Convertido').length;
    const txConversao = total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0';
    const porCanal = leads.reduce<Record<string, number>>((acc, l) => { acc[l.canal] = (acc[l.canal] || 0) + 1; return acc; }, {});
    const melhorCanal = Object.entries(porCanal).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const tempos = leads.filter(l => l.tempoAteContatoHoras && l.tempoAteContatoHoras > 0).map(l => l.tempoAteContatoHoras!);
    const tempoMedio = tempos.length > 0 ? (tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1) : '—';
    const contratosValor = lancamentos.filter(l => l.tipo.startsWith('Honorário') && l.natureza === 'Receita').reduce((a, l) => a + l.valor, 0);
    const ticketMedio = convertidos > 0 ? (contratosValor / convertidos).toFixed(0) : '0';
    return { total, convertidos, txConversao, melhorCanal, tempoMedio, ticketMedio };
  }, [leads, lancamentos]);

  const juridico = useMemo(() => {
    const ativos = casos.filter(c => c.status === 'Ativo').length;
    const comPericia = casos.filter(c => c.periciaRealizada).length;
    const periciasFav = casos.filter(c => c.periciaRealizada && c.resultadoPericia === 'Favorável').length;
    const txPericiaFav = comPericia > 0 ? ((periciasFav / comPericia) * 100).toFixed(0) : '—';
    const encerrados = casos.filter(c => c.status === 'Encerrado').length;
    const procedentes = casos.filter(c => c.resultadoFinal === 'Procedente').length;
    const txExito = encerrados > 0 ? ((procedentes / encerrados) * 100).toFixed(0) : '—';
    const judiciais = casos.filter(c => c.tipo === 'Judicial').length;
    const totalCasos = casos.length;
    const txJudicializacao = totalCasos > 0 ? ((judiciais / totalCasos) * 100).toFixed(0) : '0';
    const sem30 = casos.filter(c => c.diasSemMovimentacao >= 30 && c.status === 'Ativo').length;
    const sem60 = casos.filter(c => c.diasSemMovimentacao >= 60 && c.status === 'Ativo').length;
    const valorMedioAtrasados = casos.filter(c => c.valorRPV && c.valorRPV > 0).reduce((a, c) => a + (c.valorRPV || 0), 0);
    return { ativos, txPericiaFav, txExito, txJudicializacao, sem30, sem60, valorMedioAtrasados };
  }, [casos]);

  const financeiro = useMemo(() => {
    const honorariosRecebidos = lancamentos.filter(l => l.natureza === 'Receita' && l.status === 'Pago' && l.tipo.startsWith('Honorário')).reduce((a, l) => a + l.valor, 0);
    const receitaFuturaPonderada = casos.filter(c => c.status === 'Ativo').reduce((acc, c) => {
      const fase = c.faseJudicial || c.faseAdministrativa || '';
      const prob = PROBABILIDADE_POR_FASE[fase] || 0.3;
      return acc + (c.valorPrevisto * 0.30 * prob);
    }, 0);
    const despesas = lancamentos.filter(l => l.natureza === 'Despesa' && l.status === 'Pago').reduce((a, l) => a + l.valor, 0);
    const resultadoLiquido = honorariosRecebidos - despesas;
    const honorariosAReceber = lancamentos.filter(l => l.natureza === 'Receita' && ['Previsto', 'A Vencer'].includes(l.status)).reduce((a, l) => a + l.valor, 0);
    return { honorariosRecebidos, receitaFuturaPonderada, despesas, resultadoLiquido, honorariosAReceber };
  }, [lancamentos, casos]);

  const controladoria = useMemo(() => {
    const vencidas = tarefas.filter(t => t.status !== 'Concluída' && new Date(t.dataVencimento) < hoje).length;
    const urgentes = tarefas.filter(t => t.prioridade === 'Urgente' && t.status !== 'Concluída').length;
    const pericias15dias = casos.filter(c => {
      if (!c.dataPericia || c.periciaRealizada) return false;
      const diff = Math.ceil((new Date(c.dataPericia).getTime() - hoje.getTime()) / 86400000);
      return diff >= 0 && diff <= 15;
    }).length;
    return { vencidas, urgentes, pericias15dias };
  }, [tarefas, casos]);

  const relacionamento = useMemo(() => {
    const semContato30 = clientes.filter(c => c.diasSemContato >= 30).length;
    const reclamacoes = atendimentos.filter(a => a.reclamacao).length;
    const notas = atendimentos.filter(a => a.satisfacao != null).map(a => a.satisfacao!);
    const nps = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '—';
    return { semContato30, reclamacoes, nps };
  }, [clientes, atendimentos]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8">
      {/* Alertas Críticos */}
      {(controladoria.vencidas > 0 || controladoria.urgentes > 0 || juridico.sem60 > 0 || relacionamento.semContato30 > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-[11px] font-black uppercase text-red-800 mb-3">🚨 Alertas Críticos — Ação Imediata Necessária</p>
          <div className="flex flex-wrap gap-2">
            {controladoria.vencidas > 0 && <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-black">{controladoria.vencidas} tarefa(s) vencida(s)</span>}
            {controladoria.urgentes > 0 && <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-500 text-white text-[11px] font-black">{controladoria.urgentes} urgente(s)</span>}
            {juridico.sem60 > 0 && <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-black">{juridico.sem60} caso(s) parado(s) +60 dias</span>}
            {relacionamento.semContato30 > 0 && <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-400 text-white text-[11px] font-black">{relacionamento.semContato30} cliente(s) sem contato +30 dias</span>}
            {controladoria.pericias15dias > 0 && <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-black">{controladoria.pericias15dias} perícia(s) nos próx. 15 dias</span>}
          </div>
        </div>
      )}

      {/* COMERCIAL */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm">📈</span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#001529]">KPIs Comerciais</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Metric label="Total de Leads" value={comercial.total} sub="Entradas no funil" color="text-blue-700" />
          <Metric label="Convertidos" value={comercial.convertidos} sub="Leads → Contratos" color="text-emerald-700" />
          <Metric label="Taxa Conversão" value={`${comercial.txConversao}%`} sub="Leads convertidos" color="text-purple-700" />
          <Metric label="Melhor Canal" value={comercial.melhorCanal} sub="Mais leads gerados" color="text-indigo-700" />
          <Metric label="Tempo Médio (h)" value={`${comercial.tempoMedio}h`} sub="1º contato" color="text-orange-700" />
          <Metric label="Ticket Médio" value={`R$ ${Number(comercial.ticketMedio).toLocaleString('pt-BR')}`} sub="Por contrato" color="text-teal-700" />
        </div>
      </div>

      {/* JURÍDICO */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-[#001529] rounded-xl flex items-center justify-center">
            <span className="text-white text-sm">⚖️</span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#001529]">KPIs Jurídicos</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Metric label="Casos Ativos" value={juridico.ativos} sub="Em andamento" color="text-[#001529]" />
          <Metric label="Judicialização" value={`${juridico.txJudicializacao}%`} sub="Casos judiciais" color="text-blue-700" />
          <Metric label="Perícias Favoráveis" value={`${juridico.txPericiaFav}%`} sub="Das perícias realizadas" color="text-emerald-700" />
          <Metric label="Taxa de Êxito" value={`${juridico.txExito}%`} sub="Casos encerrados" color="text-purple-700" />
          <Metric label="Parados +30d" value={juridico.sem30} sub="Sem movimentação" alerta={juridico.sem30 > 0} />
          <Metric label="Parados +60d" value={juridico.sem60} sub="Risco processual" alerta={juridico.sem60 > 0} />
        </div>
      </div>

      {/* FINANCEIRO */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm">💰</span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#001529]">KPIs Financeiros</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Metric label="Hon. Recebidos" value={fmt(financeiro.honorariosRecebidos)} sub="Receita realizada" color="text-emerald-700" />
          <Metric label="A Receber" value={fmt(financeiro.honorariosAReceber)} sub="Em aberto" color="text-blue-700" />
          <Metric label="Total Despesas" value={fmt(financeiro.despesas)} sub="Pagas no período" color="text-red-600" />
          <Metric label="Resultado Líquido" value={fmt(financeiro.resultadoLiquido)} sub="Receitas - Despesas" color={financeiro.resultadoLiquido >= 0 ? 'text-emerald-700' : 'text-red-600'} />
          <Metric label="Receita Ponderada" value={fmt(financeiro.receitaFuturaPonderada)} sub="Forecast ajustado" color="text-amber-700" />
        </div>
      </div>

      {/* CONTROLADORIA + RELACIONAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm">🎯</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529]">Controladoria</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Tarefas Vencidas" value={controladoria.vencidas} alerta={controladoria.vencidas > 0} />
            <Metric label="Urgências" value={controladoria.urgentes} alerta={controladoria.urgentes > 0} />
            <Metric label="Perícias 15 dias" value={controladoria.pericias15dias} color="text-amber-700" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm">💬</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529]">Relacionamento</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Sem Contato +30d" value={relacionamento.semContato30} alerta={relacionamento.semContato30 > 0} />
            <Metric label="Reclamações" value={relacionamento.reclamacoes} alerta={relacionamento.reclamacoes > 0} />
            <Metric label="NPS Médio" value={`${relacionamento.nps}/5`} color={Number(relacionamento.nps) >= 4 ? 'text-emerald-700' : 'text-orange-600'} />
          </div>
        </div>
      </div>
    </div>
  );
};
