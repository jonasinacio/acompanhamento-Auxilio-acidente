# Robô da Peça — "Totti" do escritório
**Gerador automático da petição inicial de auxílio-acidente · Jonas Inácio Advocacia**

Equivalente ao robô "Totti" do POP de referência, adaptado à nossa stack (ADVBOX + Google Drive + Gemini).
**Nunca protocola** — produz o rascunho e abre a revisão. Quem assina é o advogado.

---

## O que o robô faz (pipeline)
```
1. DETECTA   caso entra na etapa de elaboração judicial (após TRIAGEM → JUD)
2. LÊ        acha a pasta do cliente no Drive e valida o kit (gate da pasta)
3. EXTRAI    lê CNIS + laudos + provas (PDF/imagem) → fatos estruturados
4. REDIGE    monta a inicial: template + IA nos fatos e na fundamentação
5. VALIDA    gate: todos os documentos citados existem? números batem? sem lei "inventada"?
6. ENTREGA   salva o rascunho na pasta, cria/atualiza o processo no ADVBOX,
             abre a tarefa de revisão para a Natália e move a etapa
7. PARA      espera revisão humana — NÃO protocola
```

## Mapeamento com o "Totti" da referência
| Totti (referência) | Aqui (auxílio-acidente) |
|--------------------|-------------------------|
| Detecta card em Elaboração (Trello) | Detecta etapa de elaboração (ADVBOX) |
| Acha a pasta no Drive, valida o kit | Idem (pasta 01–07) |
| Cria processo no AdvBox | Cria/atualiza processo (API ADVBOX) |
| Monta a inicial (análise→organiza→redige→gate) | Idem, com Gemini + template |
| APTA → move card + abre revisão | Move etapa + abre tarefa p/ Natália |
| Nunca protocola | Nunca protocola |

---

## As 3 regras de segurança (inegociáveis)
1. **Não inventa direito.** A IA redige **fatos e estrutura**; leis, súmulas e teses vêm de uma **lista fixa** do escritório (biblioteca de fundamentos), nunca da "memória" do modelo.
2. **Gate antes de entregar.** Confere se cada documento citado existe na pasta, se os números (NB, DER, vínculos, valores) batem, e se não há campo em branco. Reprovou → volta como pendência, não como peça.
3. **Revisão humana obrigatória.** O robô entrega **rascunho**. Natália revisa, Jonas decide. Só então ajuíza.

## LGPD
Dados sensíveis do cliente vão para a IA. Usar a camada da API com **garantia de não-treino** (evitar o tier gratuito que pode reter dados). Registrar a base legal (execução do contrato).

---

## Realidade técnica — o que um robô de verdade exige
O app atual é **frontend** (Vite/React, chave Gemini no navegador). Um robô **autônomo** precisa rodar sozinho, num **backend**, com as chaves protegidas e acesso às APIs. Por isso o build é faseado:

### Fase 1 — O cérebro (dá pra começar já, no app)
- Botão **"Gerar rascunho da inicial"** na tela do processo.
- Advogado sobe CNIS/laudo → Gemini extrai + redige com o template → mostra o rascunho para editar/exportar.
- **Semi-robô** (a pessoa dispara), mas já economiza ~70% do tempo. Roda no app atual.

### Fase 2 — Integrações
- Ler a pasta do Drive automaticamente (API Drive).
- Criar processo + abrir tarefa de revisão no ADVBOX (API ADVBOX).

### Fase 3 — Autonomia (o "Totti" completo)
- Um **serviço backend** disparado pela mudança de etapa (webhook do ADVBOX/Flowter ou fila).
- Roda o pipeline inteiro sozinho e só chama o humano na revisão.
- Requer hospedagem + chaves server-side.

## O que eu preciso de você para o cérebro sair bom
1. **1 inicial de auxílio-acidente que você aprova** (pode anonimizar) → vira o molde.
2. Sua **lista de fundamentos** (leis, súmulas, teses que você usa) → a biblioteca fixa anti-alucinação.
3. Campos que faltam no cadastro (`Processo`): NB, DER, vínculos do CNIS, CID, DII.

## Onde encaixa na esteira
Entre **TRIAGEM (judicial)** e **AJUIZADO**. O robô entrega o rascunho → Natália revisa → ajuíza → status `AJUIZADO` dispara o WhatsApp de "processo protocolado".
