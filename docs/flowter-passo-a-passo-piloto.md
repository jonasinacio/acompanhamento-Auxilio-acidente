# Passo a passo do Flowter — fluxo piloto
**Aviso ao cliente "processo protocolado/ajuizado" · Jonas Inácio Advocacia**

Este é o **primeiro fluxo** a montar: maior impacto percebido, menor risco. Depois de validá-lo,
os outros marcos são cópias com outra etapa + outra mensagem.

> Os nomes dos botões podem variar um pouco na sua versão do ADVBOX. A lógica é sempre
> **Gatilho (quando) → Ações (o quê)**.

---

## Antes de começar (pré-requisitos)
- [ ] Etapas da esteira cadastradas (`Configurações → Fases e Etapas`), incluindo **AJUIZADO** e **PROTOCOLO ADM**
- [ ] Cargos criados (Atendimento, Técnico, Documentos, Direção)
- [ ] Z-API com o **número dedicado** conectado. Anote: `INSTANCIA`, `TOKEN`, `Client-Token`
- [ ] Cláusula de opt-in já no contrato

---

## Passo 1 — Criar o fluxo
1. Abra `Configurações → Flowter` (ou "Automações / Workflow").
2. **Novo fluxo** → nome: `Aviso cliente — Ajuizado`.

## Passo 2 — Definir o gatilho (QUANDO)
- Evento: **mudança de etapa do processo**
- Condição: etapa passou a ser **AJUIZADO**
- (O Flowter aplica sozinho o delay de segurança de ~1 min antes de disparar.)

## Passo 3 — Ação: HTTP Request para o Z-API (O QUÊ)
Adicione a ação **HTTP Request** e preencha:

| Campo | Valor |
|-------|-------|
| Método | `POST` |
| URL | `https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text` |
| Header | `Client-Token: SEU_CLIENT_TOKEN` |
| Header | `Content-Type: application/json` |
| Body | *(JSON abaixo)* |

**Body:**
```json
{
  "phone": "{{telefone_do_cliente}}",
  "message": "{{cliente}}, seu processo foi protocolado na Justiça hoje ✅. A partir de agora acompanhamos cada movimentação e avisamos sempre que houver novidade relevante. Estamos com você nessa.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```
> Troque `{{telefone_do_cliente}}` e `{{cliente}}` pelas **variáveis do Flowter** correspondentes (telefone no formato `55` + DDD + número).

## Passo 4 — (Opcional) Ação: criar tarefa interna
- Título: `Confirmar comunicação de ajuizamento ao cliente`
- Responsável: **Cargo Atendimento (Bia)** · Prazo: mesmo dia

## Passo 5 — Salvar e ativar

---

## Passo 6 — TESTAR (não pule)
1. Cadastre um caso de teste com **o seu próprio número** no campo telefone.
2. Mova a etapa para **AJUIZADO**.
3. Aguarde ~1 min. Confira no WhatsApp:
   - [ ] A mensagem chegou pelo **número dedicado**
   - [ ] Os links `wa.me` e `instagram.com` estão **clicáveis**
   - [ ] O nome do cliente entrou certo (variável)

Se não chegou → ver "Se algo falhar" abaixo.

---

## Passo 7 — Replicar para os outros marcos
Mesma receita, trocando **etapa do gatilho** + **mensagem** (nº em `mensagens-zapi.md`):

| Fluxo | Gatilho (etapa) | Mensagem |
|-------|-----------------|----------|
| Boas-vindas | CONTRATO ASSINADO | 1 |
| Protocolo administrativo | PROTOCOLO ADM | 4 |
| **Ajuizado (piloto)** | **AJUIZADO** | **5** |
| Documento/exigência | EXIGÊNCIA ADM / EMENDA | 6 |
| Perícia D-15 / D-7 / D-2 | PERÍCIA DESIGNADA | 7 / 8 / 9 |
| Cobrança D+3 / D+5 | AGUARDANDO DOCS | 2 / 3 |
| Resultado (com autorização) | SENTENÇA | 10 |

As **tarefas internas** (não-mensagem) estão em `flowter-tarefas-internas.md`.

---

## Se algo falhar
- **Não dá pra editar o Body no HTTP Request?** É o "caso 2" — ponha um tradutor leve (n8n grátis/Make) entre o Flowter e o Z-API pra reformatar o JSON.
- **Mensagem não chega?** Confira: número no formato `55DDDNUMERO`, o `Client-Token` no header, e se a instância do Z-API está conectada (número não caiu).
- **Chegou sem o nome?** A variável do Flowter não está mapeada — confira o nome exato do campo.
- **Links não clicam?** Garanta que estão como URL completa (`https://...`), sem texto colado antes.
