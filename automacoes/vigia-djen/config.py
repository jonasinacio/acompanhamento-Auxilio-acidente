# -*- coding: utf-8 -*-
"""
VIGIA-DJEN · configuração
=========================

Vigia o boletim do DJEN (Diário de Justiça Eletrônico Nacional, via API Comunica
do CNJ). Todo dia consulta as publicações/intimações do escritório e joga no
grupo GERAL, pra ninguém perder prazo — alimenta direto o alarme-emendas.

⚠️  Preencha OABS com o(s) número(s) do escritório. Sem isso o robô só grita
    pedindo configuração.
"""
from __future__ import annotations
import os

# API pública Comunica/DJEN (CNJ). Confira a base na doc oficial se mudar.
API_BASE = os.environ.get(
    "DJEN_API", "https://comunicaapi.pje.jus.br/api/v1/comunicacao")

# Advogados/OABs monitorados (a OAB é dado PÚBLICO — aparece nas publicações).
# Se houver mais sócios, acrescente dicts aqui.
OABS: list[dict] = [
    {"oab": "160291", "uf": "MG", "quem": "Jonas Inácio Andreza"},
]
# Atalho por variável de ambiente (um só): DJEN_OAB=123456 DJEN_UF=SP
if os.environ.get("DJEN_OAB"):
    OABS = [{"oab": os.environ["DJEN_OAB"],
             "uf": os.environ.get("DJEN_UF", "SP"),
             "quem": os.environ.get("DJEN_QUEM", "escritório")}]

# Janela: publicações disponibilizadas de N dias atrás até hoje (pega fim de
# semana/feriado em que o robô não rodou). 3 é um bom padrão.
DIAS_ATRAS = int(os.environ.get("DJEN_DIAS", "3"))

# Quantos caracteres do inteiro teor mostrar no aviso (o resto o time abre no link).
TRECHO = int(os.environ.get("DJEN_TRECHO", "300"))

TEMPLATE = (
    "📰 *DJEN — nova publicação* ({quem})\n"
    "Proc: {processo}\n"
    "{tribunal} · {orgao}\n"
    "Tipo: {tipo}{classe}\n"
    "{classificacao}"
    "🗓️ Disponibilizado em {data}\n"
    "{trecho}"
    "{link}"
    "\n⚠️ Prazo é *estimativa* — conferir e registrar no AdvBox."
)

ALERTAS_JSON = os.environ.get(
    "DJEN_ESTADO", os.path.join(os.path.dirname(__file__), "alertas_enviados.json"))
LOG_DIR = os.environ.get(
    "DJEN_LOGS", os.path.join(os.path.dirname(__file__), "logs"))
