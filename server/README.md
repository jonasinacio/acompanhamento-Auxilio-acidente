# API Central — Sistema de Intimações

Backend que **centraliza captura, persistência e leitura** das intimações, para
o escritório compartilhar os mesmos dados (o front deixa de depender de
`localStorage`) e para rodar a captura no **servidor** — onde alcança o CNJ e o
LegalMail sem CORS e sem expor chaves no browser.

```
DJEN/CNJ  ─┐
LegalMail ─┤─▶  API central  ──GET /intimacoes──▶  front (aba Intimações)
(webhook) ─┘   (captura + classifica + guarda)   ◀──PATCH status──
```

## Endpoints

| Método | Rota                          | Função                                                    | Auth |
|--------|-------------------------------|-----------------------------------------------------------|:----:|
| GET    | `/health`                     | Healthcheck.                                              |  —   |
| GET    | `/intimacoes`                 | Lista as intimações persistidas (consumido pelo front).  |  —   |
| PATCH  | `/intimacoes/:id`             | Atualiza campos (ex.: `statusLeitura`, `revisaoManual`). |  ✔   |
| POST   | `/intimacoes/sync/djen`       | Captura no DJEN/CNJ (server-side) e persiste.            |  ✔   |
| POST   | `/intimacoes/sync/legalmail`  | Captura no LegalMail (polling) e persiste.               |  ✔   |
| POST   | `/legalmail/webhook`          | Recebe o push do LegalMail e persiste.                   | clientkey |
| POST   | `/legalmail/register`         | Registra a URL de webhook no LegalMail.                  |  ✔   |

**Auth:** se `APP_TOKEN` estiver definido, as rotas marcadas exigem o header
`X-Auth-Token: <APP_TOKEN>`. O webhook usa a sua própria `clientkey`
(`LEGALMAIL_WEBHOOK_KEY`).

## Variáveis de ambiente

| Variável                     | Descrição                                                                 |
|------------------------------|---------------------------------------------------------------------------|
| `APP_TOKEN`                  | Token compartilhado exigido nas rotas de escrita/captura.                 |
| `GEMINI_API_KEY`             | Habilita a classificação por IA das intimações.                          |
| `DJEN_ADVOGADOS` / `DJEN_MOCK` | Cadastro de OABs monitoradas / força fonte simulada (offline).          |
| `LEGALMAIL_API_KEY`          | Chave do LegalMail (só no servidor).                                      |
| `LEGALMAIL_WEBHOOK_ENDPOINT` | URL pública deste receiver p/ registro.                                   |
| `LEGALMAIL_WEBHOOK_KEY`      | Chave de segurança validada como `clientkey` nos pushes.                  |
| `CORS_ORIGIN`                | Origem permitida para o front (padrão `*`).                              |
| `PORT`                       | Porta HTTP (padrão `8787`).                                              |

## Como rodar

```bash
# Sobe a API (exposta publicamente em produção — deploy ou túnel)
npx tsx server/apiServer.ts

# Captura DJEN no servidor e persiste (com token, se configurado)
curl -X POST http://localhost:8787/intimacoes/sync/djen -H 'X-Auth-Token: SEU_TOKEN'

# Front lê daqui
curl http://localhost:8787/intimacoes
```

Aponte o front para esta API com `LEGALMAIL_BACKEND_URL=http://localhost:8787`
(a fonte `LegalMail (via backend)` lê as intimações já capturadas).

## Produção

- **Persistência:** hoje é um JSON local (`server/data/`, ignorado pelo Git).
  Troque `lerStore`/`salvarStore` por um banco (Postgres, DynamoDB…).
- **Agendamento:** dispare `POST /intimacoes/sync/djen` periodicamente (cron do
  provedor ou GitHub Actions) para captura diária automática.
- **Serverless:** reaproveite `handleRequest` no handler da plataforma.
- **Segurança:** defina `APP_TOKEN` e `LEGALMAIL_WEBHOOK_KEY`, e restrinja
  `CORS_ORIGIN` ao domínio do app.
