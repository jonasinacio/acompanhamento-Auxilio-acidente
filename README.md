# Sistema de Intimações Judiciais — Direito Previdenciário

Captação de intimações (DJEN/CNJ + LegalMail), triagem com cálculo de prazos em
dias úteis, classificação por IA e vínculo automático ao cliente. Front em
React/Vite + uma API central (Node) que captura no servidor e compartilha os
dados entre o escritório.

## Rodar rápido (desenvolvimento)

**Pré-requisitos:** Node.js 20+.

```bash
npm install
cp .env.example .env.local      # preencha GEMINI_API_KEY (classificação por IA)
npm run dev:all                 # front (5173) + API (8787) juntos
```

- Para o front falar com a API, defina no `.env.local`:
  `INTIMACOES_API_URL=http://localhost:8787`
- Sem `INTIMACOES_API_URL`, o app roda individual (localStorage), sem backend.
- Sem acesso à internet (ou para demonstrar), use `DJEN_MOCK=1`.

## Rodar como serviço único (produção simples)

A API serve o front compilado e os endpoints na mesma porta:

```bash
INTIMACOES_API_URL=same-origin npm run build   # compila o front
GEMINI_API_KEY=... APP_TOKEN=... npm start      # sobe tudo em :8787
```

## Docker

```bash
docker build -t intimacoes .
docker run -p 8787:8787 \
  -e GEMINI_API_KEY=... \
  -e APP_TOKEN=um-token-forte \
  -e DJEN_ADVOGADOS='[{"numeroOab":"160291","ufOab":"MG"}]' \
  intimacoes
# abra http://localhost:8787
```

Segredos (chaves de IA/LegalMail) entram **no runtime** do container — nunca no
build do front. Veja `server/README.md` para todos os endpoints e variáveis, e
`.env.example` para a lista completa de configurações.

## Canais de captura

- **DJEN/CNJ** — API pública Comunica do CNJ, por OAB monitorada
  (padrão: MG 160291, ajustável em `services/djenService.ts` ou `DJEN_ADVOGADOS`).
- **LegalMail** — API real (webhook recomendado; polling como alternativa),
  tratada no backend para não expor a chave no browser.

## Status

Prontos: captura (DJEN + LegalMail), classificação IA, prazos, triagem,
persistência compartilhada e deploy único. Pendentes para produção plena:
login de usuários real (hoje é demonstrativo) e troca do store JSON por um banco.
