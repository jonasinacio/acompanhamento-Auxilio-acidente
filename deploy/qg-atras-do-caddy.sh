#!/usr/bin/env bash
# ============================================================================
# QG atrás do Caddy JÁ EXISTENTE (coexiste com o chat-bullq nas portas 80/443)
# ----------------------------------------------------------------------------
# Faz, com segurança e sem derrubar o chat:
#   1) sobe o QG SEM Traefik (só banco + app) e remove o Traefik que falhou
#   2) conecta o Caddy do chat à rede do QG (pra ele enxergar o qg-app)
#   3) adiciona um bloco pro seu domínio no Caddyfile (com BACKUP)
#   4) VALIDA o Caddyfile e só então dá reload (chat segue no ar)
#
# Rode como root, da raiz do repositório:  bash deploy/qg-atras-do-caddy.sh
# Idempotente: pode rodar de novo sem duplicar nada.
# ============================================================================
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin:$PATH"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
QG_DIR="$REPO_DIR/qg"
ENV="$QG_DIR/.env"
COMPOSE="docker-compose.caddy.yml"
CF_DEST="/etc/caddy/Caddyfile"

msg(){  printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok(){   printf '\033[1;32m   ✓ %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m   ⚠ %s\033[0m\n' "$*"; }
die(){  printf '\033[1;31m   ✗ %s\033[0m\n' "$*"; exit 1; }

[ -f "$ENV" ] || die "não achei $ENV — rode antes o subir-qg.sh (ou crie o .env)."
QG_HOST="$(grep -E '^QG_HOST=' "$ENV" | cut -d'"' -f2)"
[ -n "$QG_HOST" ] || die "QG_HOST vazio no .env"

# ---------------------------------------------------------------------------
msg "1/5 · subindo o QG sem Traefik (banco + app) e removendo o Traefik que falhou"
cd "$QG_DIR"
docker compose -f "$COMPOSE" up -d --build --remove-orphans
APP_CT="$(docker compose -f "$COMPOSE" ps -q app)"
[ -n "$APP_CT" ] || die "o container do app não subiu — veja 'docker compose -f $COMPOSE logs app'."
APP_NAME="$(docker inspect -f '{{.Name}}' "$APP_CT" | sed 's#^/##')"
QG_NET="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$APP_CT" | awk '{print $1}')"
ok "app: $APP_NAME · porta interna 3000 · rede: $QG_NET"

# ---------------------------------------------------------------------------
msg "2/5 · localizando o Caddy que já roda"
CADDY="$(docker ps --format '{{.Names}}' | grep -i caddy | head -1 || true)"
[ -n "$CADDY" ] || die "não achei um container Caddy rodando."
ok "Caddy: $CADDY"

# ---------------------------------------------------------------------------
msg "3/5 · conectando o Caddy à rede do QG"
if docker network connect "$QG_NET" "$CADDY" 2>/dev/null; then
  ok "Caddy conectado à rede $QG_NET."
else
  ok "Caddy já estava na rede $QG_NET (ok)."
fi

# ---------------------------------------------------------------------------
msg "4/5 · adicionando o bloco do QG no Caddyfile (com backup + sem duplicar)"
BLOCO="$QG_HOST {
	reverse_proxy $APP_NAME:3000
}"

CF_HOST="$(docker inspect "$CADDY" -f "{{range .Mounts}}{{if eq .Destination \"$CF_DEST\"}}{{.Source}}{{end}}{{end}}")"

edita() {   # $1 = caminho do arquivo a editar
  local f="$1"
  if grep -q "^${QG_HOST}[[:space:]]*{" "$f" 2>/dev/null || grep -q "^${QG_HOST} " "$f" 2>/dev/null; then
    warn "já existe um bloco de $QG_HOST — não dupliquei."; return 1
  fi
  cp "$f" "$f.bak.$(date +%s)"
  printf '\n%s\n' "$BLOCO" >> "$f"
}

APLICOU=0
if [ -n "$CF_HOST" ] && [ -f "$CF_HOST" ]; then
  ok "Caddyfile no host: $CF_HOST"
  if edita "$CF_HOST"; then ok "bloco adicionado (backup .bak salvo ao lado)."; APLICOU=1; fi
else
  warn "Caddyfile não é arquivo montado do host — vou editar dentro do container."
  TMP="$(mktemp)"; docker exec "$CADDY" cat "$CF_DEST" > "$TMP"
  if edita "$TMP"; then
    docker cp "$TMP" "$CADDY:$CF_DEST"; ok "bloco adicionado dentro do container."; APLICOU=1
    warn "se algum dia RECRIAR o container do Caddy, esse bloco some — some também no Caddyfile de origem do chat-bullq."
  fi
  rm -f "$TMP"
fi

# ---------------------------------------------------------------------------
msg "5/5 · validando e recarregando o Caddy (sem derrubar o chat)"
if docker exec "$CADDY" caddy validate --config "$CF_DEST" --adapter caddyfile >/dev/null 2>&1; then
  docker exec "$CADDY" caddy reload --config "$CF_DEST" --adapter caddyfile
  ok "Caddy recarregado. chat-bullq seguiu no ar."
else
  warn "o Caddyfile ficou inválido — NÃO recarreguei (nada mudou pro chat)."
  die "restaure o backup (arquivo .bak) e me chame; provavelmente o caminho do Caddyfile difere."
fi

cat <<FIM

======================================================================
✅ QG no ar ao lado do chat-bullq. Abra no navegador:

     https://$QG_HOST

O cadeado (Let's Encrypt) leva ~1 min pra fechar na 1ª vez — o Caddy
pega o certificado sozinho (o DNS de $QG_HOST precisa apontar pra este VPS).

Login inicial:  jonasinacioa@gmail.com  ·  senha: sentinela2026
(troque a senha no 1º acesso.)

Conferir:
   docker compose -f $COMPOSE logs -f app     # o QG
   docker logs -f $CADDY                       # o porteiro / HTTPS
======================================================================
FIM
