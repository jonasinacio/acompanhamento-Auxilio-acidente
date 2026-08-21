#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARAUTO-PERÍCIA · o disparador
=============================

Irmão do robô de avisos de audiência (ARAUTO). Roda 1x/dia pelo launchd:
lê a planilha "mãe", decide o marco de cada perícia pela régua fechada
(D-15 / D-9 Pedro / D-7 / D-2 / D+1), dispara o WhatsApp certo ao cliente
— ou o alerta interno no grupo GERAL — tudo via uazapi, e CARIMBA a
mãe para nunca repetir o mesmo aviso.

Uso:
    python3 robo_pericias.py --dry     # mostra o que FARIA, não envia nada
    python3 robo_pericias.py --send    # envia de verdade e carimba a mãe
    python3 robo_pericias.py --send --hoje 2026-07-20   # simula outro "hoje"

Sem --send ele é --dry por padrão (trava de segurança, igual ARAUTO).
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sys

# lib comum (mora na pasta pai automacoes/)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj  # noqa: E402
import config as C     # noqa: E402


# ======================================================================
# RÉGUA — decide e monta os marcos do dia
# ======================================================================
def montar_checklist(linha: dict) -> str:
    itens = list(C.CHECKLIST_BASE)
    if pj.norm(linha.get("acidentaria")) == "SIM":
        itens += C.CHECKLIST_ACIDENTARIA
    return "\n".join(f"• {i}" for i in itens)


def montar_texto(marco: dict, linha: dict, data_pericia: dt.date) -> str:
    tpl = C.TEMPLATES[marco["template"]]
    return tpl.format(
        cliente=linha.get("cliente", ""),
        primeiro_nome=pj.primeiro_nome(linha.get("cliente", "")),
        processo=linha.get("processo", ""),
        data=pj.fmt_data(data_pericia),
        hora=str(linha.get("hora") or "").strip(),
        local=str(linha.get("local") or "").strip(),
        checklist=montar_checklist(linha),
    )


def marcos_do_dia(data_pericia: dt.date, hoje: dt.date, ja_carimbados: set) -> list[dict]:
    """
    Decide QUAIS marcos disparar hoje para esta perícia.
    - considera o offset + janela de tolerância de cada marco;
    - ignora marcos já carimbados;
    - CLIENTE: no máximo 1 por dia — se mais de um elegível, vence o MAIS
      PRÓXIMO da perícia (Regra 5 do ARAUTO: nunca 2 mensagens coladas ao mesmo
      cliente);
    - INTERNO: dispara independente do canal cliente (público diferente — o
      grupo GERAL) e independente entre si; cada um só sai 1x (dedupe carimbo).
    """
    cliente_elegiveis = []
    internos = []
    for m in C.MARCOS:
        if m["id"] in ja_carimbados:
            continue
        alvo = data_pericia + dt.timedelta(days=m["offset"])
        atraso = (hoje - alvo).days  # 0 = no ponto; >0 dentro da janela de catch-up
        if not (0 <= atraso <= m["janela"]):
            continue
        if m["canal"] == "cliente":
            cliente_elegiveis.append((abs(m["offset"]), m))
        else:
            internos.append(m)

    saida = list(internos)
    if cliente_elegiveis:
        cliente_elegiveis.sort(key=lambda x: x[0])  # mais próximo da perícia primeiro
        saida.append(cliente_elegiveis[0][1])
    return saida


# ======================================================================
# MÃE — leitura de linha
# ======================================================================
def ler_linha(ws, i: int, idx: dict) -> dict:
    def get(chave):
        return ws.cell(row=i, column=idx[chave]).value
    return {
        "processo": get("processo"),
        "cliente": get("cliente"),
        "telefone": get("telefone"),
        "data": get("data"),
        "hora": get("hora"),
        "local": get("local"),
        "tipo": get("tipo"),
        "acidentaria": get("acidentaria"),
        "status": get("status"),
        "carimbos": {m["id"]: get(m["carimbo"]) for m in C.MARCOS},
    }


# ======================================================================
# MAIN
# ======================================================================
def main() -> int:
    ap = argparse.ArgumentParser(description="ARAUTO-PERÍCIA · disparador de avisos de perícia")
    ap.add_argument("--send", action="store_true", help="envia de verdade e carimba a mãe")
    ap.add_argument("--dry", action="store_true", help="só mostra o que faria (padrão)")
    ap.add_argument("--hoje", help="simula a data de hoje (aaaa-mm-dd)")
    args = ap.parse_args()

    dry = not args.send  # padrão é seguro
    hoje = pj.parse_data(args.hoje) or dt.date.today()

    pj.log(f"ARAUTO-PERÍCIA · modo={'DRY' if dry else 'SEND'} · hoje={pj.fmt_data(hoje)}")
    pj.log(f"mãe: {C.MAE_XLSX}  (aba {C.ABA})")

    wb, ws = pj.abrir_mae(C.MAE_XLSX, C.ABA)
    idx = pj.mapear_colunas(ws, C.COL)
    estado = pj.carregar_estado(C.ALERTAS_JSON)

    disparos = alertas = pulados = 0

    for i in range(2, ws.max_row + 1):
        linha = ler_linha(ws, i, idx)
        proc = str(linha["processo"] or "").strip()
        if not proc:
            continue

        # trava natural: STATUS manda
        if pj.norm(linha["status"]) in {pj.norm(s) for s in C.STATUS_PULA}:
            pulados += 1
            continue

        data_p = pj.parse_data(linha["data"])
        if not data_p:
            chave = f"{proc}|SEM_DATA"
            if chave not in estado:
                txt = (f"⚠️ *ARAUTO-PERÍCIA* · {linha['cliente']} (proc {proc}) "
                       f"está sem DATA_PERICIA preenchida. Natália: registrar a data.")
                ok, info = pj.enviar_alerta_interno(txt, dry)
                pj.log(f"  ⚠️  {proc} sem data → alerta interno [{info}]")
                if ok and not dry:
                    estado[chave] = pj.fmt_data(hoje)
                alertas += 1
            continue

        ja = {mid for mid, v in linha["carimbos"].items() if str(v or "").strip()}
        for marco in marcos_do_dia(data_p, hoje, ja):
            # trava: marco de cliente exige data+hora+local prontos
            faltam = [C.COL[c] for c in marco["exige"]
                      if not str(linha.get(c) or "").strip()]
            if faltam and marco["canal"] == "cliente":
                chave = f"{proc}|{marco['id']}|FALTA"
                if chave not in estado:
                    txt = (f"⚠️ *ARAUTO-PERÍCIA* · {linha['cliente']} (proc {proc}): "
                           f"marco {marco['id']} não saiu — falta {', '.join(faltam)}.")
                    ok, info = pj.enviar_alerta_interno(txt, dry)
                    pj.log(f"  ⚠️  {proc} {marco['id']} incompleto ({', '.join(faltam)}) → alerta [{info}]")
                    if ok and not dry:
                        estado[chave] = pj.fmt_data(hoje)
                    alertas += 1
                continue

            texto = montar_texto(marco, linha, data_p)

            # DISPARO
            if marco["canal"] == "cliente":
                tel = pj.so_digitos(linha["telefone"])
                if not tel:
                    chave = f"{proc}|{marco['id']}|SEM_TEL"
                    if chave not in estado:
                        txt = (f"⚠️ *ARAUTO-PERÍCIA* · {linha['cliente']} (proc {proc}): "
                               f"marco {marco['id']} pronto mas SEM TELEFONE. "
                               f"Pedro/Bia: preencher o WhatsApp na mãe.")
                        ok, info = pj.enviar_alerta_interno(txt, dry)
                        pj.log(f"  ⚠️  {proc} {marco['id']} sem telefone → alerta [{info}]")
                        if ok and not dry:
                            estado[chave] = pj.fmt_data(hoje)
                        alertas += 1
                    continue
                ok, info = pj.enviar_whatsapp_cliente(tel, texto, dry)
                destino = f"cliente {tel}"
            else:
                ok, info = pj.enviar_alerta_interno(texto, dry)
                destino = "grupo GERAL"

            pj.log(f"  {'✅' if ok else '❌'} {proc} · {marco['id']} → {destino} [{info}]")
            if dry:
                print("     ┌─ prévia ─────────────────────────────────")
                for ln in texto.splitlines():
                    print(f"     │ {ln}")
                print("     └──────────────────────────────────────────")

            # CARIMBO — só grava se enviou de verdade e deu certo
            if ok and not dry:
                ws.cell(row=i, column=idx[marco["carimbo"]]).value = pj.carimbo_agora(hoje)
                estado[f"{proc}|{marco['id']}"] = pj.fmt_data(hoje)

            if marco["canal"] == "interno":
                alertas += 1
            else:
                disparos += 1

    if not dry:
        pj.backup_mae(C.MAE_XLSX, C.LOG_DIR)
        wb.save(C.MAE_XLSX)
        pj.salvar_estado(C.ALERTAS_JSON, estado)

    pj.log(f"fim · disparos cliente={disparos} · alertas internos={alertas} · pulados={pulados}"
           + ("  (DRY — nada foi enviado nem carimbado)" if dry else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
