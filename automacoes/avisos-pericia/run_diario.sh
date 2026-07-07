#!/bin/bash
# ARAUTO-PERÍCIA · orquestrador diário (chamado pelo launchd às 09h05)
# Roda em SÉRIE, igual ao run_diario.sh do ARAUTO:
#   1) (opcional) puxa perícias novas do AdvBox para a mãe
#   2) dispara os avisos e carimba a mãe
#
# Fim de semana: sai sem fazer nada (perícia não é marcada p/ sáb/dom, mas
# se quiser rodar mesmo assim, comente o bloco abaixo).

set -euo pipefail
cd "$(dirname "$0")"

DIA=$(date +%u)   # 1=seg ... 7=dom
if [ "$DIA" -ge 6 ]; then
  echo "[$(date '+%F %T')] fim de semana — ARAUTO-PERÍCIA em silêncio."
  exit 0
fi

mkdir -p logs
LOG="logs/run_$(date +%F).log"

{
  echo "==================== $(date '+%F %T') ===================="

  # 1) puxa as perícias novas do AdvBox p/ a mãe.
  #    Descomente DEPOIS de validar os campos em ../puxa_advbox.py (os «AJUSTE»).
  # python3 ../puxa_advbox.py --write --destino pericia

  # 2) dispara de verdade (troque --send por --dry p/ ensaiar)
  python3 robo_pericias.py --send

  echo "-------------------- fim --------------------"
} | tee -a "$LOG"
