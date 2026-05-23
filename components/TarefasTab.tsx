
import React, { useMemo, useState } from 'react';
import { Tarefa, PrioridadeNivel } from '../types';
import { PRIORIDADE_COLORS } from '../constants';

interface TarefasTabProps {
  tarefas: Tarefa[];
  onUpdateTarefa?: (t: Tarefa) => void;
}

const STATUS_BADGE: Record<string, string> = {
  'Pendente': 'bg-yellow-100 text-yellow-700',
  'Em Andamento': 'bg-blue-100 text-blue-700',
  'Concluída': 'bg-emerald-100 text-emerald-700',
  'Vencida': 'bg-red-100 text-red-700',
};

const TIPO_ICONS: Record<string, string> = {
  'Prazo': '⏰',
  'Audiência': '⚖️',
  'Documento': '📄',
  'Contato': '📞',
  'Petição': '✍️',
  'Perícia': '🩺',
  'Protocolo': '📮',
  'Outro': '📌',
};

export const TarefasTab: React.FC<TarefasTabProps> = ({ tarefas, onUpdateTarefa }) => {
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('Todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('Todos');

  const hoje = new Date();

  const tarefasAtualizadas = useMemo(() =>
    tarefas.map(t => {
      if (t.status !== 'Concluída' && new Date(t.dataVencimento) < hoje) {
        return { ...t, status: 'Vencida' as const };
      }
      return t;
    }), [tarefas]);

  const kpis = useMemo(() => {
    const vencidas = tarefasAtualizadas.filter(t => t.status === 'Vencida').length;
    const pendentes = tarefasAtualizadas.filter(t => t.status === 'Pendente').length;
    const emAndamento = tarefasAtualizadas.filter(t => t.status === 'Em Andamento').length;
    const concluidas = tarefasAtualizadas.filter(t => t.status === 'Concluída').length;
    const urgentes = tarefasAtualizadas.filter(t => t.prioridade === 'Urgente' && t.status !== 'Concluída').length;
    const proximas7dias = tarefasAtualizadas.filter(t => {
      if (t.status === 'Concluída') return false;
      const diff = Math.ceil((new Date(t.dataVencimento).getTime() - hoje.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    }).length;
    return { vencidas, pendentes, emAndamento, concluidas, urgentes, proximas7dias };
  }, [tarefasAtualizadas]);

  const responsaveis = useMemo(() => {
    const set = new Set(tarefas.map(t => t.responsavel));
    return Array.from(set);
  }, [tarefas]);

  const tarefasFiltradas = useMemo(() =>
    tarefasAtualizadas.filter(t => {
      if (filtroStatus !== 'Todos' && t.status !== filtroStatus) return false;
      if (filtroPrioridade !== 'Todos' && t.prioridade !== filtroPrioridade) return false;
      if (filtroResponsavel !== 'Todos' && t.responsavel !== filtroResponsavel) return false;
      return true;
    }).sort((a, b) => {
      const prioOrd = ['Urgente','Alta','Média','Baixa'];
      const statusOrd = ['Vencida','Pendente','Em Andamento','Concluída'];
      if (statusOrd.indexOf(a.status) !== statusOrd.indexOf(b.status))
        return statusOrd.indexOf(a.status) - statusOrd.indexOf(b.status);
      return prioOrd.indexOf(a.prioridade) - prioOrd.indexOf(b.prioridade);
    }), [tarefasAtualizadas, filtroStatus, filtroPrioridade, filtroResponsavel]);

  const porResponsavel = useMemo(() => {
    const resp: Record<string, { vencidas: number; pendentes: number; concluidas: number }> = {};
    tarefasAtualizadas.forEach(t => {
      if (!resp[t.responsavel]) resp[t.responsavel] = { vencidas: 0, pendentes: 0, concluidas: 0 };
      if (t.status === 'Vencida') resp[t.responsavel].vencidas++;
      else if (t.status === 'Pendente' || t.status === 'Em Andamento') resp[t.responsavel].pendentes++;
      else resp[t.responsavel].concluidas++;
    });
    return resp;
  }, [tarefasAtualizadas]);

  const diasParaVencer = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - hoje.getTime()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)} dias em atraso`;
    if (diff === 0) return 'Vence hoje';
    if (diff === 1) return 'Amanhã';
    return `Em ${diff} dias`;
  };

  const corDiasVencer = (dateStr: string, status: string) => {
    if (status === 'Vencida') return 'text-red-600 font-black';
    const diff = Math.ceil((new Date(dateStr).getTime() - hoje.getTime()) / 86400000);
    if (diff === 0) return 'text-orange-600 font-black animate-pulse';
    if (diff <= 2) return 'text-orange-500 font-bold';
    if (diff <= 7) return 'text-yellow-600 font-medium';
    return 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Vencidas', value: kpis.vencidas, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'Urgentes', value: kpis.urgentes, color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
          { label: 'Pendentes', value: kpis.pendentes, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
          { label: 'Em Andamento', value: kpis.emAndamento, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          { label: 'Próx. 7 dias', value: kpis.proximas7dias, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
          { label: 'Concluídas', value: kpis.concluidas, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.color} border rounded-2xl p-4`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-black mt-1 ${kpi.text}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de tarefas */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mr-2">Tarefas & Prazos</h3>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
              <option value="Todos">Todos status</option>
              {['Vencida','Pendente','Em Andamento','Concluída'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
              <option value="Todos">Todas prioridades</option>
              {['Urgente','Alta','Média','Baixa'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
              <option value="Todos">Todos responsáveis</option>
              {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {tarefasFiltradas.map(tarefa => (
              <div key={tarefa.id} className={`p-4 hover:bg-gray-50/50 transition-colors ${tarefa.status === 'Vencida' ? 'bg-red-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-xl mt-0.5">{TIPO_ICONS[tarefa.tipo] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <p className={`text-sm font-bold ${tarefa.status === 'Concluída' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {tarefa.titulo}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${STATUS_BADGE[tarefa.status]}`}>
                          {tarefa.status}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border" style={{ color: PRIORIDADE_COLORS[tarefa.prioridade], borderColor: PRIORIDADE_COLORS[tarefa.prioridade] + '55', background: PRIORIDADE_COLORS[tarefa.prioridade] + '15' }}>
                          {tarefa.prioridade}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {tarefa.nomeCliente && <p className="text-[11px] text-gray-500">👤 {tarefa.nomeCliente}</p>}
                        {tarefa.numeroCaso && <p className="text-[11px] text-gray-400">📁 {tarefa.numeroCaso.substring(0, 20)}...</p>}
                        <p className="text-[11px] text-gray-500">👷 {tarefa.responsavel}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[11px] ${corDiasVencer(tarefa.dataVencimento, tarefa.status)}`}>
                      {diasParaVencer(tarefa.dataVencimento)}
                    </p>
                    <p className="text-[10px] text-gray-400">{new Date(tarefa.dataVencimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            ))}
            {tarefasFiltradas.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-bold">Nenhuma tarefa encontrada com esses filtros.</p>
              </div>
            )}
          </div>
        </div>

        {/* Produtividade por responsável */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-5">Tarefas por Responsável</h3>
          <div className="space-y-4">
            {Object.entries(porResponsavel).map(([resp, dados]) => {
              const total = dados.vencidas + dados.pendentes + dados.concluidas;
              const pctConcluidas = total > 0 ? (dados.concluidas / total) * 100 : 0;
              return (
                <div key={resp} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-800">{resp}</p>
                    <div className="flex items-center gap-2">
                      {dados.vencidas > 0 && <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{dados.vencidas} vencidas</span>}
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{dados.concluidas} concluídas</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctConcluidas}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400">{pctConcluidas.toFixed(0)}% concluídas de {total} tarefas</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">Legenda de Prazos</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span><span className="text-[11px] text-gray-600">Vencida — ação imediata</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span><span className="text-[11px] text-gray-600">Vence hoje ou amanhã</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0"></span><span className="text-[11px] text-gray-600">Próximos 7 dias</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span><span className="text-[11px] text-gray-600">Concluída</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
