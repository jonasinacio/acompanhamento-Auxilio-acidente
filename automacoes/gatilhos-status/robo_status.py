#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GATILHOS-STATUS · o maestro de status
=====================================

Roda 1x/dia pelo launchd. Compara o STATUS atual de cada caso na "mãe" com o
último que viu (guardado no estado JSON). Quando muda, dispara no grupo GERAL a
*tarefa obrigatória* daquele status (tabela 14). Em paralelo, mede há quantos
dias úteis o caso está parado no status atual e, se passou do SLA, joga no
painel de exceção — reavisando periodicamente enquanto continuar estourado.

    python3 robo_status.py --dry      # mostra o que faria (padrão)
    python3 robo_status.py --send     # dispara de verdade e grava o estado
    python3 robo_status.py --send --hoje 2026-07-20

Na PRIMEIRA rodada com --send o robô só registra os status atuais como
"linha de base" (sem disparar gatilho retroativo). A partir daí, só o que mudar
dispara. Use --disparar-primeira p/ forçar gatilho já na primeira rodada.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj  # noqa: E402
import config as C     # noqa: E402


def texto_gatilho(status_norm, l):
    g = C.GATILHOS[status_norm]
    return (f"🔔 *STATUS → {status_norm}*\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"*{g['quem']}:* {g['tarefa']}")


def texto_atraso(status_norm, l, du_parado, sla):
    return (f"⏰ *ATRASO DE SLA — painel de exceção*\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Status *{status_norm}* há *{du_parado} dias úteis* (SLA: {sla}). "
            f"Responsável da etapa: retomar ou justificar na reunião semanal.")


def main() -> int:
    ap = argparse.ArgumentParser(description="GATILHOS-STATUS · maestro de status")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--hoje")
    ap.add_argument("--disparar-primeira", action="store_true",
                    help="dispara gatilho já na 1ª rodada (padrão: só cria linha de base)")
    args = ap.parse_args()

    dry = not args.send
    hoje = pj.parse_data(args.hoje) or dt.date.today()

    pj.log(f"GATILHOS-STATUS · modo={'DRY' if dry else 'SEND'} · hoje={pj.fmt_data(hoje)}")
    pj.log(f"mãe: {C.MAE_XLSX} (aba {C.ABA})")

    wb, ws = pj.abrir_mae(C.MAE_XLSX, C.ABA)
    idx = pj.mapear_colunas(ws, C.COL)
    estado = pj.carregar_estado(C.ALERTAS_JSON)
    visto = estado.setdefault("ultimo_status", {})   # processo -> status_norm
    primeira_vez = not visto  # estado vazio = primeira rodada

    gatilhos = atrasos = pulados = mudancas = 0

    def alerta(texto, tag_log):
        ok, info = pj.enviar_alerta_interno(texto, dry)
        pj.log(f"  {'✅' if ok else '❌'} {tag_log} → GERAL [{info}]")
        if dry:
            print("     ┌─ prévia ─────────────────────────────────")
            for ln in texto.splitlines():
                print(f"     │ {ln}")
            print("     └──────────────────────────────────────────")
        return ok

    for i in range(2, ws.max_row + 1):
        l = {k: ws.cell(row=i, column=idx[k]).value for k in C.COL}
        proc = str(l["processo"] or "").strip()
        if not proc:
            continue

        status_norm = pj.norm(l["status"])
        if not status_norm or status_norm in {pj.norm(s) for s in C.STATUS_PULA}:
            pulados += 1
            continue

        # 1) MUDANÇA DE STATUS → gatilho
        anterior = visto.get(proc)
        if anterior != status_norm:
            mudancas += 1
            deve_disparar = (not primeira_vez) or args.disparar_primeira
            if deve_disparar and status_norm in C.GATILHOS:
                if alerta(texto_gatilho(status_norm, l), f"{proc} gatilho {status_norm}"):
                    gatilhos += 1
            if not dry:
                visto[proc] = status_norm  # atualiza linha de base

        # 2) ATRASO DE SLA
        sla = C.SLA_DIAS_UTEIS.get(status_norm)
        desde = pj.parse_data(l["status_desde"])
        if sla and desde:
            du_parado = pj.dias_uteis_entre(desde, hoje)  # quantos d.ú. no status
            if du_parado > sla:
                # reavisa a cada REAVISO_ATRASO_DU dias úteis de atraso
                excesso = du_parado - sla
                bucket = excesso // C.REAVISO_ATRASO_DU
                chave = f"{proc}|ATRASO|{status_norm}|{bucket}"
                if chave not in estado:
                    if alerta(texto_atraso(status_norm, l, du_parado, sla),
                              f"{proc} ATRASO {status_norm} ({du_parado}du)"):
                        atrasos += 1
                        if not dry:
                            estado[chave] = pj.fmt_data(hoje)

    if not dry:
        pj.salvar_estado(C.ALERTAS_JSON, estado)

    base = "  (linha de base criada — gatilhos valem a partir da próxima rodada)" \
        if (primeira_vez and not args.disparar_primeira) else ""
    pj.log(f"fim · gatilhos={gatilhos} · atrasos={atrasos} · mudanças={mudancas} · pulados={pulados}"
           + ("  (DRY)" if dry else base))
    return 0


if __name__ == "__main__":
    sys.exit(main())
