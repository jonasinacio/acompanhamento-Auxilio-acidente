#!/usr/bin/env python3
"""
Busca publicações no DJEN (Comunica API do CNJ) por OAB e calcula prazos.

Encadeia a lógica dos agentes:
  1. monitor-dje-djen -> busca e classifica urgência das publicações
  2. lembrete-prazo    -> calcula data fatal e régua de lembretes (D-7/D-3/D-1/D-0)

Requer rede liberada para comunicaapi.pje.jus.br (não funciona em ambientes
com política de egress restrita, como sessões remotas do Claude Code on the web).

Uso:
  python3 scripts/busca_djen_oab.py --oab 160291 --uf MG --inicio 2026-06-01 --fim 2026-06-28
  python3 scripts/busca_djen_oab.py --oab 160291 --uf MG --mes-atual
"""
import argparse
import json
import sys
import urllib.request
import urllib.parse
from datetime import date, timedelta, datetime

API_BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"

FERIADOS_2026 = {
    date(2026, 1, 1), date(2026, 2, 16), date(2026, 2, 17), date(2026, 2, 18),
    date(2026, 4, 3), date(2026, 4, 21), date(2026, 5, 1), date(2026, 6, 4),
    date(2026, 9, 7), date(2026, 10, 12), date(2026, 11, 2), date(2026, 11, 15),
    date(2026, 11, 20), date(2026, 12, 25),
}

RITO = {
    "contestar": {"prazo_dias": 15, "urgencia": "CRITICA", "lei": "CPC 335"},
    "contestação": {"prazo_dias": 15, "urgencia": "CRITICA", "lei": "CPC 335"},
    "apelar": {"prazo_dias": 15, "urgencia": "CRITICA", "lei": "CPC 1.003 §5"},
    "apelação": {"prazo_dias": 15, "urgencia": "CRITICA", "lei": "CPC 1.003 §5"},
    "embargos de declaração": {"prazo_dias": 5, "urgencia": "CRITICA", "lei": "CPC 1.023"},
    "réplica": {"prazo_dias": 15, "urgencia": "ALTA", "lei": "CPC 350"},
    "manifestar laudo": {"prazo_dias": 15, "urgencia": "ALTA", "lei": "CPC 477"},
    "sentença": {"prazo_dias": 15, "urgencia": "CRITICA", "lei": "CPC 1.003 §5"},
    "mero expediente": {"prazo_dias": None, "urgencia": "BAIXA", "lei": "-"},
}


def em_recesso(d):
    if d.month == 12 and d.day >= 20:
        return True
    if d.month == 1 and d.day <= 20:
        return True
    return False


def eh_dia_util(d):
    if d.weekday() >= 5:
        return False
    if d in FERIADOS_2026:
        return False
    if em_recesso(d):
        return False
    return True


def somar_dias_uteis(inicio, dias):
    d = inicio
    contados = 0
    while contados < dias:
        d += timedelta(days=1)
        if eh_dia_util(d):
            contados += 1
    return d


def calcular_prazo(data_publicacao, dias_uteis):
    pub = datetime.strptime(data_publicacao, "%Y-%m-%d").date()
    inicio = pub + timedelta(days=1)
    while not eh_dia_util(inicio):
        inicio += timedelta(days=1)
    return somar_dias_uteis(inicio - timedelta(days=1), dias_uteis)


def classificar(ato_texto):
    ato_lower = (ato_texto or "").lower()
    for chave, regra in RITO.items():
        if chave in ato_lower:
            return regra
    return {"prazo_dias": None, "urgencia": "MEDIA", "lei": "?"}


def buscar_djen(oab, uf, inicio, fim):
    params = {
        "numeroOab": oab,
        "ufOab": uf,
        "dataDisponibilizacaoInicio": inicio,
        "dataDisponibilizacaoFim": fim,
    }
    url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--oab", required=True, help="Número da OAB (sem UF), ex: 160291")
    ap.add_argument("--uf", required=True, help="UF da OAB, ex: MG")
    ap.add_argument("--inicio", help="Data início (YYYY-MM-DD)")
    ap.add_argument("--fim", help="Data fim (YYYY-MM-DD)")
    ap.add_argument("--mes-atual", action="store_true", help="Usa o mês atual como período")
    ap.add_argument("--json-out", help="Salva resultado bruto em arquivo JSON")
    args = ap.parse_args()

    if args.mes_atual:
        hoje = date.today()
        inicio = hoje.replace(day=1).isoformat()
        fim = hoje.isoformat()
    else:
        if not args.inicio or not args.fim:
            ap.error("informe --inicio e --fim, ou use --mes-atual")
        inicio, fim = args.inicio, args.fim

    print(f"Buscando publicações DJEN para OAB {args.oab}/{args.uf} de {inicio} a {fim}...\n")

    try:
        dados = buscar_djen(args.oab, args.uf, inicio, fim)
    except Exception as e:
        print(f"ERRO ao consultar DJEN: {e}", file=sys.stderr)
        print(
            "Verifique conexão de rede com comunicaapi.pje.jus.br "
            "(este script não funciona em ambientes com egress restrito).",
            file=sys.stderr,
        )
        sys.exit(1)

    items = dados.get("items", [])
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
        print(f"Resultado bruto salvo em {args.json_out}\n")

    if not items:
        print("Nenhuma publicação encontrada no período.")
        return

    linhas = []
    for item in items:
        processo = item.get("numero_processo", "?")
        orgao = item.get("nomeOrgao", "?")
        data_pub = item.get("data_disponibilizacao", "?")
        ato = item.get("tipoComunicacao") or item.get("texto", "")[:60]
        regra = classificar(ato)

        data_fatal = None
        if regra["prazo_dias"] and data_pub != "?":
            try:
                data_fatal = calcular_prazo(data_pub, regra["prazo_dias"])
            except ValueError:
                data_fatal = None

        linhas.append({
            "processo": processo,
            "orgao": orgao,
            "data_publicacao": data_pub,
            "ato": ato,
            "urgencia": regra["urgencia"],
            "prazo_dias": regra["prazo_dias"],
            "lei": regra["lei"],
            "data_fatal": data_fatal.isoformat() if data_fatal else None,
        })

    print(f"{'PROCESSO':<28} {'ATO':<35} {'URG':<9} {'DATA FATAL':<12} {'LEI':<15}")
    print("-" * 105)
    ordem_urgencia = {"CRITICA": 0, "ALTA": 1, "MEDIA": 2, "BAIXA": 3}
    for l in sorted(linhas, key=lambda x: ordem_urgencia.get(x["urgencia"], 9)):
        print(
            f"{l['processo']:<28} {l['ato'][:35]:<35} {l['urgencia']:<9} "
            f"{l['data_fatal'] or '-':<12} {l['lei']:<15}"
        )

    urgentes = [l for l in linhas if l["urgencia"] == "CRITICA" and l["data_fatal"]]
    urgentes.sort(key=lambda x: x["data_fatal"])
    if urgentes:
        print("\nTOP URGENTES (CRÍTICA, ordenado por data fatal):")
        for l in urgentes[:3]:
            print(f"  - {l['processo']} | {l['ato']} | data fatal: {l['data_fatal']}")

    print("\nChecklist de captura do dia:")
    print("[ ] DJEN consultado (data de hoje)")
    print("[ ] DJE estadual consultado (se houver expedição residual na UF)")
    print("[ ] STF/STJ portais consultados (se aplicável)")
    print("[ ] Publicações registradas no controle de prazos")
    print("[ ] Cliente notificado das publicações relevantes")
    print("[ ] Prazos críticos lançados na agenda")


if __name__ == "__main__":
    main()
