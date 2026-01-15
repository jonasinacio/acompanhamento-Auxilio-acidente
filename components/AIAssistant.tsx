
import React, { useState } from 'react';
import { getLegalInsights } from '../services/geminiService';
import { Processo } from '../types';

interface AIAssistantProps {
  processos: Processo[];
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ processos }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const result = await getLegalInsights(processos, query);
    setResponse(result);
    setLoading(false);
  };

  const suggestions = [
    "Qual o valor total de causas com probabilidade Alta?",
    "Quais processos precisam de atenção imediata?",
    "Resuma o status do meu escritório.",
  ];

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold">Assistente Legal IA</h3>
          <p className="text-slate-400 text-xs">Gemini AI Analytics</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar pr-2">
        {response ? (
          <div className="prose prose-invert prose-sm">
            <div className="bg-slate-800 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
              <p className="whitespace-pre-wrap">{response}</p>
            </div>
            <button 
              onClick={() => setResponse('')}
              className="text-blue-400 hover:text-blue-300 text-xs font-medium"
            >
              ← Limpar resposta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">Como posso ajudar na estratégia dos seus processos hoje?</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(s)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs py-2 px-3 rounded-lg text-slate-300 transition-colors text-left border border-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite sua pergunta..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};
