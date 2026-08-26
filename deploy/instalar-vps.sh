#!/usr/bin/env bash
# ============================================================================
# SENTINELA · instalador para VPS Linux (Ubuntu/Debian ou AlmaLinux/CentOS/RHEL)
# ----------------------------------------------------------------------------
# Deixa o SENTINELA rodando 24/7 no servidor, sem o Mac:
#   - systemd timer  -> vigia-djen todo dia útil às 08h40
#   - systemd service-> webhook do ZapSign sempre no ar (porta 8765)
#
# Rode como root (ou com sudo), de dentro da pasta do repositório já clonado:
#   sudo bash deploy/instalar-vps.sh
# Idempotente: pode rodar de novo pra atualizar.
# ============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # raiz do repositório
RUN_USER="${SENTINELA_USER:-sentinela}"
TZ_ALVO="America/Sao_Paulo"

echo "==> repositório em: $APP_DIR"

echo "==> 1/6 fuso horário do servidor ($TZ_ALVO)"
timedatectl set-timezone "$TZ_ALVO" 2>/dev/null || echo "   (não consegui mudar o fuso — siga assim mesmo)"

echo "==> 2/6 pacotes (python3, git, openpyxl)"
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y python3 python3-pip git python3-openpyxl python3-psycopg2 \
    || { apt-get install -y python3 python3-pip git; pip3 install --break-system-packages openpyxl psycopg2-binary; }
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y python3 python3-pip git python3-openpyxl python3-psycopg2 \
    || { dnf install -y python3 python3-pip git; pip3 install openpyxl psycopg2-binary; }
else
  echo "❌ gerenciador de pacotes não reconhecido (nem apt nem dnf)."; exit 1
fi

echo "==> 3/6 usuário de serviço ($RUN_USER)"
id -u "$RUN_USER" >/dev/null 2>&1 || useradd --system --create-home "$RUN_USER"
chown -R "$RUN_USER":"$RUN_USER" "$APP_DIR"

echo "==> 4/6 arquivo de credenciais (.env)"
ENV="$APP_DIR/automacoes/.env"
if [ ! -f "$ENV" ]; then
  cp "$APP_DIR/automacoes/.env.example" "$ENV"
  chown "$RUN_USER":"$RUN_USER" "$ENV"
  chmod 600 "$ENV"
  echo "   ⚠️  criei $ENV a partir do modelo."
  echo "   ⚠️  EDITE ele com suas credenciais ANTES de usar: nano $ENV"
else
  echo "   .env já existe — mantido."
fi

echo "==> 5/6 instalando serviços systemd"
gen() { sed "s#__APP_DIR__#$APP_DIR#g; s#__USER__#$RUN_USER#g" "$1"; }
gen "$APP_DIR/deploy/sentinela-webhook.service" > /etc/systemd/system/sentinela-webhook.service
gen "$APP_DIR/deploy/sentinela-djen.service"    > /etc/systemd/system/sentinela-djen.service
cp  "$APP_DIR/deploy/sentinela-djen.timer"        /etc/systemd/system/sentinela-djen.timer
systemctl daemon-reload

echo "==> 6/6 ligando"
systemctl enable --now sentinela-djen.timer
systemctl enable --now sentinela-webhook.service

echo ""
echo "======================================================================"
echo "✅ SENTINELA instalado."
echo ""
echo "  • Webhook ZapSign ouvindo em:  http://SEU_IP:8765/zapsign/<segredo>"
echo "  • DJEN dispara todo dia útil às 08h40 (fuso $TZ_ALVO)"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "  1) Edite as credenciais:   nano $ENV"
echo "  2) Reinicie o webhook:     systemctl restart sentinela-webhook"
echo "  3) Teste o DJEN agora:     systemctl start sentinela-djen  (e veja o log abaixo)"
echo "  4) Abra a porta 8765 no firewall do VPS/OCI se for usar o webhook."
echo ""
echo "VER LOGS:"
echo "  journalctl -u sentinela-webhook -f          # webhook ao vivo"
echo "  journalctl -u sentinela-djen --no-pager -n 50   # última rodada do DJEN"
echo "======================================================================"
