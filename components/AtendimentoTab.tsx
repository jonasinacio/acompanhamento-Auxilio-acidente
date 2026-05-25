
import React, { useMemo, useState } from 'react';
import { Atendimento, Cliente } from '../types';

interface AtendimentoTabProps {
  atendimentos: Atendimento[];
  clientes: Cliente[];
}

const TIPO_ICONS: Record<string, string> = {
  'Telefone': '📞',
  'WhatsApp': '💬',
  'Email': '📧',
  'Presencial': '👥',
  'Videoconferência': '🎥',
};

const NPS_COLORS: Record<number, string> = {
  5: 'text-emerald-600',
  4: 'text-green-500',
  3: 'text-yellow-500',
  2: 'text-orange-500',
  1: 'text-red-600',
};

export const AtendimentoTab: React.FC<AtendimentoTabProps> = ({ atendimentos, clientes }) => {
  const [abaAtiva, setAbaAtiva] = useState<'atendimentos' | 'clientes' | 'nps'>('atendimentos');

  const hoje = new Date();

  const kpis = useMemo(() => {
    const total = atendimentos.length;
    const reclamacoes = atendimentos.filter(a => a.reclamacao).length;
    const notas = atendimentos.filter(a => a.satisfacao != null).map(a => a.satisfacao!);
    const npsMedia = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
    const clientesSemContato30 = clientes.filter(c => c.diasSemContato >= 30).length;
    const clientesSemContato60 = clientes.filter(c => c.diasSemContato >= 60).length;
    const indicacoes = clientes.reduce((a, c) => a + c.qtdIndicacoes, 0);
    const emRisco = clientes.filter(c => c.statusRelacionamento === 'Em Risco').length;
    return { total, reclamacoes, npsMedia, clientesSemContato30, clientesSemContato60, indicacoes, emRisco };
  }, [atendimentos, clientes]);

  const clientesOrdenados = useMemo(() =>
    [...clientes].sort((a, b) => b.diasSemContato - a.diasSemContato),
    [clientes]);

  const npsDistribuicao = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    atendimentos.filter(a => a.satisfacao != null).forEach(a => {
      dist[a.satisfacao! - 1]++;
    });
    return dist;
  }, [atendimentos]);

  const RELACIONAMENTO_COLORS: Record<string, string> = {
    'Ativo': 'bg-emerald-100 text-emerald-700',
    'Promotor': 'bg-blue-100 text-blue-700',
    'Em Risco': 'bg-orange-100 text-orange-700',
    'Inativo': 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Atendimentos', value: kpis.total, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          { label: 'Reclamações', value: kpis.reclamacoes, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'NPS Médio', value: `${kpis.npsMedia.toFixed(1)}/5`, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
          { label: 'Sem contato 30d', value: kpis.clientesSemContato30, color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
          { label: 'Sem contato 60d', value: kpis.clientesSemContato60, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'Clientes em Risco', value: kpis.emRisco, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
          { label: 'Indicações Geradas', value: kpis.indicacoes, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.color} border rounded-2xl p-4`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-black mt-1 ${kpi.text}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Alertas críticos de relacionamento */}
      {(kpis.clientesSemContato30 > 0 || kpis.reclamacoes > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-[11px] font-black uppercase text-orange-800 mb-2">⚠️ Alertas de Relacionamento</p>
          <div className="flex flex-wrap gap-3">
            {kpis.clientesSemContato30 > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-orange-300 text-[11px] font-bold text-orange-700">
                {kpis.clientesSemContato30} cliente(s) sem contato há mais de 30 dias
              </span>
            )}
            {kpis.reclamacoes > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-red-300 text-[11px] font-bold text-red-700">
                {kpis.reclamacoes} reclamação(ões) registrada(s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['atendimentos', 'clientes', 'nps'] as const).map(tab => (
          <button key={tab} onClick={() => setAbaAtiva(tab)} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${abaAtiva === tab ? 'bg-white shadow-sm text-[#001529]' : 'text-gray-400 hover:text-gray-600'}`}>
            {tab === 'atendimentos' ? 'Histórico de Atendimentos' : tab === 'clientes' ? 'Painel de Clientes' : 'NPS & Satisfação'}
          </button>
        ))}
      </div>

      {abaAtiva === 'atendimentos' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {[...atendimentos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(at => (
              <div key={at.id} className={`p-4 hover:bg-gray-50/50 transition-colors ${at.reclamacao ? 'bg-red-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{TIPO_ICONS[at.tipo] || '📋'}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{at.nomeCliente}</p>
                        {at.reclamacao && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">⚠️ Reclamação</span>}
                        {at.satisfacao && (
                          <span className={`text-[11px] font-black ${NPS_COLORS[at.satisfacao]}`}>
                            {'★'.repeat(at.satisfacao)}{'☆'.repeat(5 - at.satisfacao)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{at.tipo} • {at.assunto}</p>
                      {at.observacoes && <p className="text-[11px] text-gray-400 mt-1 italic">"{at.observacoes}"</p>}
                      <div className="flex gap-3 mt-1">
                        <p className="text-[10px] text-gray-400">👷 {at.responsavel}</p>
                        {at.duracao && <p className="text-[10px] text-gray-400">⏱ {at.duracao} min</p>}
                        {at.followUpNecessario && !at.dataFollowUp && <p className="text-[10px] text-orange-500 font-bold">🔔 Follow-up pendente</p>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-gray-600">{new Date(at.data).toLocaleDateString('pt-BR')}</p>
                    <p className="text-[10px] text-gray-400">há {Math.floor((hoje.getTime() - new Date(at.data).getTime()) / 86400000)} dias</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {abaAtiva === 'clientes' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Cliente', 'Responsável', 'Último Contato', 'Dias s/ Contato', 'Relacionamento', 'Satisfação', 'Indicações'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientesOrdenados.map(c => (
                  <tr key={c.id} className={`hover:bg-gray-50/50 transition-colors ${c.diasSemContato >= 30 ? 'bg-orange-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">{c.nome}</p>
                      <p className="text-[10px] text-gray-400">{c.profissao}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">{c.responsavel}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">
                      {c.dataUltimoContato ? new Date(c.dataUltimoContato).toLocaleDateString('pt-BR') : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${c.diasSemContato >= 60 ? 'bg-red-100 text-red-700' : c.diasSemContato >= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {c.diasSemContato}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${RELACIONAMENTO_COLORS[c.statusRelacionamento]}`}>
                        {c.statusRelacionamento}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.notaSatisfacao ? (
                        <span className={`text-sm font-black ${NPS_COLORS[c.notaSatisfacao]}`}>
                          {'★'.repeat(c.notaSatisfacao)}
                        </span>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.qtdIndicacoes > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                          🤝 {c.qtdIndicacoes}
                        </span>
                      ) : <span className="text-gray-300 text-[11px]">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abaAtiva === 'nps' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-6">Distribuição de Satisfação</h3>
            {[5, 4, 3, 2, 1].map(nota => {
              const total = atendimentos.filter(a => a.satisfacao != null).length;
              const qtd = npsDistribuicao[nota - 1];
              const pct = total > 0 ? (qtd / total * 100) : 0;
              return (
                <div key={nota} className="flex items-center gap-3 mb-3">
                  <span className={`w-8 text-sm font-black ${NPS_COLORS[nota]}`}>{'★'.repeat(nota)}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${nota >= 4 ? 'bg-emerald-500' : nota === 3 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-[11px] font-bold text-gray-600 text-right">{qtd}</span>
                  <span className="w-10 text-[10px] text-gray-400 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-600">NPS Médio</span>
              <span className={`text-3xl font-black ${kpis.npsMedia >= 4 ? 'text-emerald-600' : kpis.npsMedia >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>{kpis.npsMedia.toFixed(1)}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-6">Clientes Promotores (Indicações)</h3>
            {clientes.filter(c => c.qtdIndicacoes > 0).sort((a, b) => b.qtdIndicacoes - a.qtdIndicacoes).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-gray-800">{c.nome}</p>
                  <p className="text-[10px] text-gray-400">{c.profissao}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-purple-700">🤝 {c.qtdIndicacoes} indicação(ões)</span>
                  {c.notaSatisfacao && <span className={`text-xs font-black ${NPS_COLORS[c.notaSatisfacao]}`}>{'★'.repeat(c.notaSatisfacao)}</span>}
                </div>
              </div>
            ))}
            {clientes.filter(c => c.qtdIndicacoes > 0).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">Nenhum cliente com indicações registradas.</p>
            )}
            <div className="mt-4 p-3 bg-purple-50 rounded-xl">
              <p className="text-[11px] font-black text-purple-700">Total de Indicações: {kpis.indicacoes}</p>
              <p className="text-[11px] text-purple-600 mt-1">Indicações são o canal com menor custo e maior taxa de conversão. Invista no relacionamento com clientes satisfeitos.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
