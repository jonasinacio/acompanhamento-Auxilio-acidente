#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ALARME-EMENDAS · o vigia de prazo fatal
=======================================

Roda 1x/dia pelo launchd. Lê a "mãe" de emendas e, para cada emenda ainda não
protocolada, dispara no grupo GERAL o alarme certo conforme os dias ÚTEIS que
faltam até o PRAZO_FATAL — escalando para o Jonas quando o prazo aperta e
NAGGANDO todo dia se já venceu sem protocolo. Carimba para não repetir os
alarmes de nível (o alarme de "vencido" repete de propósito, todo dia).

    python3 robo_emendas.py --dry     # mostra o que faria (padrão)
    python3 robo_emendas.py --send    # dispara de verdade e carimba
    python3 robo_emendas.py --send --hoje 2026-07-20
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj  # noqa: E402
import config as C     # noqa: E402


def ler_linha(ws, i, idx):
    def g(k):
        return ws.cell(row=i, column=idx[k]).value
    return {k: g(k) for k in C.COL}


def texto_classificar(l):
    return (f"📌 *EMENDA · classificar* (D+0)\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Prazo fatal: {pj.fmt_data(pj.parse_data(l['prazo_fatal']))}\n"
            f"*Natália:* classificar a emenda (simples/documental/jurídica/"
            f"estratégica) e abrir a tarefa no ADVBOX. Bia acompanha o prazo.")


def texto_doc(l):
    return (f"📎 *EMENDA · depende de documento*\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Prazo fatal: {pj.fmt_data(pj.parse_data(l['prazo_fatal']))}\n"
            f"*Bia/Natália:* acionar Pedro com lista objetiva e prazo. "
            f"Marcar DOC_OK=SIM na mãe quando o documento chegar.")


def texto_2du(l, du):
    return (f"⏳ *EMENDA · protocolar agora* (faltam {du} dias úteis)\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Prazo fatal: {pj.fmt_data(pj.parse_data(l['prazo_fatal']))}\n"
            f"SLA interno: protocolar até 2 dias úteis antes do fatal. "
            f"*Natália:* redigir e protocolar. *Bia:* confirmar baixa após comprovante.")


def texto_1du(l):
    return (f"🚨 *EMENDA CRÍTICA — ESCALAR JONAS* (falta 1 dia útil)\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Prazo fatal: {pj.fmt_data(pj.parse_data(l['prazo_fatal']))} — *vence no próximo dia útil* "
            f"e não consta protocolo. Natália + Jonas: ação imediata para não perder o prazo.")


def texto_fatal(l):
    return (f"🚨🚨 *EMENDA VENCE HOJE* 🚨🚨\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Prazo fatal: {pj.fmt_data(pj.parse_data(l['prazo_fatal']))} = HOJE. "
            f"Protocolar e dar baixa imediatamente. Sem protocolo = risco de indeferimento.")


def texto_vencido(l, du):
    return (f"❗️ *EMENDA VENCIDA HÁ {abs(du)} DIA(S) ÚTIL(EIS) — SEM PROTOCOLO* ❗️\n"
            f"Cliente: {l['cliente']}  ·  Proc: {l['processo']}\n"
            f"Prazo fatal era {pj.fmt_data(pj.parse_data(l['prazo_fatal']))}. "
            f"Jonas + Natália: verificar situação processual e providências urgentes. "
            f"(Este alarme se repete todo dia até PROTOCOLADA_EM ser preenchida.)")


def main() -> int:
    ap = argparse.ArgumentParser(description="ALARME-EMENDAS · vigia de prazo fatal")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--hoje")
    args = ap.parse_args()

    dry = not args.send
    hoje = pj.parse_data(args.hoje) or dt.date.today()

    pj.log(f"ALARME-EMENDAS · modo={'DRY' if dry else 'SEND'} · hoje={pj.fmt_data(hoje)}")
    pj.log(f"mãe: {C.MAE_XLSX} (aba {C.ABA})")

    wb, ws = pj.abrir_mae(C.MAE_XLSX, C.ABA)
    idx = pj.mapear_colunas(ws, C.COL)
    estado = pj.carregar_estado(C.ALERTAS_JSON)

    alarmes = pulados = baixadas = 0

    def dispara(l, i, nivel_id, carimbo_key, texto, diario=False):
        """Dispara 1 alarme com dedupe. diario=True re-alerta a cada dia."""
        nonlocal alarmes
        proc = str(l["processo"]).strip()
        chave = f"{proc}|{nivel_id}" + (f"|{pj.fmt_data(hoje)}" if diario else "")
        if not diario and carimbo_key and str(l.get("carimbos_" + carimbo_key) or "").strip():
            return  # já carimbado na mãe
        if chave in estado:
            return
        ok, info = pj.enviar_alerta_interno(texto, dry)
        pj.log(f"  {'✅' if ok else '❌'} {proc} · {nivel_id} → GERAL [{info}]")
        if dry:
            print("     ┌─ prévia ─────────────────────────────────")
            for ln in texto.splitlines():
                print(f"     │ {ln}")
            print("     └──────────────────────────────────────────")
        if ok and not dry:
            estado[chave] = pj.fmt_data(hoje)
            if carimbo_key:
                ws.cell(row=i, column=idx[carimbo_key]).value = pj.carimbo_agora(hoje)
        alarmes += 1

    for i in range(2, ws.max_row + 1):
        l = ler_linha(ws, i, idx)
        proc = str(l["processo"] or "").strip()
        if not proc:
            continue

        # trava: já protocolada/baixada → silêncio
        if (pj.norm(l["status"]) in {pj.norm(s) for s in C.STATUS_BAIXADA}
                or str(l["protocolada_em"] or "").strip()):
            baixadas += 1
            continue
        # trava: status que pula
        if pj.norm(l["status"]) in {pj.norm(s) for s in C.STATUS_PULA}:
            pulados += 1
            continue

        # facilita o acesso aos carimbos por chave
        for niv in C.NIVEIS:
            l["carimbos_" + niv["carimbo"]] = l[niv["carimbo"]]

        # 1) classificar (condicional)
        if not str(l["classificacao"] or "").strip():
            dispara(l, i, "CLASSIFICAR", "a_classificar", texto_classificar(l))

        # 2) depende de documento e ainda sem doc (condicional)
        if pj.norm(l["depende_doc"]) == "SIM" and pj.norm(l["doc_ok"]) != "SIM":
            dispara(l, i, "DOC", "a_doc", texto_doc(l))

        # 3) alarmes por proximidade do prazo fatal
        pf = pj.parse_data(l["prazo_fatal"])
        if not pf:
            chave = f"{proc}|SEM_FATAL"
            if chave not in estado:
                dispara(l, i, "SEM_FATAL", "",
                        (f"⚠️ *EMENDA sem PRAZO_FATAL* · {l['cliente']} (proc {proc}). "
                         f"Natália: registrar o prazo fatal na mãe — sem isso o alarme não roda."))
            continue

        du = pj.dias_uteis_entre(hoje, pf)  # >0 faltam; 0 hoje; <0 já venceu
        if du < 0:
            dispara(l, i, "VENCIDO", "", texto_vencido(l, du), diario=True)
        elif du == 0:
            dispara(l, i, "AL_FATAL", "a_hoje", texto_fatal(l))
        elif du == 1:
            dispara(l, i, "AL_1DU", "a_d1", texto_1du(l))
        elif du <= C.SLA_PROTOCOLO_DU:  # 2 dias úteis (o SLA)
            dispara(l, i, "AL_2DU", "a_d2", texto_2du(l, du))

    if not dry:
        pj.backup_mae(C.MAE_XLSX, C.LOG_DIR)
        wb.save(C.MAE_XLSX)
        pj.salvar_estado(C.ALERTAS_JSON, estado)

    pj.log(f"fim · alarmes={alarmes} · protocoladas(silêncio)={baixadas} · pulados={pulados}"
           + ("  (DRY)" if dry else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
