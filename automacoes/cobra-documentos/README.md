# COBRA-DOCUMENTOS — cobrança automática de documentos do cliente

O gargalo nº 1 do escritório resolvido no piloto automático. Para cada caso
`AGUARDANDO DOCUMENTOS`, o robô manda ao cliente lembretes educados e
escalonados no WhatsApp, com a **lista exata do que falta**, e escala pro
Pedro/Bia se o cliente não responder. Baseado na seção 5 + status da seção 14
("7 dias úteis com follow-ups").

## Régua (dias após `SOLICITADO_EM`)

| Quando | O quê | Para quem |
|---|---|---|
| **D+3** | lembrete gentil, com a lista do que falta | cliente |
| **D+7** | 2º lembrete, um pouco mais firme | cliente |
| **D+10** | escala: cobrar ativamente (ligar) | Pedro/Bia (GERAL) |
| **D+12** | 3º e último lembrete (avisa que pode atrasar) | cliente |

Se o robô ficar parado e vários lembretes vencerem, manda só o **mais
avançado** — nada de "lembrete gentil" uma semana atrasado. Cada lembrete sai
1x (carimbo). Lembrete de cliente e escala interna são públicos diferentes,
disparam no mesmo dia sem problema.

## Travas

- `STATUS` COMPLETO/RECEBIDO/PASTA FECHADA **ou** `RECEBIDO_EM` preenchida →
  silêncio.
- `STATUS` CANCELADA/MANUAL/PAUSADO → pula.
- Sem `DOCS_FALTANDO` → não manda ao cliente (lembrete sem lista confunde);
  grita interno pra preencher. Sem telefone → idem.
- Sem `SOLICITADO_EM` → grita interno.

## Planilha "mãe" (`OFICIAL_DOCUMENTOS_2026.xlsx`, aba `2026`)

| Coluna | O que é |
|---|---|
| `PROCESSO` / `CLIENTE` / `TELEFONE` | identificação (telefone: só dígitos, `5511…`) |
| `SOLICITADO_EM` | data em que os documentos foram pedidos (`dd/mm/aaaa`) |
| `DOCS_FALTANDO` | lista do que falta, itens separados por `;` |
| `STATUS` | AGUARDANDO DOCUMENTOS / COMPLETO / … |
| `RECEBIDO_EM` | data em que veio tudo (preencheu → cala) |
| `LEMB_3` … `LEMB_12` | **carimbos** (o robô preenche; comece vazio) |

## Uso

```bash
cd ~/pj-automacoes/cobra-documentos
python3 criar_planilha_modelo.py
python3 robo_documentos.py --dry
cp com.pj.cobra-documentos.plist ~/Library/LaunchAgents/   # roda 09h20
launchctl load ~/Library/LaunchAgents/com.pj.cobra-documentos.plist
```
