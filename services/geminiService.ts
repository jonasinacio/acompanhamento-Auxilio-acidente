
import { GoogleGenAI } from "@google/genai";
import { Processo } from "../types";

export const getLegalInsights = async (processos: Processo[], query: string): Promise<string> => {
  // Acesso seguro à chave de API
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : (window as any).API_KEY;
  
  if (!apiKey) {
    console.warn("API Key não encontrada no ambiente.");
    return "A inteligência artificial não foi configurada corretamente (API Key ausente).";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const today = new Date().toISOString().split('T')[0];
  
  const context = `
    Você é um assistente jurídico sênior e analista estratégico para um escritório de advocacia especializado em Auxílio-Acidente.
    A data de hoje é: ${today}.
    
    Abaixo estão os dados dos processos do escritório de Jonas Inácio:
    ${JSON.stringify(processos, null, 2)}

    Pergunta do usuário: ${query}

    Instruções:
    1. PRIORIDADE: Alerte sobre datas de perícias ou prazos nos próximos 7 dias.
    2. Análise: Projete faturamento e sugira ações para processos parados.
    3. Responda de forma executiva, em português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
    });
    return response.text || "Não foi possível gerar uma resposta clara no momento.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "O assistente de IA encontrou um erro. Por favor, tente novamente em instantes.";
  }
};
