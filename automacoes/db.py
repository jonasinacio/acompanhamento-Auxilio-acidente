# -*- coding: utf-8 -*-
"""
db.py — ponte dos robôs SENTINELA com o Postgres do QG (Sprint 1: ingestão).

Fonte única: os robôs, além de avisar no WhatsApp, GRAVAM aqui — e o QG/IA leem
deste banco. É opcional e seguro: se DATABASE_URL não estiver setada (ou o
psycopg2 faltar), `habilitado()` é False e o robô segue igual, sem tocar no banco.
Todas as escritas são idempotentes (ON CONFLICT) — rodar de novo não duplica.
"""
from __future__ import annotations

import contextlib
import os

try:
    import psycopg2
    _TEM_PSYCOPG = True
except ImportError:  # pragma: no cover
    _TEM_PSYCOPG = False

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def habilitado() -> bool:
    return bool(DATABASE_URL) and _TEM_PSYCOPG


@contextlib.contextmanager
def cursor():
    """Abre conexão + cursor (autocommit). Use: `with db.cursor() as cur: ...`."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            yield cur
    finally:
        conn.close()


def ensure_processo(cur, numero_cnj, tribunal=None):
    """Acha ou cria o processo pelo número CNJ; devolve o id (ou None)."""
    if not numero_cnj:
        return None
    cur.execute(
        "INSERT INTO processos (numero_cnj, tribunal) VALUES (%s, %s) "
        "ON CONFLICT (numero_cnj) DO UPDATE "
        "SET tribunal = COALESCE(processos.tribunal, EXCLUDED.tribunal) "
        "RETURNING id",
        (numero_cnj, tribunal))
    row = cur.fetchone()
    return row[0] if row else None


def upsert_publicacao(cur, p: dict) -> None:
    """Grava/atualiza uma publicação do DJEN (dedupe por djen_id)."""
    proc_id = ensure_processo(cur, p.get("numero_cnj"), p.get("tribunal"))
    cur.execute(
        "INSERT INTO publicacoes "
        "(processo_id, djen_id, data_disp, tribunal, orgao, tipo, ato, prazo_dias, data_fatal, texto) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
        "ON CONFLICT (djen_id) DO UPDATE SET "
        "ato = EXCLUDED.ato, prazo_dias = EXCLUDED.prazo_dias, data_fatal = EXCLUDED.data_fatal",
        (proc_id, str(p.get("djen_id")), p.get("data_disp"), p.get("tribunal"),
         p.get("orgao"), p.get("tipo"), p.get("ato"), p.get("prazo_dias"),
         p.get("data_fatal"), p.get("texto")))


def upsert_pericia(cur, p: dict) -> None:
    """Grava/atualiza uma perícia do AdvBox (dedupe por advbox_post_id)."""
    proc_id = ensure_processo(cur, p.get("numero_cnj"))
    cur.execute(
        "INSERT INTO pericias (processo_id, data, hora, local, advbox_post_id) "
        "VALUES (%s,%s,%s,%s,%s) "
        "ON CONFLICT (advbox_post_id) DO UPDATE SET "
        "data = EXCLUDED.data, hora = EXCLUDED.hora, local = EXCLUDED.local",
        (proc_id, p.get("data"), p.get("hora"), p.get("local"),
         str(p.get("advbox_post_id"))))


def upsert_contrato(cur, c: dict) -> None:
    """Grava/atualiza um contrato do ZapSign (dedupe por zapsign_token)."""
    cur.execute(
        "INSERT INTO contratos (zapsign_token, nome, status, assinado_em) "
        "VALUES (%s,%s,%s,%s) "
        "ON CONFLICT (zapsign_token) DO UPDATE SET "
        "status = EXCLUDED.status, assinado_em = COALESCE(EXCLUDED.assinado_em, contratos.assinado_em)",
        (str(c.get("zapsign_token")), c.get("nome"), c.get("status"), c.get("assinado_em")))
