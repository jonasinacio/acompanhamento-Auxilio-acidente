
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PROCESSOS } from './constants';
import { StatsCard } from './components/StatsCard';
import { ProcessTable } from './components/ProcessTable';
import { LegalCharts } from './components/LegalCharts';
import { AIAssistant } from './components/AIAssistant';
import { NotificationPanel } from './components/NotificationPanel';
import { SpreadsheetTab } from './components/SpreadsheetTab';
import { UserManagementTab } from './components/UserManagementTab';
import { Login } from './components/Login';
import { Processo, User, UserRole } from './types';

type TabId = 'dashboard' | 'processos' | 'planilha' | 'equipe';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Inicialização segura com proteção contra erros de JSON
  const [processos, setProcessos] = useState<Processo[]>(() => {
    try {
      const saved = localStorage.getItem('adv_processos');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_PROCESSOS;
      }
    } catch (e) {
      console.warn("Usando dados padrão devido a erro no storage.");
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

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [role, setRole] = useState<UserRole>('gestor'); 

  useEffect(() => {
    try {
      localStorage.setItem('adv_processos', JSON.stringify(processos));
    } catch (e) {}
  }, [processos]);

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
      alert("Credenciais inválidas.");
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
              <button onClick={() => setRole('gestor')} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'gestor' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>GESTÃO</button>
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-serif text-sm border border-white/20 hover:bg-red-500 transition-all">JI</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-3 space-y-10">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatsCard title="Perícias Realizadas" value={`${stats.periciasRealizadas} / ${stats.total}`} icon="📅" colorClass="bg-blue-50" />
                  <StatsCard title="Expectativa RPV" value={(stats.valorTotalPrevisto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon="💰" colorClass="bg-indigo-50" />
                  <StatsCard title="Processos Ativos" value={processos.length} icon="📂" colorClass="bg-slate-50" />
                  <StatsCard title="Taxa de Êxito" value={`${Math.round((stats.favoraveis / (stats.total || 1)) * 100)}%`} icon="⭐" colorClass="bg-emerald-50" />
                </div>
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
