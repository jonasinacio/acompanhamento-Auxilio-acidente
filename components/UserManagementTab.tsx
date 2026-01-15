
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface UserManagementTabProps {
  users: User[];
  onAddUser: (user: User) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ users, onAddUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'usuario' as UserRole
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email) return;

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      nome: formData.nome,
      email: formData.email,
      role: formData.role,
      dataCriacao: new Date().toISOString().split('T')[0]
    };

    onAddUser(newUser);
    setShowForm(false);
    setFormData({ nome: '', email: '', role: 'usuario' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#001529]">Gestão de Equipe</h2>
          <p className="text-sm text-gray-400">Gerencie os acessos do escritório Jonas Inácio.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#001529] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Criar Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl border border-[#001529]/10 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xs font-black text-[#001529]/40 uppercase tracking-[0.2em] mb-6">Cadastro de Colaborador</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                required
                type="text" 
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#001529] outline-none"
                placeholder="Ex: Pedro Alvares"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#001529] outline-none"
                placeholder="pedro@advocacia.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-[#001529] outline-none"
              >
                <option value="usuario">Operacional (Apenas Dash)</option>
                <option value="gestor">Gestão (Acesso Total)</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">Salvar Usuário</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-400 p-3 rounded-xl hover:bg-gray-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível de Acesso</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Data de Inclusão</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#001529] text-white flex items-center justify-center font-bold text-xs shadow-inner">
                      {u.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{u.nome}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${
                    u.role === 'gestor' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}>
                    {u.role === 'gestor' ? 'Acesso Total' : 'Operacional'}
                  </span>
                </td>
                <td className="px-8 py-6 text-center text-xs font-medium text-gray-500">
                  {new Date(u.dataCriacao).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-gray-300 hover:text-red-500 transition-colors p-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
