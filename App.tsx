
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PROCESSOS, MOCK_INTIMACOES } from './constants.ts';
import { StatsCard } from './components/StatsCard.tsx';
import { ProcessTable } from './components/ProcessTable.tsx';
import { LegalCharts } from './components/LegalCharts.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { NotificationPanel } from './components/NotificationPanel.tsx';
import { SpreadsheetTab } from './components/SpreadsheetTab.tsx';
import { UserManagementTab } from './components/UserManagementTab.tsx';
import { IntimacoesTab } from './components/IntimacoesTab.tsx';
import { Login } from './components/Login.tsx';
import { Processo, User, UserRole, Intimacao } from './types.ts';
import { diasUteisRestantes } from './utils/prazo.ts';

type TabId = 'dashboard' | 'processos' | 'intimacoes' | 'planilha' | 'equipe';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [processos, setProcessos] = useState<Processo[]>(() => {
    try {
      const saved = localStorage.getItem('adv_processos');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_PROCESSOS;
      }
    } catch (e) {
      console.warn("Usando dados padrão.");
    }
    return MOCK_PROCESSOS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('adv_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [{ id: '1', nome: 'Jonas Inácio', email: 'jonas@advocacia.com', role: 'gestor', dataCriacao: '2024-01-01' }];
  });

  const [intimacoes, setIntimacoes] = useState<Intimacao[]>(() => {
    try {
      const saved = localStorage.getItem('adv_intimacoes');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_INTIMACOES;
      }
    } catch (e) {}
    return MOCK_INTIMACOES;
  });

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [role, setRole] = useState<UserRole>('gestor');

  useEffect(() => {
    try {
      localStorage.setItem('adv_processos', JSON.stringify(processos));
    } catch (e) {}
  }, [processos]);

  useEffect(() => {
    try {
      localStorage.setItem('adv_intimacoes', JSON.stringify(intimacoes));
    } catch (e) {}
  }, [intimacoes]);

  // Contadores de triagem para o badge de intimações no menu.
  const intimacoesUrgentes = useMemo(() => {
    return intimacoes.filter(i => {
      if (i.statusLeitura === 'Arquivada') return false;
      if (i.statusLeitura === 'Não Lida') return true;
      const dias = diasUteisRestantes(i.dataPrazoFinal);
      return dias !== null && dias <= 3;
    }).length;
  }, [intimacoes]);

  const stats = useMemo(() => {
    const total = processos.length;
    const periciasRealizadas = processos.filter(p => p.periciaRealizada).length;
    const favoraveis = processos.filter(p => p.resultadoJulgamento === 'Favorável').length;
    const valorTotalPrevisto = processos.reduce((acc, p) => acc + (p.valorPrevisto || 0), 0);
    return { total, periciasRealizadas, favoraveis, valorTotalPrevisto };
  }, [processos]);

  const handleLogin = (email: string, pass: string) => {
    if (email && pass.length >= 4) {
      setIsAuthenticated(true);
    } else {
      alert("Credenciais inválidas. Use pelo menos 4 caracteres na senha.");
    }
  };

  const handleUpdateProcesso = (updated: Processo) => {
    setProcessos(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddProcesso = (newProcesso: Processo) => {
    setProcessos(prev => [newProcesso, ...prev]);
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateIntimacao = (updated: Intimacao) => {
    setIntimacoes(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col animate-fade-in">
      <header className="bg-[#001529] text-white sticky top-0 z-40 shadow-xl h-24 flex items-center">
        <div className="max-w-[1600px] mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-center cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <h1 className="text-xl font-serif tracking-widest text-white uppercase font-bold">JONAS INÁCIO</h1>
              <p className="text-[8px] tracking-[0.4em] text-white/40 uppercase">Advocacia Especializada</p>
            </div>
            
            <nav className="flex items-center gap-4">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>DASHBOARD</button>
              <button onClick={() => setActiveTab('processos')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'processos' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>CARTEIRA</button>
              <button onClick={() => setActiveTab('intimacoes')} className={`relative px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'intimacoes' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>
                INTIMAÇÕES
                {intimacoesUrgentes > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-red-500 text-white text-[8px] font-black rounded-full">{intimacoesUrgentes}</span>
                )}
              </button>
              {role === 'gestor' && (
                <>
                  <button onClick={() => setActiveTab('planilha')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'planilha' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>PERÍCIAS</button>
                  <button onClick={() => setActiveTab('equipe')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'equipe' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>EQUIPE</button>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
              <button onClick={() => setRole('usuario')} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'usuario' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>OPERACIONAL</button>
              <button onClick={() => setRole('gestor')} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'gestor' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>GESTOR</button>
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="text-white/40 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto p-6 w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <NotificationPanel processos={processos} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard title="Total de Processos" value={stats.total} icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} colorClass="bg-indigo-50" />
              <StatsCard title="Perícias Realizadas" value={stats.periciasRealizadas} icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} colorClass="bg-amber-50" />
              <StatsCard title="Favoráveis (Vitórias)" value={stats.favoraveis} icon={<svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>} colorClass="bg-emerald-50" />
              <StatsCard title="Projeção Faturamento" value={`R$ ${stats.valorTotalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorClass="bg-blue-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <LegalCharts processos={processos} />
              </div>
              <div className="lg:col-span-1">
                <AIAssistant processos={processos} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'processos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <ProcessTable processos={processos} onAdd={handleAddProcesso} />
          </div>
        )}

        {activeTab === 'intimacoes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <IntimacoesTab intimacoes={intimacoes} processos={processos} onUpdate={handleUpdateIntimacao} />
          </div>
        )}

        {activeTab === 'planilha' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <SpreadsheetTab processos={processos} onUpdate={handleUpdateProcesso} onAdd={handleAddProcesso} />
          </div>
        )}

        {activeTab === 'equipe' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <UserManagementTab users={users} onAddUser={handleAddUser} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-8 px-6 mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2024 Jonas Inácio Advocacia • Sistema de Gestão Inteligente</p>
          <div className="flex gap-6">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest cursor-pointer hover:text-[#001529]">Termos</span>
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest cursor-pointer hover:text-[#001529]">Privacidade</span>
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest cursor-pointer hover:text-[#001529]">Suporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
