
import React, { useState, useRef } from 'react';
import { Processo, ProcessStatus, ResultadoJulgamento } from '../types';

interface SpreadsheetTabProps {
  processos: Processo[];
  onUpdate: (updated: Processo) => void;
  onAdd: (newProcesso: Processo) => void;
}

export const SpreadsheetTab: React.FC<SpreadsheetTabProps> = ({ processos, onUpdate, onAdd }) => {
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    cliente: '',
    numero: '',
    dataPericia: '',
    tipoSequela: '',
    valorPrevisto: 0
  });

  const handleCellChange = (id: string, field: keyof Processo, value: any) => {
    const process = processos.find(p => p.id === id);
    if (process) {
      let finalValue = value;
      if (field === 'valorPrevisto' || field === 'valorRPV') {
        finalValue = parseFloat(value) || 0;
      }
      if (field === 'periciaRealizada') {
        finalValue = value === 'true';
      }
      onUpdate({ ...process, [field]: finalValue });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProcess: Processo = {
      id: Math.random().toString(36).substr(2, 9),
      cliente: formData.cliente,
      numero: formData.numero || 'N/A',
      dataInicio: new Date().toISOString().split('T')[0],
      ultimaMovimentacao: new Date().toISOString().split('T')[0],
      status: 'Perícia',
      valorCausa: formData.valorPrevisto * 1.2,
      probabilidade: 'Média',
      tipoSequela: formData.tipoSequela,
      valorPrevisto: formData.valorPrevisto,
      dataPrevista: new Date(new Date(formData.dataPericia).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dataPericia: formData.dataPericia,
      periciaRealizada: false,
      resultadoJulgamento: 'Pendente' as ResultadoJulgamento
    };

    onAdd(newProcess);
    setShowForm(false);
    setFormData({ cliente: '', numero: '', dataPericia: '', tipoSequela: '', valorPrevisto: 0 });
    alert(`Perícia agendada para ${formData.cliente}. Alerta enviado ao cliente com sucesso!`);
  };

  // Funcionalidade de Exportação
  const exportToCSV = () => {
    const headers = ['ID', 'Cliente', 'Numero', 'Data Inicio', 'Status', 'Tipo Sequela', 'Valor Previsto', 'Valor RPV', 'Data Pericia', 'Pericia Realizada', 'Resultado'];
    const rows = processos.map(p => [
      p.id,
      p.cliente,
      p.numero,
      p.dataInicio,
      p.status,
      p.tipoSequela,
      p.valorPrevisto,
      p.valorRPV || 0,
      p.dataPericia || '',
      p.periciaRealizada ? 'Sim' : 'Não',
      p.resultadoJulgamento
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `planilha_casos_jonas_inacio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funcionalidade de Importação
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      // Pular cabeçalho
      const dataLines = lines.slice(1);
      
      let importCount = 0;
      dataLines.forEach(line => {
        if (!line.trim()) return;
        const columns = line.split(';');
        if (columns.length < 5) return;

        // Tentar mapear colunas para o objeto Processo
        const newProcess: Processo = {
          id: columns[0] || Math.random().toString(36).substr(2, 9),
          cliente: columns[1],
          numero: columns[2] || 'N/A',
          dataInicio: columns[3] || new Date().toISOString().split('T')[0],
          status: (columns[4] as ProcessStatus) || 'Inicial',
          tipoSequela: columns[5] || 'Não informada',
          valorPrevisto: parseFloat(columns[6]) || 0,
          valorRPV: parseFloat(columns[7]) || 0,
          dataPericia: columns[8] || undefined,
          periciaRealizada: columns[9]?.toLowerCase().includes('sim'),
          resultadoJulgamento: (columns[10] as ResultadoJulgamento) || 'Pendente',
          ultimaMovimentacao: new Date().toISOString().split('T')[0],
          valorCausa: (parseFloat(columns[6]) || 0) * 1.2,
          probabilidade: 'Média',
          dataPrevista: new Date().toISOString().split('T')[0],
        };

        onAdd(newProcess);
        importCount++;
      });

      alert(`${importCount} processos importados com sucesso.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Editor de Planilha Conectado</h2>
            <p className="text-xs text-gray-500">Gestão direta de valores e status dos processos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={importFromCSV} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar
            </button>
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Exportar
            </button>
             <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-[#001529] rounded-xl hover:bg-[#002545] shadow-lg shadow-indigo-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Nova Perícia
            </button>
          </div>
        </div>

        {showForm && (
          <div className="p-6 bg-indigo-50/50 border-b border-indigo-100">
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Cliente</label>
                <input required type="text" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})} className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome completo" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Data da Perícia</label>
                <input required type="date" value={formData.dataPericia} onChange={e => setFormData({...formData, dataPericia: e.target.value})} className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Sequela</label>
                <input required type="text" value={formData.tipoSequela} onChange={e => setFormData({...formData, tipoSequela: e.target.value})} className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Membro Superior" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Valor Previsto (R$)</label>
                <input required type="number" value={formData.valorPrevisto} onChange={e => setFormData({...formData, valorPrevisto: parseFloat(e.target.value)})} className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 transition-all uppercase tracking-widest">Salvar e Notificar</button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r w-10">#</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r min-w-[200px]">Cliente</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r">Data Perícia</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r text-center">Realizada?</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r">Julgamento</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r">Status Geral</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50 border-r">Previsto (R$)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase bg-gray-50">RPV (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processos.map((p, idx) => (
                <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-4 py-2 text-xs text-gray-400 border-r text-center font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 border-r font-semibold">
                    <input type="text" value={p.cliente} onChange={(e) => handleCellChange(p.id, 'cliente', e.target.value)} className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-300 rounded" />
                  </td>
                  <td className="px-4 py-2 border-r">
                    <input 
                      type="date" 
                      value={p.dataPericia || ''} 
                      onChange={(e) => handleCellChange(p.id, 'dataPericia', e.target.value)}
                      className="w-full text-xs bg-transparent border-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
                    />
                  </td>
                  <td className="px-4 py-2 border-r text-center">
                    <select 
                      value={p.periciaRealizada ? 'true' : 'false'} 
                      onChange={(e) => handleCellChange(p.id, 'periciaRealizada', e.target.value)}
                      className={`text-[10px] font-black uppercase bg-transparent border-none focus:ring-1 focus:ring-indigo-300 rounded px-1 ${p.periciaRealizada ? 'text-emerald-600' : 'text-amber-600'}`}
                    >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border-r">
                    <select 
                      value={p.resultadoJulgamento} 
                      onChange={(e) => handleCellChange(p.id, 'resultadoJulgamento', e.target.value)}
                      className={`w-full text-[10px] font-bold bg-transparent border-none focus:ring-1 focus:ring-indigo-300 rounded px-1 ${
                        p.resultadoJulgamento === 'Favorável' ? 'text-emerald-600' : 
                        p.resultadoJulgamento === 'Improcedente' ? 'text-red-600' : 'text-gray-500'
                      }`}
                    >
                      <option value="Pendente">Aguardando</option>
                      <option value="Favorável">Favorável</option>
                      <option value="Improcedente">Improcedente</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border-r">
                    <select 
                      value={p.status} 
                      onChange={(e) => handleCellChange(p.id, 'status', e.target.value)}
                      className="w-full text-xs bg-transparent border-none focus:ring-1 focus:ring-indigo-300 rounded"
                    >
                      <option value="Inicial">Inicial</option>
                      <option value="Perícia">Perícia</option>
                      <option value="Instrução">Instrução</option>
                      <option value="Sentença">Sentença</option>
                      <option value="Recurso">Recurso</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border-r">
                    <input 
                      type="number" 
                      value={p.valorPrevisto} 
                      onChange={(e) => handleCellChange(p.id, 'valorPrevisto', e.target.value)}
                      className="w-full text-sm font-bold text-indigo-700 bg-transparent border-none text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={p.valorRPV || 0} 
                      onChange={(e) => handleCellChange(p.id, 'valorRPV', e.target.value)}
                      className="w-full text-sm font-bold text-emerald-700 bg-transparent border-none text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800">Alertas de SMS e WhatsApp Ativos</h4>
            <p className="text-xs text-gray-500">Clientes são notificados automaticamente 48h antes de cada perícia agendada.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex -space-x-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 self-center ml-2 font-medium">89 notificações enviadas este mês</p>
        </div>
      </div>
    </div>
  );
};
