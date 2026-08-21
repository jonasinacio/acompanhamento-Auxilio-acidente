# -*- coding: utf-8 -*-
"""
classificacao.py — datas/dias úteis + classificação de ato do DJEN.

Porta fiel do classificacao.js do Jonas (Drive): mesma conta de dias úteis
(feriados fixos, móveis por Páscoa, recesso forense 20/12–20/01) e a mesma
regra de classificar cada publicação num "ato" com o prazo (dias úteis).
NÃO chuta: quando não reconhece com confiança, devolve flag 'conferir'.

Sem rede, sem dependências externas.
"""
from __future__ import annotations

import datetime as dt
import re


def _pascoa(Y: int) -> dt.date:  # Meeus/Gregoriano
    a = Y % 19; b = Y // 100; c = Y % 100; d = b // 4; e = b % 4
    f = (b + 8) // 25; g = (b - f + 1) // 3; h = (19 * a + b - d - g + 15) % 30
    i = c // 4; k = c % 4; l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = ((h + l - 7 * m + 114) % 31) + 1
    return dt.date(Y, mes, dia)


_FIXOS = [(1, 1), (4, 21), (5, 1), (9, 7), (10, 12), (11, 2), (11, 15), (11, 20), (12, 25)]
_cache: dict[int, set] = {}


def _feriados(Y: int) -> set:
    if Y not in _cache:
        s = set()
        for (mm, dd) in _FIXOS:
            if (mm, dd) == (11, 20) and Y < 2024:  # Consciência Negra nacional só a partir de 2024
                continue
            s.add((mm, dd))
        P = _pascoa(Y)
        for off in (-48, -47, -2, 60):  # Carnaval seg/ter, Sexta Santa, Corpus Christi
            d = P + dt.timedelta(days=off)
            s.add((d.month, d.day))
        _cache[Y] = s
    return _cache[Y]


def is_feriado(d: dt.date) -> bool:
    return (d.month, d.day) in _feriados(d.year)


def em_recesso(d: dt.date) -> bool:  # art. 220 CPC
    return (d.month == 12 and d.day >= 20) or (d.month == 1 and d.day <= 20)


def dia_util(d: dt.date) -> bool:
    return d.weekday() < 5 and not is_feriado(d) and not em_recesso(d)


def proximo_dia_util(d: dt.date) -> dt.date:
    d = d + dt.timedelta(days=1)
    while not dia_util(d):
        d += dt.timedelta(days=1)
    return d


def dia_util_anterior(d: dt.date) -> dt.date:
    d = d - dt.timedelta(days=1)
    while not dia_util(d):
        d -= dt.timedelta(days=1)
    return d


def data_fatal_uteis(base: dt.date, dias: int) -> dt.date:
    """Data fatal = 'dias' dias úteis a partir do dia útil seguinte à base."""
    d = proximo_dia_util(base)
    for _ in range(1, dias):
        d = proximo_dia_util(d)
    return d


def subtrair_dias_uteis(d: dt.date, n: int) -> dt.date:
    for _ in range(n):
        d = dia_util_anterior(d)
    return d


def _remover_rodape(txt: str) -> str:
    """Corta o rodapé 'Dica de tramitação ágil' que alguns tribunais anexam."""
    m = re.search(r"Dica de tramita[çc][ãa]o [áa]gil", txt or "", re.I)
    return txt[:m.start()] if m else (txt or "")


def classificar(pub: dict) -> dict:
    """
    pub -> {ato, dias|None, flag?, obs?}. Mesma lógica do classificacao.js.
    'flag' presente = não reconheceu com confiança (humano confere).
    """
    td = (pub.get("tipoDocumento") or "").upper()
    tc = (pub.get("tipoComunicacao") or "").upper()
    txt = _remover_rodape(pub.get("texto") or "")
    tu = txt.upper()
    jef = ("JUIZADO ESPECIAL" in tu or "RECURSO CÍVEL" in tu
           or "RECURSO INOMINADO" in tu or re.search(r"/JEF\b", tu))
    pericia = "PERÍCIA" in tu or "PERICIA" in tu
    m_expl = re.search(r"prazo de\s+(\d+)\s*\(?[^)]*\)?\s*dias", txt, re.I)

    if "ACÓRDÃO" in td or "ACÓRDÃO" in tc:
        favor = ("NEGAR PROVIMENTO AO RECURSO DO INSS" in tu
                 or "NEGO PROVIMENTO AO RECURSO DO INSS" in tu
                 or ("MANTENDO A SENTENÇA" in tu and "INSS" in tu))
        if favor:
            return {"ato": "Acórdão (favorável)", "dias": None, "flag": "favoravel"}
        return {"ato": "Acórdão", "dias": 15, "obs": "conferir cabimento/resultado"}

    if "SENTENÇA" in td or "SENTENÇA" in tc:
        if "HOMOLOGO" in tu and "ACORDO" in tu:
            return {"ato": "Sentença (homologação de acordo)", "dias": None,
                    "flag": "homologacao",
                    "obs": "conferir se o cumprimento/pagamento seguiu o combinado"}
        if jef:
            return {"ato": "Sentença (JEF) → recurso inominado", "dias": 10}
        return {"ato": "Sentença → apelação", "dias": 15, "obs": "conferir resultado"}

    if ("PROPOSTA DE ACORDO" in tu or "MANIFESTAÇÃO SOBRE O ACORDO" in tu
            or "MANIFESTAÇÃO SOBRE A PROPOSTA" in tu):
        if m_expl:
            return {"ato": "Manifestação sobre proposta de acordo (prazo expresso)",
                    "dias": int(m_expl.group(1))}
        return {"ato": "Manifestação sobre proposta de acordo", "dias": None, "flag": "conferir"}

    if "CONTESTAÇÃO" in tu:
        return {"ato": "Contestação do INSS → réplica", "dias": 15}
    if ("SANEAMENTO" in tu or "NOMEIO PERITO" in tu or "NOMEAR PERITO" in tu
            or "QUESITOS" in tu):
        return {"ato": "Saneamento/quesitos", "dias": 15}
    if "LAUDO" in tu:
        return {"ato": "Laudo pericial → manifestação", "dias": 15}
    if m_expl:
        return {"ato": (pub.get("tipoDocumento") or "Ato") + " (prazo expresso)",
                "dias": int(m_expl.group(1))}
    if pericia:
        return {"ato": "Perícia designada — anotar agenda", "dias": None, "flag": "pericia"}
    return {"ato": (pub.get("tipoDocumento") or pub.get("tipoComunicacao") or "Comunicação"),
            "dias": None, "flag": "conferir"}
