#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Descobre o JID dos seus grupos de WhatsApp na uazapi (GET /group/list).
Serve pra achar o JID do grupo GERAL e colar em UAZAPI_GRUPO_GERAL no .env.

Pré-requisito: a instância CONECTADA (🟢) e o número já DENTRO do grupo.
Lê UAZAPI_URL / UAZAPI_TOKEN do .env (o token é o DA INSTÂNCIA, não o Admin).

    python3 descobrir_grupo.py            # lista todos os grupos
    python3 descobrir_grupo.py geral      # só os que têm "geral" no nome
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

import pj_comum as pj  # dispara a carga do .env e traz UAZAPI_URL / UAZAPI_TOKEN


def buscar_grupos() -> list[dict]:
    url = f"{pj.UAZAPI_URL}/group/list?noparticipants=true"
    req = urllib.request.Request(url, headers={"token": pj.UAZAPI_TOKEN})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8", "replace"))
    return data.get("groups") or []


def main() -> int:
    filtro = " ".join(sys.argv[1:]).strip().lower()

    if not (pj.UAZAPI_URL and pj.UAZAPI_TOKEN):
        print("❌ Falta UAZAPI_URL / UAZAPI_TOKEN no .env "
              "(use o token DA INSTÂNCIA, não o Admin Token).")
        return 2

    try:
        grupos = buscar_grupos()
    except urllib.error.HTTPError as e:
        detalhe = ""
        try:
            detalhe = e.read().decode("utf-8", "replace")[:200]
        except Exception:  # noqa: BLE001
            pass
        print(f"❌ Erro HTTP {e.code}: {detalhe}")
        if e.code in (401, 403):
            print("   Token inválido? Confira que é o token da INSTÂNCIA conectada.")
        return 1
    except Exception as e:  # noqa: BLE001
        print(f"❌ Erro ao falar com a uazapi: {e}")
        return 1

    linhas = []
    for g in grupos:
        nome = (g.get("Name") or "(sem nome)").strip()
        jid = g.get("JID") or ""
        if filtro and filtro not in nome.lower():
            continue
        linhas.append((nome, jid))
    linhas.sort(key=lambda x: x[0].lower())

    if not linhas:
        alvo = f" com '{filtro}'" if filtro else ""
        print(f"Nenhum grupo{alvo} encontrado.")
        print("Dica: o número conectado precisa ESTAR no grupo. "
              "Rode sem filtro para ver todos.")
        return 0

    print(f"\n{len(linhas)} grupo(s) — copie a linha do grupo GERAL pro seu .env:\n")
    for nome, jid in linhas:
        print(f"  • {nome}")
        print(f"      UAZAPI_GRUPO_GERAL={jid}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
