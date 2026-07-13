
import React, { useState, useMemo } from 'react';
import { Intimacao, Processo, TipoAto, StatusLeitura, FonteCaptura } from '../types';
import { TIPOS_ATO, TIPO_ATO_COLORS, PRAZO_REGRAS } from '../constants';
import { calcularPrazoFinal, diasUteisRestantes } from '../utils/prazo';
import { classifyIntimacao } from '../services/geminiService';
import { capturarLegalMailDaFonte, resolverLegalMailSource } from '../services/legalMailService';

interface IntimacoesTabProps {
  intimacoes: Intimacao[];
  processos: Processo[];
  onUpdate: (updated: Intimacao) => void;
  onAdd: (novas: Intimacao[]) => void;
}

type CardFiltro = 'naoLidas' | 'prazo3' | 'atrasadas' | 'periciasAudiencias' | 'revisao' | null;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

const PERICIA_AUDIENCIA: TipoAto[] = ['Designação de Perícia', 'Intimação de Audiência'];

const FONTE_COLORS: Record<FonteCaptura, string> = {
  'DJEN': '#4f46e5',
  'LegalMail': '#0d9488',
};

export const IntimacoesTab: React.FC<IntimacoesTabProps> = ({ intimacoes, processos, onUpdate, onAdd }) => {
  const [busca, setBusca] = useState('');
  const [fTribunal, setFTribunal] = useState('todos');
  const [fTipo, setFTipo] = useState<'todos' | TipoAto>('todos');
  const [fStatus, setFStatus] = useState<'todos' | StatusLeitura>('todos');
  const [fPrazo, setFPrazo] = useState<'todos' | 'com' | 'sem'>('todos');
  const [fFonte, setFFonte] = useState<'todos' | FonteCaptura>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [card, setCard] = useState<CardFiltro>(null);
  const [selecionada, setSelecionada] = useState<Intimacao | null>(null);
  const [reclassificandoId, setReclassificandoId] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const tribunais = useMemo(
    () => Array.from(new Set(intimacoes.map(i => i.tribunal))).sort(),
    [intimacoes],
  );

  // --- Métricas dos cartões-resumo ---
  const metrics = useMemo(() => {
    let naoLidas = 0, prazo3 = 0, atrasadas = 0, periciasAudiencias = 0, revisao = 0;
    for (const i of intimacoes) {
      const dias = diasUteisRestantes(i.dataPrazoFinal);
      if (i.statusLeitura === 'Não Lida') naoLidas++;
      if (dias !== null && dias >= 0 && dias <= 3) prazo3++;
      if (dias !== null && dias < 0 && i.statusLeitura !== 'Arquivada') atrasadas++;
      if (PERICIA_AUDIENCIA.includes(i.tipoAto) && i.statusLeitura !== 'Arquivada') periciasAudiencias++;
      if (i.revisaoManual) revisao++;
    }
    return { naoLidas, prazo3, atrasadas, periciasAudiencias, revisao };
  }, [intimacoes]);

  // --- Aplicação dos filtros + cartão ativo ---
  const filtradas = useMemo(() => {
    return intimacoes.filter(i => {
      const dias = diasUteisRestantes(i.dataPrazoFinal);

      if (card === 'naoLidas' && i.statusLeitura !== 'Não Lida') return false;
      if (card === 'prazo3' && !(dias !== null && dias >= 0 && dias <= 3)) return false;
      if (card === 'atrasadas' && !(dias !== null && dias < 0 && i.statusLeitura !== 'Arquivada')) return false;
      if (card === 'periciasAudiencias' && !(PERICIA_AUDIENCIA.includes(i.tipoAto) && i.statusLeitura !== 'Arquivada')) return false;
      if (card === 'revisao' && !i.revisaoManual) return false;

      if (fTribunal !== 'todos' && i.tribunal !== fTribunal) return false;
      if (fFonte !== 'todos' && i.fonte !== fFonte) return false;
      if (fTipo !== 'todos' && i.tipoAto !== fTipo) return false;
      if (fStatus !== 'todos' && i.statusLeitura !== fStatus) return false;
      if (fPrazo === 'com' && !i.dataPrazoFinal) return false;
      if (fPrazo === 'sem' && i.dataPrazoFinal) return false;
      if (dataInicio && i.dataDisponibilizacao < dataInicio) return false;
      if (dataFim && i.dataDisponibilizacao > dataFim) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const alvo = `${i.segurado} ${i.numeroProcesso} ${i.teorResumido}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.dataDisponibilizacao.localeCompare(a.dataDisponibilizacao));
  }, [intimacoes, card, fTribunal, fFonte, fTipo, fStatus, fPrazo, dataInicio, dataFim, busca]);

  const sincronizarLegalMail = async () => {
    setSincronizando(true);
    try {
      const source = resolverLegalMailSource(); // API real se configurada, senão simulada
      const novas = await capturarLegalMailDaFonte(source, intimacoes, processos);
      if (novas.length > 0) {
        onAdd(novas);
        alert(`${novas.length} nova(s) intimação(ões) capturada(s) via ${source.nome}.`);
      } else {
        alert(`Nenhuma intimação nova (${source.nome} já sincronizado).`);
      }
    } catch (e: any) {
      alert(`Falha ao sincronizar o LegalMail: ${e?.message ?? 'erro desconhecido'}.`);
    } finally {
      setSincronizando(false);
    }
  };

  const toggleLeitura = (i: Intimacao) => {
    onUpdate({ ...i, statusLeitura: i.statusLeitura === 'Lida' ? 'Não Lida' : 'Lida' });
  };

  const arquivar = (i: Intimacao) => {
    onUpdate({ ...i, statusLeitura: 'Arquivada' });
    setSelecionada(null);
  };

  const reclassificar = async (i: Intimacao) => {
    setReclassificandoId(i.id);
    const resultado = await classifyIntimacao(i.teorIntegral);
    if (resultado) {
      const prazoDias = PRAZO_REGRAS[resultado.tipoAto].prazoDias;
      onUpdate({
        ...i,
        tipoAto: resultado.tipoAto,
        teorResumido: resultado.teorResumido,
        confianca: resultado.confianca,
        prazoDias,
        dataPrazoFinal: calcularPrazoFinal(i.dataDisponibilizacao, prazoDias),
        revisaoManual: resultado.confianca === 'Baixa',
      });
    } else {
      alert('Não foi possível reclassificar (IA indisponível). Item mantido em revisão manual.');
    }
    setReclassificandoId(null);
  };

  const cards: { key: Exclude<CardFiltro, null>; label: string; value: number; color: string; ring: string }[] = [
    { key: 'naoLidas', label: 'Não Lidas', value: metrics.naoLidas, color: 'text-slate-700', ring: 'ring-slate-300' },
    { key: 'prazo3', label: 'Prazo ≤ 3 dias úteis', value: metrics.prazo3, color: 'text-amber-600', ring: 'ring-amber-300' },
    { key: 'atrasadas', label: 'Atrasadas', value: metrics.atrasadas, color: 'text-red-600', ring: 'ring-red-300' },
    { key: 'periciasAudiencias', label: 'Perícias / Audiências', value: metrics.periciasAudiencias, color: 'text-sky-600', ring: 'ring-sky-300' },
    { key: 'revisao', label: 'Revisão Manual (IA)', value: metrics.revisao, color: 'text-fuchsia-600', ring: 'ring-fuchsia-300' },
  ];

  const nomeProcessoVinculado = (id: string | null) =>
    id ? processos.find(p => p.id === id)?.cliente ?? null : null;

  const prazoBadge = (i: Intimacao) => {
    if (!i.dataPrazoFinal) {
      return <span className="text-[10px] font-bold text-gray-400 uppercase">Informativo</span>;
    }
    const dias = diasUteisRestantes(i.dataPrazoFinal);
    const atrasado = dias !== null && dias < 0;
    const urgente = dias !== null && dias >= 0 && dias <= 3;
    const cor = atrasado ? 'bg-red-600' : urgente ? 'bg-amber-500' : 'bg-emerald-600';
    const texto = atrasado
      ? `Vencido há ${Math.abs(dias!)} d.ú.`
      : dias === 0 ? 'Vence hoje' : `${dias} d.ú.`;
    return (
      <div className="flex flex-col gap-0.5">
        <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded uppercase inline-block w-fit ${cor}`}>{texto}</span>
        <span className="text-[10px] text-gray-400 font-medium">{formatDate(i.dataPrazoFinal)}</span>
      </div>
    );
  };

  const confiancaBadge = (i: Intimacao) => {
    const map = {
      'Alta': 'text-emerald-600 bg-emerald-50',
      'Média': 'text-amber-600 bg-amber-50',
      'Baixa': 'text-red-600 bg-red-50',
    } as const;
    return <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${map[i.confianca]}`}>{i.confianca}</span>;
  };

  const now = new Date();
  const capturadas24hPorFonte = (fonte: FonteCaptura) => intimacoes.filter(i => {
    if (i.fonte !== fonte) return false;
    const d = new Date(i.dataDisponibilizacao + 'T12:00:00');
    return (now.getTime() - d.getTime()) <= 1000 * 60 * 60 * 24 * 1.5;
  }).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho + Saúde da captura */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0a192f] rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Intimações Judiciais</h2>
              <p className="text-sm text-gray-500 font-medium">Captação DJEN/CNJ + LegalMail · classificação por IA · rito previdenciário (JEF / Vara Federal)</p>
            </div>
          </div>

          <button
            onClick={sincronizarLegalMail}
            disabled={sincronizando}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center gap-2 shadow-lg shadow-teal-100 disabled:opacity-50 self-start"
          >
            {sincronizando ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            )}
            {sincronizando ? 'Sincronizando...' : 'Sincronizar LegalMail'}
          </button>
        </div>

        {/* Painel de Saúde da Captura (dois canais) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
          <div className="px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Canal DJEN/CNJ</p>
            <p className="text-sm font-bold text-indigo-800">Hoje, {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-[10px] text-indigo-500 font-medium">{capturadas24hPorFonte('DJEN')} capturada(s) em 24h</p>
          </div>
          <div className="px-4 py-3 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Canal LegalMail</p>
            <p className="text-sm font-bold text-teal-800">Hoje, {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-[10px] text-teal-500 font-medium">{capturadas24hPorFonte('LegalMail')} capturada(s) em 24h</p>
          </div>
          <div className="px-4 py-3 bg-fuchsia-50 rounded-xl border border-fuchsia-100">
            <p className="text-[9px] font-black text-fuchsia-700 uppercase tracking-widest">Fila IA (Revisão)</p>
            <p className="text-lg font-black text-fuchsia-800">{metrics.revisao}</p>
          </div>
          <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Falhas Recentes</p>
            <p className="text-lg font-black text-gray-700">0</p>
          </div>
        </div>
      </div>

      {/* Cartões-resumo (triagem) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <button
            key={c.key}
            onClick={() => setCard(card === c.key ? null : c.key)}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left transition-all hover:shadow-md ${card === c.key ? `ring-2 ${c.ring}` : ''}`}
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{c.label}</p>
            <h3 className={`text-3xl font-black mt-2 ${c.color}`}>{c.value}</h3>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Busca (segurado / processo)</label>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite para buscar..." className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fonte</label>
            <select value={fFonte} onChange={e => setFFonte(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="todos">Todas</option>
              <option value="DJEN">DJEN/CNJ</option>
              <option value="LegalMail">LegalMail</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tribunal / Vara</label>
            <select value={fTribunal} onChange={e => setFTribunal(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="todos">Todos</option>
              {tribunais.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Ato</label>
            <select value={fTipo} onChange={e => setFTipo(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="todos">Todos</option>
              {TIPOS_ATO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Leitura</label>
            <select value={fStatus} onChange={e => setFStatus(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="todos">Todos</option>
              <option value="Não Lida">Não Lida</option>
              <option value="Lida">Lida</option>
              <option value="Arquivada">Arquivada</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Prazo</label>
            <select value={fPrazo} onChange={e => setFPrazo(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="todos">Todos</option>
              <option value="com">Com prazo</option>
              <option value="sem">Sem prazo</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Disp. de</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Disp. até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          {(card || busca || fTribunal !== 'todos' || fFonte !== 'todos' || fTipo !== 'todos' || fStatus !== 'todos' || fPrazo !== 'todos' || dataInicio || dataFim) && (
            <button
              onClick={() => { setCard(null); setBusca(''); setFTribunal('todos'); setFFonte('todos'); setFTipo('todos'); setFStatus('todos'); setFPrazo('todos'); setDataInicio(''); setDataFim(''); }}
              className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
            >Limpar</button>
          )}
        </div>
      </div>

      {/* Tabela de triagem */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{filtradas.length} intimação(ões)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1150px]">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                {['Disponib.', 'Processo / Segurado', 'Teor Resumido', 'Tipo do Ato', 'Prazo', 'IA', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map(i => {
                const vinculo = nomeProcessoVinculado(i.processoVinculadoId);
                return (
                  <tr key={i.id} className={`hover:bg-[#f8fafc] transition-all ${i.statusLeitura === 'Não Lida' ? 'bg-indigo-50/20' : ''}`}>
                    <td className="px-5 py-4 text-xs font-bold text-gray-600 whitespace-nowrap">{formatDate(i.dataDisponibilizacao)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: FONTE_COLORS[i.fonte] }}>{i.fonte}</span>
                        <div className="text-sm font-bold text-gray-900">{i.segurado}</div>
                      </div>
                      <div className="text-[10px] text-indigo-600 font-black mt-0.5">{i.numeroProcesso}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{i.tribunal} · {i.orgao}</div>
                      {i.processoVinculadoId
                        ? <span className="text-[9px] text-emerald-600 font-black uppercase">✓ Vinculado{vinculo && vinculo !== i.segurado ? ` · ${vinculo}` : ''}</span>
                        : <span className="text-[9px] text-red-500 font-black uppercase">⚠ Sem vínculo</span>}
                    </td>
                    <td className="px-5 py-4 max-w-[280px]">
                      <p className="text-xs text-gray-600 line-clamp-2">{i.teorResumido}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-black text-white px-2 py-1 rounded uppercase inline-block" style={{ backgroundColor: TIPO_ATO_COLORS[i.tipoAto] }}>{i.tipoAto}</span>
                    </td>
                    <td className="px-5 py-4">{prazoBadge(i)}</td>
                    <td className="px-5 py-4">{confiancaBadge(i)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-black uppercase ${i.statusLeitura === 'Não Lida' ? 'text-indigo-600' : i.statusLeitura === 'Arquivada' ? 'text-gray-400' : 'text-gray-500'}`}>{i.statusLeitura}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelecionada(i)} title="Ver teor integral" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => toggleLeitura(i)} title="Marcar lida/não lida" className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button onClick={() => reclassificar(i)} disabled={reclassificandoId === i.id} title="Reclassificar com IA" className="p-1.5 text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors disabled:opacity-40">
                          {reclassificandoId === i.id ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400 font-medium">Nenhuma intimação corresponde aos filtros selecionados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de teor integral */}
      {selecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelecionada(null)}>
          <div className="bg-white rounded-[28px] w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-[10px] font-black text-white px-2 py-1 rounded uppercase" style={{ backgroundColor: TIPO_ATO_COLORS[selecionada.tipoAto] }}>{selecionada.tipoAto}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-3">{selecionada.segurado}</h3>
                <p className="text-xs text-indigo-600 font-black">{selecionada.numeroProcesso}</p>
                <p className="text-[10px] text-gray-400 font-medium">{selecionada.tribunal} · {selecionada.orgao}</p>
              </div>
              <button onClick={() => setSelecionada(null)} className="p-2 text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Disponibilização</p>
                <p className="text-sm font-bold text-gray-800">{formatDate(selecionada.dataDisponibilizacao)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Prazo Final</p>
                <p className="text-sm font-bold text-gray-800">{formatDate(selecionada.dataPrazoFinal)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Confiança IA</p>
                <p className="text-sm font-bold text-gray-800">{selecionada.confianca}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Regra de prazo aplicada</p>
              <p className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-xl p-3">{PRAZO_REGRAS[selecionada.tipoAto].descricao}</p>
            </div>

            <div className="mb-6">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Teor integral (DJEN)</p>
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-4 max-h-56 overflow-y-auto whitespace-pre-wrap">{selecionada.teorIntegral}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { toggleLeitura(selecionada); setSelecionada({ ...selecionada, statusLeitura: selecionada.statusLeitura === 'Lida' ? 'Não Lida' : 'Lida' }); }} className="flex-1 py-3 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 uppercase tracking-widest transition-all">
                {selecionada.statusLeitura === 'Lida' ? 'Marcar Não Lida' : 'Marcar Lida'}
              </button>
              <button onClick={() => reclassificar(selecionada)} disabled={reclassificandoId === selecionada.id} className="flex-1 py-3 bg-fuchsia-600 text-white text-[10px] font-black rounded-xl hover:bg-fuchsia-700 uppercase tracking-widest transition-all disabled:opacity-50">
                {reclassificandoId === selecionada.id ? 'Classificando...' : 'Reclassificar com IA'}
              </button>
              <button onClick={() => arquivar(selecionada)} className="flex-1 py-3 bg-gray-100 text-gray-500 text-[10px] font-black rounded-xl hover:bg-gray-200 uppercase tracking-widest transition-all">Arquivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
