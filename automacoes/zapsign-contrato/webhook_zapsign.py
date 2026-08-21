#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZAPSIGN-CONTRATO · webhook "contrato assinado" → aviso no grupo GERAL
====================================================================

Diferente dos outros robôs: este NÃO roda por horário. Ele fica ouvindo. Quando
um cliente assina o contrato no ZapSign, o ZapSign chama este endereço (webhook)
e a gente dispara no grupo GERAL, via uazapi, com o NOME e o TELEFONE de quem
fechou.

    python3 webhook_zapsign.py          # sobe o servidor na porta ZAPSIGN_PORTA (8765)

No ZapSign, configure o webhook apontando para:
    https://SEU_HOST/zapsign/<ZAPSIGN_SEGREDO>

⚠️  Ainda NÃO sei o formato exato do payload do ZapSign — o parser abaixo é
    defensivo (tenta os campos mais comuns) e GRAVA todo payload cru em
    logs/zapsign_raw_*.json. No primeiro weblook real, me mande esse arquivo
    para eu travar os nomes de campo 1:1.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj  # noqa: E402  (traz uazapi + .env + estado/dedupe)

# ----------------------------------------------------------------------
# Config (tudo por variável de ambiente; nada de segredo no código)
# ----------------------------------------------------------------------
PORTA   = int(os.environ.get("ZAPSIGN_PORTA", "8765"))
SEGREDO = os.environ.get("ZAPSIGN_SEGREDO", "")   # vai no fim da URL do webhook
ESTADO_JSON = os.environ.get(
    "ZAPSIGN_ESTADO", os.path.join(os.path.dirname(__file__), "alertas_enviados.json"))
LOG_DIR = os.environ.get(
    "ZAPSIGN_LOGS", os.path.join(os.path.dirname(__file__), "logs"))

# Quando considerar "assinado". Confirme os valores reais no painel do ZapSign.
EVENTOS_ASSINADO = {e.lower() for e in
                    ("doc_signed", "document_signed", "signed", "assinado", "finished")}
STATUS_ASSINADO  = {"signed", "assinado", "concluido", "concluído"}


def _telefone(sig: dict) -> str:
    """Extrai telefone de um signatário do ZapSign, juntando país+número."""
    pais = str(sig.get("phone_country") or "").strip()
    num = ""
    for k in ("phone_number", "phone", "cellphone", "telefone"):
        if sig.get(k):
            num = str(sig[k]).strip()
            break
    if not num:
        return ""
    junto = num if (pais and num.startswith(pais)) else (pais + num)
    return pj.normalizar_telefone_br(junto)


def extrair(payload: dict) -> tuple[bool, str, list[dict]]:
    """
    Devolve (assinado?, nome_do_documento, [ {nome, telefone} ]).
    Defensivo: aceita event_type/event/status em nomes variados.
    """
    ev = str(payload.get("event_type") or payload.get("event")
             or payload.get("type") or "").lower()
    status = str(payload.get("status") or "").lower()
    assinado = ev in EVENTOS_ASSINADO or status in STATUS_ASSINADO

    doc = str(payload.get("name") or payload.get("doc_name")
              or payload.get("document_name") or "").strip()

    pessoas = []
    for sig in (payload.get("signers") or payload.get("signatarios") or []):
        st = str(sig.get("status") or "").lower()
        # se o status vem por signatário e ele NÃO assinou, ignora esse
        if st and st not in STATUS_ASSINADO:
            continue
        nome = str(sig.get("name") or sig.get("nome") or "").strip()
        tel = _telefone(sig)
        if nome or tel:
            pessoas.append({"nome": nome or "(sem nome)", "telefone": tel})
    return assinado, doc, pessoas


def montar_mensagem(doc: str, pessoas: list[dict]) -> str:
    linhas = ["✅ *CONTRATO ASSINADO — ZapSign*"]
    if doc:
        linhas.append(f"📄 {doc}")
    for p in pessoas:
        linhas.append(f"• {p['nome']} — {p['telefone'] or '—'}")
    linhas.append("")
    linhas.append("🎯 *Bia/Pedro:* abrir a pasta e enviar o checklist inicial ao cliente.")
    return "\n".join(linhas)


def processar(payload: dict) -> tuple[int, str]:
    """Decide e dispara. Retorna (quantos_avisos, motivo)."""
    assinado, doc, pessoas = extrair(payload)
    if not assinado:
        return 0, "evento ignorado (não é assinatura concluída)"
    if not pessoas:
        return 0, "assinado, mas sem signatários no payload"

    estado = pj.carregar_estado(ESTADO_JSON)
    chave = "zapsign|" + str(payload.get("token") or payload.get("doc_token")
                             or payload.get("external_id") or doc or "?")
    if chave in estado:
        return 0, "já anunciado (dedupe)"

    ok, info = pj.enviar_alerta_interno(montar_mensagem(doc, pessoas), dry=False)
    if not ok:
        return 0, f"falha no envio ({info})"
    estado[chave] = dt.datetime.now().isoformat(timespec="minutes")
    pj.salvar_estado(ESTADO_JSON, estado)
    return 1, f"anunciado ({info})"


def _grava_cru(raw: bytes) -> None:
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        caminho = os.path.join(LOG_DIR, f"zapsign_raw_{dt.datetime.now():%Y%m%d_%H%M%S}.json")
        with open(caminho, "wb") as f:
            f.write(raw)
    except Exception as e:  # noqa: BLE001
        pj.log(f"⚠️  não consegui gravar o payload cru: {e}")


class Handler(BaseHTTPRequestHandler):
    def _resp(self, code: int, msg: str):
        corpo = json.dumps({"result": msg}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        # healthcheck simples ("tá vivo?")
        self._resp(200, "zapsign-contrato vivo")

    def do_POST(self):
        if SEGREDO and self.path.rstrip("/") != f"/zapsign/{SEGREDO}":
            self._resp(404, "endpoint incorreto"); return
        tam = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(tam) if tam > 0 else b""
        _grava_cru(raw)
        try:
            payload = json.loads(raw.decode("utf-8", "replace"))
        except ValueError:
            self._resp(400, "json inválido"); return
        try:
            n, motivo = processar(payload)
            pj.log(f"webhook: {motivo}")
        except Exception as e:  # noqa: BLE001
            pj.log(f"webhook: erro ao processar → {e}")
            motivo = f"erro interno: {e}"
        # sempre 200 rápido: senão o ZapSign fica reenviando
        self._resp(200, motivo)

    def log_message(self, *a):  # silencia o log padrão do http.server
        pass


def main() -> int:
    pj.log(f"ZAPSIGN-CONTRATO ouvindo em 0.0.0.0:{PORTA}  "
           f"(POST /zapsign/{'<segredo>' if SEGREDO else '(sem segredo!)'} )")
    if not SEGREDO:
        pj.log("⚠️  ZAPSIGN_SEGREDO vazio — qualquer um que achar a URL dispara. "
               "Defina um segredo no .env.")
    ThreadingHTTPServer(("0.0.0.0", PORTA), Handler).serve_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
