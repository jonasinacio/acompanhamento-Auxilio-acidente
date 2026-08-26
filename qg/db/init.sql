-- ============================================================================
-- QG do Escritório · esquema inicial (Sprint 0)
-- Roda automaticamente na 1ª subida do Postgres (docker-entrypoint-initdb.d).
-- Fonte única de dados: QG e IA leem daqui; os robôs SENTINELA escrevem aqui.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector: embeddings do Manual no mesmo banco

-- ---- equipe / acesso -------------------------------------------------------
CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  papel       TEXT NOT NULL DEFAULT 'operacao',   -- admin | comercial | juridico | operacao
  senha_hash  TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- CRM: leads e clientes (mesma tabela, separados pelo status) -----------
CREATE TABLE clientes (
  id              SERIAL PRIMARY KEY,
  nome            TEXT NOT NULL,
  telefone        TEXT,
  cpf             TEXT,
  email           TEXT,
  origem          TEXT,                         -- de onde veio o lead
  status          TEXT NOT NULL DEFAULT 'novo', -- novo | contato | proposta | contrato | cliente | perdido
  responsavel_id  INTEGER REFERENCES usuarios(id),
  ultima_acao_em  TIMESTAMPTZ,
  proxima_acao    TEXT,
  proxima_acao_em DATE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_resp   ON clientes(responsavel_id);

CREATE TABLE interacoes (
  id         SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo       TEXT,                              -- ligacao | whatsapp | email | nota
  texto      TEXT,
  autor_id   INTEGER REFERENCES usuarios(id),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- contratos (ZapSign) ---------------------------------------------------
CREATE TABLE contratos (
  id            SERIAL PRIMARY KEY,
  cliente_id    INTEGER REFERENCES clientes(id),
  zapsign_token TEXT UNIQUE,
  nome          TEXT,
  status        TEXT DEFAULT 'pending',         -- pending | signed | refused
  criado_em     TIMESTAMPTZ,
  assinado_em   TIMESTAMPTZ
);

-- ---- processos e publicações do DJEN --------------------------------------
CREATE TABLE processos (
  id          SERIAL PRIMARY KEY,
  cliente_id  INTEGER REFERENCES clientes(id),
  numero_cnj  TEXT UNIQUE,
  tribunal    TEXT,
  fase        TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE publicacoes (
  id           SERIAL PRIMARY KEY,
  processo_id  INTEGER REFERENCES processos(id),
  djen_id      TEXT UNIQUE,                     -- dedupe do vigia-djen
  data_disp    DATE,
  tribunal     TEXT,
  orgao        TEXT,
  tipo         TEXT,
  ato          TEXT,                            -- classificacao.py
  prazo_dias   INTEGER,
  data_fatal   DATE,
  texto        TEXT,
  resolvido    BOOLEAN NOT NULL DEFAULT false,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pub_fatal ON publicacoes(data_fatal) WHERE resolvido = false;

-- ---- tarefas (AdvBox / DJEN / manual) --------------------------------------
CREATE TABLE tarefas (
  id             SERIAL PRIMARY KEY,
  cliente_id     INTEGER REFERENCES clientes(id),
  processo_id    INTEGER REFERENCES processos(id),
  tipo           TEXT,
  titulo         TEXT,
  responsavel_id INTEGER REFERENCES usuarios(id),
  prazo          DATE,
  status         TEXT NOT NULL DEFAULT 'aberta', -- aberta | concluida | atrasada
  origem         TEXT,                           -- advbox | djen | manual
  advbox_id      TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tarefas_prazo ON tarefas(prazo) WHERE status = 'aberta';

-- ---- perícias (AdvBox) -----------------------------------------------------
CREATE TABLE pericias (
  id             SERIAL PRIMARY KEY,
  processo_id    INTEGER REFERENCES processos(id),
  data           DATE,
  hora           TEXT,
  local          TEXT,
  status         TEXT DEFAULT 'designada',
  advbox_post_id TEXT UNIQUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- IA do Manual (RAG) ----------------------------------------------------
CREATE TABLE manual_chunks (
  id         SERIAL PRIMARY KEY,
  texto      TEXT NOT NULL,
  fonte      TEXT,
  embedding  vector(1536)                       -- ajuste à dimensão do seu modelo
);

CREATE TABLE manual_perguntas (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  pergunta   TEXT NOT NULL,
  resposta   TEXT,
  resolvida  BOOLEAN NOT NULL DEFAULT true,      -- false = a IA não soube responder
  assunto    TEXT,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- admin semente ---------------------------------------------------------
-- Senha inicial: sentinela2026  → TROQUE no primeiro acesso.
INSERT INTO usuarios (nome, email, papel, senha_hash) VALUES
  ('Jonas Inácio', 'jonasinacioa@gmail.com', 'admin',
   '$2b$12$1KlBNOgGandvj9jALHgXOuz.NO/6x/GIT.lASEHxQQskHVEPtQPmG');
