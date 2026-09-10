# -*- coding: utf-8 -*-
"""
PAINEL-MANHÃ · configuração
===========================

Digest diário no grupo GERAL: uma mensagem com as exceções do dia lidas de
TODAS as mães (perícia, emenda, casos, documentos). Não dispara nada aos
clientes — é resumo interno pra reunião/começo de dia (seções 15 e 16).
"""
from __future__ import annotations
import os

# Janelas de destaque (ajuste ao gosto).
PERICIA_PROX_DIAS   = 7    # perícias nos próximos N dias
EMENDA_CRIT_DU      = 3    # emendas com prazo fatal em ≤ N dias úteis
DOCS_PARADO_DIAS    = 7    # documentos aguardando há ≥ N dias
MAX_ITENS_LISTA     = 6    # quantos itens listar por seção (o resto vira "+N")

# Manda no máximo 1 painel por dia (dedupe por data).
ALERTAS_JSON = os.environ.get(
    "PAINEL_ESTADO", os.path.join(os.path.dirname(__file__), "estado_painel.json"))
LOG_DIR      = os.environ.get(
    "PAINEL_LOGS", os.path.join(os.path.dirname(__file__), "logs"))
