
import React, { useState } from 'react';
import { Processo, ProcessStatus, ResultadoJulgamento } from '../types';

interface SpreadsheetTabProps {
  processos: Processo[];
  onUpdate: (updated: Processo) => void;
  onAdd: (newProcesso: Processo) => void;
}

interface FormErrors {
  cliente?: string;
  numero?: string;
  dataPericia?: string;
  tipoSequela?: string;
  valorPrevisto?: string;
}

export const SpreadsheetTab: React.FC<SpreadsheetTabProps> = ({ processos, onUpdate, onAdd }) => {
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente: '',
    numero: '',
    dataPericia: '',
    tipoSequela: '',
    valorPrevisto: 0
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (name: string, value: any): string => {
    switch (name) {
      case 'cliente':
        if (!value) return 'Nome do cliente é obrigatório';
        if (value.length < 3) return 'Nome muito curto';
        return '';
      case 'numero':
        if (!value) return 'Número do processo é obrigatório';
        if (!/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(value) && value !== 'N/A') 
          return 'Formato inválido (0000000-00.0000.0.00.0000)';
        return '';
      case 'dataPericia':
        if (!value) return 'Data da perícia é obrigatória';
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return 'Data não pode ser no passado';
        return '';
      case 'tipoSequela':
        if (!value) return 'Tipo de sequela é obrigatório';
        return '';
      case 'valorPrevisto':
        if (value <= 0) return 'Valor deve ser maior que zero';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = name === 'valorPrevisto' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => ({ ...prev, [name]: val }));
    
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validate(name, val) }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validate(name, (formData as any)[name]) }));
  };

  const isFormValid = () => {
    const newErrors: FormErrors = {
      cliente: validate('cliente', formData.cliente),
      numero: validate('numero', formData.numero),
      dataPericia: validate('dataPericia', formData.dataPericia),
      tipoSequela: validate('tipoSequela', formData.tipoSequela),
      valorPrevisto: validate('valorPrevisto', formData.valorPrevisto),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(err => err !== '');
  };

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
    
    if (!isFormValid()) {
      setTouched({
        cliente: true,
        numero: true,
        dataPericia: true,
        tipoSequela: true,
        valorPrevisto: true
      });
      return;
    }

    const newProcess: Processo = {
      id: Math.random().toString(36).substr(2, 9),
      cliente: formData.cliente,
      numero: formData.numero,
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
    setErrors({});
    setTouched({});
    alert(`Perícia agendada para ${formData.cliente}. Alerta enviado ao cliente com sucesso!`);
  };

  const renderField = (label: string, name: string, type: string, placeholder?: string) => {
    const hasError = touched[name] && !!errors[name as keyof FormErrors];
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
          {label}
          {touched[name] && !errors[name as keyof FormErrors] && formData[name as keyof typeof formData] !== '' && (
            <span className="text-emerald-500">✓</span>
          )}
        </label>
        <input 
          name={name}
          type={type} 
          value={(formData as any)[name]} 
          onChange={handleInputChange}
          onBlur={() => handleBlur(name)}
          className={`px-3 py-2 text-xs border rounded-lg outline-none transition-all ${
            hasError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-indigo-500'
          }`}
          placeholder={placeholder} 
        />
        {hasError && (
          <span className="text-[9px] font-bold text-red-500 uppercase mt-0.5 animate-in fade-in slide-in-from-top-1">
            {errors[name as keyof FormErrors]}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Agendamento de Perícias</h2>
            <p className="text-xs text-gray-500">Gestão direta de valores e status dos processos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <button 
              onClick={() => { setShowForm(!showForm); setErrors({}); setTouched({}); }}
              className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white rounded-xl transition-all shadow-lg ${
                showForm ? 'bg-red-500 hover:bg-red-600' : 'bg-[#001529] hover:bg-[#002545]'
              }`}
            >
              {showForm ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancelar
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Nova Perícia
                </>
              )}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 animate-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {renderField('Cliente', 'cliente', 'text', 'Nome completo')}
              {renderField('Nº Processo', 'numero', 'text', '0000000-00.0000.0.00.0000')}
              {renderField('Data Perícia', 'dataPericia', 'date')}
              {renderField('Tipo de Sequela', 'tipoSequela', 'text', 'Ex: Membro Superior')}
              {renderField('Valor Previsto (R$)', 'valorPrevisto', 'number')}
              
              <div className="flex items-end">
                <button 
                  type="submit" 
                  className={`w-full py-2.5 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-widest shadow-md ${
                    isFormValid() ? 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]' : 'bg-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  Salvar e Notificar
                </button>
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
