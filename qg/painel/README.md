# Painel do QG (protótipo)

`painel-qg.html` é o painel do QG do Escritório em abas:
**Comercial** (leads do dia via ChatGuru) · **Financeiro** (RPVs) · **Prazos**
(≤ 7 dias, DJEN) · **Perícias** (agrupadas) · **IA do Manual** (chat ao vivo).

Publicado como Artifact do claude.ai (capability `sample` para a IA responder ao vivo).

## Manual confidencial (fora do git de propósito)

A aba **IA do Manual** embute o Manual Operacional do escritório para responder
pelas regras internas. Esse manual é **confidencial** e **NÃO** é versionado aqui:
no código há apenas o marcador `__MANUAL_PLACEHOLDER__`.

Para publicar a versão funcional, injete o manual no marcador antes de subir o
Artifact (fora do repositório):

```py
import json
html = open("painel-qg.html", encoding="utf-8").read()
manual = open("MANUAL.txt", encoding="utf-8").read().strip()   # arquivo local, NÃO commitado
html = html.replace('"__MANUAL_PLACEHOLDER__"', json.dumps(manual, ensure_ascii=False), 1)
open("painel-publicar.html", "w", encoding="utf-8").write(html)
```

O manual tem ~42 KB; o limite de contexto da IA (`sample`) é 64 KB, então sobra
folga para a conversa (o painel usa as últimas 4 mensagens).

## Dados

- **Perícias** e **Financeiro**: dados reais lidos das planilhas do Drive, embutidos no HTML.
- **Comercial** e **Prazos**: exemplos, até ligar ChatGuru e DJEN.
