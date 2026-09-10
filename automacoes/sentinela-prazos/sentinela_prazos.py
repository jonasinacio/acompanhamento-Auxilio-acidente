#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SENTINELA-PRAZOS · DJEN → classifica → cria a tarefa no AdvBox (D-2)
===================================================================

Porta fiel do sentinela-prazos.js do Jonas. Para as intimações do DJEN
classificadas com ALTA confiança (escopo estreito), cria automaticamente no
AdvBox a tarefa correspondente, com vencimento a D-2 (2 dias úteis de margem
antes do prazo fatal real). O que sai do escopo fica só no boletim do vigia-djen
— humano decide (mesmo princípio do "não chuta").

SEGURANÇA (igual ao original):
  • --dry por PADRÃO: só mostra o que faria, NÃO escreve no AdvBox.
  • Só grava de verdade com --send explícito.
  • Idempotente por publicação do DJEN (nunca cria a mesma tarefa 2x).
  • Token do AdvBox só via ambiente (ADVBOX_TOKEN), nunca no código.

    python3 sentinela_prazos.py --dry            # simulação (padrão)
    python3 sentinela_prazos.py --dry --mock     # simulação sem rede (exemplo)
    python3 sentinela_prazos.py --send           # cria as tarefas no AdvBox
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj        # noqa: E402
import classificacao as clf  # noqa: E402  (compartilhado com o vigia-djen)

# ---- credenciais / constantes (do sentinela-prazos.js) ----
ADVBOX_URL   = os.environ.get("ADVBOX_URL", "https://app.advbox.com.br/api/v1").rstrip("/")
ADVBOX_TOKEN = os.environ.get("ADVBOX_TOKEN", "")
DJEN_API     = os.environ.get("DJEN_API", "https://comunicaapi.pje.jus.br/api/v1/comunicacao")
OAB          = os.environ.get("DJEN_OAB", "160291")
UF           = os.environ.get("DJEN_UF", "MG")

USER_JONAS   = int(os.environ.get("ADVBOX_USER_JONAS", "112841"))
USER_SUPORTE = int(os.environ.get("ADVBOX_USER_SUPORTE", "112842"))
MARGEM_DIAS_UTEIS = 2   # D-2, mesma margem da Controladoria Autônoma

# ato (string exata do classificacao.py) -> tarefa do AdvBox
# (task_id conferidos ao vivo em /settings pelo Jonas em 19-20/08/2026)
ESCOPO = {
    "Contestação do INSS → réplica":       {"task_id": 3349334, "nome": "RÉPLICA/IMPUGNAÇÃO À CONTESTAÇÃO"},
    "Sentença (JEF) → recurso inominado":  {"task_id": 3349368, "nome": "RECURSO DE APELAÇÃO/INOMINADO"},
    "Sentença → apelação":                 {"task_id": 3349368, "nome": "RECURSO DE APELAÇÃO/INOMINADO"},
}

ESTADO_JSON = os.environ.get(
    "PRAZOS_ESTADO", os.path.join(os.path.dirname(__file__), "prazos-tarefas-criadas.json"))

# O AdvBox (WAF) bloqueia sem cara de navegador — mesmo UA dos scripts do Jonas.
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

# ---- amostras p/ --mock (sem rede) ----
_MOCK_DJEN = [
    {"id": 901, "numeroprocessocommascara": "1002345-67.2026.8.26.0100",
     "datadisponibilizacao": "2026-07-07", "tipoComunicacao": "Intimação",
     "texto": "Fica a parte intimada da CONTESTAÇÃO apresentada pelo INSS."},
    {"id": 902, "numeroprocessocommascara": "5009876-54.2026.4.03.6100",
     "datadisponibilizacao": "2026-07-07", "tipoComunicacao": "Sentença",
     "texto": "JUIZADO ESPECIAL FEDERAL. Julgo procedente o pedido."},
    {"id": 903, "numeroprocessocommascara": "9999999-99.9999.9.99.9999",
     "datadisponibilizacao": "2026-07-07", "tipoComunicacao": "Despacho",
     "texto": "Manifestem-se as partes."},   # fora do escopo → ignorado
]
_MOCK_LAWSUITS = {
    "10023456720268260100": {"id": 555001, "customers": [{"name": "Maria Souza"}]},
    "50098765420264036100": {"id": 555002, "customers": [{"name": "João Ferreira"}]},
    # o 3º processo não existe na carteira → sem match
}


def _digitos(v) -> str:
    return pj.so_digitos(v)


def _req(method: str, url: str, corpo: dict | None = None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    headers = {"Authorization": f"Bearer {ADVBOX_TOKEN}", "Accept": "application/json",
               "User-Agent": UA}
    if dados is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=dados, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def buscar_djen(ini: dt.date, fim: dt.date, mock: bool) -> list[dict]:
    if mock:
        return list(_MOCK_DJEN)
    qs = urllib.parse.urlencode({
        "dataDisponibilizacaoInicio": ini.strftime("%Y-%m-%d"),
        "dataDisponibilizacaoFim": fim.strftime("%Y-%m-%d"),
        "numeroOab": _digitos(OAB), "ufOab": UF.upper(),
        "itensPorPagina": 100, "pagina": 1,
    })
    req = urllib.request.Request(f"{DJEN_API}?{qs}",
                                 headers={"Accept": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8", "replace")).get("items") or []


def indexar_lawsuits(mock: bool) -> dict:
    """Toda a carteira do AdvBox indexada por nº de processo (só dígitos)."""
    if mock:
        return dict(_MOCK_LAWSUITS)
    idx, offset, total = {}, 0, 0
    while True:
        d = _req("GET", f"{ADVBOX_URL}/lawsuits?limit=1000&offset={offset}")
        total = d.get("totalCount") or 0
        lote = d.get("data") or []
        for lw in lote:
            dig = _digitos(lw.get("process_number"))
            if dig:
                idx[dig] = lw
        offset += len(lote)
        if not lote or offset >= total:
            break
    return idx


def montar_comentario(c: dict, pub: dict, data_fatal: str) -> str:
    trecho = clf._remover_rodape(pub.get("texto") or "")[:400]
    reticencias = "…" if len(pub.get("texto") or "") > 400 else ""
    return (f"Prazo de {c['dias']} d.ú. detectado via DJEN em "
            f"{pub.get('datadisponibilizacao')} — {c['ato']}. "
            f"Data fatal real: {data_fatal} (margem de {MARGEM_DIAS_UTEIS} d.ú. "
            f"aplicada nesta tarefa). Trecho: \"{trecho}{reticencias}\" "
            f"(criado automaticamente pelo sentinela de prazos — confira antes de protocolar)")


def main() -> int:
    ap = argparse.ArgumentParser(description="SENTINELA-PRAZOS · DJEN → tarefa no AdvBox")
    ap.add_argument("--send", action="store_true", help="cria de verdade no AdvBox")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--mock", action="store_true", help="sem rede, dados de exemplo")
    ap.add_argument("--hoje")
    args = ap.parse_args()

    dry = not args.send
    hoje = pj.parse_data(args.hoje) or dt.date.today()
    ini = hoje - dt.timedelta(days=int(os.environ.get("DJEN_DIAS", "3")))

    pj.log(f"SENTINELA-PRAZOS · modo={'DRY' if dry else 'SEND'}"
           f"{' · MOCK' if args.mock else ''} · janela {pj.fmt_data(ini)}→{pj.fmt_data(hoje)}")
    if not args.mock and not dry and not ADVBOX_TOKEN:
        pj.log("❌ falta ADVBOX_TOKEN no ambiente — não dá pra criar tarefa."); return 2

    estado = pj.carregar_estado(ESTADO_JSON)

    # 1) publicações do DJEN dentro do escopo estreito, ainda não tratadas
    try:
        pubs = buscar_djen(ini, hoje, args.mock)
    except Exception as e:  # noqa: BLE001
        pj.log(f"❌ erro ao consultar o DJEN → {e}"); return 1

    candidatas = []
    for pub in pubs:
        pid = str(pub.get("id") or "")
        if pid and pid in estado:
            continue
        c = clf.classificar({
            "tipoDocumento": pub.get("tipoDocumento", ""),
            "tipoComunicacao": pub.get("tipoComunicacao", ""),
            "texto": pub.get("texto", ""),
        })
        alvo = ESCOPO.get(c["ato"])
        if alvo and c.get("dias"):
            candidatas.append((pub, c, alvo))

    pj.log(f"  publicações={len(pubs)} · candidatas no escopo={len(candidatas)}")
    if not candidatas:
        pj.log("fim · nada a criar" + ("  (DRY)" if dry else "")); return 0

    # 2) indexa a carteira do AdvBox p/ casar processo → lawsuit_id
    try:
        idx = indexar_lawsuits(args.mock)
    except Exception as e:  # noqa: BLE001
        pj.log(f"❌ erro ao listar a carteira do AdvBox → {e}"); return 1

    criadas = sem_match = 0
    for pub, c, alvo in candidatas:
        proc = pub.get("numeroprocessocommascara") or pub.get("numero_processo") or ""
        lw = idx.get(_digitos(proc))
        base = pj.parse_data(str(pub.get("datadisponibilizacao"))[:10])
        fatal = clf.data_fatal_uteis(base, c["dias"]) if base else None
        alvo_dt = clf.subtrair_dias_uteis(fatal, MARGEM_DIAS_UTEIS) if fatal else None

        if not lw:
            sem_match += 1
            pj.log(f"  ⚠️ {proc} · {c['ato']} — processo NÃO está na carteira do AdvBox "
                   f"(conferir à mão). Não marco como tratado; tento amanhã.")
            continue

        cliente = next((cu.get("name") for cu in (lw.get("customers") or []) if cu.get("name")), "?")
        fatal_iso = fatal.strftime("%Y-%m-%d")
        alvo_iso = alvo_dt.strftime("%Y-%m-%d")
        pj.log(f"  {'📝 criaria' if dry else '✅ criando'}: {alvo['nome']} p/ {cliente} "
               f"(proc {proc}) · venc {alvo_iso} · fatal {fatal_iso}")

        if dry:
            continue
        corpo = {
            "from": str(USER_SUPORTE), "guests": [USER_JONAS],
            "tasks_id": str(alvo["task_id"]), "lawsuits_id": str(lw["id"]),
            "start_date": alvo_iso, "comments": montar_comentario(c, pub, fatal_iso),
        }
        try:
            if args.mock:
                ok = True
            else:
                _req("POST", f"{ADVBOX_URL}/posts", corpo); ok = True
        except Exception as e:  # noqa: BLE001
            ok = False
            pj.log(f"    ❌ falha ao criar no AdvBox: {e}")
        if ok:
            estado[str(pub.get("id"))] = pj.fmt_data(hoje)
            criadas += 1

    if not dry:
        pj.salvar_estado(ESTADO_JSON, estado)

    pj.log(f"fim · criadas={criadas} · sem_match={sem_match}" + ("  (DRY)" if dry else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
