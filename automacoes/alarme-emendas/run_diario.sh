#!/bin/bash
# ALARME-EMENDAS · orquestrador diário (launchd 09h10)
# Roda todo dia útil. Prazo de emenda não espera fim de semana virar dia útil,
# mas o alarme só faz sentido em dia útil (é quando se protocola).
set -euo pipefail
cd "$(dirname "$0")"

DIA=$(date +%u)
if [ "$DIA" -ge 6 ]; then
  echo "[$(date '+%F %T')] fim de semana — ALARME-EMENDAS em silêncio."
  exit 0
fi

mkdir -p logs
LOG="logs/run_$(date +%F).log"
{
  echo "==================== $(date '+%F %T') ===================="
  python3 robo_emendas.py --send
  echo "-------------------- fim --------------------"
} | tee -a "$LOG"
