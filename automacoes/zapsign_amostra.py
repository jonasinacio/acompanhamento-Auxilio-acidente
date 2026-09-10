#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Puxa 1 documento do ZapSign pela API e imprime o JSON com os dados sensíveis
MASCARADOS — para revelar o FORMATO do payload (nomes de campo, estrutura dos
signatários) sem vazar dado de cliente. Esse formato espelha o do webhook, então
serve para travar o parser do zapsign-contrato sem esperar uma assinatura real.

Roda na SUA máquina (do ambiente do Claude o ZapSign não é alcançável).
Lê ZAPSIGN_API_TOKEN do .env (nunca colado no código).

    python3 zapsign_amostra.py                 # o documento mais recente
    python3 zapsign_amostra.py <token_do_doc>  # um documento específico
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

import pj_comum as pj  # dispara a carga do .env

API_URL = os.environ.get(
    "ZAPSIGN_API_URL", "https://api.zapsign.com.br/api/v1").rstrip("/")
API_TOKEN = os.environ.get("ZAPSIGN_API_TOKEN", "")

# chaves cujo VALOR é mascarado (o NOME do campo continua visível, que é o que
# eu preciso pra travar o parser). Dado de cliente e segredos ficam escondidos.
SENSIVEL = ("phone", "email", "cpf", "cnpj", "rg", "cep", "birth", "nascimento",
            "address", "endereco", "token", "key", "secret", "signature", "ip")


def _mask_str(v) -> str:
    s = str(v)
    if len(s) <= 4:
        return "***"
    return s[:2] + "*" * (len(s) - 4) + s[-2:]


def mascarar(obj):
    """Mascara VALORES sensíveis mantendo a estrutura e os nomes dos campos."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if (any(t in k.lower() for t in SENSIVEL)
                    and isinstance(v, (str, int, float))
                    and not isinstance(v, bool) and str(v) != ""):
                out[k] = _mask_str(v)
            else:
                out[k] = mascarar(v)
        return out
    if isinstance(obj, list):
        return [mascarar(x) for x in obj]
    return obj


def _get(url: str):
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {API_TOKEN}",
                      "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def main() -> int:
    if not API_TOKEN:
        print("❌ Falta ZAPSIGN_API_TOKEN no .env.")
        return 2

    doc_token = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    try:
        if doc_token:
            data = _get(f"{API_URL}/docs/{doc_token}/")
        else:
            lista = _get(f"{API_URL}/docs/")
            docs = lista.get("results") if isinstance(lista, dict) else lista
            if not docs:
                print("Nenhum documento na conta.")
                return 0
            tok = docs[0].get("token")
            print(f"(pegando o mais recente: token {_mask_str(tok)})")
            data = _get(f"{API_URL}/docs/{tok}/")
    except urllib.error.HTTPError as e:
        detalhe = ""
        try:
            detalhe = e.read().decode("utf-8", "replace")[:200]
        except Exception:  # noqa: BLE001
            pass
        print(f"❌ HTTP {e.code}: {detalhe}")
        if e.code in (401, 403):
            print("   Token de API inválido? Confira ZAPSIGN_API_TOKEN.")
        return 1
    except Exception as e:  # noqa: BLE001
        print(f"❌ Erro ao falar com o ZapSign: {e}")
        return 1

    print("\n--- JSON do documento (telefone/e-mail/CPF mascarados) ---\n")
    print(json.dumps(mascarar(data), indent=2, ensure_ascii=False))
    print("\n>>> Me mande ESTE bloco (já mascarado) que eu travo o parser do "
          "webhook 1:1.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
