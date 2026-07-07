#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PUXA-ADVBOX · a boca (fase 2)
=============================

Irmão do `puxa_advbox.py` do ARAUTO. Puxa do AdvBox e ACRESCENTA nas "mães" o
que ainda não existe — para as planilhas se preencherem sozinhas, em vez de na
mão. Regra de ouro do ARAUTO: **casa pelo nº do processo e só acrescenta o que
não existe; NUNCA sobrescreve célula preenchida nem toca em carimbo.**

Fontes (API AdvBox — base https://api.softwareadvbox.com.br, Bearer token):
  • /posts     (tarefas)   → roteadas por TIPO para a mãe de perícia ou emenda
  • /lawsuits  (processos) → alimentam a mãe de casos (status/fase)

Uso:
    python3 puxa_advbox.py --dry               # mostra o que acrescentaria (padrão)
    python3 puxa_advbox.py --write             # grava nas mães (com backup)
    python3 puxa_advbox.py --dry --mock        # usa dados de exemplo, sem token
    python3 puxa_advbox.py --write --destino pericia   # só uma mãe

⚠️  DOIS pontos dependem da sua conta AdvBox — e são o ÚNICO trabalho que falta
    pra ligar isto de verdade. Estão marcados com «AJUSTE» mais abaixo:
      1) buscar_posts() / buscar_lawsuits() — o formato exato do JSON;
      2) os mapas MAPA_* — quais chaves do AdvBox caem em quais colunas da mãe.
    Compare com o `puxa_advbox.py` que o seu ARAUTO já usa e acerte 1:1.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
import pj_comum as pj  # noqa: E402

try:
    import openpyxl
except ImportError:
    print("Falta openpyxl. Rode:  pip3 install openpyxl", file=sys.stderr)
    sys.exit(2)


# ----------------------------------------------------------------------
# AdvBox — credenciais (só por env) e cliente HTTP
# ----------------------------------------------------------------------
ADVBOX_ENDPOINT = os.environ.get("ADVBOX_ENDPOINT", "https://api.softwareadvbox.com.br")
ADVBOX_TOKEN    = os.environ.get("ADVBOX_TOKEN", "")


def _get(path: str, params: dict | None = None) -> list[dict]:
    """GET paginado no AdvBox com Bearer token. Retorna lista de itens."""
    import urllib.request
    import urllib.parse
    itens, page = [], 1
    while True:
        q = dict(params or {})
        q["page"] = page
        url = f"{ADVBOX_ENDPOINT.rstrip('/')}/{path.lstrip('/')}?" + urllib.parse.urlencode(q)
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {ADVBOX_TOKEN}",
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=45) as r:
            data = json.loads(r.read().decode())
        # «AJUSTE» — o AdvBox pode devolver {"data":[...]} ou lista direta.
        lote = data.get("data", data) if isinstance(data, dict) else data
        if not lote:
            break
        itens.extend(lote)
        if len(lote) < 50:   # última página (ajuste ao page-size real)
            break
        page += 1
    return itens


# «AJUSTE 1» — troque o corpo destas duas funções pelo fetch real do seu ARAUTO.
def buscar_posts(mock: bool) -> list[dict]:
    if mock:
        return _MOCK_POSTS
    if not ADVBOX_TOKEN:
        pj.log("⚠️  ADVBOX_TOKEN vazio — use --mock ou exporte o token.")
        return []
    return _get("/posts")


def buscar_lawsuits(mock: bool) -> list[dict]:
    if mock:
        return _MOCK_LAWSUITS
    if not ADVBOX_TOKEN:
        return []
    return _get("/lawsuits")


# ----------------------------------------------------------------------
# «AJUSTE 2» — mapas: chave do AdvBox  ->  chave lógica da coluna na mãe
# (as chaves lógicas são as de C.COL de cada robô). Só as que o AdvBox fornece;
# o resto (carimbos, campos manuais) fica em branco e o robô/pessoa preenche.
# ----------------------------------------------------------------------
# Tipos de tarefa (campo "task"/"tasks_id") que roteiam pra cada mãe.
TIPOS_PERICIA = {"perícia", "pericia", "perícia médica", "pericia medica"}
TIPOS_EMENDA  = {"emenda", "emenda judicial", "intimação de emenda", "intimacao de emenda"}

MAPA_PERICIA = {
    "lawsuit":  "processo",     # nº do processo
    "customer": "cliente",
    "phone":    "telefone",
    "date":     "data",         # data da perícia
    "hour":     "hora",
    "local":    "local",
    "type":     "tipo",
}
MAPA_EMENDA = {
    "lawsuit":   "processo",
    "customer":  "cliente",
    "date":      "intimacao",   # data da intimação
    "deadline":  "prazo_fatal", # prazo fatal (AdvBox: prazo da tarefa)
}
MAPA_CASOS = {
    "lawsuit":   "processo",
    "customer":  "cliente",
    "status":    "status",
    "status_at": "status_desde",
}


# ----------------------------------------------------------------------
# carrega os config dos robôs (cada um numa subpasta)
# ----------------------------------------------------------------------
def _carrega_config(subpasta: str):
    caminho = os.path.join(BASE, subpasta, "config.py")
    spec = importlib.util.spec_from_file_location(f"cfg_{subpasta}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


DESTINOS = {
    "pericia": {"sub": "avisos-pericia", "mapa": MAPA_PERICIA},
    "emenda":  {"sub": "alarme-emendas", "mapa": MAPA_EMENDA},
    "casos":   {"sub": "gatilhos-status", "mapa": MAPA_CASOS},
}


def norm_proc(v) -> str:
    return "".join(ch for ch in str(v or "") if ch.isalnum())


def traduz(item: dict, mapa: dict) -> dict:
    """AdvBox dict -> {chave_logica: valor} conforme o mapa."""
    out = {}
    for k_adv, k_col in mapa.items():
        if item.get(k_adv) not in (None, ""):
            out[k_col] = item[k_adv]
    return out


# ----------------------------------------------------------------------
# merge numa mãe: casa por processo; só acrescenta o que falta
# ----------------------------------------------------------------------
def merge_mae(cfg, registros: list[dict], dry: bool) -> tuple[int, int]:
    xlsx, aba, COL = cfg.MAE_XLSX, cfg.ABA, cfg.COL

    if not os.path.exists(xlsx):
        # bootstrap: cria só o cabeçalho (o robô/pessoa preenche o resto)
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = aba
        ws.append(list(COL.values()))
        wb.save(xlsx)
        pj.log(f"  (criei a mãe vazia com cabeçalho: {os.path.basename(xlsx)})")

    wb, ws = pj.abrir_mae(xlsx, aba)
    idx = pj.mapear_colunas(ws, COL)

    # índice processo -> linha
    col_proc = idx["processo"]
    linha_de = {}
    for i in range(2, ws.max_row + 1):
        p = norm_proc(ws.cell(row=i, column=col_proc).value)
        if p:
            linha_de[p] = i

    novos = preenchidos = 0
    for reg in registros:
        p = norm_proc(reg.get("processo"))
        if not p:
            continue
        if p not in linha_de:
            # linha nova
            i = ws.max_row + 1
            for chave, valor in reg.items():
                if chave in idx and idx[chave]:
                    ws.cell(row=i, column=idx[chave]).value = valor
            linha_de[p] = i
            novos += 1
            pj.log(f"  + novo: {reg.get('processo')} · {reg.get('cliente','')}")
        else:
            # existe: preenche só célula VAZIA (self-heal), nunca sobrescreve
            i = linha_de[p]
            faltou = []
            for chave, valor in reg.items():
                if chave not in idx or not idx[chave]:
                    continue
                atual = ws.cell(row=i, column=idx[chave]).value
                if str(atual or "").strip() == "" and str(valor or "").strip() != "":
                    ws.cell(row=i, column=idx[chave]).value = valor
                    faltou.append(COL[chave])
            if faltou:
                preenchidos += 1
                pj.log(f"  ~ completei {reg.get('processo')}: {', '.join(faltou)}")

    if not dry and (novos or preenchidos):
        pj.backup_mae(xlsx, cfg.LOG_DIR)
        wb.save(xlsx)
    return novos, preenchidos


# ----------------------------------------------------------------------
# roteia posts por tipo
# ----------------------------------------------------------------------
def rotear_posts(posts: list[dict]) -> dict[str, list[dict]]:
    saida = {"pericia": [], "emenda": []}
    for post in posts:
        tipo = pj.norm(post.get("task") or post.get("type") or "")
        tipo_l = tipo.lower()
        if any(t in tipo_l for t in TIPOS_PERICIA):
            saida["pericia"].append(traduz(post, MAPA_PERICIA))
        elif any(t in tipo_l for t in TIPOS_EMENDA):
            saida["emenda"].append(traduz(post, MAPA_EMENDA))
    return saida


def main() -> int:
    ap = argparse.ArgumentParser(description="PUXA-ADVBOX · preenche as mães a partir do AdvBox")
    ap.add_argument("--write", action="store_true", help="grava nas mães (padrão: --dry)")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--mock", action="store_true", help="usa dados de exemplo, sem chamar a API")
    ap.add_argument("--destino", choices=["pericia", "emenda", "casos", "todos"], default="todos")
    args = ap.parse_args()

    dry = not args.write
    pj.log(f"PUXA-ADVBOX · modo={'DRY' if dry else 'WRITE'}"
           f"{' · MOCK' if args.mock else ''} · destino={args.destino}")

    alvos = ["pericia", "emenda", "casos"] if args.destino == "todos" else [args.destino]

    # posts -> pericia/emenda
    if {"pericia", "emenda"} & set(alvos):
        roteado = rotear_posts(buscar_posts(args.mock))
        for d in ("pericia", "emenda"):
            if d in alvos:
                cfg = _carrega_config(DESTINOS[d]["sub"])
                pj.log(f"[{d}] {len(roteado[d])} tarefa(s) do AdvBox")
                n, c = merge_mae(cfg, roteado[d], dry)
                pj.log(f"[{d}] novos={n} · completados={c}")

    # lawsuits -> casos
    if "casos" in alvos:
        cfg = _carrega_config(DESTINOS["casos"]["sub"])
        regs = [traduz(x, MAPA_CASOS) for x in buscar_lawsuits(args.mock)]
        pj.log(f"[casos] {len(regs)} processo(s) do AdvBox")
        n, c = merge_mae(cfg, regs, dry)
        pj.log(f"[casos] novos={n} · completados={c}")

    pj.log("fim" + ("  (DRY — nada gravado)" if dry else ""))
    return 0


# ----------------------------------------------------------------------
# dados de exemplo p/ --mock (o shape é o que buscar_*() deve devolver)
# ----------------------------------------------------------------------
_MOCK_POSTS = [
    {"task": "Perícia médica", "lawsuit": "0000123-45.2026.4.03.6300",
     "customer": "Maria Aparecida de Souza", "phone": "5511999990001",
     "date": "22/07/2026", "hour": "09:30",
     "local": "Av. Paulista, 1000 - Perito Dr. Silva - São Paulo/SP", "type": "Judicial"},
    {"task": "Emenda judicial", "lawsuit": "0000987-65.2026.4.03.6300",
     "customer": "João Carlos Ferreira", "date": "05/07/2026", "deadline": "17/07/2026"},
    {"task": "Audiência de instrução", "lawsuit": "0000555-55.2026.4.03.6300",
     "customer": "Fulano (ignorado — não é perícia nem emenda)"},
]
_MOCK_LAWSUITS = [
    {"lawsuit": "0000123-45.2026.4.03.6300", "customer": "Maria Aparecida de Souza",
     "status": "PERICIA DESIGNADA", "status_at": "07/07/2026"},
    {"lawsuit": "0000987-65.2026.4.03.6300", "customer": "João Carlos Ferreira",
     "status": "EMENDA PENDENTE", "status_at": "05/07/2026"},
]


if __name__ == "__main__":
    sys.exit(main())
