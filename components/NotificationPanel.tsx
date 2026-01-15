
import React from 'react';
import { Processo } from '../types';

interface NotificationPanelProps {
  processos: Processo[];
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ processos }) => {
  const now = new Date();
  
  // Perícias agendadas (Futuro)
  const proximas = processos
    .filter(p => p.dataPericia && !p.periciaRealizada)
    .map(p => ({
      ...p,
      daysDiff: Math.ceil((new Date(p.dataPericia!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))
    .filter(p => p.daysDiff >= 0 && p.daysDiff <= 10)
    .sort((a, b) => a.daysDiff - b.daysDiff);

  // Perícias que já passaram mas ainda constam como "Não Realizada" no sistema
  const atrasadasOuSemLaudo = processos
    .filter(p => p.dataPericia && !p.periciaRealizada && new Date(p.dataPericia!) < now);

  // Perícias realizadas recentemente (últimos 5 dias) - Conferência de Laudo
  const realizadas = processos
    .filter(p => p.periciaRealizada && p.dataPericia)
    .map(p => ({
      ...p,
      daysSince: Math.floor((now.getTime() - new Date(p.dataPericia!).getTime()) / (1000 * 60 * 60 * 24))
    }))
    .filter(p => p.daysSince >= 0 && p.daysSince <= 5);

  if (!proximas.length && !atrasadasOuSemLaudo.length && !realizadas.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Alerta de Perícias Futuras */}
      {(proximas.length > 0 || atrasadasOuSemLaudo.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              Agenda de Perícias (Próx. Dias)
            </h3>
          </div>
          <div className="divide-y divide-amber-50 max-h-60 overflow-y-auto">
            {atrasadasOuSemLaudo.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between bg-red-50/50">
                <div>
                  <p className="text-sm font-bold text-red-700">{p.cliente}</p>
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Vencida em {new Date(p.dataPericia!).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded uppercase">Urgente</span>
              </div>
            ))}
            {proximas.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-amber-50/20 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.cliente}</p>
                  <p className="text-[10px] text-amber-600 font-bold uppercase">{p.tipoSequela}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-amber-700">{p.daysDiff === 0 ? 'HOJE' : `Em ${p.daysDiff} dias`}</p>
                  <p className="text-[10px] text-gray-400">{new Date(p.dataPericia!).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de Laudos / Conferência */}
      {realizadas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Perícias Concluídas (Conferir Laudo)</h3>
          </div>
          <div className="divide-y divide-emerald-50 max-h-60 overflow-y-auto">
            {realizadas.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-emerald-50/20 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.cliente}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Realizada há {p.daysSince} {p.daysSince === 1 ? 'dia' : 'dias'}</p>
                </div>
                <button className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 underline uppercase">Checar Laudo</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
