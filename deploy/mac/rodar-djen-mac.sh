#!/usr/bin/env bash
# ============================================================================
# DJEN pelo MAC (IP brasileiro) gravando no banco do QG (no VPS)
# ----------------------------------------------------------------------------
# O DJEN só aceita IP do Brasil, e o IP do VPS é barrado. Então o vigia-djen
# roda AQUI no Mac (IP brasileiro, funciona) e grava no Postgres do VPS por um
# TÚNEL SSH seguro — sem expor o banco na internet. A Ana segue avisando o grupo.
#
# Uso (no Mac):   bash deploy/mac/rodar-djen-mac.sh
#
# Pré-requisitos (fazer UMA vez — ver deploy/mac/LEIA-ME.md):
#   1) SSH sem senha do Mac pro VPS (ssh-copy-id)
#   2) automacoes/.env com a linha:  PG_SENHA_QG="a-senha-do-postgres-do-vps"
# ============================================================================
set -euo pipefail

VPS_HOST="143.95.160.16"
VPS_PORT="22022"
LOCAL_PORT="5433"          # porta local do túnel (evita bater com Postgres local)
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
ENV="$REPO/automacoes/.env"

le_env() { grep -E "^$1=" "$ENV" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }
PGPASS="$(le_env PG_SENHA_QG)"
if [ -z "$PGPASS" ]; then
  echo "❌ Falta a senha do banco. Abra $ENV e adicione a linha:"
  echo '   PG_SENHA_QG="cole-aqui-a-POSTGRES_PASSWORD-do-VPS"'
  echo "   (a senha está no VPS em /root/app/qg/.env)"
  exit 1
fi

echo "==> abrindo túnel seguro pro banco do VPS…"
# fecha algum túnel antigo na mesma porta, se existir
pkill -f "${LOCAL_PORT}:127.0.0.1:5432" 2>/dev/null || true
sleep 1
ssh -f -N -o ExitOnForwardFailure=yes -L "${LOCAL_PORT}:127.0.0.1:5432" \
    -p "$VPS_PORT" "root@${VPS_HOST}"
trap 'pkill -f "${LOCAL_PORT}:127.0.0.1:5432" 2>/dev/null || true' EXIT
sleep 1

echo "==> rodando o vigia-djen (modo só-banco: sem WhatsApp, a Ana avisa)…"
export DATABASE_URL="postgres://qg:${PGPASS}@127.0.0.1:${LOCAL_PORT}/qg"
export SENTINELA_SO_BANCO=1
python3 "$REPO/automacoes/vigia-djen/robo_djen.py" --send

echo "==> pronto. túnel fechado."
