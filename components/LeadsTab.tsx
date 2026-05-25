
import React, { useMemo, useState } from 'react';
import { Lead, CanalMarketing } from '../types';
import { STATUS_COLORS, MOCK_CANAIS } from '../constants';

interface LeadsTabProps {
  leads: Lead[];
  onAddLead?: (lead: Lead) => void;
}

const LEAD_FUNNEL_ORDER = ['Novo', 'Contatado', 'Triagem', 'Documentação', 'Análise', 'Convertido', 'Perdido'];

const CANAL_ICONS: Record<string, string> = {
  'Google Ads': '🔍',
  'Facebook/Instagram': '📱',
  'Indicação': '🤝',
  'Orgânico/SEO': '🌐',
  'WhatsApp': '💬',
  'Parceiro': '🤝',
  'Outro': '📋',
};

export const LeadsTab: React.FC<LeadsTabProps> = ({ leads }) => {
  const [filtroCanal, setFiltroCanal] = useState<string>('Todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [abaAtiva, setAbaAtiva] = useState<'funil' | 'lista' | 'canais'>('funil');

  const kpis = useMemo(() => {
    const total = leads.length;
    const convertidos = leads.filter(l => l.status === 'Convertido').length;
    const perdidos = leads.filter(l => l.status === 'Perdido').length;
    const ativos = leads.filter(l => !['Convertido', 'Perdido'].includes(l.status)).length;
    const taxaConversao = total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0';
    const semContato = leads.filter(l => !l.dataContatoInicial && l.status === 'Novo').length;
    const temposMedio = leads.filter(l => l.tempoAteContatoHoras != null && l.tempoAteContatoHoras > 0).map(l => l.tempoAteContatoHoras!);
    const tempoMedioContato = temposMedio.length > 0 ? (temposMedio.reduce((a, b) => a + b, 0) / temposMedio.length).toFixed(1) : 'N/A';
    return { total, convertidos, perdidos, ativos, taxaConversao, semContato, tempoMedioContato };
  }, [leads]);

  const porStatus = useMemo(() => {
    return LEAD_FUNNEL_ORDER.map(status => ({
      status,
      count: leads.filter(l => l.status === status).length,
      leads: leads.filter(l => l.status === status),
    }));
  }, [leads]);

  const leadsFiltrados = useMemo(() => {
    return leads.filter(l => {
      if (filtroCanal !== 'Todos' && l.canal !== filtroCanal) return false;
      if (filtroStatus !== 'Todos' && l.status !== filtroStatus) return false;
      return true;
    });
  }, [leads, filtroCanal, filtroStatus]);

  const motivosPerdaAgrupados = useMemo(() => {
    const motivos: Record<string, number> = {};
    leads.filter(l => l.status === 'Perdido' && l.motivoPerda).forEach(l => {
      motivos[l.motivoPerda!] = (motivos[l.motivoPerda!] || 0) + 1;
    });
    return Object.entries(motivos).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const statusColor = (s: string) => STATUS_COLORS[s] || '#94a3b8';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total de Leads', value: kpis.total, color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
          { label: 'Em Andamento', value: kpis.ativos, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          { label: 'Convertidos', value: kpis.convertidos, color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
          { label: 'Perdidos', value: kpis.perdidos, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'Taxa Conversão', value: `${kpis.taxaConversao}%`, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
          { label: 'Sem 1º Contato', value: kpis.semContato, color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
          { label: 'Tempo Médio (h)', value: `${kpis.tempoMedioContato}h`, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.color} border rounded-2xl p-4`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-black mt-1 ${kpi.text}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['funil', 'lista', 'canais'] as const).map(tab => (
          <button key={tab} onClick={() => setAbaAtiva(tab)} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${abaAtiva === tab ? 'bg-white shadow-sm text-[#001529]' : 'text-gray-400 hover:text-gray-600'}`}>
            {tab === 'funil' ? 'Funil de Vendas' : tab === 'lista' ? 'Lista de Leads' : 'Performance por Canal'}
          </button>
        ))}
      </div>

      {/* Funil */}
      {abaAtiva === 'funil' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-6">Funil Comercial — Leads por Etapa</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {porStatus.map(({ status, count, leads: ls }) => (
              <div key={status} className="text-center">
                <div className="rounded-2xl p-4 border-2 mb-2" style={{ borderColor: statusColor(status), background: statusColor(status) + '18' }}>
                  <p className="text-3xl font-black" style={{ color: statusColor(status) }}>{count}</p>
                  <p className="text-[10px] font-black uppercase tracking-wide mt-1" style={{ color: statusColor(status) }}>{status}</p>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {ls.slice(0, 3).map(l => (
                    <div key={l.id} className="text-[10px] text-gray-500 bg-gray-50 rounded px-2 py-1 truncate text-left">
                      {l.nome.split(' ').slice(0, 2).join(' ')}
                    </div>
                  ))}
                  {ls.length > 3 && <p className="text-[9px] text-gray-400">+{ls.length - 3} mais</p>}
                </div>
              </div>
            ))}
          </div>

          {motivosPerdaAgrupados.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">Principais Motivos de Perda</p>
              <div className="flex flex-wrap gap-2">
                {motivosPerdaAgrupados.map(([motivo, qtd]) => (
                  <span key={motivo} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-bold text-red-700">
                    {motivo} <span className="font-black">({qtd})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {abaAtiva === 'lista' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
              <option value="Todos">Todos os canais</option>
              {['Google Ads','Facebook/Instagram','Indicação','Orgânico/SEO','WhatsApp','Parceiro','Outro'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
              <option value="Todos">Todos os status</option>
              {LEAD_FUNNEL_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-[11px] text-gray-400 font-bold ml-auto">{leadsFiltrados.length} lead(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Nome', 'Canal', 'Data Entrada', 'Tempo 1º Contato', 'Status', 'CAT', 'AD Anterior', 'Responsável'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leadsFiltrados.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">{lead.nome}</p>
                      <p className="text-[10px] text-gray-400">{lead.telefone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600">
                        {CANAL_ICONS[lead.canal] || '📋'} {lead.canal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">{new Date(lead.dataEntrada).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      {lead.tempoAteContatoHoras != null && lead.tempoAteContatoHoras > 0 ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${lead.tempoAteContatoHoras > 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {lead.tempoAteContatoHoras}h
                        </span>
                      ) : lead.status === 'Novo' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 animate-pulse">Pendente</span>
                      ) : <span className="text-[11px] text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: statusColor(lead.status) + '25', color: statusColor(lead.status) }}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{lead.possuiCAT ? <span className="text-emerald-600 font-black text-xs">✓</span> : <span className="text-gray-300 text-xs">✗</span>}</td>
                    <td className="px-4 py-3 text-center">{lead.possuiAuxilioDoencaAnterior ? <span className="text-emerald-600 font-black text-xs">✓</span> : <span className="text-gray-300 text-xs">✗</span>}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-600 font-medium">{lead.responsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Canais */}
      {abaAtiva === 'canais' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-6">Performance de Captação por Canal — Mês Atual</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Canal', 'Investimento', 'Leads', 'Conversões', 'Taxa Conv.', 'CPL', 'CPA', 'Avaliação'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_CANAIS.map(canal => (
                  <tr key={canal.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-sm text-gray-800">{CANAL_ICONS[canal.nome] || '📋'} {canal.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">R$ {canal.custoMes.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{canal.leadsGerados}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-700">{canal.conversoes}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${canal.taxaConversao >= 30 ? 'bg-emerald-100 text-emerald-700' : canal.taxaConversao >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {canal.taxaConversao.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{canal.custoPorlead > 0 ? `R$ ${canal.custoPorlead.toFixed(0)}` : 'Gratuito'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{canal.custoPorConversao > 0 ? `R$ ${canal.custoPorConversao.toFixed(0)}` : 'Gratuito'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-black ${canal.taxaConversao >= 30 ? 'text-emerald-600' : canal.taxaConversao >= 15 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {canal.taxaConversao >= 30 ? '⭐ Excelente' : canal.taxaConversao >= 15 ? '🟡 Regular' : '⚠️ Baixo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-[11px] font-black uppercase text-gray-500">Total</td>
                  <td className="px-4 py-3 text-sm font-black text-gray-800">R$ {MOCK_CANAIS.reduce((a, c) => a + c.custoMes, 0).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-sm font-black text-gray-800">{MOCK_CANAIS.reduce((a, c) => a + c.leadsGerados, 0)}</td>
                  <td className="px-4 py-3 text-sm font-black text-emerald-700">{MOCK_CANAIS.reduce((a, c) => a + c.conversoes, 0)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
