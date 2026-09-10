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

# --- modo "só banco" --------------------------------------------------------
# Sem uazapi: os robôs NÃO mandam WhatsApp (a Ana/ChatGuru avisa o grupo).
# Eles só coletam e gravam no banco do QG. Ver SENTINELA_SO_BANCO no pj_comum.
ok "modo 'só banco': os robôs alimentam o QG, sem mandar WhatsApp (a Ana avisa)."

# --- grava o .env -----------------------------------------------------------
umask 077
cat > "$ENV" <<EOF
# gerado por deploy/config-robos-vps.sh — NÃO commitar (fica fora do git)
DATABASE_URL="$DBURL"

# Modo "só banco": robôs alimentam o QG e NÃO mandam WhatsApp (a Ana/ChatGuru avisa).
SENTINELA_SO_BANCO="1"

# opcionais (preencha quando for usar sentinela-prazos / puxa_advbox):
ADVBOX_URL="https://app.advbox.com.br/api/v1"
ADVBOX_TOKEN=""
EOF
chmod 600 "$ENV"
ok "gravei $ENV (protegido, chmod 600)."

cat <<FIM

======================================================================
✅ Robôs configurados (modo só banco — a Ana avisa o grupo).

TESTE AGORA (consulta o DJEN e grava no banco, sem mandar WhatsApp):
   cd $AUT/vigia-djen && python3 robo_djen.py --send

Se listar publicações e disser "gravada(s) no banco do QG" sem erro,
LIGUE o agendamento 24/7 (roda como root por causa da pasta /root):
   SENTINELA_USER=root bash $REPO_DIR/deploy/instalar-vps.sh

Depois disso o DJEN roda sozinho todo dia útil às 08h40 e alimenta o
Dashboard do QG. Quem avisa o grupo é a Ana (ChatGuru).
======================================================================
FIM
