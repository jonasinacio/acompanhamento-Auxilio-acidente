#!/bin/bash
# GATILHOS-STATUS · orquestrador diário (launchd 09h15)
set -euo pipefail
cd "$(dirname "$0")"

DIA=$(date +%u)
if [ "$DIA" -ge 6 ]; then
  echo "[$(date '+%F %T')] fim de semana — GATILHOS-STATUS em silêncio."
  exit 0
fi

mkdir -p logs
LOG="logs/run_$(date +%F).log"
{
  echo "==================== $(date '+%F %T') ===================="
  python3 robo_status.py --send
  echo "-------------------- fim --------------------"
} | tee -a "$LOG"
