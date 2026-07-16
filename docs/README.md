# Esteira Previdenciária — POP e automações

Procedimento Operacional Padrão do escritório **Jonas Inácio Advocacia**, derivado do
Manual Operacional e de Legal Ops v4.1. Descreve a esteira do caso — do lead ao encerramento —
sem Trello (o quadro é o **status do ADVBOX**), com automação via **Flowter + Z-API**.

## Arquivos

| Arquivo | O que é |
|---------|---------|
| [`pop-esteira-previdenciaria.html`](./pop-esteira-previdenciaria.html) | POP visual completo (abrir no navegador). Atores, pasta, esteira, automação, segurança, KPIs e regras. |
| [`mensagens-zapi.md`](./mensagens-zapi.md) | Textos e payloads JSON prontos do Z-API para cada marco, com rodapé padrão anti-golpe. |
| [`flowter-tarefas-internas.md`](./flowter-tarefas-internas.md) | Modelos das tarefas internas do Flowter (onboarding, cobrança, perícia, laudo, alvará). |
| [`clausula-optin-whatsapp.md`](./clausula-optin-whatsapp.md) | Cláusula de autorização de contato por WhatsApp (LGPD) para o contrato. |

## Arquitetura da automação

```
Card muda de etapa  →  Flowter (cria tarefa + HTTP Request)  →  Z-API (send-text)  →  WhatsApp do cliente
```

- **Flowter** = o gatilho e a orquestração dentro do ADVBOX.
- **Z-API** = a entrega no WhatsApp (número **dedicado**; ver checklist anti-banimento no POP).
- **SMS/e-mail nativo** do ADVBOX segue como backup, disponível em todos os planos.

## Regra de atualização

POP vivo — atualiza a cada mudança de fluxo, função, ferramenta ou SLA. A versão vigente é única.
