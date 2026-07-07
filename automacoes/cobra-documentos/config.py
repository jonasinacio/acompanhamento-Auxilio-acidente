# -*- coding: utf-8 -*-
"""
COBRA-DOCUMENTOS · configuração
===============================

Robô de cobrança de documentos do cliente — o gargalo nº 1 do escritório
(seção 5 + status AGUARDANDO DOCUMENTOS da seção 14, "7 dias úteis com
follow-ups"). Para cada caso aguardando documentos, manda ao cliente lembretes
educados e escalonados no WhatsApp, com a LISTA do que falta, e escala pro
Pedro/Bia se o cliente não responder.

Régua (dias a partir de SOLICITADO_EM):

    D+3   lembrete gentil ao cliente (com a lista do que falta)
    D+7   2º lembrete, um pouco mais firme
    D+10  ESCALA interna: Pedro/Bia cobram ativamente (ligar)
    D+12  3º e último lembrete ao cliente (avisa que o processo pode atrasar)

Trava: STATUS COMPLETO/RECEBIDO ou RECEBIDO_EM preenchida → silêncio.
       STATUS CANCELADA/MANUAL/PAUSADO → pula.
"""
from __future__ import annotations
import os

MAE_XLSX = os.environ.get(
    "DOCS_MAE", os.path.join(os.path.dirname(__file__), "OFICIAL_DOCUMENTOS_2026.xlsx"))
ABA = os.environ.get("DOCS_ABA", "2026")

COL = {
    "processo":   "PROCESSO",
    "cliente":    "CLIENTE",
    "telefone":   "TELEFONE",
    "solicitado": "SOLICITADO_EM",   # data em que os documentos foram pedidos
    "docs":       "DOCS_FALTANDO",   # lista do que falta (itens separados por ; )
    "status":     "STATUS",          # AGUARDANDO DOCUMENTOS / COMPLETO / ...
    "recebido":   "RECEBIDO_EM",     # data em que veio tudo (preencheu → cala)
    # carimbos
    "c_l1":       "LEMB_3",
    "c_l2":       "LEMB_7",
    "c_esc":      "ESCALA_PEDRO",
    "c_l3":       "LEMB_12",
}

STATUS_PULA     = {"CANCELADA", "MANUAL", "NA MAO", "NA MÃO", "TESTE", "PAUSADO", "SUSPENSO"}
STATUS_COMPLETO = {"COMPLETO", "RECEBIDO", "PASTA FECHADA", "DOCS OK", "COMPLETA"}

# Régua. offset = dias corridos após SOLICITADO_EM. janela = tolerância catch-up.
# canal cliente: só 1 lembrete por dia — se vários vencidos, manda o MAIS
# AVANÇADO e marca os anteriores como já passados (não faz sentido mandar o
# "lembrete gentil" uma semana depois). O interno (Pedro) é independente.
MARCOS = [
    {"id": "LEMB_3",  "offset": 3,  "janela": 3, "canal": "cliente",
     "carimbo": "c_l1", "exige": ["docs"], "template": "lembrete_1"},
    {"id": "LEMB_7",  "offset": 7,  "janela": 3, "canal": "cliente",
     "carimbo": "c_l2", "exige": ["docs"], "template": "lembrete_2"},
    {"id": "ESCALA_PEDRO", "offset": 10, "janela": 5, "canal": "interno",
     "carimbo": "c_esc", "exige": [], "template": "escala_pedro"},
    {"id": "LEMB_12", "offset": 12, "janela": 6, "canal": "cliente",
     "carimbo": "c_l3", "exige": ["docs"], "template": "lembrete_3"},
]

TEMPLATES = {
    "lembrete_1": (
        "Olá, {primeiro_nome}! Aqui é do escritório Jonas Inácio - Advocacia "
        "Previdenciária. 📄\n\n"
        "Para dar andamento ao seu processo, ainda precisamos destes documentos:\n"
        "{lista}\n\n"
        "Pode enviar aqui mesmo por foto ou PDF, é bem rápido. Qualquer dúvida, "
        "estou à disposição. Obrigado! 🙏"
    ),
    "lembrete_2": (
        "{primeiro_nome}, tudo bem? Passando para lembrar dos documentos que "
        "ainda faltam para o seu processo seguir: 📄\n\n"
        "{lista}\n\n"
        "Assim que você enviar, já damos sequência. Se estiver com dificuldade "
        "para conseguir algum deles, me avise que a gente te ajuda a resolver. 🤝"
    ),
    "lembrete_3": (
        "{primeiro_nome}, este é um lembrete importante. ⚠️\n\n"
        "Ainda estamos aguardando estes documentos, e sem eles o seu processo "
        "pode ficar parado:\n{lista}\n\n"
        "Consegue nos enviar até esta semana? Se algum documento não existir ou "
        "você não conseguir, me responda aqui que buscamos uma alternativa. "
        "Não queremos que seu caso atrase. 🙏"
    ),
    "escala_pedro": (
        "📎 *COBRANÇA DE DOCUMENTOS · sem retorno*\n"
        "Cliente: {cliente}  ·  Proc: {processo}\n"
        "Solicitado em {solicitado}. Já foram enviados lembretes e o cliente "
        "ainda não completou:\n{lista}\n"
        "*Pedro/Bia:* cobrar ativamente (ligar), ajudar o cliente a conseguir e "
        "salvar no Drive. Marcar RECEBIDO_EM na mãe quando vier tudo."
    ),
}

ALERTAS_JSON = os.environ.get(
    "DOCS_ESTADO", os.path.join(os.path.dirname(__file__), "alertas_enviados.json"))
LOG_DIR      = os.environ.get(
    "DOCS_LOGS", os.path.join(os.path.dirname(__file__), "logs"))
