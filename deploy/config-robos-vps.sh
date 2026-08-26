#!/usr/bin/env bash
# ============================================================================
# SENTINELA · configura o automacoes/.env pros robôs rodarem NO VPS
# ----------------------------------------------------------------------------
# - monta o DATABASE_URL sozinho (lê a senha do Postgres do qg/.env)
# - pergunta só o WhatsApp (uazapi): URL, token da instância e JID do grupo
# - grava automacoes/.env (chmod 600)
#
# Rode como root, da raiz do repositório:  bash deploy/config-robos-vps.sh
#
# ⚠️  DIGITE os valores (não cole) — o console web embaralha ao colar. O token
#     do uazapi é só letras e números, então digitar funciona certinho.
# ============================================================================
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin:$PATH"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AUT="$REPO_DIR/automacoes"
ENV="$AUT/.env"
QG_ENV="$REPO_DIR/qg/.env"

msg(){ printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok(){  printf '\033[1;32m   ✓ %s\033[0m\n' "$*"; }
die(){ printf '\033[1;31m   ✗ %s\033[0m\n' "$*"; exit 1; }

[ -f "$QG_ENV" ] || die "não achei $QG_ENV (o QG precisa já estar instalado)."

# --- DATABASE_URL automático (senha lida do qg/.env) -----------------------
val(){ grep -E "^$1=" "$QG_ENV" | head -1 | cut -d'"' -f2; }
PGUSER="$(val POSTGRES_USER)"; PGPASS="$(val POSTGRES_PASSWORD)"; PGDB="$(val POSTGRES_DB)"
[ -n "$PGPASS" ] || die "não consegui ler a senha do Postgres em $QG_ENV."
DBURL="postgres://${PGUSER}:${PGPASS}@127.0.0.1:5432/${PGDB}"
ok "DATABASE_URL montado a partir do qg/.env (senha lida automaticamente)."

# --- protege o que já existe -----------------------------------------------
if [ -f "$ENV" ]; then
  msg "já existe $ENV"
  read -rp "   Sobrescrever? (s/N): " R; [ "${R:-N}" = "s" ] || die "mantido o .env atual. Nada mudou."
fi

# --- WhatsApp (uazapi) ------------------------------------------------------
msg "WhatsApp (uazapi) — DIGITE cada valor e dê Enter (não cole)"
read -rp "   UAZAPI_URL [https://jonasinacioadv.uazapi.com]: " UURL
UURL="${UURL:-https://jonasinacioadv.uazapi.com}"
read -rp "   UAZAPI_TOKEN (token da INSTÂNCIA, não o Admin): " UTOK
read -rp "   UAZAPI_GRUPO_GERAL (JID do grupo, ex.: 120363...@g.us): " UGRP
[ -n "$UTOK" ] || die "token vazio — rode de novo e informe o token da instância."
[ -n "$UGRP" ] || die "grupo vazio — rode de novo e informe o JID do grupo (...@g.us)."

# --- grava o .env -----------------------------------------------------------
umask 077
cat > "$ENV" <<EOF
# gerado por deploy/config-robos-vps.sh — NÃO commitar (fica fora do git)
DATABASE_URL="$DBURL"

UAZAPI_URL="$UURL"
UAZAPI_TOKEN="$UTOK"
UAZAPI_GRUPO_GERAL="$UGRP"

# opcionais (preencha quando for usar sentinela-prazos / webhook ZapSign):
ADVBOX_URL="https://app.advbox.com.br/api/v1"
ADVBOX_TOKEN=""
ZAPSIGN_SEGREDO=""
ZAPSIGN_PORTA="8765"
EOF
chmod 600 "$ENV"
ok "gravei $ENV (protegido, chmod 600)."

cat <<FIM

======================================================================
✅ Credenciais dos robôs prontas.

TESTE AGORA (sem enviar nada — só mostra o que faria):
   cd $AUT/vigia-djen && python3 robo_djen.py --dry

Se o teste listar publicações (ou "0 na janela") sem erro, LIGUE o
agendamento 24/7 (roda como root por causa da pasta /root):
   SENTINELA_USER=root bash $REPO_DIR/deploy/instalar-vps.sh

Depois disso o DJEN dispara sozinho todo dia útil às 08h40, avisa no
grupo e grava no banco do QG (o Dashboard acende).
======================================================================
FIM
