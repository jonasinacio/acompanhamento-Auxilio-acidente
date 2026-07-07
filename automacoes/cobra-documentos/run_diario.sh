#!/bin/bash
# COBRA-DOCUMENTOS · orquestrador diário (launchd 09h20)
set -euo pipefail
cd "$(dirname "$0")"
DIA=$(date +%u)
if [ "$DIA" -ge 6 ]; then
  echo "[$(date '+%F %T')] fim de semana — COBRA-DOCUMENTOS em silêncio."
  exit 0
fi
mkdir -p logs
LOG="logs/run_$(date +%F).log"
{
  echo "==================== $(date '+%F %T') ===================="
  # (fase 2) puxar do AdvBox os casos AGUARDANDO DOCUMENTOS ainda não está no
  # puxa_advbox.py — hoje a mãe de documentos é preenchida à mão / colada.
  python3 robo_documentos.py --send
  echo "-------------------- fim --------------------"
} | tee -a "$LOG"
