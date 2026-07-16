# Modelos de tarefa do Flowter — tarefas internas da esteira
**Esteira Previdenciária · Jonas Inácio Advocacia**

Cada modelo abaixo é uma **ação "criar tarefa"** do Flowter, disparada pelo gatilho da etapa.
Campos: **Título · Responsável (cargo) · Prazo · Descrição/checklist**.
Cargos: Atendimento = Bia · Técnico = Natália · Documentos = Pedro · Direção = Jonas.

> As mensagens ao cliente (WhatsApp/Z-API) estão em `mensagens-zapi.md`. Aqui ficam só as tarefas **internas**.

---

## Receita 1 — Onboarding (gatilho: etapa → CONTRATO ASSINADO)

### Tarefa 1.1 — Abrir pasta e solicitar documentos
- **Responsável:** Documentos (Pedro)
- **Prazo:** mesmo dia
- **Checklist:**
  - [ ] Criar pasta do cliente no Drive com a estrutura 01–07
  - [ ] Enviar ao cliente a lista de documentos iniciais
  - [ ] Registrar no ADVBOX que a solicitação foi feita

### Tarefa 1.2 — Baixar CNIS e laudos do Meu INSS
- **Responsável:** Documentos (Pedro)
- **Prazo:** 2 dias úteis
- **Checklist:**
  - [ ] Extrair CNIS no Meu INSS e salvar em `03 - CNIS e Meu INSS`
  - [ ] Baixar laudos/decisões disponíveis
  - [ ] Validar vínculos, carência e qualidade de segurado; anotar inconsistências
  - [ ] Ao concluir, mover a etapa para AGUARDANDO DOCS

---

## Receita 3 — Cobrança de documentos (gatilho: etapa → AGUARDANDO DOCS · SLA 7 d.ú.)

### Tarefa 3.1 — Follow-up documentos (D+3)
- **Responsável:** Documentos (Pedro)
- **Prazo:** 3 dias úteis
- **Checklist:**
  - [ ] Conferir o que já chegou
  - [ ] Disparar lembrete ao cliente (Z-API — msg 2)
  - [ ] Se recebido e legível, renomear e salvar; senão manter pendência

### Tarefa 3.2 — Follow-up documentos (D+5)
- **Responsável:** Documentos (Pedro)
- **Prazo:** 5 dias úteis
- **Checklist:**
  - [ ] 2º lembrete ao cliente (Z-API — msg 3)
  - [ ] Avaliar se algum documento é insubstituível para o protocolo

### Tarefa 3.3 — Aging crítico (D+7)
- **Responsável:** Atendimento (Bia)
- **Prazo:** imediato
- **Checklist:**
  - [ ] Ligar para o cliente (não depender só de mensagem)
  - [ ] Mover pendências para `07 - Pendências`
  - [ ] Registrar no ADVBOX; escalar se travar prazo

---

## Receita 4 — Sequência da perícia (gatilho: etapa → PERÍCIA DESIGNADA + data preenchida)

### Tarefa 4.1 — Perícia D-15: avisar o cliente
- **Responsável:** Atendimento (Bia) · **Prazo:** D-15 (a partir da data da perícia)
- **Checklist:** [ ] Enviar data/hora/local (Z-API — msg 7) · [ ] Confirmar que o cliente recebeu

### Tarefa 4.2 — Perícia D-7: orientação + documentos
- **Responsável:** Atendimento (Bia) / Documentos (Pedro) · **Prazo:** D-7
- **Checklist:** [ ] Enviar orientação de preparo (Z-API — msg 8) · [ ] Pedro organiza os documentos que o cliente deve levar

### Tarefa 4.3 — Perícia D-2: confirmar presença
- **Responsável:** Atendimento (Bia) · **Prazo:** D-2
- **Checklist:** [ ] Confirmar presença, rota e documentos (Z-API — msg 9)

### Tarefa 4.4 — Perícia D+1: coletar relato
- **Responsável:** Atendimento (Bia) · **Prazo:** D+1
- **Checklist:** [ ] Coletar relato do cliente sobre como foi · [ ] Registrar no ADVBOX e em `06 - Perícia`

---

## Ganhos rápidos (mesma mecânica)

### LAUDO JUNTADO → Analisar laudo
- **Responsável:** Direção (Jonas) · **Prazo:** 5 dias úteis
- **Checklist:** [ ] Natália monta resumo técnico (aderência à tese, quesitos) · [ ] Jonas decide: concordar / impugnar / esclarecimentos / nova perícia

### ALVARÁ EXPEDIDO → Checklist bancário
- **Responsável:** Direção (Jonas) / apoio · **Prazo:** 2 dias úteis
- **Checklist:** [ ] Conferir valor bruto, honorários e líquido do cliente · [ ] Preparar kit bancário · [ ] Registrar status financeiro
