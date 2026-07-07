#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARAUTO-PERÍCIA · o disparador
=============================

Irmão do robô de avisos de audiência (ARAUTO). Roda 1x/dia pelo launchd:
lê a planilha "mãe", decide o marco de cada perícia pela régua fechada
(D-15 / D-9 Pedro / D-7 / D-2 / D+1), dispara o WhatsApp certo ao cliente
via ChatGuru — ou o alerta interno no grupo GERAL via Z-API — e CARIMBA a
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
import json
import os
import re
import sys
import unicodedata

import config as C

try:
    import openpyxl
except ImportError:
    print("Falta a lib openpyxl. Rode:  pip install -r requirements.txt", file=sys.stderr)
    sys.exit(2)


# ======================================================================
# util
# ======================================================================
def log(msg: str) -> None:
    print(f"[{dt.datetime.now():%H:%M:%S}] {msg}")


def primeiro_nome(nome: str) -> str:
    nome = (nome or "").strip()
    return nome.split()[0].capitalize() if nome else "tudo bem"


def so_digitos(v) -> str:
    return re.sub(r"\D", "", str(v or ""))


def norm(v) -> str:
    """maiúsculas sem acento, p/ comparar STATUS de forma robusta."""
    s = unicodedata.normalize("NFKD", str(v or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.strip().upper()


def parse_data(v):
    """Aceita datetime do Excel ou texto dd/mm/aaaa (ou aaaa-mm-dd)."""
    if v is None or str(v).strip() == "":
        return None
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    txt = str(v).strip()
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return dt.datetime.strptime(txt, fmt).date()
        except ValueError:
            continue
    return None


def fmt_data(d: dt.date) -> str:
    return d.strftime("%d/%m/%Y") if d else ""


# ======================================================================
# ESTADO — dedupe extra por processo+marco (além do carimbo na mãe)
# ======================================================================
def carregar_estado() -> dict:
    if os.path.exists(C.ALERTAS_JSON):
        try:
            with open(C.ALERTAS_JSON, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def salvar_estado(estado: dict) -> None:
    with open(C.ALERTAS_JSON, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)


# ======================================================================
# SAÍDA — senders (env-driven; em --dry só imprimem)
# ======================================================================
def enviar_whatsapp_cliente(telefone: str, texto: str, dry: bool) -> tuple[bool, str]:
    if dry:
        return True, "DRY (não enviou)"
    if not (C.CHATGURU_ENDPOINT and C.CHATGURU_TOKEN):
        return False, "ChatGuru sem credencial (CHATGURU_ENDPOINT/TOKEN)"
    import urllib.request
    import urllib.parse
    payload = urllib.parse.urlencode({
        "key": C.CHATGURU_TOKEN,
        "account_id": C.CHATGURU_ACCOUNT,
        "phone_id": telefone,
        "chat_number": telefone,
        "text": texto,
        "action": "message_send",
    }).encode()
    try:
        req = urllib.request.Request(C.CHATGURU_ENDPOINT, data=payload)
        with urllib.request.urlopen(req, timeout=30) as r:
            return (200 <= r.status < 300), f"HTTP {r.status}"
    except Exception as e:  # noqa: BLE001
        return False, f"erro ChatGuru: {e}"


def enviar_alerta_interno(texto: str, dry: bool) -> tuple[bool, str]:
    if dry:
        return True, "DRY (não enviou)"
    if not (C.ZAPI_ENDPOINT and C.ZAPI_TOKEN and C.ZAPI_GRUPO):
        return False, "Z-API sem credencial (ZAPI_ENDPOINT/TOKEN/GRUPO)"
    import urllib.request
    body = json.dumps({"phone": C.ZAPI_GRUPO, "message": texto}).encode()
    try:
        req = urllib.request.Request(
            C.ZAPI_ENDPOINT,
            data=body,
            headers={"Content-Type": "application/json", "Client-Token": C.ZAPI_TOKEN},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return (200 <= r.status < 300), f"HTTP {r.status}"
    except Exception as e:  # noqa: BLE001
        return False, f"erro Z-API: {e}"


# ======================================================================
# RÉGUA — monta texto do marco
# ======================================================================
def montar_checklist(linha: dict) -> str:
    itens = list(C.CHECKLIST_BASE)
    if norm(linha.get("acidentaria")) == "SIM":
        itens += C.CHECKLIST_ACIDENTARIA
    return "\n".join(f"• {i}" for i in itens)


def montar_texto(marco: dict, linha: dict, data_pericia: dt.date) -> str:
    tpl = C.TEMPLATES[marco["template"]]
    return tpl.format(
        cliente=linha.get("cliente", ""),
        primeiro_nome=primeiro_nome(linha.get("cliente", "")),
        processo=linha.get("processo", ""),
        data=fmt_data(data_pericia),
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
# MÃE — leitura/escrita da planilha
# ======================================================================
def abrir_mae():
    if not os.path.exists(C.MAE_XLSX):
        log(f"❌ planilha mãe não encontrada: {C.MAE_XLSX}")
        log("   Gere a modelo com:  python3 criar_planilha_modelo.py")
        sys.exit(1)
    wb = openpyxl.load_workbook(C.MAE_XLSX)
    if C.ABA not in wb.sheetnames:
        log(f"❌ aba '{C.ABA}' não existe na planilha. Abas: {wb.sheetnames}")
        sys.exit(1)
    return wb, wb[C.ABA]


def mapear_colunas(ws) -> dict:
    """Casa cabeçalho da linha 1 -> índice de coluna (1-based)."""
    header = {}
    for j, cell in enumerate(ws[1], start=1):
        nome = str(cell.value or "").strip().upper()
        if nome:
            header[nome] = j
    idx = {}
    faltando = []
    for chave, nome_col in C.COL.items():
        j = header.get(nome_col.upper())
        if j is None:
            faltando.append(nome_col)
        idx[chave] = j
    if faltando:
        log(f"❌ colunas ausentes na mãe: {', '.join(faltando)}")
        log("   Cabeçalho esperado: " + ", ".join(C.COL.values()))
        sys.exit(1)
    return idx


def ler_linha(ws, i: int, idx: dict) -> dict:
    def get(chave):
        j = idx[chave]
        return ws.cell(row=i, column=j).value
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
    hoje = parse_data(args.hoje) or dt.date.today()

    log(f"ARAUTO-PERÍCIA · modo={'DRY' if dry else 'SEND'} · hoje={fmt_data(hoje)}")
    log(f"mãe: {C.MAE_XLSX}  (aba {C.ABA})")

    wb, ws = abrir_mae()
    idx = mapear_colunas(ws)
    estado = carregar_estado()

    disparos = 0
    pulados = 0
    alertas = 0

    for i in range(2, ws.max_row + 1):
        linha = ler_linha(ws, i, idx)

        proc = str(linha["processo"] or "").strip()
        if not proc:
            continue  # linha vazia

        # trava natural: STATUS manda
        if norm(linha["status"]) in {norm(s) for s in C.STATUS_PULA}:
            pulados += 1
            continue

        data_p = parse_data(linha["data"])
        if not data_p:
            # sem data não dá pra calcular marco — grita interno 1x
            chave = f"{proc}|SEM_DATA"
            if chave not in estado:
                txt = (f"⚠️ *ARAUTO-PERÍCIA* · {linha['cliente']} (proc {proc}) "
                       f"está sem DATA_PERICIA preenchida. Natália: registrar a data.")
                ok, info = enviar_alerta_interno(txt, dry)
                log(f"  ⚠️  {proc} sem data → alerta interno [{info}]")
                if ok and not dry:
                    estado[chave] = fmt_data(hoje)
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
                    ok, info = enviar_alerta_interno(txt, dry)
                    log(f"  ⚠️  {proc} {marco['id']} incompleto ({', '.join(faltam)}) → alerta [{info}]")
                    if ok and not dry:
                        estado[chave] = fmt_data(hoje)
                    alertas += 1
                continue

            texto = montar_texto(marco, linha, data_p)

            # DISPARO
            if marco["canal"] == "cliente":
                tel = so_digitos(linha["telefone"])
                if not tel:
                    # sem telefone → não trava, vira alerta interno (self-heal manual)
                    chave = f"{proc}|{marco['id']}|SEM_TEL"
                    if chave not in estado:
                        txt = (f"⚠️ *ARAUTO-PERÍCIA* · {linha['cliente']} (proc {proc}): "
                               f"marco {marco['id']} pronto mas SEM TELEFONE. "
                               f"Pedro/Bia: preencher o WhatsApp na mãe.")
                        ok, info = enviar_alerta_interno(txt, dry)
                        log(f"  ⚠️  {proc} {marco['id']} sem telefone → alerta [{info}]")
                        if ok and not dry:
                            estado[chave] = fmt_data(hoje)
                        alertas += 1
                    continue
                ok, info = enviar_whatsapp_cliente(tel, texto, dry)
                destino = f"cliente {tel}"
            else:
                ok, info = enviar_alerta_interno(texto, dry)
                destino = "grupo GERAL"

            log(f"  {'✅' if ok else '❌'} {proc} · {marco['id']} → {destino} [{info}]")
            if dry:
                print("     ┌─ prévia ─────────────────────────────────")
                for ln in texto.splitlines():
                    print(f"     │ {ln}")
                print("     └──────────────────────────────────────────")

            # CARIMBO — só grava se enviou de verdade e deu certo
            if ok and not dry:
                ws.cell(row=i, column=idx[marco["carimbo"]]).value = f"{fmt_data(hoje)} {dt.datetime.now():%H:%M}"
                estado[f"{proc}|{marco['id']}"] = fmt_data(hoje)

            if marco["canal"] == "interno":
                alertas += 1
            else:
                disparos += 1

    # grava mãe + estado (só em SEND)
    if not dry:
        # backup antes de escrever (Falha grita: nunca perder a mãe)
        try:
            os.makedirs(C.LOG_DIR, exist_ok=True)
            backup = os.path.join(C.LOG_DIR, f"mae_backup_{dt.datetime.now():%Y%m%d_%H%M%S}.xlsx")
            import shutil
            shutil.copy2(C.MAE_XLSX, backup)
        except Exception as e:  # noqa: BLE001
            log(f"⚠️  não consegui fazer backup da mãe: {e}")
        wb.save(C.MAE_XLSX)
        salvar_estado(estado)

    log(f"fim · disparos cliente={disparos} · alertas internos={alertas} · pulados={pulados}"
        + ("  (DRY — nada foi enviado nem carimbado)" if dry else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
