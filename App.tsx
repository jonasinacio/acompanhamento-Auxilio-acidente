
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PROCESSOS } from './constants.ts';
import { StatsCard } from './components/StatsCard.tsx';
import { ProcessTable } from './components/ProcessTable.tsx';
import { LegalCharts } from './components/LegalCharts.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { NotificationPanel } from './components/NotificationPanel.tsx';
import { SpreadsheetTab } from './components/SpreadsheetTab.tsx';
import { UserManagementTab } from './components/UserManagementTab.tsx';
import { Login } from './components/Login.tsx';
import { Processo, User, UserRole } from './types.ts';

type TabId = 'dashboard' | 'processos' | 'planilha' | 'equipe';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Inicialização segura dos dados
  const [processos, setProcessos] = useState<Processo[]>(() => {
    try {
      const saved = localStorage.getItem('adv_processos');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_PROCESSOS;
      }
    } catch (e) {
      console.error("Erro ao carregar processos do storage:", e);
    }
    return MOCK_PROCESSOS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('adv_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Erro ao carregar usuários do storage:", e);
    }
    return [{ id: '1', nome: 'Jonas Inácio', email: 'jonas@advocacia.com', role: 'gestor', dataCriacao: '2024-01-01' }];
  });

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [role, setRole] = useState<UserRole>('gestor'); 

  // Sincronização automática
  useEffect(() => {
    try {
      localStorage.setItem('adv_processos', JSON.stringify(processos));
    } catch (e) {
      console.error("Erro ao salvar processos:", e);
    }
  }, [processos]);

  useEffect(() => {
    try {
      localStorage.setItem('adv_users', JSON.stringify(users));
    } catch (e) {
      console.error("Erro ao salvar usuários:", e);
    }
  }, [users]);

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
      alert("Por favor, insira um e-mail válido e uma senha com pelo menos 4 dígitos.");
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

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-[#001529] text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-center cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
              <div className="relative mb-1">
                <svg width="40" height="40" viewBox="0 0 100 100" className="text-white fill-current transform group-hover:scale-110 transition-transform">
                  <path d="M65,35 C65,35 70,30 72,25 C74,20 70,18 68,22 C66,26 60,35 60,35 M55,38 C40,55 35,65 35,75 C35,85 45,90 55,80 C65,70 75,50 75,45 C75,40 70,38 65,42 C60,46 50,65 48,75" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-base font-serif tracking-[0.2em] text-white font-medium uppercase">JONAS INÁCIO</div>
            </div>
            
            <nav className="flex items-center gap-2">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>INÍCIO</button>
              <button onClick={() => setActiveTab('processos')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'processos' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>CARTEIRA</button>
              {role === 'gestor' && (
                <>
                  <button onClick={() => setActiveTab('planilha')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'planilha' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>PERÍCIAS</button>
                  <button onClick={() => setActiveTab('equipe')} className={`px-4 py-2 text-[10px] font-black tracking-widest transition-all border-b-2 ${activeTab === 'equipe' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>EQUIPE</button>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
               <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                 <button onClick={() => {setRole('usuario'); setActiveTab('dashboard');}} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'usuario' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>OPERACIONAL</button>
                 <button onClick={() => setRole('gestor')} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'gestor' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>GESTÃO</button>
               </div>
            </div>
            <button 
              onClick={() => { if(confirm("Deseja sair?")) setIsAuthenticated(false); }} 
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-serif text-sm border border-white/20 hover:bg-red-500 transition-all"
            >JI</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-10">
            {activeTab === 'dashboard' && (
              <>
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatsCard title="Perícias Realizadas" value={`${stats.periciasRealizadas} / ${stats.total}`} icon={<svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} colorClass="bg-blue-50" />
                  <StatsCard title="Taxa de Êxito" value={`${Math.round((stats.favoraveis / (stats.total || 1)) * 100)}%`} icon={<svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorClass="bg-emerald-50" />
                  <StatsCard title="Expectativa RPV" value={formatBRL(stats.valorTotalPrevisto)} icon={<svg className="w-5 h-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>} colorClass="bg-indigo-50" />
                  <StatsCard title="Processos Ativos" value={processos.filter(p => p.status !== 'Finalizado').length} icon={<svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" /></svg>} colorClass="bg-slate-50" />
                </section>
                <NotificationPanel processos={processos} />
                <LegalCharts processos={processos} />
              </>
            )}

            {activeTab === 'processos' && <ProcessTable processos={processos} />}
            {activeTab === 'planilha' && role === 'gestor' && <SpreadsheetTab processos={processos} onUpdate={handleUpdateProcesso} onAdd={handleAddProcesso} />}
            {activeTab === 'equipe' && role === 'gestor' && <UserManagementTab users={users} onAddUser={handleAddUser} />}
          </div>

          <aside className="lg:col-span-1">
            <AIAssistant processos={processos} />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default App;
