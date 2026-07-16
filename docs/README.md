# Esteira Previdenciária — POP e automações

Procedimento Operacional Padrão do escritório **Jonas Inácio Advocacia**, derivado do
Manual Operacional e de Legal Ops v4.1. Descreve a esteira do caso — do lead ao encerramento —
sem Trello (o quadro é o **status do ADVBOX**), com automação via **Flowter + Z-API**.

## Arquivos

| Arquivo | O que é |
|---------|---------|
| [`pop-esteira-previdenciaria.html`](./pop-esteira-previdenciaria.html) | POP visual completo (abrir no navegador). Atores, pasta, esteira, automação, segurança, KPIs e regras. |
| [`mensagens-zapi.md`](./mensagens-zapi.md) | Textos e payloads JSON prontos do Z-API para cada marco, com rodapé padrão anti-golpe. |
| [`mensagens-pericia.md`](./mensagens-pericia.md) | Jornada completa da perícia: D-15, D-7, D-2, D-1, D+1, remarcada e não compareceu. |
| [`robot-inicial-spec.md`](./robot-inicial-spec.md) | Blueprint do robô que gera a petição inicial de auxílio-acidente (o "Totti" do escritório). |
| [`flowter-passo-a-passo-piloto.md`](./flowter-passo-a-passo-piloto.md) | Guia campo a campo para montar o 1º fluxo no Flowter (aviso de ajuizamento) e replicar os demais. |
| [`flowter-tarefas-internas.md`](./flowter-tarefas-internas.md) | Modelos das tarefas internas do Flowter (onboarding, cobrança, perícia, laudo, alvará). |
| [`flowter-alertas-internos.md`](./flowter-alertas-internos.md) | Como avisar cada responsável da tarefa: nativo (sino/e-mail/push) + WhatsApp via Z-API. |
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
