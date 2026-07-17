# Integração com a API do ADVBOX
**Esteira Previdenciária · Jonas Inácio Advocacia**

Objetivo: o digest (e futuras automações) puxarem **dado vivo** do ADVBOX — processos,
publicações (prazos/intimações), tarefas e financeiro — em vez do CSV manual.

## Estado atual (importante)
- **Base URL:** `https://app.advbox.com.br/api/v1` · **Auth:** Bearer token
- ⛔ **A rede deste ambiente bloqueia `app.advbox.com.br`** (403 CONNECT). A liberação da política de
  rede **só vale em SESSÃO NOVA** — a sessão que já está rodando não pega a mudança.
- Por isso o código abaixo está **pronto, mas ainda não testado ao vivo**.

## Pré-requisitos para rodar ao vivo
1. Política de rede do ambiente **permitindo `app.advbox.com.br`** (e `api.softwareadvbox.com.br` se algum endpoint usar).
2. **Abrir uma sessão nova** nesse ambiente (a mudança de rede não retroage à sessão atual).
3. `ADVBOX_TOKEN` definido como **variável de ambiente** (nunca no chat/repo). Gere um token novo no ADVBOX.

## Como validar e finalizar (na sessão nova)
```bash
node scripts/advbox-descobrir.mjs
```
Esse script confirma a conexão e imprime as **chaves reais** das respostas
(`/settings`, `/lawsuits`, `/publications`, `/posts`). Com esses campos, finalizo o
mapeamento do digest (hoje o mapa é uma suposição, porque não consegui bater na API real daqui).

## Arquivos
| Arquivo | Papel |
|---------|-------|
| `services/advboxService.mjs` | Cliente da API: auth por env, GET genérico e wrappers dos endpoints. |
| `scripts/advbox-descobrir.mjs` | Descoberta: testa conexão e mostra a estrutura das respostas. |
| `scripts/gerar-digest.mjs` | Digest atual (fonte: `data/casos.csv`). Vira fonte ADVBOX após a descoberta. |

## Próximo passo depois da descoberta
Com as chaves reais, eu escrevo `scripts/gerar-digest-advbox.mjs` — puxa processos + publicações
(prazos da semana) + tarefas e gera o digest sem CSV. A rotina de segunda passa a usar essa fonte.

## Segurança
- Token só em variável de ambiente. O `advboxService.mjs` lê de `process.env.ADVBOX_TOKEN` e **falha** se não existir.
- Nunca commitar token. Rotacionar imediatamente qualquer token que tenha aparecido em chat.
