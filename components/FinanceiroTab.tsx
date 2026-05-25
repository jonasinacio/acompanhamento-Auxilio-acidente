
import React, { useMemo, useState } from 'react';
import { Lancamento, Caso } from '../types';

interface FinanceiroTabProps {
  lancamentos: Lancamento[];
  casos: Caso[];
}

const STATUS_BADGE: Record<string, string> = {
  'Pago': 'bg-emerald-100 text-emerald-700',
  'Previsto': 'bg-blue-100 text-blue-700',
  'A Vencer': 'bg-yellow-100 text-yellow-700',
  'Vencido': 'bg-red-100 text-red-700',
  'Cancelado': 'bg-gray-100 text-gray-500',
};

const PROBABILIDADE_FASE: Record<string, number> = {
  'Triagem': 0.10, 'Análise Técnica': 0.20, 'Requerimento Administrativo': 0.25,
  'Aguardando Análise INSS': 0.25, 'Encaminhado para Judicial': 0.40,
  'Inicial em Elaboração': 0.35, 'Distribuído': 0.40, 'Contestação': 0.45,
  'Perícia Designada': 0.55, 'Perícia Realizada': 0.60, 'Aguardando Laudo': 0.60,
  'Manifestação sobre Laudo': 0.70, 'Sentença': 0.72, 'Recurso': 0.65,
  'Trânsito em Julgado': 1.00, 'Implantação': 1.00, 'RPV/Precatório': 1.00,
  'Honorários Cobrados': 1.00, 'Encerrado': 1.00,
};

export const FinanceiroTab: React.FC<FinanceiroTabProps> = ({ lancamentos, casos }) => {
  const [abaAtiva, setAbaAtiva] = useState<'visao' | 'lancamentos' | 'forecast'>('visao');
  const [filtroNatureza, setFiltroNatureza] = useState<string>('Todos');

  const kpis = useMemo(() => {
    const receitas = lancamentos.filter(l => l.natureza === 'Receita');
    const despesas = lancamentos.filter(l => l.natureza === 'Despesa');

    const honorariosContratados = receitas.filter(l => l.tipo.startsWith('Honorário')).reduce((a, l) => a + l.valor, 0);
    const honorariosRecebidos = receitas.filter(l => l.tipo.startsWith('Honorário') && l.status === 'Pago').reduce((a, l) => a + l.valor, 0);
    const honorariosAReceber = honorariosContratados - honorariosRecebidos;
    const rpvsRecebidas = receitas.filter(l => l.tipo === 'RPV' && l.status === 'Pago').reduce((a, l) => a + l.valor, 0);
    const receitaRealizada = receitas.filter(l => l.status === 'Pago').reduce((a, l) => a + l.valor, 0);
    const receitaPrevista = receitas.reduce((a, l) => a + l.valor, 0);
    const totalDespesas = despesas.filter(l => l.status === 'Pago').reduce((a, l) => a + l.valor, 0);
    const custosCaptacao = despesas.filter(l => l.tipo === 'Custo Captação' && l.status === 'Pago').reduce((a, l) => a + l.valor, 0);
    const clientes = new Set(receitas.filter(l => l.status === 'Pago').map(l => l.idCliente)).size;
    const custoAquisicao = clientes > 0 ? custosCaptacao / clientes : 0;

    // Receita futura ponderada por fase
    const receitaFuturaPonderada = casos
      .filter(c => c.status === 'Ativo')
      .reduce((acc, c) => {
        const fase = c.faseJudicial || c.faseAdministrativa || '';
        const prob = PROBABILIDADE_FASE[fase] || 0.3;
        const honorariosEstimados = c.valorPrevisto * 0.30;
        return acc + honorariosEstimados * prob;
      }, 0);

    const inadimplencia = honorariosAReceber > 0 ? honorariosAReceber : 0;

    return { honorariosContratados, honorariosRecebidos, honorariosAReceber, rpvsRecebidas, receitaRealizada, receitaPrevista, totalDespesas, custosCaptacao, custoAquisicao, receitaFuturaPonderada, inadimplencia };
  }, [lancamentos, casos]);

  const lancamentosFiltrados = useMemo(() =>
    lancamentos.filter(l => filtroNatureza === 'Todos' || l.natureza === filtroNatureza)
      .sort((a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()),
    [lancamentos, filtroNatureza]);

  const forecastPorFase = useMemo(() => {
    const fases: Record<string, { casos: number; valorEstimado: number; valorPonderado: number; prob: number }> = {};
    casos.filter(c => c.status === 'Ativo').forEach(c => {
      const fase = c.faseJudicial || c.faseAdministrativa || 'Não informado';
      if (!fases[fase]) fases[fase] = { casos: 0, valorEstimado: 0, valorPonderado: 0, prob: PROBABILIDADE_FASE[fase] || 0.3 };
      fases[fase].casos++;
      const hon = c.valorPrevisto * 0.30;
      fases[fase].valorEstimado += hon;
      fases[fase].valorPonderado += hon * (PROBABILIDADE_FASE[fase] || 0.3);
    });
    return Object.entries(fases).sort((a, b) => b[1].valorPonderado - a[1].valorPonderado);
  }, [casos]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Honorários Recebidos</p>
          <p className="text-2xl font-black mt-1 text-emerald-700">{fmt(kpis.honorariosRecebidos)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Receita realizada no período</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">A Receber (Previsto)</p>
          <p className="text-2xl font-black mt-1 text-blue-700">{fmt(kpis.honorariosAReceber)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Honorários contratados em aberto</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">RPVs Recebidas</p>
          <p className="text-2xl font-black mt-1 text-purple-700">{fmt(kpis.rpvsRecebidas)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Precatórios pagos</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Receita Futura Ponderada</p>
          <p className="text-2xl font-black mt-1 text-amber-700">{fmt(kpis.receitaFuturaPonderada)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Estimativa ajustada pelo risco</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Contratado</p>
          <p className="text-xl font-black mt-1 text-gray-800">{fmt(kpis.honorariosContratados)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Despesas (pagas)</p>
          <p className="text-xl font-black mt-1 text-red-600">{fmt(kpis.totalDespesas)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Custo de Captação</p>
          <p className="text-xl font-black mt-1 text-orange-600">{fmt(kpis.custosCaptacao)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">CAC (Custo por Cliente)</p>
          <p className="text-xl font-black mt-1 text-gray-800">{fmt(kpis.custoAquisicao)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['visao', 'lancamentos', 'forecast'] as const).map(tab => (
          <button key={tab} onClick={() => setAbaAtiva(tab)} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${abaAtiva === tab ? 'bg-white shadow-sm text-[#001529]' : 'text-gray-400 hover:text-gray-600'}`}>
            {tab === 'visao' ? 'Visão Geral' : tab === 'lancamentos' ? 'Lançamentos' : 'Forecast por Fase'}
          </button>
        ))}
      </div>

      {abaAtiva === 'visao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-5">Composição da Receita</h3>
            {[
              { label: 'Honorários Recebidos', valor: kpis.honorariosRecebidos, cor: 'bg-emerald-500', pct: kpis.receitaPrevista > 0 ? (kpis.honorariosRecebidos / kpis.receitaPrevista * 100) : 0 },
              { label: 'A Receber (em aberto)', valor: kpis.honorariosAReceber, cor: 'bg-blue-400', pct: kpis.receitaPrevista > 0 ? (kpis.honorariosAReceber / kpis.receitaPrevista * 100) : 0 },
              { label: 'RPVs Recebidas', valor: kpis.rpvsRecebidas, cor: 'bg-purple-500', pct: kpis.receitaPrevista > 0 ? (kpis.rpvsRecebidas / kpis.receitaPrevista * 100) : 0 },
            ].map(item => (
              <div key={item.label} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-700">{item.label}</span>
                  <span className="text-[11px] font-black text-gray-900">{fmt(item.valor)}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.cor} rounded-full transition-all`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.pct.toFixed(1)}% do total contratado</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mb-5">Resultado Financeiro</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Receita Realizada</span>
                <span className="text-sm font-black text-emerald-700">{fmt(kpis.receitaRealizada)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Total de Despesas</span>
                <span className="text-sm font-black text-red-600">- {fmt(kpis.totalDespesas)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gray-50 rounded-xl px-3 mt-2">
                <span className="text-sm font-black text-gray-800">Resultado Líquido</span>
                <span className={`text-lg font-black ${(kpis.receitaRealizada - kpis.totalDespesas) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {fmt(kpis.receitaRealizada - kpis.totalDespesas)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 mt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600 font-bold">Receita Futura Ponderada</span>
                <span className="text-sm font-black text-amber-700">{fmt(kpis.receitaFuturaPonderada)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'lancamentos' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529] mr-2">Lançamentos</h3>
            <select value={filtroNatureza} onChange={e => setFiltroNatureza(e.target.value)} className="bg-gray-50 border border-gray-200 text-[11px] font-bold rounded-xl px-3 py-2 outline-none">
              <option value="Todos">Todos</option>
              <option value="Receita">Receitas</option>
              <option value="Despesa">Despesas</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Cliente', 'Descrição', 'Tipo', 'Valor', 'Vencimento', 'Pagamento', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lancamentosFiltrados.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{l.nomeCliente}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">{l.descricao}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.natureza === 'Receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-black ${l.natureza === 'Receita' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {l.natureza === 'Despesa' ? '- ' : '+ '}{fmt(l.valor)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">{new Date(l.dataVencimento).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">{l.dataPagamento ? new Date(l.dataPagamento).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${STATUS_BADGE[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abaAtiva === 'forecast' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#001529]">Receita Futura Estimada por Fase Processual</h3>
            <p className="text-[11px] text-gray-400 mt-1">Fórmula: Honorários Estimados × Probabilidade de Êxito da Fase</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Fase Processual', 'Casos', 'Prob. Êxito', 'Honorários Estimados', 'Receita Ponderada'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {forecastPorFase.map(([fase, dados]) => (
                  <tr key={fase} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{fase}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{dados.casos}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${dados.prob >= 0.7 ? 'bg-emerald-100 text-emerald-700' : dados.prob >= 0.4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {(dados.prob * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{fmt(dados.valorEstimado)}</td>
                    <td className="px-4 py-3 text-sm font-black text-amber-700">{fmt(dados.valorPonderado)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-4 py-3 text-[11px] font-black uppercase text-gray-500">Total Ponderado</td>
                  <td className="px-4 py-3 text-sm font-black text-gray-800">{fmt(forecastPorFase.reduce((a, [, d]) => a + d.valorEstimado, 0))}</td>
                  <td className="px-4 py-3 text-lg font-black text-amber-700">{fmt(kpis.receitaFuturaPonderada)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-[11px] font-black text-amber-800 mb-1">Como interpretar o Forecast</p>
            <p className="text-[11px] text-amber-700">A receita ponderada representa a expectativa financeira ajustada pela probabilidade de êxito em cada fase. Casos em fases mais avançadas (laudo favorável, sentença) têm maior peso. Use este número no planejamento financeiro como cenário realista.</p>
          </div>
        </div>
      )}
    </div>
  );
};
