# GATILHOS-STATUS — maestro de status do ADVBOX

Robô **interno**. Todo dia útil compara o `STATUS` de cada caso na "mãe" com o
último que viu; **quando muda**, dispara no grupo GERAL a *tarefa obrigatória*
daquele status, para o responsável certo. Em paralelo, mede há quantos dias
úteis o caso está parado e, se estourou o SLA, joga no **painel de exceção**.
Implementa a seção 14 do Manual v4.1 ("status disparam a próxima ação").

## O que cada mudança de status dispara (tabela 14)

| Novo status | Tarefa obrigatória | Quem |
|---|---|---|
| CONTRATO ASSINADO | abrir checklist, criar pasta, enviar lista inicial | Bia → Pedro |
| PASTA FECHADA | direcionar pela matriz, abrir fila ADM ou JUD | Pedro → Natália |
| PROTOCOLO ADM | abrir acompanhamento semanal + comunicar cliente | Natália + Bia |
| EXIGENCIA ADM | classificar exigência, acionar Pedro se faltar doc | Natália + Bia |
| EMENDA PENDENTE | classificar, abrir tarefa, acionar Pedro | Natália + Bia |
| PERICIA DESIGNADA | abrir sequência D-15/D-7/D-2/D+1 | Natália + Bia |
| LAUDO JUNTADO | notificar Jonas + registrar prazo de análise | Natália → Jonas |

> `EMENDA PENDENTE` e `PERICIA DESIGNADA` disparam só o **aviso de abertura**
> aqui; quem cuida do prazo/régua deles são o **ALARME-EMENDAS** e o
> **ARAUTO-PERÍCIA**. Sem sobreposição de disparo.

## Detecção de atraso de SLA (tabela 14)

Se o caso está num status além do SLA em dias úteis, sai um alerta de
`ATRASO DE SLA` pro painel de exceção — reavisando a cada 5 dias úteis enquanto
continuar estourado.

| Status | SLA (dias úteis) | Status | SLA |
|---|---|---|---|
| CONTRATO ASSINADO | 1 | AJUIZADO | 5 |
| AGUARDANDO DOCUMENTOS | 7 | LAUDO JUNTADO | 5 |
| PASTA FECHADA | 7 | SENTENCA | 3 |
| PROTOCOLO ADM | 3 | EXECUCAO | 7 |
| EXIGENCIA ADM | 1 | ALVARA EXPEDIDO | 2 |

`LEAD` (15 min), `EMENDA PENDENTE` e `PERICIA DESIGNADA` não têm SLA de tempo
aqui — o primeiro é granular demais pra um robô diário, os outros dois têm robô
próprio.

## Linha de base (importante)

Na **primeira** rodada com `--send`, o robô só **registra** os status atuais
como linha de base — não dispara gatilho retroativo pra caso antigo (senão
choveria alerta no dia 1). A partir da 2ª rodada, só o que **mudar** dispara.
Alertas de **atraso de SLA** valem já na 1ª rodada.

Quer disparar tudo já na 1ª (ex.: pra testar): `--disparar-primeira`.

## Planilha "mãe" (`OFICIAL_CASOS_2026.xlsx`, aba `2026`)

| Coluna | O que é |
|---|---|
| `PROCESSO` | nº do processo |
| `CLIENTE` | nome |
| `STATUS` | um dos status padrão (tabela 14) |
| `STATUS_DESDE` | data em que entrou no status atual (`dd/mm/aaaa`) — usada no SLA |
| `RESPONSAVEL` | opcional, informativo |

O robô não escreve na planilha — guarda o último status visto em
`estado_status.json`. A mãe pode ser um export do ADVBOX; o ideal (fase 2) é
puxar direto pela API do ADVBOX, igual ao `puxa_advbox.py` do ARAUTO.

## Uso

```bash
cd ~/jonas-inacio-automacoes/gatilhos-status
python3 criar_planilha_modelo.py
python3 robo_status.py --dry --disparar-primeira   # vê todos os gatilhos + atrasos
python3 robo_status.py --send                       # 1ª vez: cria linha de base

cp com.jonasinacio.gatilhos-status.plist ~/Library/LaunchAgents/
launchctl load  ~/Library/LaunchAgents/com.jonasinacio.gatilhos-status.plist   # roda 09h15
launchctl start com.jonasinacio.gatilhos-status
```
