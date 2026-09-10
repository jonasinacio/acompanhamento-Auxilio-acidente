#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VIGIA-DJEN · o vigia do boletim
===============================

Roda 1x/dia. Consulta a API Comunica (DJEN/CNJ) pelas OABs do escritório, pega
as publicações da janela e joga cada NOVA no grupo GERAL (dedupe pelo id).
Assim ninguém precisa abrir o Diário à mão — e alimenta o alarme-emendas.

Contrato da API portado do buscar-djen.js do Jonas (Drive): mesma base, mesmos
campos, mesma limpeza de HTML e paginação — agora conectado à estrutura dos
robôs (envio via uazapi, dedupe/backup do pj_comum, launchd).

    python3 robo_djen.py --dry               # mostra o que faria
    python3 robo_djen.py --send              # envia e carimba
    python3 robo_djen.py --dry --mock        # testa sem rede (dados de exemplo)
    python3 robo_djen.py --send --hoje 2026-07-07

⚠️  Do ambiente do Claude a API do DJEN não é alcançável — use --mock pra testar.
    Em produção (máquina do escritório) roda sem --mock.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pj_comum as pj      # noqa: E402
import config as C         # noqa: E402
import classificacao as clf  # noqa: E402  (cérebro portado do classificacao.js)
import db                  # noqa: E402  (grava no Postgres do QG, se configurado)

# Amostra p/ --mock, nos MESMOS campos que a API Comunica devolve.
_MOCK = {
    "count": 2,
    "items": [
        {"id": 111, "datadisponibilizacao": "2026-07-07", "siglaTribunal": "TJSP",
         "nomeOrgao": "3ª Vara Cível - Foro Central", "tipoComunicacao": "Intimação",
         "nomeClasse": "Procedimento Comum Cível",
         "numeroprocessocommascara": "1002345-67.2026.8.26.0100",
         "meiocompleto": "Diário de Justiça Eletrônico Nacional",
         "link": "https://comunica.pje.jus.br/consulta/111",
         "texto": "<p>Fica a parte autora intimada para, no prazo de <b>15 dias</b>, "
                  "emendar a inicial.</p>",
         "destinatarioadvogados": [{"advogado": {"nome": "Jonas Inácio Andreza"}}]},
        {"id": 222, "datadisponibilizacao": "2026-07-07", "siglaTribunal": "TRF3",
         "nomeOrgao": "1ª Vara Federal Previdenciária", "tipoComunicacao": "Sentença",
         "nomeClasse": "Procedimento do Juizado Especial Cível",
         "numeroprocessocommascara": "5009876-54.2026.4.03.6100",
         "meiocompleto": "Diário de Justiça Eletrônico Nacional",
         "link": "https://comunica.pje.jus.br/consulta/222",
         "texto": "<div>Julgo <b>procedente</b> o pedido de auxílio-acidente.</div>",
         "destinatarioadvogados": [{"advogado": {"nome": "Jonas Inácio Andreza"}}]},
    ],
}


def limpar_html(bruto) -> str:
    """Tira tags/entidades do inteiro teor (porta do limparHtml do buscar-djen.js)."""
    if not bruto:
        return ""
    t = str(bruto)
    t = re.sub(r"<\s*(br|/p|/tr|/section|/div)\s*/?\s*>", "\n", t, flags=re.I)
    t = re.sub(r"</td>", " ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return "\n".join(ln.strip() for ln in t.splitlines()).strip()


def buscar(oab: dict, ini: dt.date, fim: dt.date, mock: bool) -> list[dict]:
    if mock:
        return list(_MOCK["items"])
    coletadas: list[dict] = []
    total = None
    for pagina in range(1, 21):  # teto: 20 páginas x 100
        qs = urllib.parse.urlencode({
            "dataDisponibilizacaoInicio": ini.strftime("%Y-%m-%d"),
            "dataDisponibilizacaoFim": fim.strftime("%Y-%m-%d"),
            "itensPorPagina": 100,
            "pagina": pagina,
            "numeroOab": pj.so_digitos(oab["oab"]),
            "ufOab": (oab.get("uf") or "").upper(),
        })
        # A API Comunica (WAF) devolve 403 pra quem não parece navegador — mesmo
        # truque do AdvBox: mandar cara de navegador (senão HTTP 403).
        req = urllib.request.Request(
            f"{C.API_BASE}?{qs}",
            headers={
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                "Referer": "https://comunica.pje.jus.br/",
                "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                               "AppleWebKit/537.36 (KHTML, like Gecko) "
                               "Chrome/124.0.0.0 Safari/537.36"),
            })
        with urllib.request.urlopen(req, timeout=40) as r:
            data = json.loads(r.read().decode("utf-8", "replace"))
        if total is None:
            total = data.get("count") or 0
        itens = data.get("items") or []
        coletadas.extend(itens)
        if len(itens) < 100 or len(coletadas) >= total:
            break
    return coletadas


def campo(item: dict, *nomes) -> str:
    for n in nomes:
        v = item.get(n)
        if v:
            return str(v).strip()
    return ""


def id_publicacao(item: dict) -> str:
    return str(campo(item, "id", "hash") or
               (campo(item, "numeroprocessocommascara", "numero_processo") + "|"
                + campo(item, "datadisponibilizacao", "data_disponibilizacao")))


def bloco_classificacao(item: dict) -> str:
    """Ato + prazo estimado + data fatal (conta de dias úteis do classificacao.py)."""
    # o classificador espera o texto JÁ LIMPO (no pipeline do Jonas, o buscar-djen
    # limpa o HTML antes de classificar).
    c = clf.classificar({
        "tipoDocumento": campo(item, "tipoDocumento", "tipodocumento"),
        "tipoComunicacao": campo(item, "tipoComunicacao", "tipo"),
        "texto": limpar_html(campo(item, "texto", "teor")),
    })
    linha = f"🏷️ {c['ato']}\n"
    dias = c.get("dias")
    base = pj.parse_data(campo(item, "datadisponibilizacao", "data_disponibilizacao")[:10])
    if dias and base:
        fatal = clf.data_fatal_uteis(base, dias)
        linha += f"⏳ Prazo ~{dias} d.ú. → *fatal {fatal.strftime('%d/%m/%Y')}* (conferir)\n"
    elif c.get("flag"):
        rotulo = {"favoravel": "✅ possível resultado favorável — conferir",
                  "pericia": "🩺 perícia — anotar agenda",
                  "homologacao": "🤝 acordo homologado — conferir cumprimento",
                  "conferir": "❓ ato não reconhecido com certeza — humano confere"}
        linha += f"{rotulo.get(c['flag'], '❓ conferir')}\n"
    return linha


def montar(item: dict, quem: str) -> str:
    trecho = limpar_html(campo(item, "texto", "teor"))
    if trecho:
        trecho = trecho[:C.TRECHO].rstrip() + ("…" if len(trecho) > C.TRECHO else "")
        trecho = f"“{trecho}”\n"
    classe = campo(item, "nomeClasse", "classe")
    link = campo(item, "link", "url")
    return C.TEMPLATE.format(
        quem=quem,
        processo=campo(item, "numeroprocessocommascara", "numero_processo", "numeroProcesso") or "—",
        tribunal=campo(item, "siglaTribunal", "tribunal") or "—",
        orgao=campo(item, "nomeOrgao", "orgao") or "—",
        tipo=campo(item, "tipoComunicacao", "tipo") or "—",
        classe=(f" · {classe}" if classe else ""),
        classificacao=bloco_classificacao(item),
        data=campo(item, "datadisponibilizacao", "data_disponibilizacao") or "—",
        trecho=trecho,
        link=(f"🔗 {link}\n" if link else ""),
    )


def registro_db(item: dict) -> dict:
    """Publicação no formato das colunas de `publicacoes` (banco do QG)."""
    c = clf.classificar({
        "tipoDocumento": campo(item, "tipoDocumento", "tipodocumento"),
        "tipoComunicacao": campo(item, "tipoComunicacao", "tipo"),
        "texto": limpar_html(campo(item, "texto", "teor")),
    })
    base = pj.parse_data(campo(item, "datadisponibilizacao", "data_disponibilizacao")[:10])
    fatal = clf.data_fatal_uteis(base, c["dias"]) if (c.get("dias") and base) else None
    return {
        "djen_id": id_publicacao(item),
        "numero_cnj": campo(item, "numeroprocessocommascara", "numero_processo") or None,
        "tribunal": campo(item, "siglaTribunal", "tribunal") or None,
        "orgao": campo(item, "nomeOrgao", "orgao") or None,
        "tipo": campo(item, "tipoComunicacao", "tipo") or None,
        "ato": c["ato"],
        "prazo_dias": c.get("dias"),
        "data_fatal": fatal,
        "data_disp": base,
        "texto": limpar_html(campo(item, "texto", "teor")) or None,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="VIGIA-DJEN · vigia do boletim do DJEN")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--mock", action="store_true", help="dados de exemplo, sem rede")
    ap.add_argument("--hoje")
    args = ap.parse_args()

    dry = not args.send
    hoje = pj.parse_data(args.hoje) or dt.date.today()
    ini = hoje - dt.timedelta(days=C.DIAS_ATRAS)

    pj.log(f"VIGIA-DJEN · modo={'DRY' if dry else 'SEND'}"
           f"{' · MOCK' if args.mock else ''} · janela {pj.fmt_data(ini)}→{pj.fmt_data(hoje)}")

    if not C.OABS:
        pj.log("❌ nenhuma OAB configurada. Edite OABS no config.py "
               "(ou use DJEN_OAB / DJEN_UF).")
        return 2

    estado = pj.carregar_estado(C.ALERTAS_JSON)
    novas = repetidas = 0
    para_db: list[dict] = []

    for oab in C.OABS:
        quem = oab.get("quem") or f"OAB {oab.get('oab')}/{oab.get('uf')}"
        try:
            itens = buscar(oab, ini, hoje, args.mock)
        except urllib.error.HTTPError as e:
            pj.log(f"  ❌ {quem}: HTTP {e.code} na API do DJEN")
            continue
        except Exception as e:  # noqa: BLE001
            pj.log(f"  ❌ {quem}: erro ao consultar DJEN → {e}")
            continue

        pj.log(f"  {quem}: {len(itens)} publicação(ões) na janela")
        for item in itens:
            chave = f"djen|{id_publicacao(item)}"
            if chave in estado:
                repetidas += 1
                continue
            texto = montar(item, quem)
            ok, info = pj.enviar_alerta_interno(texto, dry)
            proc = campo(item, "numeroprocessocommascara", "numero_processo") or "?"
            pj.log(f"    {'✅' if ok else '❌'} {proc} · {campo(item,'tipoComunicacao','tipo')} [{info}]")
            if dry:
                for ln in texto.splitlines():
                    print(f"       │ {ln}")
            if ok:
                if not dry:
                    estado[chave] = pj.fmt_data(hoje)
                    para_db.append(registro_db(item))
                novas += 1

    if not dry:
        pj.salvar_estado(C.ALERTAS_JSON, estado)
        if para_db and db.habilitado():
            try:
                with db.cursor() as cur:
                    for reg in para_db:
                        db.upsert_publicacao(cur, reg)
                pj.log(f"  🗄️  {len(para_db)} publicação(ões) gravada(s) no banco do QG")
            except Exception as e:  # noqa: BLE001
                pj.log(f"  ⚠️  falha ao gravar no banco (WhatsApp não afetado): {e}")

    pj.log(f"fim · novas={novas} · já vistas={repetidas}" + ("  (DRY)" if dry else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
