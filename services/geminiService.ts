
import { GoogleGenAI } from "@google/genai";
import { Processo, TipoAto, ConfiancaIA } from "../types";
import { TIPOS_ATO } from "../constants";

// Provedor de IA: usa OpenAI (ChatGPT) quando OPENAI_API_KEY está definido;
// caso contrário, Gemini (API_KEY/GEMINI_API_KEY). A chave é sempre "limpa"
// (trim) para evitar erros de caractere invisível ao colar.
const openaiKey = () => (process.env.OPENAI_API_KEY || '').trim();
const geminiKey = () => (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();

export const getLegalInsights = async (processos: Processo[], query: string): Promise<string> => {
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
    if (openaiKey()) {
      const texto = await chamarOpenAI([
        { role: 'system', content: 'Você é um assistente jurídico sênior. Responda em português do Brasil.' },
        { role: 'user', content: context },
      ], false);
      return texto || "Não foi possível gerar uma resposta clara no momento.";
    }
    if (geminiKey()) {
      const ai = new GoogleGenAI({ apiKey: geminiKey() });
      const response = await ai.models.generateContent({ model: MODELO_GEMINI, contents: context });
      return response.text || "Não foi possível gerar uma resposta clara no momento.";
    }
    return "A inteligência artificial não foi configurada (defina OPENAI_API_KEY ou GEMINI_API_KEY).";
  } catch (error) {
    console.error("AI Error:", error);
    return "O assistente de IA encontrou um erro. Por favor, tente novamente em instantes.";
  }
};

export interface ClassificacaoIntimacao {
  tipoAto: TipoAto;
  teorResumido: string;
  confianca: ConfiancaIA;
}

// Modelos padrão (ajustáveis por env). Gemini estável em vez de "-preview".
const MODELO_GEMINI = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
const MODELO_OPENAI = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Erros transitórios (vale nova tentativa): 429 e 5xx / sobrecarga.
const isTransientError = (error: any): boolean => {
  const status = error?.status ?? error?.code;
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true;
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|rate limit/i.test(String(error?.message ?? error ?? ''));
};

const promptClassificacao = (teor: string) => `
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
"""${teor}"""
`;

const extrairJson = (txt: string): any =>
  JSON.parse((txt || '').trim().replace(/^```json\s*|\s*```$/g, ''));

const normalizar = (parsed: any): ClassificacaoIntimacao => ({
  tipoAto: TIPOS_ATO.includes(parsed?.tipoAto) ? parsed.tipoAto as TipoAto : 'Outro',
  teorResumido: String(parsed?.teorResumido || '').trim() || 'Resumo indisponível.',
  confianca: ['Alta', 'Média', 'Baixa'].includes(parsed?.confianca) ? parsed.confianca as ConfiancaIA : 'Baixa',
});

// Endereço da API compatível com OpenAI. Padrão: OpenAI. Pode apontar para
// Groq (grátis), OpenRouter, Ollama local etc. via OPENAI_BASE_URL.
const OPENAI_BASE = () =>
  (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/$/, '');

// Chamada REST a uma API compatível com OpenAI (sem SDK).
type Msg = { role: 'system' | 'user'; content: string };
const chamarOpenAI = async (mensagens: Msg[], json: boolean): Promise<string> => {
  const resp = await fetch(`${OPENAI_BASE()}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey()}` },
    body: JSON.stringify({
      model: MODELO_OPENAI,
      messages: mensagens,
      temperature: 0,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!resp.ok) {
    const corpo = await resp.text();
    throw Object.assign(new Error(`OpenAI ${resp.status}: ${corpo.slice(0, 200)}`), { status: resp.status });
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
};

/**
 * Classifica o teor de uma intimação (tipo, resumo, confiança). O prazo é
 * sempre calculado por regra fixa — a IA nunca "adivinha" prazo.
 * Até 3 tentativas com backoff para erros transitórios; null => revisão manual.
 */
export const classifyIntimacao = async (
  teorIntegral: string,
): Promise<ClassificacaoIntimacao | null> => {
  const usarOpenAI = !!openaiKey();
  const usarGemini = !usarOpenAI && !!geminiKey();
  if (!usarOpenAI && !usarGemini) {
    console.warn("Nenhuma chave de IA configurada (OPENAI_API_KEY ou GEMINI_API_KEY).");
    return null;
  }

  const MAX = 3;
  for (let tentativa = 1; tentativa <= MAX; tentativa++) {
    try {
      if (usarOpenAI) {
        const texto = await chamarOpenAI([
          { role: 'system', content: 'Você classifica intimações judiciais previdenciárias e responde SOMENTE JSON válido.' },
          { role: 'user', content: promptClassificacao(teorIntegral) },
        ], true);
        return normalizar(extrairJson(texto));
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey() });
      const response = await ai.models.generateContent({
        model: MODELO_GEMINI,
        contents: promptClassificacao(teorIntegral),
        config: { responseMimeType: 'application/json' },
      });
      return normalizar(extrairJson(response.text || ''));
    } catch (error) {
      console.error(`Erro na classificação (tentativa ${tentativa}/${MAX}):`, (error as any)?.message ?? error);
      if (!isTransientError(error) || tentativa === MAX) return null;
      await sleep(1000 * 2 ** (tentativa - 1)); // 1s, 2s, 4s
    }
  }
  return null;
};
