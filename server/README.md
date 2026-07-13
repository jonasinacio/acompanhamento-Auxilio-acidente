# Backend de Webhook — LegalMail

Receiver que integra o canal **LegalMail** com segurança, sem expor a `api_key`
no browser e **sem polling** (que a API do LegalMail penaliza com timeouts
progressivos). Fluxo:

```
LegalMail  ──push──▶  este backend  ──GET /intimacoes──▶  front (aba Intimações)
             (webhook)   (classifica + guarda)
```

## Endpoints

| Método | Rota                     | Função                                                        |
|--------|--------------------------|---------------------------------------------------------------|
| POST   | `/legalmail/webhook`     | Recebe o push do LegalMail, classifica (IA) e persiste.       |
| GET    | `/intimacoes`            | Lista as intimações capturadas (consumido pelo front).        |
| POST   | `/legalmail/register`    | Registra a URL deste receiver no LegalMail.                   |
| GET    | `/health`                | Healthcheck.                                                  |

## Variáveis de ambiente

| Variável                     | Obrigatória | Descrição                                                                 |
|------------------------------|-------------|---------------------------------------------------------------------------|
| `LEGALMAIL_API_KEY`          | p/ registrar| Chave da API do LegalMail (menu Integrações). **Só no servidor.**          |
| `LEGALMAIL_WEBHOOK_ENDPOINT` | p/ registrar| URL pública deste receiver, ex.: `https://seu-dominio/legalmail/webhook`.  |
| `LEGALMAIL_WEBHOOK_KEY`      | recomendada | Chave de segurança; validada como `clientkey` em cada push.               |
| `LEGALMAIL_APP_NAME`         | opcional    | Nome da aplicação exibido no LegalMail.                                    |
| `GEMINI_API_KEY`             | recomendada | Habilita a classificação por IA das intimações recebidas.                 |
| `CORS_ORIGIN`                | opcional    | Origem permitida para o front (padrão `*`).                               |
| `PORT`                       | opcional    | Porta HTTP (padrão `8787`).                                               |

## Como rodar

```bash
# 1. Suba o receiver (exposto publicamente — ex.: via túnel/deploy)
npx tsx server/legalmailWebhookServer.ts

# 2. Registre a URL no LegalMail (uma vez)
curl -X POST http://localhost:8787/legalmail/register

# 3. Aponte o front para este backend (.env.local do app)
#    LEGALMAIL_BACKEND_URL=http://localhost:8787
```

A partir daí, o botão **"Sincronizar LegalMail"** na aba Intimações lê deste
backend (fonte `LegalMail (via backend)`), já com as intimações classificadas.

## Produção

- **Persistência:** hoje é um JSON local (`server/data/intimacoes.json`, ignorado
  pelo Git). Troque por um banco (Postgres, DynamoDB etc.).
- **Serverless:** reaproveite `handleRequest` no handler da sua plataforma
  (Vercel/Netlify/Lambda) — a lógica é agnóstica de framework.
- **Segurança:** mantenha `LEGALMAIL_WEBHOOK_KEY` definida para rejeitar pushes
  sem `clientkey` válida, e restrinja `CORS_ORIGIN` ao domínio do app.
