#!/usr/bin/env bash
# ============================================================================
# QG do Escritório · subida automática no VPS (Ubuntu/Debian)
# ----------------------------------------------------------------------------
# Faz TUDO sozinho, pra você não precisar colar comando comprido no console:
#   1) instala Docker + compose (se faltar)
#   2) descobre quem está nas portas 80/443 e desliga servidor web padrão
#   3) libera 80/443 no firewall (e mantém o SSH em 22022)
#   4) cria o qg/.env com senhas fortes ALEATÓRIAS (não sobrescreve se já existe)
#   5) sobe o QG (docker compose up -d --build)
#
# Rode como root, da raiz do repositório:
#     bash deploy/subir-qg.sh
# É idempotente: pode rodar de novo sem medo.
# ============================================================================
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin:$PATH"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
QG_DIR="$REPO_DIR/qg"
ENV="$QG_DIR/.env"

# domínio e e-mail do certificado (ajuste aqui se um dia mudar)
QG_HOST_PADRAO="qg.jonasinacio.adv.br"
ACME_EMAIL_PADRAO="jonasinacioa@gmail.com"
SSH_PORT="22022"   # sua porta de SSH — mantida aberta pra não te trancar pra fora

msg() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m   ✓ %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m   ⚠ %s\033[0m\n' "$*"; }

[ -d "$QG_DIR" ] || { echo "❌ não achei a pasta qg/ em $REPO_DIR"; exit 1; }
[ "$(id -u)" = "0" ] || { echo "❌ rode como root (você é root no VPS)."; exit 1; }

# ---------------------------------------------------------------------------
msg "1/5 · Docker"
if ! command -v docker >/dev/null 2>&1; then
  warn "Docker não encontrado — instalando (pode levar 1-2 min)…"
  curl -fsSL https://get.docker.com | sh
  ok "Docker instalado."
else
  ok "Docker já está instalado ($(docker --version))."
fi
if ! docker compose version >/dev/null 2>&1; then
  warn "plugin 'docker compose' ausente — instalando…"
  (apt-get update -y && apt-get install -y docker-compose-plugin) \
    || warn "não instalei o plugin via apt; se o compose falhar, me avise."
fi
systemctl enable --now docker >/dev/null 2>&1 || true
ok "Docker pronto."

# ---------------------------------------------------------------------------
msg "2/5 · liberando as portas 80 e 443"
quem80="$(ss -ltnp 2>/dev/null | awk '/:80 /{print; exit}')"
quem443="$(ss -ltnp 2>/dev/null | awk '/:443 /{print; exit}')"
[ -n "$quem80" ]  && warn "na porta 80:  $quem80"
[ -n "$quem443" ] && warn "na porta 443: $quem443"

# desliga servidores web padrão que costumam ocupar 80/443 (Traefik assume o lugar)
for svc in nginx apache2 httpd lighttpd caddy; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^${svc}\.service"; then
    if systemctl is-active --quiet "$svc"; then
      warn "desligando '$svc' (estava ocupando as portas)…"
      systemctl stop "$svc" || true
      systemctl disable "$svc" 2>/dev/null || true
      ok "'$svc' desligado e desabilitado no boot."
    fi
  fi
done

# firewall: só mexe se o ufw estiver ATIVO (senão o Ubuntu já deixa aberto)
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${SSH_PORT}/tcp" >/dev/null 2>&1 || true   # não se trancar pra fora
  ufw allow 80/tcp  >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ok "firewall (ufw) liberou 80, 443 e ${SSH_PORT}."
else
  ok "sem firewall ativo bloqueando (Ubuntu deixa as portas abertas)."
fi

# ---------------------------------------------------------------------------
msg "3/5 · arquivo de configuração (qg/.env)"
if [ -f "$ENV" ]; then
  ok ".env já existe — mantido (não sobrescrevo suas senhas)."
else
  gera_segredo() { openssl rand -hex "${1:-24}" 2>/dev/null || head -c "${1:-24}" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
  PG_PASS="$(gera_segredo 16)"
  AUTH="$(gera_segredo 32)"
  umask 077
  cat > "$ENV" <<EOF
QG_HOST="${QG_HOST_PADRAO}"
ACME_EMAIL="${ACME_EMAIL_PADRAO}"
POSTGRES_USER="qg"
POSTGRES_PASSWORD="${PG_PASS}"
POSTGRES_DB="qg"
AUTH_SECRET="${AUTH}"
EOF
  ok "criei $ENV com senhas fortes aleatórias."
  warn "domínio: ${QG_HOST_PADRAO}  ·  certificado p/: ${ACME_EMAIL_PADRAO}"
fi

# ---------------------------------------------------------------------------
msg "4/5 · subindo o QG (build + up) — a 1ª vez demora alguns minutos"
cd "$QG_DIR"
docker compose up -d --build

# ---------------------------------------------------------------------------
msg "5/5 · status"
docker compose ps
QG_HOST_ATUAL="$(grep -E '^QG_HOST=' "$ENV" | cut -d'"' -f2)"
cat <<FIM

======================================================================
✅ QG no ar (ou subindo). Abra no navegador:

     https://${QG_HOST_ATUAL:-qg.jonasinacio.adv.br}

O cadeado (Let's Encrypt) leva ~1 min pra fechar na 1ª vez. Se der aviso
de certificado logo de cara, espere 1-2 min e recarregue.

Login inicial:  jonasinacioa@gmail.com  ·  senha: sentinela2026
(TROQUE a senha depois — ela é só pra 1º acesso.)

VER LOGS se algo não abrir:
   cd ${QG_DIR}
   docker compose logs -f app       # o site
   docker compose logs -f traefik   # o cadeado/HTTPS
======================================================================
FIM
