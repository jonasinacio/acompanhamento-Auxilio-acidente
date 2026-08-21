# ALARME-EMENDAS — vigia de prazo fatal de emendas

Robô **interno** (não fala com cliente). Todo dia útil olha a "mãe" de emendas
e, para cada emenda ainda não protocolada, dispara no grupo **GERAL** o alarme
certo conforme os **dias úteis** que faltam até o `PRAZO_FATAL`, escalando para
o Jonas quando aperta e nagando todo dia se já venceu. Baseado nas seções 7 e
14 do Manual Operacional v4.1.

> Emenda é pendência crítica: prazo processual + risco de indeferimento. Um
> prazo perdido é o pior resultado possível — por isso este robô é barulhento
> de propósito.

## A escada de alarmes (por dias úteis até o prazo fatal)

| Situação | Alarme | Para quem |
|---|---|---|
| Sem `CLASSIFICACAO` | classificar a emenda (D+0/D+1) | Natália |
| `DEPENDE_DOC=SIM` e `DOC_OK≠SIM` | acionar Pedro com lista + prazo | Bia/Natália |
| Faltam **2 dias úteis** (o SLA) | protocolar agora | Natália + Bia |
| Falta **1 dia útil** | 🚨 **escala Jonas** — vence amanhã | Natália + Jonas |
| **Hoje** é o prazo fatal | 🚨🚨 vence hoje | todos |
| **Já venceu** e sem protocolo | ❗️ nag **diário** até baixar | Jonas + Natália |

Cada nível dispara **1x** (carimbo na mãe + dedupe em JSON). Conforme os dias
passam, o alarme **sobe de degrau sozinho** (2 d.ú. → 1 d.ú. → hoje → vencido).
O alarme de "vencido" repete **todo dia** até você preencher `PROTOCOLADA_EM`.

## Travas

- `STATUS` = PROTOCOLADA/BAIXADA/CONCLUÍDA **ou** `PROTOCOLADA_EM` preenchida →
  silêncio (a emenda saiu, o robô cala).
- `STATUS` = CANCELADA/MANUAL/TESTE/ARQUIVADA → pula.
- Sem `PRAZO_FATAL` → grita 1x pedindo pra Natália registrar o prazo.
- **Dias úteis** consideram sáb/dom e os feriados de `../feriados.txt`
  (uma data `dd/mm/aaaa` por linha — preencha os do seu foro).

## Planilha "mãe" (`OFICIAL_EMENDAS_2026.xlsx`, aba `2026`)

| Coluna | O que é |
|---|---|
| `PROCESSO` | nº do processo |
| `CLIENTE` | nome |
| `INTIMACAO` | data em que a intimação de emenda foi identificada |
| `PRAZO_FATAL` | **data fatal** (`dd/mm/aaaa`) — a coluna mais importante |
| `CLASSIFICACAO` | simples/documental/jurídica/estratégica (vazio = ainda não classificada) |
| `DEPENDE_DOC` | `SIM`/`NAO` |
| `DOC_OK` | `SIM` quando Pedro recebeu/salvou o documento |
| `STATUS` | EMENDA PENDENTE / PROTOCOLADA / CANCELADA … |
| `PROTOCOLADA_EM` | data do protocolo (preencheu → robô cala) |
| `AL_CLASSIFICAR` … `AL_FATAL` | **carimbos** (o robô preenche; comece vazio) |

## Uso

```bash
cd ~/jonas-inacio-automacoes/alarme-emendas
python3 criar_planilha_modelo.py            # cria a mãe com exemplos
python3 robo_emendas.py --dry               # ensaia, mostra cada alarme
python3 robo_emendas.py --dry --hoje 2026-08-01   # simula outro dia p/ ver a escada
```

Agendar (09h10, depois do ARAUTO e do perícia):

```bash
cp com.jonasinacio.alarme-emendas.plist ~/Library/LaunchAgents/
launchctl load  ~/Library/LaunchAgents/com.jonasinacio.alarme-emendas.plist
launchctl start com.jonasinacio.alarme-emendas
```

Credenciais (uazapi do grupo GERAL) e senders: em `../pj_comum.py` — os mesmos
de todos os robôs. Este robô só usa o alerta interno (não manda WhatsApp a cliente).
