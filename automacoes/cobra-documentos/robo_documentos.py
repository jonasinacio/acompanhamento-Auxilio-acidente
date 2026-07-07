#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COBRA-DOCUMENTOS · o cobrador
=============================

Roda 1x/dia. Para cada caso aguardando documentos, manda ao cliente o lembrete
certo da régua (D+3/D+7/D+12) com a lista do que falta, escala pro Pedro em
D+10, e carimba para não repetir. Se o robô ficou parado e vários lembretes
venceram, manda só o MAIS AVANÇADO e marca os anteriores como já passados —
nada de mandar o "lembrete gentil" uma semana atrasado.

    python3 robo_documentos.py --dry      # mostra o que faria (padrão)
    python3 robo_documentos.py --send      # envia e carimba
    python3 robo_documentos.py --send --hoje 2026-07-20
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj  # noqa: E402
import config as C     # noqa: E402


def formata_lista(docs: str) -> str:
    """'RG; CPF; laudo' -> '• RG\n• CPF\n• laudo'. Aceita ; ou quebra de linha."""
    bruto = str(docs or "").replace("\n", ";")
    itens = [x.strip() for x in bruto.split(";") if x.strip()]
    return "\n".join(f"• {i}" for i in itens) if itens else "• (documentos combinados)"


def montar_texto(marco, linha, solicitado):
    tpl = C.TEMPLATES[marco["template"]]
    return tpl.format(
        cliente=linha.get("cliente", ""),
        primeiro_nome=pj.primeiro_nome(linha.get("cliente", "")),
        processo=linha.get("processo", ""),
        solicitado=pj.fmt_data(solicitado),
        lista=formata_lista(linha.get("docs")),
    )


def marcos_do_dia(solicitado, hoje, ja):
    """
    Lembretes de cliente: manda só o MAIS AVANÇADO dos vencidos e devolve também
    os anteriores vencidos p/ carimbar como 'passados' (não reenviar atrasado).
    Interno (escala): independente, dispara se vencido e não carimbado.
    Retorna (marco_cliente|None, [marcos_cliente_a_pular], [marcos_internos]).
    """
    cliente_vencidos, internos = [], []
    for m in C.MARCOS:
        if m["id"] in ja:
            continue
        alvo = solicitado + dt.timedelta(days=m["offset"])
        atraso = (hoje - alvo).days
        if not (0 <= atraso <= m["janela"]):
            continue
        if m["canal"] == "cliente":
            cliente_vencidos.append(m)
        else:
            internos.append(m)

    cliente_vencidos.sort(key=lambda m: m["offset"])
    escolhido = cliente_vencidos[-1] if cliente_vencidos else None
    pular = cliente_vencidos[:-1] if cliente_vencidos else []
    return escolhido, pular, internos


def ler_linha(ws, i, idx):
    def g(k):
        return ws.cell(row=i, column=idx[k]).value
    base = {k: g(k) for k in C.COL if not k.startswith("c_")}
    base["carimbos"] = {m["id"]: g(m["carimbo"]) for m in C.MARCOS}
    return base


def main() -> int:
    ap = argparse.ArgumentParser(description="COBRA-DOCUMENTOS · cobrador de documentos")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--hoje")
    args = ap.parse_args()

    dry = not args.send
    hoje = pj.parse_data(args.hoje) or dt.date.today()

    pj.log(f"COBRA-DOCUMENTOS · modo={'DRY' if dry else 'SEND'} · hoje={pj.fmt_data(hoje)}")
    pj.log(f"mãe: {C.MAE_XLSX} (aba {C.ABA})")

    wb, ws = pj.abrir_mae(C.MAE_XLSX, C.ABA)
    idx = pj.mapear_colunas(ws, C.COL)
    estado = pj.carregar_estado(C.ALERTAS_JSON)

    lembretes = alertas = pulados = completos = 0

    def carimba(i, marco):
        if not dry:
            ws.cell(row=i, column=idx[marco["carimbo"]]).value = pj.carimbo_agora(hoje)
            estado[f"{proc}|{marco['id']}"] = pj.fmt_data(hoje)

    for i in range(2, ws.max_row + 1):
        linha = ler_linha(ws, i, idx)
        proc = str(linha["processo"] or "").strip()
        if not proc:
            continue

        if (pj.norm(linha["status"]) in {pj.norm(s) for s in C.STATUS_COMPLETO}
                or str(linha["recebido"] or "").strip()):
            completos += 1
            continue
        if pj.norm(linha["status"]) in {pj.norm(s) for s in C.STATUS_PULA}:
            pulados += 1
            continue

        solicitado = pj.parse_data(linha["solicitado"])
        if not solicitado:
            chave = f"{proc}|SEM_SOLIC"
            if chave not in estado:
                ok, info = pj.enviar_alerta_interno(
                    f"⚠️ *COBRA-DOCUMENTOS* · {linha['cliente']} (proc {proc}) sem "
                    f"SOLICITADO_EM. Pedro/Bia: registrar a data em que os documentos "
                    f"foram pedidos.", dry)
                pj.log(f"  ⚠️  {proc} sem data de solicitação → alerta [{info}]")
                if ok and not dry:
                    estado[chave] = pj.fmt_data(hoje)
                alertas += 1
            continue

        ja = {mid for mid, v in linha["carimbos"].items() if str(v or "").strip()}
        escolhido, pular, internos = marcos_do_dia(solicitado, hoje, ja)

        # carimba (silenciosamente) os lembretes anteriores vencidos
        for m in pular:
            pj.log(f"  · {proc} {m['id']} vencido há tempo — pulado (marca passado)")
            carimba(i, m)

        # escala interna (Pedro)
        for m in internos:
            texto = montar_texto(m, linha, solicitado)
            ok, info = pj.enviar_alerta_interno(texto, dry)
            pj.log(f"  {'✅' if ok else '❌'} {proc} · {m['id']} → grupo GERAL [{info}]")
            if dry:
                for ln in texto.splitlines():
                    print(f"     │ {ln}")
            if ok:
                carimba(i, m)
                alertas += 1

        # lembrete ao cliente (só o mais avançado)
        if escolhido:
            faltam = [C.COL[c] for c in escolhido["exige"]
                      if not str(linha.get(c) or "").strip()]
            if faltam:
                chave = f"{proc}|{escolhido['id']}|FALTA"
                if chave not in estado:
                    ok, info = pj.enviar_alerta_interno(
                        f"⚠️ *COBRA-DOCUMENTOS* · {linha['cliente']} (proc {proc}): "
                        f"lembrete {escolhido['id']} não saiu — falta preencher "
                        f"{', '.join(faltam)} na mãe.", dry)
                    pj.log(f"  ⚠️  {proc} {escolhido['id']} sem lista → alerta [{info}]")
                    if ok and not dry:
                        estado[chave] = pj.fmt_data(hoje)
                    alertas += 1
            else:
                tel = pj.so_digitos(linha["telefone"])
                if not tel:
                    chave = f"{proc}|{escolhido['id']}|SEM_TEL"
                    if chave not in estado:
                        ok, info = pj.enviar_alerta_interno(
                            f"⚠️ *COBRA-DOCUMENTOS* · {linha['cliente']} (proc {proc}): "
                            f"lembrete pronto mas SEM TELEFONE na mãe.", dry)
                        pj.log(f"  ⚠️  {proc} {escolhido['id']} sem telefone → alerta [{info}]")
                        if ok and not dry:
                            estado[chave] = pj.fmt_data(hoje)
                        alertas += 1
                else:
                    texto = montar_texto(escolhido, linha, solicitado)
                    ok, info = pj.enviar_whatsapp_cliente(tel, texto, dry)
                    pj.log(f"  {'✅' if ok else '❌'} {proc} · {escolhido['id']} → cliente {tel} [{info}]")
                    if dry:
                        print("     ┌─ prévia ─────────────────────────────────")
                        for ln in texto.splitlines():
                            print(f"     │ {ln}")
                        print("     └──────────────────────────────────────────")
                    if ok:
                        carimba(i, escolhido)
                        lembretes += 1

    if not dry:
        pj.backup_mae(C.MAE_XLSX, C.LOG_DIR)
        wb.save(C.MAE_XLSX)
        pj.salvar_estado(C.ALERTAS_JSON, estado)

    pj.log(f"fim · lembretes cliente={lembretes} · alertas internos={alertas} · "
           f"completos(silêncio)={completos} · pulados={pulados}"
           + ("  (DRY)" if dry else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
