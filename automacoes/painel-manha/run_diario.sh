#!/bin/bash
# PAINEL-MANHÃ · orquestrador diário (launchd 08h45 — ANTES dos outros robôs)
set -euo pipefail
cd "$(dirname "$0")"
DIA=$(date +%u)
if [ "$DIA" -ge 6 ]; then
  echo "[$(date '+%F %T')] fim de semana — sem painel."
  exit 0
fi
mkdir -p logs
LOG="logs/run_$(date +%F).log"
{
  echo "==================== $(date '+%F %T') ===================="
  # p/ o painel refletir dados fresquinhos, puxe do AdvBox antes (após validar):
  # python3 ../puxa_advbox.py --write --destino todos
  python3 robo_painel.py --send
  echo "-------------------- fim --------------------"
} | tee -a "$LOG"
