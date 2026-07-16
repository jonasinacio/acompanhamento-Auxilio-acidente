# Alertas internos de tarefa — avisar cada responsável
**Esteira Previdenciária · Jonas Inácio Advocacia**

Objetivo: garantir que a pessoa certa saiba, na hora, que tem uma tarefa nova.

---

## Camada 1 — Nativo do ADVBOX (já funciona, sem configurar)
Ao criar/atribuir uma tarefa, o responsável é avisado por:
- 🔔 **Sino** (in-app, topo da tela)
- ✉️ **E-mail**
- 📱 **Push** do app ADVBOX no celular
- ⏰ Alerta **24h antes** do prazo fatal, se não concluída

> Toda tarefa tem uma **URL exclusiva** que pode ser compartilhada por WhatsApp/Telegram (só usuários da conta abrem o conteúdo). Recomendado manter esta camada **sempre ligada**.

---

## Camada 2 — Alerta no WhatsApp via Flowter + Z-API (opcional, mais forte)
Para a equipe que vive no WhatsApp. Junto da ação que cria a tarefa, adicione **outra ação HTTP Request**
apontando para o Z-API, com o número do responsável (ou de um grupo interno).

### Mapa de destinatários (preencher com os números reais)
| Cargo | Pessoa | Número (55 + DDD + nº) |
|-------|--------|------------------------|
| Atendimento | Bia | `55DDDNUMERO` |
| Técnico | Natália | `55DDDNUMERO` |
| Documentos | Pedro | `55DDDNUMERO` |
| Direção | Jonas | `55DDDNUMERO` |
| **Grupo interno** (opcional) | Equipe | `ID do grupo no Z-API` |

> No Flowter, use a variável do **responsável** para escolher o número automaticamente; ou crie um fluxo por cargo apontando para o número fixo. Para grupo, o Z-API usa a rota de envio para grupo (ID do grupo no lugar de `phone`).

### Payload — alerta de tarefa nova (genérico)
```json
{
  "phone": "{{numero_do_responsavel}}",
  "message": "🔔 Nova tarefa: {{titulo_tarefa}}\nCliente: {{cliente}} — {{processo}}\nPrazo: {{prazo}}\nResponsável: {{responsavel}}\nAbrir no ADVBOX: {{link_tarefa}}"
}
```

### Payload — alerta de PRAZO FATAL próximo (prioridade alta)
```json
{
  "phone": "{{numero_do_responsavel}}",
  "message": "⏰ ATENÇÃO — prazo fatal se aproximando\nTarefa: {{titulo_tarefa}}\nCliente: {{cliente}} — {{processo}}\nPrazo fatal: {{prazo_fatal}}\nAbrir no ADVBOX: {{link_tarefa}}"
}
```

> `{{link_tarefa}}` = URL exclusiva da tarefa, se o Flowter expuser como variável. Se não expuser, deixe a mensagem sem o link — o responsável abre pelo app.

---

## Recomendação
- **Sempre:** manter a Camada 1 (nativa) ligada — é o alerta base de toda tarefa.
- **WhatsApp (Camada 2):** ligar para o que **não pode passar batido** — prazo fatal, emenda, perícia. Evita poluir com aviso de toda tarefa pequena.
- **Grupo interno:** bom para marcos coletivos (ex.: "caso entrou na fila", "aging crítico") — espelha o "aviso no grupo" do fluxo.

## Cuidado (mesmo do cliente)
Os alertas internos também saem pelo **número dedicado** do Z-API. Como vão para a própria equipe, o risco é
mínimo, mas mantenha o mesmo número e evite volume desnecessário.
