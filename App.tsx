
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PROCESSOS, MOCK_LEADS, MOCK_CLIENTES, MOCK_CONTRATOS, MOCK_CASOS, MOCK_TAREFAS, MOCK_LANCAMENTOS, MOCK_ATENDIMENTOS, MOCK_COLABORADORES } from './constants.ts';
import { StatsCard } from './components/StatsCard.tsx';
import { ProcessTable } from './components/ProcessTable.tsx';
import { LegalCharts } from './components/LegalCharts.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { NotificationPanel } from './components/NotificationPanel.tsx';
import { SpreadsheetTab } from './components/SpreadsheetTab.tsx';
import { UserManagementTab } from './components/UserManagementTab.tsx';
import { Login } from './components/Login.tsx';
import { LeadsTab } from './components/LeadsTab.tsx';
import { TarefasTab } from './components/TarefasTab.tsx';
import { FinanceiroTab } from './components/FinanceiroTab.tsx';
import { AtendimentoTab } from './components/AtendimentoTab.tsx';
import { KPIDashboard } from './components/KPIDashboard.tsx';
import { Processo, User, UserRole, Lead, Cliente, Caso, Tarefa, Lancamento, Atendimento } from './types.ts';

type TabId = 'dashboard' | 'kpis' | 'leads' | 'carteira' | 'tarefas' | 'financeiro' | 'atendimento' | 'pericias' | 'equipe';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [processos, setProcessos] = useState<Processo[]>(() => {
    try {
      const saved = localStorage.getItem('adv_processos');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_PROCESSOS;
      }
    } catch (e) {}
    return MOCK_PROCESSOS;
  });

  const [leads] = useState<Lead[]>(MOCK_LEADS);
  const [clientes] = useState<Cliente[]>(MOCK_CLIENTES);
  const [casos] = useState<Caso[]>(MOCK_CASOS);
  const [tarefas] = useState<Tarefa[]>(MOCK_TAREFAS);
  const [lancamentos] = useState<Lancamento[]>(MOCK_LANCAMENTOS);
  const [atendimentos] = useState<Atendimento[]>(MOCK_ATENDIMENTOS);

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

  // alertas para o header
  const alertCount = useMemo(() => {
    const hoje = new Date();
    const tarefasVencidas = tarefas.filter(t => t.status !== 'Concluída' && new Date(t.dataVencimento) < hoje).length;
    const semContato = clientes.filter(c => c.diasSemContato >= 30).length;
    const pericias = processos.filter(p => p.dataPericia && !p.periciaRealizada).filter(p => {
      const diff = Math.ceil((new Date(p.dataPericia!).getTime() - hoje.getTime()) / 86400000);
      return diff >= 0 && diff <= 5;
    }).length;
    return tarefasVencidas + semContato + pericias;
  }, [tarefas, clientes, processos]);

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

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const NAV_TABS: { id: TabId; label: string; gestorOnly?: boolean }[] = [
    { id: 'dashboard', label: 'DASHBOARD' },
    { id: 'kpis', label: 'BI / KPIS', gestorOnly: true },
    { id: 'leads', label: 'LEADS', gestorOnly: true },
    { id: 'carteira', label: 'CARTEIRA' },
    { id: 'tarefas', label: 'TAREFAS' },
    { id: 'financeiro', label: 'FINANCEIRO', gestorOnly: true },
    { id: 'atendimento', label: 'ATENDIMENTO', gestorOnly: true },
    { id: 'pericias', label: 'PERÍCIAS', gestorOnly: true },
    { id: 'equipe', label: 'EQUIPE', gestorOnly: true },
  ];

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col animate-fade-in">
      <header className="bg-[#001529] text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-[1600px] mx-auto px-6 w-full">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex flex-col cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                <h1 className="text-base font-serif tracking-widest text-white uppercase font-bold leading-none">JONAS INÁCIO</h1>
                <p className="text-[7px] tracking-[0.4em] text-white/40 uppercase">Advocacia Especializada</p>
              </div>

              <nav className="flex items-center gap-1">
                {NAV_TABS.filter(t => !t.gestorOnly || role === 'gestor').map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-[9px] font-black tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-white text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {alertCount > 0 && (
                <div className="relative">
                  <button onClick={() => setActiveTab('tarefas')} className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition-colors">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </button>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">{alertCount}</span>
                </div>
              )}
              <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                <button onClick={() => setRole('usuario')} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'usuario' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>OPERACIONAL</button>
                <button onClick={() => setRole('gestor')} className={`px-3 py-1 text-[8px] font-black rounded-full transition-all ${role === 'gestor' ? 'bg-white text-[#001529]' : 'text-white/40'}`}>GESTOR</button>
              </div>
              <button onClick={() => setIsAuthenticated(false)} className="text-white/40 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto p-6 w-full">

        {/* ─── DASHBOARD ────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <NotificationPanel processos={processos} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard title="Total de Processos" value={stats.total}
                icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                colorClass="bg-indigo-50" />
              <StatsCard title="Leads no Funil" value={leads.filter(l => !['Convertido','Perdido'].includes(l.status)).length}
                icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                colorClass="bg-blue-50" />
              <StatsCard title="Vitórias" value={stats.favoraveis}
                icon={<svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                colorClass="bg-emerald-50" />
              <StatsCard title="Projeção Faturamento" value={`R$ ${stats.valorTotalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                colorClass="bg-blue-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2"><LegalCharts processos={processos} /></div>
              <div className="lg:col-span-1"><AIAssistant processos={processos} /></div>
            </div>
          </div>
        )}

        {/* ─── BI / KPIs EXECUTIVO ──────────────────────────────────────── */}
        {activeTab === 'kpis' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#001529]">Painel Executivo — BI Completo</h2>
                <p className="text-sm text-gray-400">Visão consolidada de todos os indicadores estratégicos do escritório.</p>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Atualizado em {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <KPIDashboard
              casos={casos}
              leads={leads}
              lancamentos={lancamentos}
              tarefas={tarefas}
              atendimentos={atendimentos}
              clientes={clientes}
            />
          </div>
        )}

        {/* ─── LEADS ────────────────────────────────────────────────────── */}
        {activeTab === 'leads' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[#001529]">Gestão de Leads & Captação</h2>
              <p className="text-sm text-gray-400">Funil comercial, conversão por canal e performance de captação.</p>
            </div>
            <LeadsTab leads={leads} />
          </div>
        )}

        {/* ─── CARTEIRA ─────────────────────────────────────────────────── */}
        {activeTab === 'carteira' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <ProcessTable processos={processos} onAdd={handleAddProcesso} />
          </div>
        )}

        {/* ─── TAREFAS & PRAZOS ─────────────────────────────────────────── */}
        {activeTab === 'tarefas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[#001529]">Tarefas & Prazos</h2>
              <p className="text-sm text-gray-400">Controle de prazos processuais, tarefas por responsável e alertas de vencimento.</p>
            </div>
            <TarefasTab tarefas={tarefas} />
          </div>
        )}

        {/* ─── FINANCEIRO ───────────────────────────────────────────────── */}
        {activeTab === 'financeiro' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[#001529]">Painel Financeiro</h2>
              <p className="text-sm text-gray-400">Honorários, receitas, despesas, forecast por fase processual e CAC.</p>
            </div>
            <FinanceiroTab lancamentos={lancamentos} casos={casos} />
          </div>
        )}

        {/* ─── ATENDIMENTO ──────────────────────────────────────────────── */}
        {activeTab === 'atendimento' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[#001529]">Atendimento ao Cliente</h2>
              <p className="text-sm text-gray-400">NPS, histórico de contatos, clientes em risco e indicações recebidas.</p>
            </div>
            <AtendimentoTab atendimentos={atendimentos} clientes={clientes} />
          </div>
        )}

        {/* ─── PERÍCIAS ─────────────────────────────────────────────────── */}
        {activeTab === 'pericias' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <SpreadsheetTab processos={processos} onUpdate={handleUpdateProcesso} onAdd={handleAddProcesso} />
          </div>
        )}

        {/* ─── EQUIPE ───────────────────────────────────────────────────── */}
        {activeTab === 'equipe' && role === 'gestor' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-[#001529]">Gestão de Equipe</h2>
              <p className="text-sm text-gray-400">Colaboradores, produtividade e controle de acessos.</p>
            </div>
            <UserManagementTab users={users} onAddUser={handleAddUser} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-6 px-6 mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2025 Jonas Inácio Advocacia • Sistema de Gestão Inteligente — BI Auxílio-Acidente</p>
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
