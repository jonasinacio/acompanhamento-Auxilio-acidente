#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAINEL-MANHÃ · o resumo do dia
==============================

Lê todas as mães (perícia, emenda, casos, documentos) e monta UMA mensagem com
as exceções do dia pro grupo GERAL: perícias próximas, emendas com prazo fatal
apertado, casos atrasados de SLA e documentos parados. Roda cedo (08h45), antes
dos outros robôs, pra equipe ver o dia num olhar. Não fala com cliente.

    python3 robo_painel.py --dry      # monta e MOSTRA o painel (padrão)
    python3 robo_painel.py --send      # envia no GERAL (1x por dia)
    python3 robo_painel.py --send --hoje 2026-07-20
"""
from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
import pj_comum as pj  # noqa: E402
import config as C     # noqa: E402

try:
    import openpyxl
except ImportError:
    print("Falta openpyxl.", file=sys.stderr)
    sys.exit(2)


def carrega_cfg(subpasta):
    caminho = os.path.join(BASE, subpasta, "config.py")
    spec = importlib.util.spec_from_file_location(f"cfg_{subpasta.replace('-', '_')}", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def le_mae(cfg):
    """Devolve lista de dicts {chave_logica: valor} de uma mãe, ou [] se não existe."""
    if not os.path.exists(cfg.MAE_XLSX):
        return None  # None = mãe ausente (diferente de vazia)
    wb = openpyxl.load_workbook(cfg.MAE_XLSX, data_only=True)
    if cfg.ABA not in wb.sheetnames:
        return None
    ws = wb[cfg.ABA]
    header = {str(c.value or "").strip().upper(): j for j, c in enumerate(ws[1], 1)}
    inv = {v.upper(): k for k, v in cfg.COL.items()}
    linhas = []
    for i in range(2, ws.max_row + 1):
        reg = {}
        for nome_up, j in header.items():
            if nome_up in inv:
                reg[inv[nome_up]] = ws.cell(row=i, column=j).value
        if str(reg.get("processo") or "").strip():
            linhas.append(reg)
    return linhas


def corta(itens, n):
    if len(itens) <= n:
        return itens
    return itens[:n] + [f"…e mais {len(itens) - n}"]


def secao_pericias(hoje):
    cfg = carrega_cfg("avisos-pericia")
    linhas = le_mae(cfg)
    if linhas is None:
        return None
    prox = []
    for l in linhas:
        if pj.norm(l.get("status")) in {pj.norm(s) for s in cfg.STATUS_PULA}:
            continue
        d = pj.parse_data(l.get("data"))
        if d and 0 <= (d - hoje).days <= C.PERICIA_PROX_DIAS:
            prox.append((d, f"{pj.fmt_data(d)} {str(l.get('hora') or '').strip()} · "
                            f"{l.get('cliente', '')}"))
    prox.sort(key=lambda x: x[0])
    corpo = [f"  • {t}" for t in corta([p[1] for p in prox], C.MAX_ITENS_LISTA)]
    return f"📋 *Perícias (próx. {C.PERICIA_PROX_DIAS} dias): {len(prox)}*" + \
           ("\n" + "\n".join(corpo) if corpo else "  — nenhuma")


def secao_emendas(hoje):
    cfg = carrega_cfg("alarme-emendas")
    linhas = le_mae(cfg)
    if linhas is None:
        return None
    crit, venc = [], []
    for l in linhas:
        if (pj.norm(l.get("status")) in {pj.norm(s) for s in cfg.STATUS_BAIXADA}
                or str(l.get("protocolada_em") or "").strip()):
            continue
        if pj.norm(l.get("status")) in {pj.norm(s) for s in cfg.STATUS_PULA}:
            continue
        pf = pj.parse_data(l.get("prazo_fatal"))
        if not pf:
            continue
        du = pj.dias_uteis_entre(hoje, pf)
        rot = f"{l.get('cliente', '')} · fatal {pj.fmt_data(pf)}"
        if du < 0:
            venc.append(f"{rot} (VENCIDA há {abs(du)} d.ú.)")
        elif du <= C.EMENDA_CRIT_DU:
            crit.append((du, f"{rot} ({du} d.ú.)"))
    crit.sort(key=lambda x: x[0])
    linhas_txt = []
    if venc:
        linhas_txt += [f"  🔴 {t}" for t in corta(venc, C.MAX_ITENS_LISTA)]
    linhas_txt += [f"  • {t}" for t in corta([c[1] for c in crit], C.MAX_ITENS_LISTA)]
    total = len(venc) + len(crit)
    cab = f"🚨 *Emendas críticas (≤{C.EMENDA_CRIT_DU} d.ú. ou vencidas): {total}*"
    return cab + ("\n" + "\n".join(linhas_txt) if linhas_txt else "  — nenhuma")


def secao_casos(hoje):
    cfg = carrega_cfg("gatilhos-status")
    linhas = le_mae(cfg)
    if linhas is None:
        return None
    atrasados = []
    for l in linhas:
        st = pj.norm(l.get("status"))
        if st in {pj.norm(s) for s in cfg.STATUS_PULA}:
            continue
        sla = cfg.SLA_DIAS_UTEIS.get(st)
        desde = pj.parse_data(l.get("status_desde"))
        if sla and desde:
            du = pj.dias_uteis_entre(desde, hoje)
            if du > sla:
                atrasados.append((du - sla, f"{l.get('cliente', '')} · {st} "
                                            f"({du} d.ú., SLA {sla})"))
    atrasados.sort(key=lambda x: -x[0])
    corpo = [f"  • {t}" for t in corta([a[1] for a in atrasados], C.MAX_ITENS_LISTA)]
    return f"⏰ *Casos atrasados de SLA: {len(atrasados)}*" + \
           ("\n" + "\n".join(corpo) if corpo else "  — nenhum")


def secao_documentos(hoje):
    cfg = carrega_cfg("cobra-documentos")
    linhas = le_mae(cfg)
    if linhas is None:
        return None
    parados = []
    for l in linhas:
        if (pj.norm(l.get("status")) in {pj.norm(s) for s in cfg.STATUS_COMPLETO}
                or str(l.get("recebido") or "").strip()):
            continue
        if pj.norm(l.get("status")) in {pj.norm(s) for s in cfg.STATUS_PULA}:
            continue
        d = pj.parse_data(l.get("solicitado"))
        if d and (hoje - d).days >= C.DOCS_PARADO_DIAS:
            parados.append(((hoje - d).days, f"{l.get('cliente', '')} "
                                             f"(há {(hoje - d).days} dias)"))
    parados.sort(key=lambda x: -x[0])
    corpo = [f"  • {t}" for t in corta([p[1] for p in parados], C.MAX_ITENS_LISTA)]
    return f"📄 *Documentos parados (≥{C.DOCS_PARADO_DIAS} dias): {len(parados)}*" + \
           ("\n" + "\n".join(corpo) if corpo else "  — nenhum")


def monta_painel(hoje):
    partes = [f"☀️ *PAINEL DA MANHÃ · {pj.fmt_data(hoje)}*",
              "_exceções do dia — Jonas Inácio Advocacia_", ""]
    achou = False
    for f in (secao_pericias, secao_emendas, secao_casos, secao_documentos):
        s = f(hoje)
        if s is not None:
            partes.append(s)
            partes.append("")
            achou = True
    if not achou:
        partes.append("(nenhuma mãe encontrada — rode os robôs/puxa primeiro.)")
    partes.append("Bom trabalho! 💪")
    return "\n".join(partes).rstrip()


def main() -> int:
    ap = argparse.ArgumentParser(description="PAINEL-MANHÃ · resumo diário no GERAL")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--hoje")
    args = ap.parse_args()

    dry = not args.send
    hoje = pj.parse_data(args.hoje) or dt.date.today()
    estado = pj.carregar_estado(C.ALERTAS_JSON)

    chave = f"painel|{pj.fmt_data(hoje)}"
    if not dry and chave in estado:
        pj.log(f"painel de {pj.fmt_data(hoje)} já foi enviado — nada a fazer.")
        return 0

    texto = monta_painel(hoje)
    ok, info = pj.enviar_alerta_interno(texto, dry)
    pj.log(f"PAINEL-MANHÃ · {'DRY' if dry else 'SEND'} · hoje={pj.fmt_data(hoje)} "
           f"→ GERAL [{info}]")
    if dry:
        print("─" * 50)
        print(texto)
        print("─" * 50)
    if ok and not dry:
        estado[chave] = dt.datetime.now().isoformat(timespec="minutes")
        pj.salvar_estado(C.ALERTAS_JSON, estado)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
