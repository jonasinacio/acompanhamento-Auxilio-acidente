#!/usr/bin/env bash
# Remove os dados de exemplo inseridos por deploy/dados-exemplo.sh.
# (Os clientes reais de perícia — origem 'pericia-drive' — são MANTIDOS;
#  apague-os à mão se quiser, trocando o filtro abaixo.)
#   bash deploy/limpar-exemplo.sh
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin:$PATH"

DB="$(docker ps --format '{{.Names}}' | grep -E 'qg-db' | head -1)"
[ -n "$DB" ] || { echo "não achei o container do banco (qg-db-1)."; exit 1; }

docker exec -i "$DB" psql -U qg -d qg <<'SQL'
DELETE FROM tarefas     WHERE origem='exemplo';
DELETE FROM publicacoes WHERE djen_id LIKE 'exemplo-%';
DELETE FROM processos   WHERE numero_cnj IN ('5009876-54.2026.4.03.6100','1002345-67.2026.8.26.0100');
-- clientes de exemplo/perícia (comente a linha se quiser manter os reais):
-- DELETE FROM clientes  WHERE origem IN ('exemplo','pericia-drive');
SQL

echo "✅ dados de exemplo removidos (clientes de perícia mantidos)."
