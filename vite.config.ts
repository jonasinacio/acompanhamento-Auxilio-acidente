import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Expõe ao bundle do front APENAS as variáveis abaixo (allowlist), em vez de
// todo o process.env — que vazaria segredos e caminhos do build.
//
// SEGURANÇA: em produção, defina no build do FRONT somente INTIMACOES_API_URL
// (e, se usar, APP_TOKEN). Segredos (GEMINI_API_KEY, LEGALMAIL_API_KEY) devem
// ficar SÓ no backend; se definidos no build do front, seriam embutidos no JS.
const CHAVES_EXPOSTAS = [
  'API_KEY', 'GEMINI_API_KEY', 'GEMINI_MODEL',
  'OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_BASE_URL',
  'INTIMACOES_API_URL', 'APP_TOKEN',
  'DJEN_MOCK', 'DJEN_ADVOGADOS', 'DJEN_API_BASE', 'DJEN_DIAS',
  'LEGALMAIL_BACKEND_URL', 'LEGALMAIL_API_KEY', 'LEGALMAIL_API_BASE', 'LEGALMAIL_MAX_PROCESSOS',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const define = Object.fromEntries(
    CHAVES_EXPOSTAS.map(k => [`process.env.${k}`, JSON.stringify(env[k] ?? '')]),
  );
  return {
    plugins: [react()],
    define,
  };
});
