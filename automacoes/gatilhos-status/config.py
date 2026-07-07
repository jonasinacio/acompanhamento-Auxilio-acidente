# -*- coding: utf-8 -*-
"""
GATILHOS-STATUS · configuração
==============================

Robô interno que vigia a "mãe" de casos e faz o que a seção 14 do Manual v4.1
manda: "status não servem só pra marcar onde o caso está; servem pra disparar
a próxima ação". Dois trabalhos:

  1) MUDANÇA DE STATUS → dispara a *tarefa obrigatória* daquele status, para o
     responsável certo, 1x (tabela 14 · gatilhos).
  2) ATRASO DE SLA → se o caso está parado num status além do SLA, joga no
     painel de exceção (grupo GERAL), e cutuca de novo 1x por semana.

Fonte de verdade: a coluna STATUS da mãe. O robô guarda o último status visto
por processo no estado JSON; quando muda, dispara o gatilho.
"""
from __future__ import annotations
import os

MAE_XLSX = os.environ.get(
    "CASOS_MAE",
    os.path.join(os.path.dirname(__file__), "OFICIAL_CASOS_2026.xlsx"),
)
ABA = os.environ.get("CASOS_ABA", "2026")

COL = {
    "processo":    "PROCESSO",
    "cliente":     "CLIENTE",
    "status":      "STATUS",        # um dos status padrão (tabela 14)
    "status_desde":"STATUS_DESDE",  # data em que entrou no status atual (p/ SLA)
    "responsavel": "RESPONSAVEL",   # opcional (informativo)
}

# Status ignorados (não disparam gatilho nem SLA).
STATUS_PULA = {"MANUAL", "TESTE", "PAUSADO", "SUSPENSO"}

# ------------------------------------------------------------------
# TABELA 14 · gatilhos (mudança de status -> tarefa obrigatória)
# quem = texto do responsável; tarefa = o que precisa ser feito.
# ------------------------------------------------------------------
GATILHOS = {
    "CONTRATO ASSINADO": {
        "quem": "Bia → Pedro",
        "tarefa": "Abrir checklist de documentos, criar pasta e enviar lista inicial ao cliente.",
    },
    "PASTA FECHADA": {
        "quem": "Pedro → Natália",
        "tarefa": "Direcionar conforme a matriz de decisão e abrir a fila ADM ou JUD.",
    },
    "PROTOCOLO ADM": {
        "quem": "Natália + Bia",
        "tarefa": "Abrir acompanhamento semanal e comunicação ao cliente.",
    },
    "EXIGENCIA ADM": {
        "quem": "Natália + Bia",
        "tarefa": "Classificar a exigência e acionar Pedro se faltar documento.",
    },
    "EMENDA PENDENTE": {
        "quem": "Natália + Bia",
        "tarefa": "Classificar a exigência, abrir tarefa e acionar Pedro se depender de documento. "
                  "(O alarme de prazo fatal fica com o robô ALARME-EMENDAS.)",
    },
    "PERICIA DESIGNADA": {
        "quem": "Natália + Bia",
        "tarefa": "Abrir a sequência D-15, D-7, D-2 e D+1. (Quem dispara os avisos é o ARAUTO-PERÍCIA.)",
    },
    "LAUDO JUNTADO": {
        "quem": "Natália → Jonas",
        "tarefa": "Notificar Jonas e registrar prazo interno de análise do laudo.",
    },
}

# ------------------------------------------------------------------
# TABELA 14 · SLA por status (em dias ÚTEIS) p/ detectar ATRASO.
# None = sem SLA de tempo aqui (tratado por outro robô ou sem prazo).
# ------------------------------------------------------------------
SLA_DIAS_UTEIS = {
    "LEAD": None,                 # 15 min — granular demais p/ robô diário
    "CONTRATO ASSINADO": 1,       # mesmo dia
    "AGUARDANDO DOCUMENTOS": 7,
    "PASTA FECHADA": 7,
    "PROTOCOLO ADM": 3,
    "EXIGENCIA ADM": 1,
    "AJUIZADO": 5,
    "EMENDA PENDENTE": None,      # prazo fatal → ALARME-EMENDAS
    "PERICIA DESIGNADA": None,    # régua D-x → ARAUTO-PERÍCIA
    "LAUDO JUNTADO": 5,
    "SENTENCA": 3,
    "EXECUCAO": 7,                # atualização semanal
    "ALVARA EXPEDIDO": 2,
    "FINALIZADO": None,
}

# Reforço do alarme de atraso: reavisa a cada N dias úteis enquanto estourado.
REAVISO_ATRASO_DU = 5

ALERTAS_JSON = os.path.join(os.path.dirname(__file__), "estado_status.json")
LOG_DIR      = os.path.join(os.path.dirname(__file__), "logs")
