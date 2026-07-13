
import { GoogleGenAI } from "@google/genai";
import { Processo, TipoAto, ConfiancaIA } from "../types";
import { TIPOS_ATO } from "../constants";

export const getLegalInsights = async (processos: Processo[], query: string): Promise<string> => {
  // Access API key exclusively from environment variables as per guidelines.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API Key não encontrada no ambiente.");
    return "A inteligência artificial não foi configurada corretamente (API Key ausente).";
  }

  // Use a named parameter to initialize the GoogleGenAI client.
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
    // Call generateContent with both model name and prompt.
    // Using gemini-3-flash-preview for general analytics and Q&A.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: context,
    });
    // Access the .text property directly (not as a method).
    return response.text || "Não foi possível gerar uma resposta clara no momento.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "O assistente de IA encontrou um erro. Por favor, tente novamente em instantes.";
  }
};

export interface ClassificacaoIntimacao {
  tipoAto: TipoAto;
  teorResumido: string;
  confianca: ConfiancaIA;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Considera transitórios os erros que valem uma nova tentativa (sobrecarga /
// rate limit): 503 UNAVAILABLE e 429 RESOURCE_EXHAUSTED, comuns no tier gratuito.
// Erros de credencial/entrada (4xx) não são reprocessados.
const isTransientError = (error: any): boolean => {
  const status = error?.status ?? error?.code;
  if (status === 503 || status === 429) return true;
  const msg = String(error?.message ?? error ?? '');
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(msg);
};

/**
 * Classifica o teor de uma intimação do DJEN em: tipo do ato, resumo e nível
 * de confiança. A IA identifica APENAS o tipo e o resumo — o prazo é sempre
 * calculado por regra fixa (utils/prazo.ts), nunca estimado pela IA.
 * Em caso de falha/ausência de API key, retorna null para acionar revisão manual.
 */
export const classifyIntimacao = async (
  teorIntegral: string,
): Promise<ClassificacaoIntimacao | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key não encontrada — classificação por IA indisponível.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Você é um analista de intimações judiciais especializado em Direito Previdenciário,
atuando em ações de auxílio-acidente/benefícios que tramitam no Juizado Especial
Federal (JEF) e em Varas Federais (PJe).

Classifique o teor da publicação abaixo. Retorne ESTRITAMENTE um objeto JSON, sem
markdown, com as chaves:
- "tipoAto": exatamente um dos valores: ${JSON.stringify(TIPOS_ATO)}
- "teorResumido": resumo objetivo do ato em uma frase (português do Brasil)
- "confianca": "Alta", "Média" ou "Baixa"

Use "Outro" e confiança "Baixa" quando o teor for genérico ou ambíguo.
NÃO informe prazos — apenas o tipo do ato e o resumo.

Teor da publicação:
"""${teorIntegral}"""
`;

  // Até 3 tentativas com backoff exponencial (1s, 2s, 4s) apenas para erros
  // transitórios. Falha definitiva (ou erro não transitório) => null => revisão manual.
  const MAX_TENTATIVAS = 3;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const raw = (response.text || '').trim().replace(/^```json\s*|\s*```$/g, '');
      const parsed = JSON.parse(raw);

      const tipoAto: TipoAto = TIPOS_ATO.includes(parsed.tipoAto)
        ? parsed.tipoAto
        : 'Outro';
      const confianca: ConfiancaIA =
        ['Alta', 'Média', 'Baixa'].includes(parsed.confianca)
          ? parsed.confianca
          : 'Baixa';

      return {
        tipoAto,
        teorResumido: String(parsed.teorResumido || '').trim() || 'Resumo indisponível.',
        confianca,
      };
    } catch (error) {
      const transitorio = isTransientError(error);
      console.error(`Erro na classificação da intimação (tentativa ${tentativa}/${MAX_TENTATIVAS}):`, error);
      if (!transitorio || tentativa === MAX_TENTATIVAS) return null;
      await sleep(1000 * 2 ** (tentativa - 1)); // 1s, 2s, 4s...
    }
  }
  return null;
};
