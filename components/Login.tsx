
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (email: string, pass: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, pass);
  };

  return (
    <div className="min-h-screen bg-[#001529] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-12">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            <svg width="60" height="60" viewBox="0 0 100 100" className="text-[#001529] fill-current">
              <path d="M65,35 C65,35 70,30 72,25 C74,20 70,18 68,22 C66,26 60,35 60,35 M55,38 C40,55 35,65 35,75 C35,85 45,90 55,80 C65,70 75,50 75,45 C75,40 70,38 65,42 C60,46 50,65 48,75" fill="none" stroke="#001529" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-serif tracking-[0.3em] text-[#001529] font-medium text-center">JONAS INÁCIO</h1>
          <p className="text-[8px] font-sans tracking-[0.5em] text-gray-400 uppercase mt-2">Acesso Restrito ao Sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#001529] outline-none transition-all"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
            <input 
              type="password" 
              required
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#001529] outline-none transition-all"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-[#001529] text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all active:scale-95"
          >
            Entrar no Painel
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-300 mt-10">
          © 2024 Jonas Inácio Advocacia. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};
