
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, PieChart, Pie, Legend } from 'recharts';
import { Processo } from '../types';

interface LegalChartsProps {
  processos: Processo[];
}

type ChartMetric = 'total_vs_favoraveis' | 'pericia_vs_favoraveis' | 'pipeline_pericia';
type ChartType = 'bar' | 'pie';

export const LegalCharts: React.FC<LegalChartsProps> = ({ processos }) => {
  const [metric, setMetric] = useState<ChartMetric>('total_vs_favoraveis');
  const [chartType, setChartType] = useState<ChartType>('bar');

  const chartData = useMemo(() => {
    switch(metric) {
      case 'total_vs_favoraveis':
        const fav = processos.filter(p => p.resultadoJulgamento === 'Favorável').length;
        const total = processos.length;
        return [
          { name: 'Total de Processos', value: total, color: '#001529' },
          { name: 'Favoráveis (Vitórias)', value: fav, color: '#10b981' }
        ];
      
      case 'pericia_vs_favoraveis':
        const comPericia = processos.filter(p => p.periciaRealizada).length;
        const periciaFav = processos.filter(p => p.periciaRealizada && p.resultadoJulgamento === 'Favorável').length;
        return [
          { name: 'Processos com Perícia', value: comPericia, color: '#3b82f6' },
          { name: 'Perícias Favoráveis', value: periciaFav, color: '#10b981' }
        ];

      case 'pipeline_pericia':
        const aguardando = processos.filter(p => p.status === 'Perícia' && !p.dataPericia).length;
        const agendadas = processos.filter(p => p.dataPericia && !p.periciaRealizada).length;
        return [
          { name: 'Aguardando Perícias', value: aguardando, color: '#f59e0b' },
          { name: 'Total a Fazer (Agendadas)', value: agendadas, color: '#001529' }
        ];

      default:
        return [];
    }
  }, [processos, metric]);

  const titles = {
    total_vs_favoraveis: 'Total de Processos x Favoráveis',
    pericia_vs_favoraveis: 'Processos com Perícia x Processos Favoráveis',
    pipeline_pericia: 'Aguardando Perícias x Total a Fazer de Perícias'
  };

  const renderChart = () => {
    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      );
    } else {
      return (
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={true}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
        </PieChart>
      );
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#001529] rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-[#001529]">{titles[metric]}</h3>
            <p className="text-sm text-gray-400 font-medium">Análise de métricas operacionais Jonas Inácio.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Alternador de Tipo de Gráfico */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white shadow-sm text-[#001529]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Gráfico de Barras"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </button>
            <button 
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-lg transition-all ${chartType === 'pie' ? 'bg-white shadow-sm text-[#001529]' : 'text-gray-400 hover:text-gray-600'}`}
              title="Gráfico de Pizza"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </button>
          </div>

          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value as ChartMetric)}
            className="bg-gray-50 border border-gray-200 text-[10px] font-black text-[#001529] uppercase tracking-widest rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-[#001529]/20"
          >
            <option value="total_vs_favoraveis">Processos x Favoráveis</option>
            <option value="pericia_vs_favoraveis">Perícias x Favoráveis</option>
            <option value="pipeline_pericia">Pipeline de Perícias</option>
          </select>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
