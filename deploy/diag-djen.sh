#!/usr/bin/env bash
# Diagnóstico do DJEN: mostra o STATUS, os cabeçalhos e o começo do corpo da
# resposta — pra saber se o 403 é bloqueio de IP/Cloudflare ou outra coisa.
#   bash deploy/diag-djen.sh
python3 - <<'PY'
import urllib.request, urllib.error, datetime as dt
hoje = dt.date.today()
ini = hoje - dt.timedelta(days=3)
url = ("https://comunicaapi.pje.jus.br/api/v1/comunicacao"
       f"?numeroOab=160291&ufOab=MG"
       f"&dataDisponibilizacaoInicio={ini}&dataDisponibilizacaoFim={hoje}"
       "&itensPorPagina=5&pagina=1")
ua = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
req = urllib.request.Request(url, headers={
    "User-Agent": ua,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Referer": "https://comunica.pje.jus.br/",
})
print("URL:", url)
try:
    r = urllib.request.urlopen(req, timeout=40)
    print("STATUS:", r.status, "(OK!)")
    print("SERVER:", r.headers.get("Server"))
    print("CORPO (início):", r.read()[:400].decode("utf-8", "replace"))
except urllib.error.HTTPError as e:
    print("HTTP:", e.code)
    print("SERVER:", e.headers.get("Server"))
    print("CF-RAY:", e.headers.get("CF-RAY"))
    print("CF-MITIGATED:", e.headers.get("cf-mitigated"))
    body = e.read()[:800].decode("utf-8", "replace")
    print("CORPO (início):", body)
except Exception as e:
    print("ERRO:", type(e).__name__, e)
PY
