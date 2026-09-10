# -*- coding: utf-8 -*-
"""
ARAUTO-PERÍCIA · Configuração (régua fechada + textos + ambiente)

Espelha o robô de avisos de audiência (ARAUTO), mas para PERÍCIA MÉDICA,
seguindo a seção 8.2 do Manual Operacional v4.1:

    Ao identificar   Natália registra data/local/tipo/prazo interno
    D-15             Bia informa data, hora, local e regra geral ao cliente
    D-10 a D-7       aciona Pedro p/ organizar documentos que o cliente leva
    D-7              Bia envia orientação detalhada + checklist de conduta
    D-2              Bia confirma presença, rota, documentos e dúvidas
    D+1              Bia coleta relato do cliente e registra no ADVBOX

REGRA DE OURO (igual ARAUTO): a régua é FECHADA. Não mude os marcos.
Cada marco grava sua própria coluna na "mãe" e NUNCA repete.
"""

from __future__ import annotations
import os

# ----------------------------------------------------------------------
# 1 · FONTE — a "mãe" (planilha OFICIAL, única fonte de verdade)
# ----------------------------------------------------------------------
# Caminho da planilha. Sobrescreva com a env PERICIA_MAE se quiser.
MAE_XLSX = os.environ.get(
    "PERICIA_MAE",
    os.path.join(os.path.dirname(__file__), "OFICIAL_PERICIAS_2026.xlsx"),
)
ABA = os.environ.get("PERICIA_ABA", "2026")

# Nomes das colunas esperadas na aba (linha 1 = cabeçalho).
# O robô casa por NOME de coluna, não por posição — pode reordenar na planilha.
COL = {
    "processo":   "PROCESSO",       # nº do processo — chave do caso
    "cliente":    "CLIENTE",        # nome do cliente
    "telefone":   "TELEFONE",       # WhatsApp do cliente (só dígitos, DDI+DDD)
    "data":       "DATA_PERICIA",   # data da perícia (dd/mm/aaaa)
    "hora":       "HORA",           # hora da perícia (HH:MM)
    "local":      "LOCAL",          # endereço/local da perícia
    "tipo":       "TIPO",           # tipo (INSS administrativa / judicial)
    "acidentaria":"ACIDENTARIA",    # "SIM" p/ pedir CAT/PPP/CTPS no checklist
    "status":     "STATUS",         # ver STATUS_PULA abaixo
    # colunas de CARIMBO (o robô escreve a data/hora que disparou cada marco)
    "c_15":       "AVISO_15",
    "c_doc":      "DOC_PEDRO",
    "c_7":        "ORIENTA_7",
    "c_2":        "CONFIRMA_2",
    "c_pos":      "RELATO_1",
}

# Status que fazem o robô PULAR a linha em silêncio (trava natural, igual ARAUTO).
STATUS_PULA = {"CANCELADA", "REMARCADA", "MANUAL", "NA MAO", "NA MÃO", "TESTE", "DESIGNAR"}


# ----------------------------------------------------------------------
# 2 · RÉGUA FECHADA — 4 marcos p/ cliente + 1 alerta interno (Pedro)
# ----------------------------------------------------------------------
# offset = dias corridos ANTES da perícia (negativo) ou DEPOIS (positivo).
# janela = tolerância em dias p/ pegar quem o robô não rodou no dia exato
#          (Mac desligado, fim de semana). Evita furar o marco.
# canal  = "cliente" (WhatsApp) ou "interno" (grupo GERAL).
# carimbo= coluna que marca o disparo p/ nunca repetir.
MARCOS = [
    {
        "id": "AVISO_15", "offset": -15, "janela": 3, "canal": "cliente",
        "carimbo": "c_15", "exige": ["data", "hora", "local"],
        "template": "aviso_15",
    },
    {
        "id": "DOC_PEDRO", "offset": -9, "janela": 3, "canal": "interno",
        "carimbo": "c_doc", "exige": [],
        "template": "doc_pedro",
    },
    {
        "id": "ORIENTA_7", "offset": -7, "janela": 2, "canal": "cliente",
        "carimbo": "c_7", "exige": ["data", "hora", "local"],
        "template": "orienta_7",
    },
    {
        "id": "CONFIRMA_2", "offset": -2, "janela": 1, "canal": "cliente",
        "carimbo": "c_2", "exige": ["data", "hora", "local"],
        "template": "confirma_2",
    },
    {
        "id": "RELATO_1", "offset": +1, "janela": 2, "canal": "interno",
        "carimbo": "c_pos", "exige": [],
        "template": "relato_1",
    },
]

# Se dois marcos caem no mesmo dia (ex.: robô parado no fim de semana),
# dispara só o MAIS PRÓXIMO da perícia — evita 2 mensagens coladas (a "Regra 5"
# do ARAUTO). Ordenação por proximidade é feita no robô.


# ----------------------------------------------------------------------
# 3 · TEXTOS — templates (cliente) e alertas (interno)
# ----------------------------------------------------------------------
# Placeholders disponíveis: {cliente} {data} {hora} {local} {processo}
#                           {checklist} {primeiro_nome}
TEMPLATES = {
    # D-15 · cliente · Bia informa data/hora/local + regra geral
    "aviso_15": (
        "Olá, {primeiro_nome}! Aqui é do escritório Jonas Inácio - Advocacia "
        "Previdenciária. 📋\n\n"
        "Sua *perícia médica do INSS* já tem data marcada:\n"
        "🗓️ *Data:* {data}\n"
        "⏰ *Horário:* {hora}\n"
        "📍 *Local:* {local}\n\n"
        "Nos próximos dias enviaremos as orientações completas e a lista de "
        "documentos que você deve levar. Qualquer dúvida, é só responder aqui. "
        "Estamos com você. 🤝"
    ),
    # D-7 · cliente · orientação detalhada + checklist de conduta
    "orienta_7": (
        "{primeiro_nome}, faltam poucos dias para a sua perícia médica. "
        "Vamos ao passo a passo. 🩺\n\n"
        "🗓️ {data} às {hora}\n"
        "📍 {local}\n\n"
        "*Leve estes documentos (originais):*\n{checklist}\n\n"
        "*No dia da perícia:*\n"
        "• Chegue com *30 minutos de antecedência*.\n"
        "• Explique suas limitações com clareza e sinceridade — *sem exagerar "
        "e sem esconder nada*.\n"
        "• Relate as dores e dificuldades do seu dia a dia.\n"
        "• Leve todos os exames e laudos, mesmo os antigos.\n\n"
        "Dois dias antes vamos confirmar tudo com você. 🤝"
    ),
    # D-2 · cliente · confirmar presença/rota/documentos/dúvidas
    "confirma_2": (
        "{primeiro_nome}, sua perícia é *depois de amanhã*. Vamos confirmar? ✅\n\n"
        "🗓️ {data} às {hora}\n"
        "📍 {local}\n\n"
        "• Você já sabe como chegar ao local?\n"
        "• Separou os documentos e exames para levar?\n"
        "• Ficou alguma dúvida?\n\n"
        "Responda aqui *SIM* para confirmarmos sua presença, ou escreva sua "
        "dúvida. Boa sorte — vai dar tudo certo! 🍀"
    ),
    # D+1 · INTERNO · lembrar Bia de coletar relato pós-perícia
    "relato_1": (
        "🔔 *ARAUTO-PERÍCIA · relato D+1*\n"
        "Cliente: {cliente}\n"
        "Processo: {processo}\n"
        "Perícia foi em {data}. *Bia:* colher o relato do cliente e registrar "
        "no ADVBOX (como foi, o que o perito perguntou, sensação geral)."
    ),
    # D-10..D-7 · INTERNO · acionar Pedro p/ organizar documentos
    "doc_pedro": (
        "🔔 *ARAUTO-PERÍCIA · documentos D-9*\n"
        "Cliente: {cliente}\n"
        "Processo: {processo}\n"
        "Perícia em {data}. *Pedro:* organizar no Drive os documentos que o "
        "cliente deve levar e avisar Bia/Natália quando prontos."
    ),
}

# Checklist de documentos (seção 8.3). Itens acidentários só entram se
# ACIDENTARIA == "SIM".
CHECKLIST_BASE = [
    "Documento com foto (RG ou CNH)",
    "Laudos médicos atualizados",
    "Exames relevantes (imagem, laboratório)",
    "Receitas e comprovantes de tratamento",
    "Prontuários ou relatórios recentes",
]
CHECKLIST_ACIDENTARIA = [
    "CAT (Comunicação de Acidente de Trabalho)",
    "PPP / documentos ocupacionais",
    "CTPS ou comprovante de vínculo",
]


# ----------------------------------------------------------------------
# 4 · SAÍDA — os senders (uazapi) e credenciais moram em
#     ../pj_comum.py, compartilhados por todos os robôs. Ajuste lá.
# ----------------------------------------------------------------------


# ----------------------------------------------------------------------
# 5 · ESTADO — dedupe/memória (igual ARAUTO)
# ----------------------------------------------------------------------
ALERTAS_JSON = os.environ.get(
    "PERICIA_ESTADO", os.path.join(os.path.dirname(__file__), "alertas_enviados.json"))
LOG_DIR      = os.environ.get(
    "PERICIA_LOGS", os.path.join(os.path.dirname(__file__), "logs"))
