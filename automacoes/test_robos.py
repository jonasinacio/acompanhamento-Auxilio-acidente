#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Suíte de testes dos robôs (stdlib pura — sem pytest).
Roda cada robô via subprocess, a MESMA CLI que o launchd usa, com mães e estados
isolados numa pasta temporária. Trava os cenários já validados à mão para você
poder mexer nos config.py sem medo.

    python3 test_robos.py        # roda tudo; sai 0 se passar, 1 se falhar
"""
from __future__ import annotations

import datetime as dt
import os
import subprocess
import sys
import tempfile

import openpyxl

BASE = os.path.dirname(os.path.abspath(__file__))
HOJE = "2026-07-07"                    # terça
H = dt.date(2026, 7, 7)

_falhas: list[str] = []
_ok = 0


def check(cond: bool, msg: str):
    global _ok
    if cond:
        _ok += 1
    else:
        _falhas.append(msg)
        print(f"  ✗ {msg}")


def roda(subpasta, script, args, env_extra) -> str:
    env = dict(os.environ)
    env.update(env_extra)
    p = subprocess.run(
        [sys.executable, script, *args],
        cwd=os.path.join(BASE, subpasta),
        env=env, capture_output=True, text=True,
    )
    if p.returncode != 0:
        print(p.stdout); print(p.stderr)
        raise SystemExit(f"robô {script} saiu com erro {p.returncode}")
    return p.stdout


def mae(path, header, linhas):
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "2026"
    ws.append(header)
    for ln in linhas:
        ws.append(ln)
    wb.save(path)


def dstr(offset):
    return (H + dt.timedelta(days=offset)).strftime("%d/%m/%Y")


def d_por_diautil(n):
    """data que fica a n dias úteis de H (n>0 futuro, n<0 passado)."""
    import pj_comum as pj
    if n == 0:
        return H
    d = H; step = 1 if n > 0 else -1; c = 0
    while c != n:
        d += dt.timedelta(days=step)
        if pj.eh_dia_util(d):
            c += step
    return d


# ======================================================================
def test_pericia(tmp):
    print("• perícia")
    xlsx = os.path.join(tmp, "pericia.xlsx")
    est = os.path.join(tmp, "pericia_estado.json")
    header = ["PROCESSO", "CLIENTE", "TELEFONE", "DATA_PERICIA", "HORA", "LOCAL",
              "TIPO", "ACIDENTARIA", "STATUS", "AVISO_15", "DOC_PEDRO", "ORIENTA_7",
              "CONFIRMA_2", "RELATO_1"]

    def row(proc, tel, marco_off, hora, local, acid, status):
        data = (H - dt.timedelta(days=marco_off)).strftime("%d/%m/%Y") if marco_off is not None else ""
        return [proc, "Cli " + proc, tel, data, hora, local, "Judicial", acid, status,
                "", "", "", "", ""]

    mae(xlsx, header, [
        row("P15", "5511900000015", -15, "09:00", "L", "NAO", "DESIGNADA"),
        row("P07", "5511900000007", -7, "11:00", "L", "SIM", "DESIGNADA"),
        row("P02", "5511900000002", -2, "12:00", "L", "NAO", "DESIGNADA"),
        row("PPOS", "5511900000001", 1, "13:00", "L", "NAO", "DESIGNADA"),   # D+1 interno
        row("PTEL", "", -2, "12:00", "L", "NAO", "DESIGNADA"),               # sem telefone
        row("PLOC", "5511900000099", -15, "09:00", "", "NAO", "DESIGNADA"),  # falta local
        row("PSD", "5511900000088", None, "", "", "NAO", "DESIGNADA"),       # sem data
        row("PCAN", "5511900000077", -2, "12:00", "L", "NAO", "CANCELADA"),  # pula
    ])
    envp = {"PERICIA_MAE": xlsx, "PERICIA_ESTADO": est, "PERICIA_LOGS": tmp, "PJ_FAKE_SEND": "1"}

    out = roda("avisos-pericia", "robo_pericias.py", ["--dry", "--hoje", HOJE], envp)
    check("P15 · AVISO_15" in out, "perícia: P15 devia disparar AVISO_15")
    check("P07 · ORIENTA_7" in out, "perícia: P07 devia disparar ORIENTA_7")
    check("P02 · CONFIRMA_2" in out, "perícia: P02 devia disparar CONFIRMA_2")
    check("PPOS · RELATO_1" in out, "perícia: PPOS devia disparar RELATO_1 (interno)")
    check("PTEL" in out and "sem telefone" in out, "perícia: PTEL devia virar alerta sem telefone")
    check("PLOC" in out and "incompleto" in out, "perícia: PLOC devia gritar falta local")
    check("PSD" in out and "sem data" in out, "perícia: PSD devia gritar sem data")
    check("pulados=1" in out, "perícia: PCAN (CANCELADA) devia ser pulado")

    # dedupe: 1ª --send dispara; 2ª não repete
    out1 = roda("avisos-pericia", "robo_pericias.py", ["--send", "--hoje", HOJE], envp)
    out2 = roda("avisos-pericia", "robo_pericias.py", ["--send", "--hoje", HOJE], envp)
    check("disparos cliente=0 · alertas internos=0" in out2,
          "perícia: 2ª rodada não podia repetir nada (dedupe)")


def test_emendas(tmp):
    print("• emendas")
    xlsx = os.path.join(tmp, "emendas.xlsx")
    est = os.path.join(tmp, "emendas_estado.json")
    header = ["PROCESSO", "CLIENTE", "INTIMACAO", "PRAZO_FATAL", "CLASSIFICACAO",
              "DEPENDE_DOC", "DOC_OK", "STATUS", "PROTOCOLADA_EM",
              "AL_CLASSIFICAR", "AL_DOC", "AL_2DU", "AL_1DU", "AL_FATAL"]

    def row(proc, du, classif="x", dep="NAO", docok="NAO", status="EMENDA PENDENTE", protoc=""):
        pf = d_por_diautil(du).strftime("%d/%m/%Y")
        return [proc, "Cli " + proc, dstr(-5), pf, classif, dep, docok, status, protoc,
                "", "", "", "", ""]

    mae(xlsx, header, [
        row("E2DU", 2),
        row("EFATAL", 0),
        row("EVENC", -1),
        row("E1DU", 1),
        row("ECLASS", 5, classif=""),             # sem classificação
        row("EPROT", 1, status="PROTOCOLADA", protoc=dstr(0)),  # baixada → silêncio
    ])
    envp = {"EMENDAS_MAE": xlsx, "EMENDAS_ESTADO": est, "EMENDAS_LOGS": tmp, "PJ_FAKE_SEND": "1"}

    out = roda("alarme-emendas", "robo_emendas.py", ["--dry", "--hoje", HOJE], envp)
    check("E2DU · AL_2DU" in out, "emendas: E2DU devia AL_2DU")
    check("EFATAL · AL_FATAL" in out, "emendas: EFATAL devia AL_FATAL")
    check("EVENC · VENCIDO" in out, "emendas: EVENC devia VENCIDO")
    check("E1DU · AL_1DU" in out, "emendas: E1DU devia AL_1DU (escala Jonas)")
    check("ECLASS · CLASSIFICAR" in out, "emendas: ECLASS devia pedir classificação")
    check("EPROT" not in out, "emendas: EPROT (protocolada) devia ficar em silêncio")

    # escada: no dia seguinte, cada alarme sobe um degrau
    roda("alarme-emendas", "robo_emendas.py", ["--send", "--hoje", HOJE], envp)
    out_amanha = roda("alarme-emendas", "robo_emendas.py",
                      ["--send", "--hoje", "2026-07-08"], envp)
    check("E2DU · AL_1DU" in out_amanha, "emendas: E2DU devia SUBIR p/ AL_1DU no dia seguinte")
    check("EFATAL · VENCIDO" in out_amanha, "emendas: EFATAL devia virar VENCIDO no dia seguinte")


def test_gatilhos(tmp):
    print("• gatilhos-status")
    xlsx = os.path.join(tmp, "casos.xlsx")
    est = os.path.join(tmp, "casos_estado.json")
    header = ["PROCESSO", "CLIENTE", "STATUS", "STATUS_DESDE", "RESPONSAVEL"]
    mae(xlsx, header, [
        ["C1", "Cli 1", "CONTRATO ASSINADO", dstr(0), "Bia"],
        ["C2", "Cli 2", "PROTOCOLO ADM", dstr(-15), "Natália"],   # atrasado (SLA 3 d.ú.)
        ["C3", "Cli 3", "PASTA FECHADA", dstr(-2), "Pedro"],
    ])
    envp = {"CASOS_MAE": xlsx, "CASOS_ESTADO": est, "CASOS_LOGS": tmp, "PJ_FAKE_SEND": "1"}

    # 1ª rodada: linha de base — sem gatilho retroativo, mas atraso vale
    out1 = roda("gatilhos-status", "robo_status.py", ["--send", "--hoje", HOJE], envp)
    check("gatilhos=0" in out1, "gatilhos: 1ª rodada não podia disparar gatilho retroativo")
    check("C2 ATRASO PROTOCOLO ADM" in out1, "gatilhos: C2 devia gerar ATRASO de SLA já na 1ª")

    # 2ª rodada sem mudança: nada
    out2 = roda("gatilhos-status", "robo_status.py", ["--send", "--hoje", HOJE], envp)
    check("gatilhos=0 · atrasos=0 · mudanças=0" in out2, "gatilhos: 2ª rodada sem mudança = zero")

    # muda C3 e confirma o gatilho
    wb = openpyxl.load_workbook(xlsx); ws = wb["2026"]
    ws.cell(row=4, column=3).value = "LAUDO JUNTADO"; wb.save(xlsx)
    out3 = roda("gatilhos-status", "robo_status.py", ["--send", "--hoje", HOJE], envp)
    check("C3 gatilho LAUDO JUNTADO" in out3, "gatilhos: C3 mudou → devia disparar LAUDO JUNTADO")


def test_puxa(tmp):
    print("• puxa_advbox (mock + self-heal)")
    per = os.path.join(tmp, "px_pericia.xlsx")
    eme = os.path.join(tmp, "px_emenda.xlsx")
    cas = os.path.join(tmp, "px_casos.xlsx")
    envp = {"PERICIA_MAE": per, "EMENDAS_MAE": eme, "CASOS_MAE": cas,
            "PERICIA_LOGS": tmp, "EMENDAS_LOGS": tmp, "CASOS_LOGS": tmp}

    out = roda(".", "puxa_advbox.py", ["--write", "--mock"], envp)
    check("[pericia] novos=1" in out, "puxa: devia acrescentar 1 perícia")
    check("[emenda] novos=1" in out, "puxa: devia acrescentar 1 emenda")
    check("[casos] novos=2" in out, "puxa: devia acrescentar 2 casos")

    # roda de novo: não duplica
    out2 = roda(".", "puxa_advbox.py", ["--write", "--mock"], envp)
    check("[pericia] novos=0" in out2 and "[casos] novos=0" in out2,
          "puxa: 2ª rodada não podia duplicar")

    # self-heal: limpa HORA, edita LOCAL à mão → completa HORA, preserva LOCAL
    wb = openpyxl.load_workbook(per); ws = wb["2026"]
    h = {c.value: i + 1 for i, c in enumerate(ws[1])}
    ws.cell(row=2, column=h["HORA"]).value = None
    ws.cell(row=2, column=h["LOCAL"]).value = "EDITADO A MAO"
    wb.save(per)
    roda(".", "puxa_advbox.py", ["--write", "--mock", "--destino", "pericia"], envp)
    ws = openpyxl.load_workbook(per)["2026"]
    check(ws.cell(row=2, column=h["HORA"]).value not in (None, ""),
          "puxa: devia completar a HORA vazia (self-heal)")
    check(ws.cell(row=2, column=h["LOCAL"]).value == "EDITADO A MAO",
          "puxa: NÃO podia sobrescrever o LOCAL editado à mão")
    check(ws.max_row == 2, "puxa: não podia duplicar linha no self-heal")


def test_documentos(tmp):
    print("• cobra-documentos")
    xlsx = os.path.join(tmp, "docs.xlsx")
    est = os.path.join(tmp, "docs_estado.json")
    header = ["PROCESSO", "CLIENTE", "TELEFONE", "SOLICITADO_EM", "DOCS_FALTANDO",
              "STATUS", "RECEBIDO_EM", "LEMB_3", "LEMB_7", "ESCALA_PEDRO", "LEMB_12"]

    def row(proc, tel, off, docs, status="AGUARDANDO DOCUMENTOS", receb=""):
        sol = (H - dt.timedelta(days=off)).strftime("%d/%m/%Y") if off is not None else ""
        return [proc, "Cli " + proc, tel, sol, docs, status, receb, "", "", "", ""]

    mae(xlsx, header, [
        row("D3", "5511900000003", 3, "RG; CPF"),                 # LEMB_3
        row("D7", "5511900000007", 7, "Laudo"),                   # LEMB_7
        row("D12", "5511900000012", 12, "PPP"),                   # LEMB_12 (+ escala D+10)
        row("DTEL", "", 3, "RG"),                                 # sem telefone
        row("DLIST", "5511900000000", 3, ""),                     # sem lista
        row("DOK", "5511900000009", 7, "x", "COMPLETO", dstr(-1)),  # completo → silêncio
    ])
    envp = {"DOCS_MAE": xlsx, "DOCS_ESTADO": est, "DOCS_LOGS": tmp, "PJ_FAKE_SEND": "1"}

    out = roda("cobra-documentos", "robo_documentos.py", ["--dry", "--hoje", HOJE], envp)
    check("D3 · LEMB_3" in out, "docs: D3 devia LEMB_3")
    check("D7 · LEMB_7" in out, "docs: D7 devia LEMB_7")
    check("D12 · LEMB_12" in out, "docs: D12 devia LEMB_12")
    check("D12 · ESCALA_PEDRO" in out, "docs: D12 devia escalar Pedro (D+10)")
    check("DTEL" in out and "sem telefone" in out, "docs: DTEL sem telefone → alerta")
    check("DLIST" in out and "sem lista" in out, "docs: DLIST sem lista → alerta")
    check("DOK" not in out, "docs: DOK (completo) devia ficar em silêncio")

    # dedupe
    roda("cobra-documentos", "robo_documentos.py", ["--send", "--hoje", HOJE], envp)
    out2 = roda("cobra-documentos", "robo_documentos.py", ["--send", "--hoje", HOJE], envp)
    check("lembretes cliente=0 · alertas internos=0" in out2, "docs: 2ª rodada = zero (dedupe)")


def test_painel(tmp):
    print("• painel-manhã")
    # reusa mães de perícia (via puxa mock já rodou? não) — cria uma perícia próxima
    per = os.path.join(tmp, "pnl_per.xlsx")
    eme = os.path.join(tmp, "pnl_eme.xlsx")
    mae(per, ["PROCESSO", "CLIENTE", "TELEFONE", "DATA_PERICIA", "HORA", "LOCAL",
              "TIPO", "ACIDENTARIA", "STATUS", "AVISO_15", "DOC_PEDRO", "ORIENTA_7",
              "CONFIRMA_2", "RELATO_1"],
        [["PX", "Fulano Perícia", "551199", dstr(3), "09:00", "L", "J", "NAO",
          "DESIGNADA", "", "", "", "", ""]])
    mae(eme, ["PROCESSO", "CLIENTE", "INTIMACAO", "PRAZO_FATAL", "CLASSIFICACAO",
              "DEPENDE_DOC", "DOC_OK", "STATUS", "PROTOCOLADA_EM",
              "AL_CLASSIFICAR", "AL_DOC", "AL_2DU", "AL_1DU", "AL_FATAL"],
        [["EX", "Fulano Emenda", dstr(-5), d_por_diautil(1).strftime("%d/%m/%Y"),
          "x", "NAO", "NAO", "EMENDA PENDENTE", "", "", "", "", "", ""]])
    envp = {"PERICIA_MAE": per, "EMENDAS_MAE": eme,
            "CASOS_MAE": os.path.join(tmp, "nao_existe1.xlsx"),
            "DOCS_MAE": os.path.join(tmp, "nao_existe2.xlsx"),
            "PAINEL_ESTADO": os.path.join(tmp, "painel_estado.json"),
            "PAINEL_LOGS": tmp, "PJ_FAKE_SEND": "1"}

    out = roda("painel-manha", "robo_painel.py", ["--dry", "--hoje", HOJE], envp)
    check("PAINEL DA MANHÃ" in out, "painel: devia ter o cabeçalho")
    check("Perícias (próx. 7 dias): 1" in out, "painel: devia contar 1 perícia próxima")
    check("Fulano Perícia" in out, "painel: devia listar a perícia")
    check("Emendas críticas" in out and "Fulano Emenda" in out,
          "painel: devia listar a emenda crítica")
    check("Casos atrasados" not in out, "painel: mãe de casos ausente → seção some")

    # 1 painel por dia (dedupe)
    roda("painel-manha", "robo_painel.py", ["--send", "--hoje", HOJE], envp)
    out2 = roda("painel-manha", "robo_painel.py", ["--send", "--hoje", HOJE], envp)
    check("já foi enviado" in out2, "painel: 2º envio no mesmo dia devia ser bloqueado")


def test_zapi():
    print("• z-api (contrato dos senders)")
    import urllib.request as U
    import pj_comum as pj

    # número cheio com DDI (Z-API mantém o 9 do celular)
    check(pj.normalizar_telefone_br("11991095702") == "5511991095702",
          "z-api: número ganha o 55 e mantém o 9")
    check(pj.normalizar_telefone_br("+55 (31) 99123-4567") == "5531991234567",
          "z-api: NÃO tira o 9 (número cheio)")

    captured = {}

    class FakeResp:
        def __init__(self, body):
            self._b = body
        def read(self):
            return self._b
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False

    real = U.urlopen
    pj.ZAPI_ENDPOINT = "https://api.z-api.io/instances/ID/token/TK/send-text"
    pj.ZAPI_TOKEN = "CLIENT-TOKEN"; pj.ZAPI_GRUPO = "12036@g.us"
    pj._FAKE_SEND = False

    def fake_ok(req, timeout=None):
        captured["url"] = req.full_url
        captured["body"] = req.data
        captured["ctoken"] = req.headers.get("Client-token")
        return FakeResp(b'{"zaapId":"x","messageId":"y"}')

    U.urlopen = fake_ok
    try:
        okc, _ = pj.enviar_whatsapp_cliente("11991095702", "oi cliente", dry=False)
        okg, _ = pj.enviar_alerta_interno("aviso equipe", dry=False)
        body_grupo = captured.get("body", b"")
    finally:
        U.urlopen = real
    check(okc, "z-api: envio ao cliente devia dar OK")
    check("/send-text" in captured.get("url", ""), "z-api: usa o endpoint send-text")
    check(captured.get("ctoken") == "CLIENT-TOKEN", "z-api: Client-Token no cabeçalho")
    check(b'"phone": "12036@g.us"' in body_grupo,
          "z-api: alerta interno vai pro id do GRUPO")

    def fake_fail(req, timeout=None):
        return FakeResp(b'{"error":"phone nao encontrado"}')

    U.urlopen = fake_fail
    try:
        ok2, info2 = pj.enviar_whatsapp_cliente("11991095702", "oi", dry=False)
    finally:
        U.urlopen = real
    check(not ok2 and "recusou" in info2,
          "z-api: campo 'error' na resposta devia virar falha")
    pj._FAKE_SEND = True  # restaura p/ os testes de subprocess


def main():
    sys.path.insert(0, BASE)  # p/ importar pj_comum em d_por_diautil
    test_zapi()
    with tempfile.TemporaryDirectory() as tmp:
        test_pericia(tmp)
        test_emendas(tmp)
        test_gatilhos(tmp)
        test_documentos(tmp)
        test_painel(tmp)
        test_puxa(tmp)
    print("-" * 50)
    if _falhas:
        print(f"❌ {len(_falhas)} falha(s), {_ok} ok")
        return 1
    print(f"✅ tudo passou ({_ok} checagens)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
