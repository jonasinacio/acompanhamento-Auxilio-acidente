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


def test_uazapi():
    print("• uazapi (contrato dos senders)")
    import urllib.request as U
    import pj_comum as pj

    # número cheio com DDI (uazapi mantém o 9 do celular)
    check(pj.normalizar_telefone_br("11991095702") == "5511991095702",
          "uazapi: número ganha o 55 e mantém o 9")
    check(pj.normalizar_telefone_br("+55 (31) 99123-4567") == "5531991234567",
          "uazapi: NÃO tira o 9 (número cheio)")

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
    pj.UAZAPI_URL = "https://jonasinacioadv.uazapi.com"
    pj.UAZAPI_TOKEN = "TOKEN-INSTANCIA"; pj.UAZAPI_GRUPO = "12036@g.us"
    pj._FAKE_SEND = False

    def fake_ok(req, timeout=None):
        captured["url"] = req.full_url
        captured["body"] = req.data
        captured["token"] = req.headers.get("Token")
        return FakeResp(b'{"id":"ABC","status":"sent"}')

    U.urlopen = fake_ok
    try:
        okc, _ = pj.enviar_whatsapp_cliente("11991095702", "oi cliente", dry=False)
        body_cli = captured.get("body", b"")
        okg, _ = pj.enviar_alerta_interno("aviso equipe", dry=False)
        body_grupo = captured.get("body", b"")
    finally:
        U.urlopen = real
    check(okc, "uazapi: envio ao cliente devia dar OK")
    check(captured.get("url", "").endswith("/send/text"),
          "uazapi: usa o endpoint {URL}/send/text")
    check(captured.get("token") == "TOKEN-INSTANCIA", "uazapi: token no cabeçalho")
    check(b'"number": "5511991095702"' in body_cli and b'"text":' in body_cli,
          "uazapi: corpo {number, text} com número normalizado")
    check(b'"number": "12036@g.us"' in body_grupo,
          "uazapi: alerta interno vai pro JID do GRUPO")

    def fake_fail(req, timeout=None):
        return FakeResp(b'{"error":"number nao encontrado"}')

    U.urlopen = fake_fail
    try:
        ok2, info2 = pj.enviar_whatsapp_cliente("11991095702", "oi", dry=False)
    finally:
        U.urlopen = real
    check(not ok2 and "recusou" in info2,
          "uazapi: campo 'error' na resposta devia virar falha")
    pj._FAKE_SEND = True  # restaura p/ os testes de subprocess


def test_classificacao():
    print("• classificacao (ato + dias úteis)")
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "clf", os.path.join(BASE, "classificacao.py"))
    clf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(clf)

    check(clf.classificar({"texto": "intimado da CONTESTAÇÃO do INSS"})["dias"] == 15,
          "clf: contestação → réplica 15")
    check(clf.classificar({"tipoComunicacao": "Sentença",
                           "texto": "JUIZADO ESPECIAL. Julgo procedente."})["dias"] == 10,
          "clf: sentença no JEF → recurso 10")
    check(clf.classificar({"tipoDocumento": "Acórdão",
                           "texto": "Acordam em NEGAR PROVIMENTO AO RECURSO DO INSS"}).get("flag") == "favoravel",
          "clf: acórdão que nega provimento ao INSS = favorável")
    check(clf.classificar({"texto": "mero expediente"}).get("flag") == "conferir",
          "clf: ato desconhecido → flag conferir (não chuta)")
    check(clf.data_fatal_uteis(dt.date(2026, 7, 7), 15) == dt.date(2026, 7, 28),
          "clf: 15 d.ú. a partir de 07/07/2026 = 28/07/2026")
    check(not clf.dia_util(dt.date(2026, 12, 25)), "clf: 25/12 não é dia útil")
    check(not clf.dia_util(dt.date(2027, 1, 5)), "clf: recesso forense (05/01) não é dia útil")
    pub = {"tipoComunicacao": "Intimação",
           "texto": "Intime-se. Dica de tramitação ágil: proposta de acordo, réplica..."}
    check("réplica" not in clf.classificar(pub)["ato"].lower(),
          "clf: rodapé 'Dica de tramitação' não vira réplica falsa")


def test_djen(tmp):
    print("• vigia-djen")
    est = os.path.join(tmp, "djen_estado.json")
    envp = {"DJEN_ESTADO": est, "DJEN_LOGS": tmp, "PJ_FAKE_SEND": "1"}
    out = roda("vigia-djen", "robo_djen.py", ["--dry", "--mock", "--hoje", HOJE], envp)
    check("1002345-67.2026.8.26.0100" in out, "djen: devia listar a intimação")
    check("Sentença" in out, "djen: devia listar a sentença")
    check("<b>" not in out and "<p>" not in out and "<div>" not in out,
          "djen: HTML do teor devia ser limpo")
    check("emendar a inicial" in out, "djen: trecho do teor no aviso")
    check("Sentença → apelação" in out, "djen: classifica a sentença como apelação")
    check("fatal" in out, "djen: mostra a data fatal estimada do prazo")

    roda("vigia-djen", "robo_djen.py", ["--send", "--mock", "--hoje", HOJE], envp)
    out2 = roda("vigia-djen", "robo_djen.py", ["--send", "--mock", "--hoje", HOJE], envp)
    check("novas=0" in out2 and "já vistas=2" in out2,
          "djen: 2ª rodada não podia repetir (dedupe pelo id)")


def test_sentinela_prazos(tmp):
    print("• sentinela-prazos")
    est = os.path.join(tmp, "prazos_estado.json")
    envp = {"PRAZOS_ESTADO": est, "PJ_FAKE_SEND": "1"}
    out = roda("sentinela-prazos", "sentinela_prazos.py",
               ["--dry", "--mock", "--hoje", HOJE], envp)
    check("candidatas no escopo=2" in out,
          "sentinela: 2 candidatas no escopo (contestação + sentença JEF)")
    check("RÉPLICA/IMPUGNAÇÃO" in out, "sentinela: contestação → tarefa de réplica")
    check("venc 2026-07-24" in out and "fatal 2026-07-28" in out,
          "sentinela: vencimento a D-2 (24/07) do fatal (28/07)")
    check("criadas=0" in out, "sentinela: --dry não cria nada (criadas=0)")

    o1 = roda("sentinela-prazos", "sentinela_prazos.py",
              ["--send", "--mock", "--hoje", HOJE], envp)
    check("criadas=2" in o1, "sentinela: 1ª rodada cria 2 tarefas")
    o2 = roda("sentinela-prazos", "sentinela_prazos.py",
              ["--send", "--mock", "--hoje", HOJE], envp)
    check("nada a criar" in o2, "sentinela: 2ª rodada não recria (idempotente)")


def test_zapsign():
    print("• zapsign-contrato (webhook)")
    import importlib.util
    import pj_comum as pj
    pj._FAKE_SEND = True
    caminho = os.path.join(BASE, "zapsign-contrato", "webhook_zapsign.py")
    spec = importlib.util.spec_from_file_location("wz", caminho)
    wz = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(wz)

    tmpf = os.path.join(tempfile.gettempdir(), f"zs_estado_{os.getpid()}.json")
    if os.path.exists(tmpf):
        os.remove(tmpf)
    wz.ESTADO_JSON = tmpf

    payload = {"event_type": "doc_signed", "name": "Contrato Auxílio-Acidente",
               "token": "tk1", "status": "signed",
               "signers": [{"name": "Maria Souza", "phone_country": "55",
                            "phone_number": "11991095702", "status": "signed"}]}

    assinado, doc, pessoas = wz.extrair(payload)
    check(assinado, "zapsign: doc_signed devia contar como assinado")
    check(doc == "Contrato Auxílio-Acidente", "zapsign: pega o nome do documento")
    check(bool(pessoas) and pessoas[0]["nome"] == "Maria Souza",
          "zapsign: pega o nome do signatário")
    check(pessoas[0]["telefone"] == "5511991095702",
          "zapsign: telefone país+número normalizado")

    n1, _ = wz.processar(payload)
    check(n1 == 1, "zapsign: 1º evento devia anunciar")
    n2, m2 = wz.processar(payload)
    check(n2 == 0 and "dedupe" in m2, "zapsign: 2º evento (mesmo token) = dedupe")

    n3, m3 = wz.processar({"event_type": "doc_created", "token": "tk2", "signers": []})
    check(n3 == 0 and "ignorado" in m3, "zapsign: doc_created devia ser ignorado")

    msg = wz.montar_mensagem(doc, pessoas)
    check("Maria Souza" in msg and "5511991095702" in msg,
          "zapsign: mensagem traz nome e telefone")
    if os.path.exists(tmpf):
        os.remove(tmpf)


def test_zapsign_amostra():
    print("• zapsign_amostra (máscara de privacidade)")
    import importlib.util
    import json
    spec = importlib.util.spec_from_file_location(
        "za", os.path.join(BASE, "zapsign_amostra.py"))
    za = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(za)

    amostra = {"name": "Contrato X", "status": "signed", "token": "abcd-1234-secret",
               "signers": [{"name": "Maria", "email": "maria@x.com",
                            "phone_number": "11991095702", "cpf": "12345678900"}]}
    m = za.mascarar(amostra)
    sig = m["signers"][0]
    check("11991095702" not in json.dumps(m), "amostra: telefone NÃO pode vazar")
    check("12345678900" not in json.dumps(m), "amostra: CPF NÃO pode vazar")
    check("maria@x.com" not in json.dumps(m), "amostra: e-mail NÃO pode vazar")
    check("secret" not in json.dumps(m), "amostra: token NÃO pode vazar")
    check(m["status"] == "signed" and "phone_number" in sig and "cpf" in sig,
          "amostra: nomes de campo e valores não-sensíveis continuam visíveis")


def test_db():
    print("• db (ingestão Postgres)")
    import db

    class FakeCur:
        def __init__(self):
            self.calls = []
        def execute(self, sql, params=None):
            self.calls.append((sql, params))
        def fetchone(self):
            return (1,)

    check(not db.habilitado(),
          "db: sem DATABASE_URL a ingestão fica desligada (robô roda igual)")

    cur = FakeCur()
    db.upsert_publicacao(cur, {
        "djen_id": "111", "numero_cnj": "1002345-67.2026.8.26.0100", "tribunal": "TJSP",
        "ato": "Sentença → apelação", "prazo_dias": 15, "data_fatal": dt.date(2026, 7, 28)})
    sqls = " ".join(c[0] for c in cur.calls)
    check("INSERT INTO processos" in sqls, "db: acha/cria o processo pelo CNJ")
    check("INSERT INTO publicacoes" in sqls and "ON CONFLICT (djen_id)" in sqls,
          "db: publicação é upsert idempotente (djen_id)")
    pub = [c for c in cur.calls if "publicacoes" in c[0]][0][1]
    check("Sentença → apelação" in pub and dt.date(2026, 7, 28) in pub,
          "db: grava o ato e a data fatal")

    cur2 = FakeCur()
    db.upsert_pericia(cur2, {"advbox_post_id": "9001", "numero_cnj": "X",
                             "data": dt.date(2026, 7, 22), "hora": "09:30", "local": "L"})
    check(any("INSERT INTO pericias" in c[0] and "ON CONFLICT (advbox_post_id)" in c[0]
              for c in cur2.calls), "db: perícia é upsert idempotente (advbox_post_id)")

    cur3 = FakeCur()
    db.upsert_contrato(cur3, {"zapsign_token": "tk", "nome": "Maria", "status": "signed"})
    check(any("INSERT INTO contratos" in c[0] and "ON CONFLICT (zapsign_token)" in c[0]
              for c in cur3.calls), "db: contrato é upsert idempotente (zapsign_token)")


def test_dotenv():
    print("• .env parser (aspas e comentários)")
    import pj_comum as pj
    check(pj._parse_valor_dotenv('"https://x.uazapi.com"   # comentário') == "https://x.uazapi.com",
          "dotenv: aspas + comentário inline")
    check(pj._parse_valor_dotenv("12036@g.us") == "12036@g.us",
          "dotenv: valor simples sem aspas")
    check(pj._parse_valor_dotenv("abc123   # nota") == "abc123",
          "dotenv: comentário inline sem aspas")
    check(pj._parse_valor_dotenv('"tok#en"') == "tok#en",
          "dotenv: # dentro de aspas é preservado")


def main():
    sys.path.insert(0, BASE)  # p/ importar pj_comum em d_por_diautil
    test_db()
    test_dotenv()
    test_uazapi()
    test_zapsign()
    test_zapsign_amostra()
    with tempfile.TemporaryDirectory() as tmp:
        test_pericia(tmp)
        test_emendas(tmp)
        test_gatilhos(tmp)
        test_documentos(tmp)
        test_painel(tmp)
        test_classificacao()
        test_djen(tmp)
        test_sentinela_prazos(tmp)
        test_puxa(tmp)
    print("-" * 50)
    if _falhas:
        print(f"❌ {len(_falhas)} falha(s), {_ok} ok")
        return 1
    print(f"✅ tudo passou ({_ok} checagens)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
