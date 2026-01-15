
import React, { useState } from 'react';
import { Processo } from '../types';
import { STATUS_COLORS } from '../constants';

interface ProcessTableProps {
  processos: Processo[];
}

export const ProcessTable: React.FC<ProcessTableProps> = ({ processos }) => {
  const [filter, setFilter] = useState('');
  const [dateFilterPericia, setDateFilterPericia] = useState('');
  const [dateFilterMovimentacao, setDateFilterMovimentacao] = useState('');

  const filtered = processos.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(filter.toLowerCase()) || 
      p.numero.includes(filter) ||
      p.tipoSequela.toLowerCase().includes(filter.toLowerCase());
    
    const matchesDatePericia = !dateFilterPericia || p.dataPericia === dateFilterPericia;
    const matchesDateMov = !dateFilterMovimentacao || p.ultimaMovimentacao === dateFilterMovimentacao;

    return matchesSearch && matchesDatePericia && matchesDateMov;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0a192f] rounded-xl flex items-center justify-center shadow-lg">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Gestão de Carteira</h2>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">
                  {filtered.length} {filtered.length === 1 ? 'Processo' : 'Processos'}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Filtros dinâmicos de auditoria processual.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Busca Geral</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cliente ou Nº..."
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0a192f] focus:outline-none w-full shadow-sm bg-white pr-10"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data da Perícia</label>
              <input 
                type="date" 
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0a192f] focus:outline-none w-full shadow-sm bg-white"
                value={dateFilterPericia}
                onChange={(e) => setDateFilterPericia(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Última Movimentação</label>
              <input 
                type="date" 
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#0a192f] focus:outline-none w-full shadow-sm bg-white"
                value={dateFilterMovimentacao}
                onChange={(e) => setDateFilterMovimentacao(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[1100px]">
          <thead className="bg-white border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações do Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Atual</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agenda Perícia</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Movimentação</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Julgamento</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-gray-400 text-sm font-medium italic">Nenhum processo encontrado para os filtros selecionados.</p>
                    {(filter || dateFilterPericia || dateFilterMovimentacao) && (
                      <button 
                        onClick={() => {setFilter(''); setDateFilterPericia(''); setDateFilterMovimentacao('');}}
                        className="text-indigo-600 text-xs font-bold uppercase mt-2 hover:underline"
                      >
                        Limpar todos os filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#f8fafc] transition-all group">
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-[#0a192f] transition-colors">{p.cliente}</div>
                    <div className="text-[10px] text-indigo-600 font-black mt-1 uppercase bg-indigo-50 inline-block px-1.5 rounded">{p.numero}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span 
                      className="px-3 py-1 text-[10px] font-black uppercase rounded-lg text-white shadow-sm inline-block"
                      style={{ backgroundColor: STATUS_COLORS[p.status] }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <svg className={`w-3.5 h-3.5 ${p.dataPericia ? 'text-indigo-400' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       <span className="text-xs font-bold text-gray-600">{p.dataPericia ? formatDate(p.dataPericia) : 'Pendente'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-medium text-gray-500 italic">{formatDate(p.ultimaMovimentacao)}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${
                      p.resultadoJulgamento === 'Favorável' ? 'text-emerald-600' : 
                      p.resultadoJulgamento === 'Improcedente' ? 'text-red-600' : 'text-amber-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        p.resultadoJulgamento === 'Favorável' ? 'bg-emerald-600' : 
                        p.resultadoJulgamento === 'Improcedente' ? 'bg-red-600' : 'bg-amber-500'
                      }`}></div>
                      {p.resultadoJulgamento}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                     <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver Detalhes">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                     </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Exibindo {filtered.length} de {processos.length} processos na base</span>
         <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded text-[10px] font-bold text-gray-500 hover:bg-white transition-colors">Anterior</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-[10px] font-bold text-gray-500 hover:bg-white transition-colors">Próximo</button>
         </div>
      </div>
    </div>
  );
};
