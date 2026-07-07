# -*- coding: utf-8 -*-
"""
ALARME-EMENDAS · configuração
=============================

Robô interno de PRAZO FATAL de emendas judiciais (seções 7 e 14 do Manual v4.1).
Emenda é pendência crítica: envolve prazo processual e risco de indeferimento.

Régua (dias ÚTEIS até o PRAZO_FATAL), toda INTERNA (grupo GERAL / Jonas):

    Intimação sem classificação   → "Natália: classificar a emenda (D+0/D+1)"
    Depende de documento sem doc  → "Bia/Natália: acionar Pedro com lista + prazo"
    Faltam 2 dias úteis           → "Protocolar a emenda (SLA: até 2 d.ú. antes)"
    Falta 1 dia útil              → ESCALA JONAS — vence amanhã, sem protocolo
    Dia do prazo fatal            → 🚨 vence HOJE
    Já venceu e sem protocolo     → alarme DIÁRIO até baixar

Trava: protocolada (STATUS PROTOCOLADA ou PROTOCOLADA_EM preenchida) → silêncio.
       STATUS CANCELADA/MANUAL/TESTE → pula.
"""
from __future__ import annotations
import os

MAE_XLSX = os.environ.get(
    "EMENDAS_MAE",
    os.path.join(os.path.dirname(__file__), "OFICIAL_EMENDAS_2026.xlsx"),
)
ABA = os.environ.get("EMENDAS_ABA", "2026")

COL = {
    "processo":     "PROCESSO",
    "cliente":      "CLIENTE",
    "intimacao":    "INTIMACAO",       # data em que a intimação de emenda foi identificada
    "prazo_fatal":  "PRAZO_FATAL",     # data fatal (dd/mm/aaaa) — a mais importante
    "classificacao":"CLASSIFICACAO",   # simples/documental/jurídica/estratégica (ou vazio)
    "depende_doc":  "DEPENDE_DOC",     # SIM/NAO — se depende de documento do cliente
    "doc_ok":       "DOC_OK",          # SIM quando Pedro recebeu/salvou o documento
    "status":       "STATUS",          # EMENDA PENDENTE / PROTOCOLADA / CANCELADA...
    "protocolada_em":"PROTOCOLADA_EM", # data do protocolo (quando sai, o robô cala)
    # carimbos (o robô preenche)
    "a_classificar":"AL_CLASSIFICAR",
    "a_doc":        "AL_DOC",
    "a_d2":         "AL_2DU",
    "a_d1":         "AL_1DU",
    "a_hoje":       "AL_FATAL",
}

STATUS_PULA      = {"CANCELADA", "MANUAL", "NA MAO", "NA MÃO", "TESTE", "ARQUIVADA"}
STATUS_BAIXADA   = {"PROTOCOLADA", "BAIXADA", "CONCLUIDA", "CONCLUÍDA", "EMENDA PROTOCOLADA"}

# SLA: protocolar preferencialmente até 2 dias úteis antes do prazo fatal (7.4).
SLA_PROTOCOLO_DU = 2

# Alarmes escalonados por dias ÚTEIS restantes até o prazo fatal.
# Cada nível dispara 1x (dedupe por carimbo/estado), exceto o VENCIDO (diário).
NIVEIS = [
    {"id": "CLASSIFICAR", "carimbo": "a_classificar"},  # condicional (sem classificação)
    {"id": "DOC",         "carimbo": "a_doc"},           # condicional (depende doc e sem doc)
    {"id": "AL_2DU",      "carimbo": "a_d2",  "du": 2},  # faltam 2 dias úteis
    {"id": "AL_1DU",      "carimbo": "a_d1",  "du": 1},  # falta 1 dia útil → escala Jonas
    {"id": "AL_FATAL",    "carimbo": "a_hoje","du": 0},  # é hoje
]

ALERTAS_JSON = os.path.join(os.path.dirname(__file__), "alertas_enviados.json")
LOG_DIR      = os.path.join(os.path.dirname(__file__), "logs")
