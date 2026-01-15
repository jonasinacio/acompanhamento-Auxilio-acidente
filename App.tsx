
import React, { useState, useMemo } from 'react';
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
  const [processos, setProcessos] = useState<Processo[]>(MOCK_PROCESSOS);
  const [users, setUsers] = useState<User[]>([
    { id: '1', nome: 'Jonas Inácio', email: 'jonas@advocacia.com', role: 'gestor', dataCriacao: '2024-01-01' }
  ]);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [role, setRole] = useState<UserRole>('gestor'); 

  const stats = useMemo(() => {
    const total = processos.length;
    const periciasRealizadas = processos.filter(p => p.periciaRealizada).length;
    const periciasPendentes = total - periciasRealizadas;
    const favoraveis = processos.filter(p => p.resultadoJulgamento === 'Favorável').length;
    const valorTotalPrevisto = processos.reduce((acc, p) => acc + (p.valorPrevisto || 0), 0);

    return { total, periciasRealizadas, periciasPendentes, favoraveis, valorTotalPrevisto };
  }, [processos]);

  const handleLogin = (email: string, pass: string) => {
    // Simulação de login: qualquer e-mail do escritório entra
    if (email.includes('@') && pass.length >= 4) {
      setIsAuthenticated(true);
    } else {
      alert("Credenciais inválidas. Tente novamente.");
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
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans animate-in fade-in duration-700">
      <header className="bg-[#001529] text-white sticky top-0 z-40 shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-8 h-28 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-center cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
              <div className="relative mb-1">
                <svg width="48" height="48" viewBox="0 0 100 100" className="text-white fill-current transform group-hover:scale-110 transition-transform">
                  <path d="M65,35 C65,35 70,30 72,25 C74,20 70,18 68,22 C66,26 60,35 60,35 M55,38 C40,55 35,65 35,75 C35,85 45,90 55,80 C65,70 75,50 75,45 C75,40 70,38 65,42 C60,46 50,65 48,75" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-lg font-serif tracking-[0.3em] text-white leading-none font-medium text-center">JONAS INÁCIO</div>
              <div className="text-[7px] font-sans tracking-[0.6em] text-white/50 uppercase mt-1 font-light">ADVOCACIA</div>
            </div>
            
            <nav className="flex items-center gap-4">
              <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>DASHBOARD</button>
              <button onClick={() => setActiveTab('processos')} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'processos' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>PROCESSOS</button>
              {role === 'gestor' && (
                <>
                  <button onClick={() => setActiveTab('planilha')} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'planilha' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>ACOMPANHAMENTO DE PERÍCIAS</button>
                  <button onClick={() => setActiveTab('equipe')} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${activeTab === 'equipe' ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>EQUIPE</button>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Simular Papel</span>
               <div className="flex bg-white/5 rounded-full p-1 mt-1 border border-white/10">
                 <button onClick={() => {setRole('usuario'); setActiveTab('dashboard');}} className={`px-4 py-1 text-[9px] font-black rounded-full transition-all ${role === 'usuario' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>OPERACIONAL</button>
                 <button onClick={() => setRole('gestor')} className={`px-4 py-1 text-[9px] font-black rounded-full transition-all ${role === 'gestor' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>GESTÃO</button>
               </div>
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="h-12 w-12 rounded-full border border-white/20 bg-white/5 flex items-center justify-center font-serif text-lg italic shadow-inner hover:bg-red-500/20 transition-all" title="Sair">JI</button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-12 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3 space-y-12">
            {activeTab === 'dashboard' && (
              <>
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  <StatsCard title="Perícias Realizadas" value={`${stats.periciasRealizadas} / ${stats.total}`} icon={<svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} colorClass="bg-blue-50" trend={`${stats.total - stats.periciasRealizadas} pendentes`} />
                  <StatsCard title="Sentenças Favoráveis" value={stats.favoraveis} icon={<svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorClass="bg-emerald-50" trend="Excelente taxa" />
                  {role === 'gestor' ? (
                    <StatsCard title="Expectativa de RPV" value={formatBRL(stats.valorTotalPrevisto)} icon={<svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} colorClass="bg-indigo-50" />
                  ) : (
                    <StatsCard title="Taxa de Vitórias" value={`${Math.round((stats.favoraveis/stats.total)*100)}%`} icon={<svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} colorClass="bg-indigo-50" />
                  )}
                  <StatsCard title="Processos Ativos" value={processos.filter(p => p.status !== 'Finalizado').length} icon={<svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} colorClass="bg-slate-50" />
                </section>
                <NotificationPanel processos={processos} />
                <LegalCharts processos={processos} />
              </>
            )}

            {activeTab === 'processos' && <ProcessTable processos={processos} />}
            {activeTab === 'planilha' && role === 'gestor' && <SpreadsheetTab processos={processos} onUpdate={handleUpdateProcesso} onAdd={handleAddProcesso} />}
            {activeTab === 'equipe' && role === 'gestor' && <UserManagementTab users={users} onAddUser={handleAddUser} />}
          </div>

          <aside className="lg:col-span-1 space-y-8">
            <AIAssistant processos={processos} />
            <div className="bg-[#001529]/5 p-6 rounded-2xl border border-[#001529]/10">
              <h4 className="text-[10px] font-black text-[#001529]/40 uppercase tracking-widest mb-3">Escritório Jonas Inácio</h4>
              <p className="text-[11px] text-[#001529]/70 leading-relaxed italic">"Excelência jurídica no acompanhamento de auxílio-acidente, garantindo o direito do trabalhador com tecnologia."</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default App;
