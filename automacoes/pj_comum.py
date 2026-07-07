# -*- coding: utf-8 -*-
"""
PJ-AUTOMAÇÕES · biblioteca comum aos robôs (perícia, emendas, gatilhos)
======================================================================

Tudo que os três robôs compartilham mora aqui, para você ajustar UMA vez:
- os senders (WhatsApp cliente via ChatGuru + alerta interno via Z-API);
- datas, dias úteis e feriados;
- leitura/escrita da planilha "mãe" (openpyxl) + backup;
- estado/dedupe em JSON.

>>> O ÚNICO ponto que depende da sua conta é o corpo dos dois senders no fim
    deste arquivo. Compare com o disparo que o seu ARAUTO de audiência já usa
    em produção e acerte os nomes de campo 1:1. Mais nada precisa mudar.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import shutil
import sys
import unicodedata

try:
    import openpyxl
except ImportError:
    print("Falta openpyxl. Rode:  pip3 install openpyxl", file=sys.stderr)
    raise


# ----------------------------------------------------------------------
# .env — carrega automaticamente automacoes/.env (fora do git), se existir.
# Assim você guarda os segredos num arquivo local em vez do ~/.zshrc.
# Não sobrescreve variável já definida no ambiente.
# ----------------------------------------------------------------------
def _carregar_dotenv():
    caminho = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(caminho):
        return
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            chave, _, valor = linha.partition("=")
            chave = chave.strip()
            valor = valor.strip().strip('"').strip("'")
            os.environ.setdefault(chave, valor)


_carregar_dotenv()


# ----------------------------------------------------------------------
# log
# ----------------------------------------------------------------------
def log(msg: str) -> None:
    print(f"[{dt.datetime.now():%H:%M:%S}] {msg}")


# ----------------------------------------------------------------------
# texto / números
# ----------------------------------------------------------------------
def primeiro_nome(nome: str) -> str:
    nome = (nome or "").strip()
    return nome.split()[0].capitalize() if nome else "tudo bem"


def so_digitos(v) -> str:
    return re.sub(r"\D", "", str(v or ""))


def norm(v) -> str:
    """MAIÚSCULAS sem acento — p/ comparar STATUS de forma robusta."""
    s = unicodedata.normalize("NFKD", str(v or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.strip().upper()


# ----------------------------------------------------------------------
# datas
# ----------------------------------------------------------------------
def parse_data(v):
    """Aceita datetime do Excel, texto dd/mm/aaaa, dd/mm/aa ou aaaa-mm-dd."""
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


def fmt_data(d) -> str:
    return d.strftime("%d/%m/%Y") if isinstance(d, (dt.date, dt.datetime)) else ""


# Feriados fixos p/ contagem de dias úteis. Preencha os do seu foro/ano.
# (formato "aaaa-mm-dd"). Sem isso, conta só sábado/domingo.
FERIADOS: set[dt.date] = set()


def _carregar_feriados():
    """Lê feriados de automacoes/feriados.txt (1 data por linha) se existir."""
    caminho = os.path.join(os.path.dirname(__file__), "feriados.txt")
    if os.path.exists(caminho):
        with open(caminho, encoding="utf-8") as f:
            for ln in f:
                d = parse_data(ln.strip())
                if d:
                    FERIADOS.add(d)


_carregar_feriados()


def eh_dia_util(d: dt.date) -> bool:
    return d.weekday() < 5 and d not in FERIADOS


def dias_uteis_entre(inicio: dt.date, fim: dt.date) -> int:
    """
    Dias ÚTEIS de `inicio` (exclusivo) até `fim` (inclusivo).
    Positivo se fim > inicio; negativo se fim < inicio (já venceu).
    """
    if inicio == fim:
        return 0
    passo = 1 if fim > inicio else -1
    d = inicio
    total = 0
    while d != fim:
        d += dt.timedelta(days=passo)
        if eh_dia_util(d):
            total += passo
    return total


# ----------------------------------------------------------------------
# estado / dedupe
# ----------------------------------------------------------------------
def carregar_estado(caminho: str) -> dict:
    if os.path.exists(caminho):
        try:
            with open(caminho, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def salvar_estado(caminho: str, estado: dict) -> None:
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)


# ----------------------------------------------------------------------
# planilha "mãe"
# ----------------------------------------------------------------------
def abrir_mae(xlsx: str, aba: str):
    if not os.path.exists(xlsx):
        log(f"❌ planilha mãe não encontrada: {xlsx}")
        log("   Gere a modelo com o criar_planilha_modelo.py da pasta do robô.")
        sys.exit(1)
    wb = openpyxl.load_workbook(xlsx)
    if aba not in wb.sheetnames:
        log(f"❌ aba '{aba}' não existe. Abas: {wb.sheetnames}")
        sys.exit(1)
    return wb, wb[aba]


def mapear_colunas(ws, COL: dict) -> dict:
    """Casa cabeçalho da linha 1 -> índice (1-based). Aborta se faltar coluna."""
    header = {}
    for j, cell in enumerate(ws[1], start=1):
        nome = str(cell.value or "").strip().upper()
        if nome:
            header[nome] = j
    idx, faltando = {}, []
    for chave, nome_col in COL.items():
        j = header.get(nome_col.upper())
        if j is None:
            faltando.append(nome_col)
        idx[chave] = j
    if faltando:
        log(f"❌ colunas ausentes na mãe: {', '.join(faltando)}")
        log("   Esperado: " + ", ".join(COL.values()))
        sys.exit(1)
    return idx


def backup_mae(xlsx: str, log_dir: str) -> None:
    """Copia a mãe antes de escrever (Falha grita: nunca perder a planilha)."""
    try:
        os.makedirs(log_dir, exist_ok=True)
        destino = os.path.join(log_dir, f"mae_backup_{dt.datetime.now():%Y%m%d_%H%M%S}.xlsx")
        shutil.copy2(xlsx, destino)
    except Exception as e:  # noqa: BLE001
        log(f"⚠️  não consegui fazer backup da mãe: {e}")


def carimbo_agora(hoje: dt.date) -> str:
    return f"{fmt_data(hoje)} {dt.datetime.now():%H:%M}"


# ======================================================================
# SAÍDA — senders (AJUSTE AQUI p/ bater com o seu ARAUTO de audiência)
# ======================================================================
# Credenciais só por variável de ambiente (nunca commitar segredo).
CHATGURU_ENDPOINT = os.environ.get("CHATGURU_ENDPOINT", "")
CHATGURU_TOKEN    = os.environ.get("CHATGURU_TOKEN", "")
CHATGURU_ACCOUNT  = os.environ.get("CHATGURU_ACCOUNT_ID", "")

ZAPI_ENDPOINT = os.environ.get("ZAPI_ENDPOINT", "")
ZAPI_TOKEN    = os.environ.get("ZAPI_TOKEN", "")
ZAPI_GRUPO    = os.environ.get("ZAPI_GRUPO_GERAL", "")


def enviar_whatsapp_cliente(telefone: str, texto: str, dry: bool) -> tuple[bool, str]:
    """WhatsApp ao cliente via ChatGuru."""
    if dry:
        return True, "DRY (não enviou)"
    if not (CHATGURU_ENDPOINT and CHATGURU_TOKEN):
        return False, "ChatGuru sem credencial (CHATGURU_ENDPOINT/TOKEN)"
    import urllib.request
    import urllib.parse
    payload = urllib.parse.urlencode({
        "key": CHATGURU_TOKEN,
        "account_id": CHATGURU_ACCOUNT,
        "phone_id": telefone,
        "chat_number": telefone,
        "text": texto,
        "action": "message_send",
    }).encode()
    try:
        req = urllib.request.Request(CHATGURU_ENDPOINT, data=payload)
        with urllib.request.urlopen(req, timeout=30) as r:
            return (200 <= r.status < 300), f"HTTP {r.status}"
    except Exception as e:  # noqa: BLE001
        return False, f"erro ChatGuru: {e}"


def enviar_alerta_interno(texto: str, dry: bool) -> tuple[bool, str]:
    """Alerta no grupo interno GERAL via Z-API."""
    if dry:
        return True, "DRY (não enviou)"
    if not (ZAPI_ENDPOINT and ZAPI_TOKEN and ZAPI_GRUPO):
        return False, "Z-API sem credencial (ZAPI_ENDPOINT/TOKEN/GRUPO)"
    import urllib.request
    body = json.dumps({"phone": ZAPI_GRUPO, "message": texto}).encode()
    try:
        req = urllib.request.Request(
            ZAPI_ENDPOINT, data=body,
            headers={"Content-Type": "application/json", "Client-Token": ZAPI_TOKEN},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return (200 <= r.status < 300), f"HTTP {r.status}"
    except Exception as e:  # noqa: BLE001
        return False, f"erro Z-API: {e}"
