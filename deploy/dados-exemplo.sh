#!/usr/bin/env bash
# ============================================================================
# Enche o Dashboard do QG pra você VER ele funcionando AGORA.
#   - clientes: nomes REAIS de perícia (do seu Drive)
#   - tarefas e prazos: alguns exemplos, até a ingestão automática ligar
# Roda no VPS:  bash deploy/dados-exemplo.sh
# Pra limpar depois:  bash deploy/limpar-exemplo.sh
# ============================================================================
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin:$PATH"

DB="$(docker ps --format '{{.Names}}' | grep -E 'qg-db' | head -1)"
[ -n "$DB" ] || { echo "não achei o container do banco (qg-db-1). O QG está no ar?"; exit 1; }

docker exec -i "$DB" psql -U qg -d qg <<'SQL'
-- clientes reais (perícia) — alguns como lead novo, outros como cliente
INSERT INTO clientes (nome, status, origem) VALUES
  ('Antônio Paiva Rocha Sobrinho', 'cliente', 'pericia-drive'),
  ('Paulo Ávila Apolinário Júnior', 'cliente', 'pericia-drive'),
  ('Gilberto Rogério de Paula Filho', 'cliente', 'pericia-drive'),
  ('Giovani Bressan', 'cliente', 'pericia-drive'),
  ('Genildo Tavares de Paulo', 'cliente', 'pericia-drive'),
  ('Lázaro Victor de Lima', 'cliente', 'pericia-drive'),
  ('Nailson Machado Dias', 'cliente', 'pericia-drive'),
  ('Maria Aparecida de Souza', 'novo', 'pericia-drive'),
  ('João Carlos Ferreira', 'novo', 'pericia-drive'),
  ('Erison Gomes da Silva', 'novo', 'pericia-drive');

-- tarefas abertas (exemplos até a ingestão do AdvBox ligar)
INSERT INTO tarefas (titulo, status, origem) VALUES
  ('Protocolar réplica — auxílio-acidente', 'aberta', 'exemplo'),
  ('Juntar laudo pericial aos autos', 'aberta', 'exemplo'),
  ('Recurso inominado (JEF)', 'aberta', 'exemplo');

-- processos + publicações com prazo perto (pra acender "Prazos ≤ 7 dias")
INSERT INTO processos (numero_cnj, tribunal) VALUES
  ('5009876-54.2026.4.03.6100', 'TRF3'),
  ('1002345-67.2026.8.26.0100', 'TJSP')
ON CONFLICT (numero_cnj) DO NOTHING;

INSERT INTO publicacoes (djen_id, tipo, ato, prazo_dias, data_fatal, resolvido, texto) VALUES
  ('exemplo-1', 'Intimação', 'Emenda à inicial', 15, current_date + 3, false, 'exemplo'),
  ('exemplo-2', 'Sentença', 'Apelação', 15, current_date + 6, false, 'exemplo')
ON CONFLICT (djen_id) DO NOTHING;
SQL

echo ""
echo "✅ Pronto! Agora recarregue:  https://qg.jonasinacio.adv.br"
echo "   O Dashboard deve mostrar: Clientes 7 · Leads 3 · Tarefas 3 · Prazos 2"
