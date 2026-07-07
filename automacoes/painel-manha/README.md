# PAINEL-MANHÃ — o dia num olhar

Todo dia útil às **08h45**, antes dos outros robôs, manda **uma mensagem** no
grupo GERAL com as exceções do dia, lidas de todas as mães. Transforma 4/5
planilhas num resumo só. Não fala com cliente — é interno (seções 15 e 16).

Exemplo do que sai:

```
☀️ PAINEL DA MANHÃ · 07/07/2026
_exceções do dia — Jonas Inácio Advocacia_

📋 Perícias (próx. 7 dias): 1
  • 14/07/2026 14:00 · João Carlos Ferreira

🚨 Emendas críticas (≤3 d.ú. ou vencidas): 3
  🔴 Pedro Alves · fatal 05/07/2026 (VENCIDA há 1 d.ú.)
  • Ana Lima · fatal 08/07/2026 (1 d.ú.)
  • João Ferreira · fatal 11/07/2026 (3 d.ú.)

⏰ Casos atrasados de SLA: 1
  • João Ferreira · PROTOCOLO ADM (7 d.ú., SLA 3)

📄 Documentos parados (≥7 dias): 2
  • Ana Lima (há 12 dias)
  • João Ferreira (há 7 dias)

Bom trabalho! 💪
```

## Como funciona

- Lê as mães dos outros robôs (perícia, emenda, casos, documentos) direto —
  **não precisa de config próprio de colunas**, reaproveita os deles.
- Mãe que não existe → a seção dela some (sem erro).
- Manda **1 painel por dia** (dedupe por data). Não escreve em mãe nenhuma.
- Só usa o alerta interno (Z-API do GERAL) — nada vai pro cliente.

Ajuste as janelas (próx. dias de perícia, dias úteis de emenda crítica, etc.)
em `config.py`.

## Uso

```bash
cd ~/pj-automacoes/painel-manha
python3 robo_painel.py --dry        # monta e mostra o painel
cp com.pj.painel-manha.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.pj.painel-manha.plist
```

Se você ligar o `puxa_advbox`, descomente a linha dele no `run_diario.sh` para
o painel refletir os dados fresquinhos do AdvBox.
