# QG do Escritório — Sprint 0 (Fundação)

Postgres+pgvector · Traefik (HTTPS) · Next.js com login. Sobe no VPS com um comando.

## Antes de subir

1. **DNS**: aponte `qg.jonasinacio.adv.br` (registro **A**) para **143.95.160.16**.
2. **Docker** instalado no VPS (`docker` + `docker compose`).
3. **Portas 80 e 443** abertas no firewall/OCI (o Let's Encrypt precisa da 80).

## Subir

```bash
cd qg
cp .env.example .env
nano .env            # troque as senhas, o AUTH_SECRET (openssl rand -base64 32) e confira o QG_HOST
docker compose up -d --build
```

Acesse **https://qg.jonasinacio.adv.br** — tela de login.

- **Usuário inicial:** `jonasinacioa@gmail.com`
- **Senha inicial:** `sentinela2026` → **troque no primeiro acesso** (por enquanto, direto no banco; a tela de "trocar senha" entra na próxima sprint).

## O que já funciona nesta sprint

- HTTPS automático (Traefik + Let's Encrypt).
- Banco criado com as 10 tabelas do blueprint + `pgvector`.
- Login com papéis (Auth.js) protegendo tudo.
- Dashboard lendo as métricas do banco (zeradas até a ingestão ligar).

## Comandos úteis

```bash
docker compose ps                 # status
docker compose logs -f app        # logs do QG
docker compose logs -f traefik    # logs do HTTPS/certificado
docker compose exec db psql -U qg -d qg   # entrar no banco
docker compose down               # parar (mantém os dados no volume)
```

## Próximas sprints

1. **Ingestão** — os robôs SENTINELA passam a gravar no Postgres.
2. **Clientes (CRM)** + métricas clicáveis.
3. **IA do Manual** (RAG com pgvector).
4. **Gestão** + alertas.

## Observações de segurança

- O `.env` (senhas/segredos) **não vai pro git** — só o `.env.example`.
- Faça backup do volume `pgdata` (ex.: `pg_dump` diário, criptografado e fora do VPS).
- Troque a senha do admin e o `POSTGRES_PASSWORD` antes de usar pra valer.
