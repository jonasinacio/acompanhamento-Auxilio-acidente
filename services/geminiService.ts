
import { GoogleGenAI } from "@google/genai";
import { Processo } from "../types";

export const getLegalInsights = async (processos: Processo[], query: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "API Key não configurada.";

  const ai = new GoogleGenAI({ apiKey });
  
  const today = new Date().toISOString().split('T')[0];
  
  const context = `
    Você é um assistente jurídico sênior e analista estratégico para um escritório de advocacia especializado em Auxílio-Acidente.
    A data de hoje é: ${today}.
    
    Abaixo estão os dados dos processos, incluindo:
    - tipoSequela: A lesão ou sequela do cliente.
    - valorPrevisto: Expectativa de recebimento calculada.
    - valorRPV: Valor da RPV já emitido.
    - dataPrevista: Data estimada para desfecho ou recebimento.
    
    Dados atuais:
    ${JSON.stringify(processos, null, 2)}

    Pergunta do usuário: ${query}

    Instruções Críticas:
    1. PRIORIDADE: Sempre verifique se há datas previstas (dataPrevista) muito próximas da data de hoje (${today}). Alerte o usuário imediatamente se algo vencer nos próximos 7 dias.
    2. Análise de Fluxo: Projete o faturamento esperado baseado nas datas previstas.
    3. Estratégia: Sugira ações para processos parados em status como 'Inicial' ou 'Perícia' há muito tempo.
    4. Responda de forma profissional, executiva e direta.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
    });
    return response.text || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao consultar a inteligência artificial.";
  }
};
