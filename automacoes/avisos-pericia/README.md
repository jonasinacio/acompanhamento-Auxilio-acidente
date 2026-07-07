# ARAUTO-PERÍCIA — Robô de avisos de perícia médica

Irmão do **ARAUTO** (robô de avisos de audiência). Mesmo padrão —
*mãe → motor → régua → estado → saída* — só que a régua é a da **perícia
médica** (seção 8.2 do Manual Operacional v4.1), e não a da audiência.

> **Às 09h05 o robô lê a planilha "mãe", decide o marco de cada perícia pela
> régua fechada, dispara o WhatsApp certo ao cliente via ChatGuru — ou o alerta
> interno no grupo GERAL — e carimba a mãe para nunca repetir.**

---

## A régua (4 marcos p/ cliente + 2 alertas internos) — NÃO MUDAR

| Marco       | Quando | Canal   | O que faz                                                        |
|-------------|--------|---------|------------------------------------------------------------------|
| `AVISO_15`  | D-15   | cliente | Bia informa data, hora, local e regra geral da perícia.          |
| `DOC_PEDRO` | D-9    | interno | Aciona Pedro p/ organizar no Drive os documentos que o cliente leva. |
| `ORIENTA_7` | D-7    | cliente | Orientação detalhada + checklist de conduta e documentos.        |
| `CONFIRMA_2`| D-2    | cliente | Confirma presença, rota, documentos e dúvidas finais.            |
| `RELATO_1`  | D+1    | interno | Lembra Bia de colher o relato pós-perícia e registrar no ADVBOX. |

Cada marco grava **sua própria coluna** de carimbo na mãe e **nunca repete**.
Se dois marcos de **cliente** caírem no mesmo dia (robô parado no fim de
semana), sai só o **mais próximo** da perícia — nunca duas mensagens coladas
(a "Regra 5" do ARAUTO). Alertas **internos** vão pro grupo GERAL, público
diferente, então disparam junto com o do cliente sem problema.

## Travas naturais (seguram sozinhas)

- **STATUS manda** — `CANCELADA / REMARCADA / MANUAL / NA MÃO / TESTE / DESIGNAR`
  → o robô pula a linha em silêncio.
- **Sem data** → não dá pra calcular marco: grita 1x no GERAL (Natália
  preenche `DATA_PERICIA`).
- **Marco de cliente incompleto** (falta data/hora/local) → não manda pro
  cliente, grita no GERAL.
- **Sem telefone** → não trava: vira alerta no GERAL p/ Pedro/Bia preencherem.
- **Falha grita** — faz backup da mãe antes de escrever; erro de envio não
  carimba (tenta de novo amanhã).
- **Trava de segurança** — sem `--send` o robô roda em `--dry` (não envia nada).

---

## Instalação (no Mac, ao lado do `avisos-audiencia`)

```bash
# 1. copie a pasta automacoes/ inteira p/ ~/pj-automacoes  (os 3 robôs juntos,
#    porque todos importam o ../pj_comum.py compartilhado)
cd ~/pj-automacoes/avisos-pericia

# 2. dependência
pip3 install -r requirements.txt

# 3. gere a planilha mãe modelo (cria OFICIAL_PERICIAS_2026.xlsx com 2 exemplos)
python3 criar_planilha_modelo.py

# 4. ENSAIE sem enviar nada — mostra a prévia de cada mensagem
python3 robo_pericias.py --dry

# 5. simule outro dia p/ ver os marcos futuros
python3 robo_pericias.py --dry --hoje 2026-08-01
```

Quando a prévia estiver do seu gosto, ligue os envios reais (ver credenciais
abaixo) e agende no launchd:

```bash
# ajuste os caminhos dentro do plist (troque /Users/jonas/... pelo seu)
cp com.pj.avisos-pericia.plist ~/Library/LaunchAgents/
launchctl load  ~/Library/LaunchAgents/com.pj.avisos-pericia.plist
launchctl start com.pj.avisos-pericia   # dispara já, p/ testar
```

Roda todo dia útil às **09h05** (5 min depois do ARAUTO das 09h). Mac desligado
na hora → o launchd faz catch-up nativo ao ligar, e as *janelas* de tolerância
da régua garantem que nenhum marco fura.

---

## A planilha "mãe" (única fonte de verdade)

Aba **`2026`**. Cabeçalho na linha 1 (não renomeie as colunas):

| Coluna         | O que é                                    |
|----------------|--------------------------------------------|
| `PROCESSO`     | nº do processo — chave do caso             |
| `CLIENTE`      | nome do cliente                            |
| `TELEFONE`     | WhatsApp (só dígitos, com DDI+DDD: `5511…`)|
| `DATA_PERICIA` | data da perícia (`dd/mm/aaaa`)             |
| `HORA`         | hora (`HH:MM`)                             |
| `LOCAL`        | endereço/local da perícia                  |
| `TIPO`         | administrativa / judicial                  |
| `ACIDENTARIA`  | `SIM` → inclui CAT/PPP/CTPS no checklist   |
| `STATUS`       | ver travas acima                           |
| `AVISO_15` … `RELATO_1` | **carimbos** — o robô preenche; comece vazio |

A planilha real **não vai pro git** (`.gitignore` — dados de cliente/LGPD).
O Drive/planilha oficial continua sendo a fonte; aqui é só a cópia que o robô lê.

---

## Ligar os envios de verdade (credenciais via variável de ambiente)

Nunca coloque token no código. Exporte antes de rodar (ou no seu `~/.zshrc`):

```bash
# WhatsApp ao cliente (ChatGuru)
export CHATGURU_ENDPOINT="https://s15.chatguru.app/api/v1"   # o seu endpoint
export CHATGURU_TOKEN="..."
export CHATGURU_ACCOUNT_ID="..."

# Alerta no grupo interno GERAL (Z-API)
export ZAPI_ENDPOINT="https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN/send-text"
export ZAPI_TOKEN="..."          # Client-Token da conta
export ZAPI_GRUPO="...@g.us"     # id do grupo GERAL
```

Sem credencial o robô ainda roda em `--dry` normalmente (só não envia). Em
`--send` sem credencial ele avisa no log e não carimba — nada se perde.

> **Nota:** os senders (`enviar_whatsapp_cliente` / `enviar_alerta_interno`)
> ficam em **`../pj_comum.py`**, compartilhados pelos três robôs. Seguem o
> formato genérico do ChatGuru / Z-API — confira os nomes de campo com o que o
> seu ARAUTO de audiência já usa em produção e ajuste 1:1 **num lugar só**.

---

## Puxar do AdvBox (opcional, fase 2)

Hoje a mãe é preenchida à mão (ou colada do ADVBOX). Quando quiser automatizar
igual ao `puxa_advbox.py` do ARAUTO, crie um `puxa_pericias_advbox.py` que
casa pelo nº do processo e **só acrescenta o que não existe** (nunca sobrescreve
carimbo), e descomente a linha dele no `run_diario.sh`.

---

## Arquivos

```
pj-automacoes/
├── pj_comum.py                 ← senders + datas + estado (compartilhado)
└── avisos-pericia/
    ├── robo_pericias.py            ← o disparador (motor + régua)
    ├── config.py                   ← régua fechada e textos  (mexa aqui p/ ajustar)
    ├── criar_planilha_modelo.py    ← gera a mãe modelo
    ├── run_diario.sh               ← orquestrador (launchd chama este)
    ├── com.pj.avisos-pericia.plist ← agendamento 09h05
    ├── requirements.txt
    └── README.md
```
