#!/bin/bash
# VIGIA-DJEN · orquestrador diário (launchd 08h40, antes do painel)
set -euo pipefail
cd "$(dirname "$0")"
DIA=$(date +%u)
if [ "$DIA" -ge 6 ]; then
  echo "[$(date '+%F %T')] fim de semana — DJEN não publica; robô em silêncio."
  exit 0
fi
mkdir -p logs
LOG="logs/run_$(date +%F).log"
{
  echo "==================== $(date '+%F %T') ===================="
  python3 robo_djen.py --send
  echo "-------------------- fim --------------------"
} | tee -a "$LOG"
