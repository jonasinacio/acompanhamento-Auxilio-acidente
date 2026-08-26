# SENTINELA-PRAZOS — o prazo vira tarefa no AdvBox sozinho

O ápice do SENTINELA (um sentinela dentro do SENTINELA). Pega as intimações do
DJEN, classifica (mesmo `classificacao.py` do vigia-djen) e, para os atos de
**alta confiança**, cria automaticamente no AdvBox a tarefa certa, com
vencimento a **D-2** (2 dias úteis antes do prazo fatal real). Porta fiel do
`sentinela-prazos.js` do Jonas.

## Escopo estreito (de propósito)

Só cria tarefa para os atos mais inequívocos — o resto fica só no boletim do
vigia-djen e o humano decide:

| Ato (do classificador) | Tarefa criada no AdvBox | Prazo |
|---|---|---|
| Contestação do INSS → réplica | RÉPLICA/IMPUGNAÇÃO À CONTESTAÇÃO (`3349334`) | 15 d.ú. |
| Sentença (JEF) → recurso inominado | RECURSO DE APELAÇÃO/INOMINADO (`3349368`) | 10 d.ú. |
| Sentença → apelação | RECURSO DE APELAÇÃO/INOMINADO (`3349368`) | 15 d.ú. |

Ampliar o escopo é uma decisão à parte, depois de validar em `--dry`.

## Segurança (a mesma do original)

- **`--dry` por PADRÃO** — só mostra o que faria, **não escreve** no AdvBox.
- Só grava com **`--send`** explícito.
- **Idempotente** por publicação (nunca cria a mesma tarefa 2x — estado em
  `prazos-tarefas-criadas.json`).
- Processo que não está na carteira do AdvBox → **não** cria e **não** marca
  como tratado (tenta de novo amanhã).
- Token do AdvBox só por ambiente (`ADVBOX_TOKEN`), nunca no código.

## Como validar antes de ligar (recomendado)

```bash
cd sentinela-prazos
python3 sentinela_prazos.py --dry --mock      # sem rede, com exemplos
export ADVBOX_TOKEN="..."                      # seu token do AdvBox
python3 sentinela_prazos.py --dry              # DE VERDADE, mas só mostra
```

Rode em `--dry` de verdade por alguns dias e confira se as tarefas que ele
**criaria** batem. Só depois troque para `--send`.

## Ligar de verdade

Precisa de `ADVBOX_TOKEN` no `.env` (ou no ambiente). Aí:
```bash
python3 sentinela_prazos.py --send
```
No VPS, agende com o `deploy/sentinela-prazos.*` (systemd) — **só habilite o
`--send` depois de validar em `--dry`**.

> A data de disponibilização nem sempre é o início do prazo (depende do meio e
> do tribunal). Por isso a margem D-2 e o "confira antes de protocolar" no
> comentário da tarefa.
