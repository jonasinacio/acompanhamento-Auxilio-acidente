# Painel do QG (protótipo)

`painel-qg.html` é o painel do QG do Escritório em abas:
**Comercial** (leads do dia via ChatGuru) · **Financeiro** (RPVs) · **Prazos**
(≤ 7 dias, DJEN) · **Perícias** (agrupadas) · **IA do Manual** (chat ao vivo).

Publicado como Artifact do claude.ai (capability `sample` para a IA responder ao vivo).

## Manual do escritório (incluído no repo)

A aba **IA do Manual** embute o **Manual Operacional v4.0** (`MANUAL.txt`) para a IA
responder pelas regras internas. Aqui o manual **está versionado** e já vem
**embutido** no `painel-qg.html` (funcional ao abrir). ⚠️ É documento confidencial —
este repositório é privado; não torne público.

Para regenerar o HTML a partir do `MANUAL.txt` (se editar o manual):

```py
import json
html = open("painel-qg.html", encoding="utf-8").read()
manual = open("MANUAL.txt", encoding="utf-8").read().strip()
import re
html = re.sub(r'const MANUAL=".*?";', "const MANUAL="+json.dumps(manual, ensure_ascii=False)+";", html, count=1)
open("painel-qg.html", "w", encoding="utf-8").write(html)
```

O manual tem ~42 KB; o limite de contexto da IA (`sample`) é 64 KB, então sobra
folga para a conversa (o painel usa as últimas 4 mensagens).

## Dados

- **Perícias** e **Financeiro**: dados reais lidos das planilhas do Drive, embutidos no HTML.
- **Comercial** e **Prazos**: exemplos, até ligar ChatGuru e DJEN.
