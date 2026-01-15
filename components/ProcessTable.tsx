
import React, { useState, useRef } from 'react';
import { Processo, ProcessStatus, ResultadoJulgamento } from '../types';
import { STATUS_COLORS } from '../constants';
import * as XLSX from 'xlsx';

interface ProcessTableProps {
  processos: Processo[];
  onAdd?: (newProcesso: Processo) => void;
}

export const ProcessTable: React.FC<ProcessTableProps> = ({ processos, onAdd }) => {
  const [filter, setFilter] = useState('');
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = processos.filter(p => {
    const matchesSearch = p.cliente.toLowerCase().includes(filter.toLowerCase()) || 
      p.numero.includes(filter) ||
      p.tipoSequela.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const processImportedData = (data: any[]) => {
    if (!onAdd) return 0;
    let importCount = 0;

    data.forEach(row => {
      // row pode ser um array (de strings/objetos) dependendo de como o parser foi chamado
      // Assumindo que a primeira coluna é ID ou Cliente
      const columns = Array.isArray(row) ? row : Object.values(row);
      
      if (columns.length < 2) return;

      const newProcess: Processo = {
        id: String(columns[0] || Math.random().toString(36).substr(2, 9)),
        cliente: String(columns[1] || "Cliente Importado"),
        numero: String(columns[2] || 'N/A'),
        dataInicio: String(columns[3] || new Date().toISOString().split('T')[0]),
        status: (columns[4] as ProcessStatus) || 'Inicial',
        tipoSequela: String(columns[5] || 'Não informada'),
        valorPrevisto: parseFloat(String(columns[6]).replace(',', '.')) || 0,
        valorRPV: parseFloat(String(columns[7]).replace(',', '.')) || 0,
        dataPericia: columns[8] ? String(columns[8]) : undefined,
        periciaRealizada: String(columns[9]).toLowerCase().includes('sim'),
        resultadoJulgamento: (columns[10] as ResultadoJulgamento) || 'Pendente',
        ultimaMovimentacao: new Date().toISOString().split('T')[0],
        valorCausa: (parseFloat(String(columns[6]).replace(',', '.')) || 0) * 1.2,
        probabilidade: 'Média',
        dataPrevista: new Date().toISOString().split('T')[0],
      };

      onAdd(newProcess);
      importCount++;
    });

    return importCount;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (event) => {
      const bstr = event.target?.result;
      try {
        if (isExcel) {
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          // Remove o cabeçalho se existir
          const count = processImportedData(data.slice(1));
          alert(`${count} processos importados de arquivo Excel.`);
        } else {
          const text = bstr as string;
          const lines = text.split(/\r?\n/);
          const data = lines.map(line => {
            const separator = line.includes(';') ? ';' : ',';
            return line.split(separator).map(col => col.replace(/^"(.*)"$/, '$1').trim());
          });
          const count = processImportedData(data.slice(1));
          alert(`${count} processos importados de arquivo CSV.`);
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao processar o arquivo. Verifique o formato.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (isExcel) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const smartUrlTransform = (url: string) => {
    const trimmed = url.trim();
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      const sheetIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = trimmed.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      return sheetIdMatch ? `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=${gid}` : trimmed;
    }
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('?dl=0', '?dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }
    return trimmed;
  };

  const handleCloudImport = async () => {
    if (!cloudUrl.trim()) return;
    setIsLoadingCloud(true);
    try {
      const finalUrl = smartUrlTransform(cloudUrl);
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      
      const text = await response.text();
      const lines = text.split(/\r?\n/);
      const data = lines.map(line => {
        const separator = line.includes(';') ? ';' : ',';
        return line.split(separator).map(col => col.replace(/^"(.*)"$/, '$1').trim());
      });
      const count = processImportedData(data.slice(1));
      
      if (count > 0) {
        alert(`${count} processos sincronizados com sucesso!`);
        setShowCloudModal(false);
        setCloudUrl('');
      } else {
        alert("O arquivo foi acessado, mas não encontramos dados válidos.");
      }
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Cliente', 'Numero', 'Data Inicio', 'Status', 'Tipo Sequela', 'Valor Previsto', 'Valor RPV', 'Data Pericia', 'Pericia Realizada', 'Resultado'];
    const rows = processos.map(p => [
      p.id, p.cliente, p.numero, p.dataInicio, p.status, p.tipoSequela, p.valorPrevisto, p.valorRPV || 0, p.dataPericia || '', p.periciaRealizada ? 'Sim' : 'Não', p.resultadoJulgamento
    ]);
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `carteira_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      {showCloudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sincronizar Nuvem</h3>
                <p className="text-xs text-gray-500 font-medium">Conecte planilhas online (CSV/Excel Público).</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link da Planilha</label>
                <input 
                  type="text" 
                  placeholder="Cole o link aqui..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCloudImport()}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowCloudModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 text-[10px] font-black rounded-xl hover:bg-gray-200 uppercase tracking-widest transition-all">Cancelar</button>
                <button onClick={handleCloudImport} disabled={isLoadingCloud || !cloudUrl} className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black rounded-xl hover:bg-blue-700 uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoadingCloud ? <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : "Sincronizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0a192f] rounded-xl flex items-center justify-center shadow-lg">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Gestão de Carteira</h2>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm">{filtered.length} Processos</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Importe arquivos XLS, XLSX ou CSV.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
            <button onClick={() => setShowCloudModal(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              Sincronizar Nuvem
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar Local (.xls, .xlsx, .csv)
            </button>
            <button onClick={exportToCSV} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Exportar
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xls, .xlsx" className="hidden" />
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
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#f8fafc] transition-all group">
                <td className="px-6 py-5">
                  <div className="text-sm font-bold text-gray-900 group-hover:text-[#0a192f] transition-colors">{p.cliente}</div>
                  <div className="text-[10px] text-indigo-600 font-black mt-1 uppercase bg-indigo-50 inline-block px-1.5 rounded">{p.numero}</div>
                </td>
                <td className="px-6 py-5">
                  <span className="px-3 py-1 text-[10px] font-black uppercase rounded-lg text-white shadow-sm inline-block" style={{ backgroundColor: STATUS_COLORS[p.status] }}>{p.status}</span>
                </td>
                <td className="px-6 py-5 text-xs font-bold text-gray-600">{p.dataPericia ? formatDate(p.dataPericia) : 'Pendente'}</td>
                <td className="px-6 py-5 text-xs font-medium text-gray-500 italic">{formatDate(p.ultimaMovimentacao)}</td>
                <td className="px-6 py-5">
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${p.resultadoJulgamento === 'Favorável' ? 'text-emerald-600' : p.resultadoJulgamento === 'Improcedente' ? 'text-red-600' : 'text-amber-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${p.resultadoJulgamento === 'Favorável' ? 'bg-emerald-600' : p.resultadoJulgamento === 'Improcedente' ? 'bg-red-600' : 'bg-amber-500'}`}></div>
                    {p.resultadoJulgamento}
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                   <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
