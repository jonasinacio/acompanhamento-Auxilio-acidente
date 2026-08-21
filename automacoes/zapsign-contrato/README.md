# ZAPSIGN-CONTRATO — "fechou contrato" cai no grupo na hora

O único robô que **não roda por horário** — ele reage a um evento. Quando um
cliente assina o contrato no **ZapSign**, o ZapSign chama este servidor
(webhook) e ele dispara no grupo GERAL, via uazapi, com **nome e telefone** de
quem fechou. Encaixa direto na régua: `CONTRATO ASSINADO → Bia/Pedro abrem a
pasta e mandam o checklist` (o gatilhos-status cuida do resto).

Exemplo do que cai no grupo:

```
✅ CONTRATO ASSINADO — ZapSign
📄 Contrato Auxílio-Acidente
• Maria Souza — 5511991095702

🎯 Bia/Pedro: abrir a pasta e enviar o checklist inicial ao cliente.
```

## Como funciona

1. O ZapSign faz `POST https://SEU_HOST/zapsign/<SEGREDO>` quando o doc é assinado.
2. O servidor confere o segredo, lê o payload, tira nome+telefone dos signatários.
3. Manda no grupo (uma vez por documento — dedupe pelo `token` do ZapSign).
4. **Grava todo payload cru** em `logs/zapsign_raw_*.json`.

> ⚠️ **Ainda não travei o formato do ZapSign.** O parser é defensivo (tenta os
> campos mais comuns: `event_type`/`status`, `signers[].name`,
> `phone_country`+`phone_number`). No **primeiro webhook real**, me mande um
> `logs/zapsign_raw_*.json` que eu ajusto os campos 1:1.

## Rodar

```bash
cd ~/jonas-inacio-automacoes/zapsign-contrato
# no .env (da pasta automacoes): ZAPSIGN_SEGREDO="algo-bem-secreto"
python3 webhook_zapsign.py            # sobe na porta ZAPSIGN_PORTA (8765)
# healthcheck:  curl http://127.0.0.1:8765/
```

## O webhook precisa de um endereço PÚBLICO

O ZapSign é um site na internet — ele precisa **alcançar** o servidor. O `127.0.0.1`
só funciona na sua máquina. Opções, da mais simples à mais robusta:

| Opção | Como | Quando |
|---|---|---|
| **Túnel cloudflared** | `cloudflared tunnel --url http://localhost:8765` → dá uma URL `https://…trycloudflare.com` | testar rápido, sem custo |
| **VPS pequeno** | roda o `webhook_zapsign.py` num servidor 24/7 (com domínio/HTTPS) | produção séria |
| **Sua instância/host uazapi** | se já tem um servidor no ar, hospede lá | reaproveitar o que existe |

No ZapSign, cole a URL final + `/zapsign/<SEGREDO>` no campo de webhook
(*Configurações → Webhooks / API*) e escolha o evento **documento assinado**.

## Manter vivo no Mac (opcional)

O `com.jonasinacio.zapsign-webhook.plist` sobe o servidor no boot e o reinicia se cair
(`KeepAlive`). Ajuste os caminhos e:

```bash
cp com.jonasinacio.zapsign-webhook.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.jonasinacio.zapsign-webhook.plist
```

(Ainda assim você precisa de um túnel/host público pro ZapSign chegar até ele.)
