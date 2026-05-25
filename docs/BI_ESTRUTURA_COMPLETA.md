# BI Completo — Escritório de Advocacia Especializado em Auxílio-Acidente
**Versão:** 1.0 | **Data:** Maio/2025 | **Autor:** Jonas Inácio Advocacia

---

## 1. VISÃO GERAL DO BI

### Decisões gerenciais que este BI deve permitir

| Área | Decisão |
|---|---|
| **Comercial** | Quais canais geram os melhores leads com menor custo? Qual mês tem mais conversões? |
| **Jurídico** | Quais fases têm maior estoque de casos? Onde está o gargalo processual? |
| **Financeiro** | Qual é a receita futura realista com base no risco de cada fase? |
| **Controladoria** | Quais processos estão parados há mais de 60 dias? Quais prazos estão vencendo? |
| **Equipe** | Qual colaborador tem mais tarefas vencidas? A produtividade está dentro da meta? |
| **Atendimento** | Quais clientes estão em risco de churn? O NPS está caindo? |

---

## 2. ESTRUTURA DAS TABELAS — GOOGLE SHEETS

### ABA 1 — LEADS

**Objetivo:** Registrar todas as entradas no funil comercial, permitindo análise de captação e conversão.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Lead | Texto | L001 | Sim | Chave primária. Formato: L + 3 dígitos |
| Nome | Texto | Carlos Eduardo Mota | Sim | Nome completo do lead |
| Telefone | Texto | (11) 99871-2233 | Sim | Incluir DDD |
| Email | Texto | carlos@email.com | Não | Para follow-up digital |
| Canal | Lista | Google Ads | Sim | Google Ads / Facebook-Instagram / Indicação / Orgânico-SEO / WhatsApp / Parceiro / Outro |
| Data_Entrada | Data | 2025-05-20 | Sim | Formato YYYY-MM-DD |
| Data_Contato_Inicial | Data | 2025-05-20 | Não | Preencher quando fizer 1º contato |
| Horas_Ate_Contato | Número | 1.5 | Não | Calculado: (Data_Contato - Data_Entrada) × 24 |
| Status | Lista | Triagem | Sim | Novo / Contatado / Triagem / Documentação / Análise / Convertido / Perdido |
| Motivo_Perda | Texto | Sem viabilidade jurídica | Não | Obrigatório se Status = Perdido |
| Responsavel | Texto | Ana Souza | Sim | Colaborador responsável |
| Possui_CAT | Booleano | SIM | Não | Comunicação de Acidente de Trabalho |
| Possui_Auxilio_Doenca | Booleano | SIM | Não | Auxílio-doença anterior relacionado |
| Tipo_Sequela_Preliminar | Texto | Membro Superior | Não | Triagem inicial da sequela |
| ID_Cliente | Texto | C001 | Não | Preencher ao converter para cliente |
| Observacoes | Texto | Cliente com CAT emitida pelo empregador | Não | Notas livres |

---

### ABA 2 — CLIENTES

**Objetivo:** Cadastro completo dos clientes contratados, com dados jurídicos e de relacionamento.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Cliente | Texto | C001 | Sim | Chave primária |
| ID_Lead | Texto | L004 | Não | Referência ao lead de origem |
| Nome | Texto | Márcia Aparecida Teles | Sim | Nome completo (conforme documento) |
| CPF | Texto | ***.888.491-** | Sim | Mascarar para segurança (armazenar criptografado) |
| Data_Nascimento | Data | 1978-05-12 | Sim | |
| Telefone | Texto | (11) 96543-2109 | Sim | |
| Email | Texto | marcia@email.com | Não | |
| Cidade | Texto | São Paulo | Sim | |
| UF | Texto | SP | Sim | |
| Profissao | Texto | Operadora de Máquinas | Sim | Relevante para nexo causal |
| Empregador | Texto | Metalúrgica Boa Parte Ltda | Não | Nome da empresa do acidente |
| Data_Admissao | Data | 2010-03-01 | Não | Vínculo com empregador |
| Data_Demissao | Data | 2022-08-15 | Não | Se não está mais vinculado |
| Possui_CAT | Booleano | SIM | Sim | |
| Possui_Auxilio_Doenca | Booleano | NÃO | Sim | |
| Possui_Laudo_Medico | Booleano | SIM | Sim | Laudo particular |
| Data_Ultimo_Contato | Data | 2025-05-11 | Não | Atualizar a cada contato |
| Dias_Sem_Contato | Número | 12 | Não | =HOJE()-Data_Ultimo_Contato |
| Responsavel | Texto | Bruno Lima | Sim | |
| Data_Contratacao | Data | 2025-05-09 | Sim | Data da assinatura do contrato |
| Status_Relacionamento | Lista | Ativo | Sim | Ativo / Promotor / Em Risco / Inativo |
| Nota_Satisfacao | Número | 5 | Não | Escala 1–5 (NPS simplificado) |
| Qtd_Indicacoes | Número | 1 | Não | Quantidade de leads indicados por este cliente |
| Observacoes | Texto | | Não | |

---

### ABA 3 — CONTRATOS

**Objetivo:** Registrar os termos de honorários de cada contrato firmado.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Contrato | Texto | CT001 | Sim | |
| ID_Cliente | Texto | C001 | Sim | FK → CLIENTES |
| Numero_Contrato | Texto | CONT-2024-001 | Sim | |
| Data_Assinatura | Data | 2024-11-01 | Sim | |
| Tipo_Honorario | Lista | Êxito | Sim | Êxito / Misto / Fixo |
| Percentual_Exito | Número | 30 | Sim | Percentual sobre atrasados |
| Valor_Fixo | Número | 500 | Não | Para contratos mistos |
| Valor_Estimado_Causa | Número | 40000 | Sim | Estimativa do valor do benefício + atrasados |
| Valor_Estimado_Honorario | Número | 12000 | Não | Calculado: =Valor_Causa × Percentual/100 |
| Status | Lista | Ativo | Sim | Ativo / Encerrado / Suspenso |
| Observacoes | Texto | | Não | |

---

### ABA 4 — CASOS / PROCESSOS

**Objetivo:** Acompanhar o ciclo completo de cada caso, da abertura ao encerramento.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Caso | Texto | CA001 | Sim | |
| ID_Cliente | Texto | C003 | Sim | FK → CLIENTES |
| ID_Contrato | Texto | CT003 | Sim | FK → CONTRATOS |
| Numero_Processo | Texto | 5001234-45.2023.4.03.6100 | Não | Obrigatório se judicial |
| Tipo | Lista | Judicial | Sim | Administrativo / Judicial |
| Fase | Lista | Perícia Designada | Sim | Ver lista completa na seção 8 |
| Data_Abertura | Data | 2023-01-15 | Sim | |
| Data_Ultima_Movimentacao | Data | 2025-05-08 | Sim | Atualizar sempre |
| Dias_Sem_Movimentacao | Número | 15 | Não | =HOJE()-Data_Ultima_Movimentacao |
| Responsavel | Texto | Jonas Inácio | Sim | |
| Prioridade | Lista | Alta | Sim | Urgente / Alta / Média / Baixa |
| Pontuacao_Prioridade | Número | 82 | Não | Ver seção 9 (modelo de pontuação) |
| Valor_Causa | Número | 45000 | Sim | Estimativa do benefício + atrasados |
| Valor_Previsto_Honorario | Número | 13500 | Não | Calculado conforme contrato |
| Probabilidade_Exito | Número | 72 | Não | % estimado pela equipe jurídica |
| Receita_Futura_Ponderada | Número | 9720 | Não | =Honorario × Probabilidade/100 |
| Status | Lista | Ativo | Sim | Ativo / Suspenso / Encerrado / Arquivado |
| Resultado_Final | Lista | Procedente | Não | Procedente / Improcedente / Acordo / Desistência |
| Data_Pericia | Data | 2025-05-25 | Não | |
| Pericia_Realizada | Booleano | NÃO | Não | |
| Resultado_Pericia | Lista | Favorável | Não | Favorável / Desfavorável / Parcialmente Favorável |
| Data_Sentenca | Data | | Não | |
| Data_Transito_Julgado | Data | | Não | |
| Data_Implantacao | Data | | Não | |
| Valor_RPV | Número | | Não | Valor bruto da RPV/Precatório |
| Data_RPV | Data | | Não | |
| Valor_Honorarios_Recebidos | Número | | Não | |
| Observacoes | Texto | | Não | |

---

### ABA 5 — DADOS TÉCNICOS DO AUXÍLIO-ACIDENTE

**Objetivo:** Registrar as informações técnicas previdenciárias essenciais para análise de viabilidade e perícia.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_DadosTecnicos | Texto | DT001 | Sim | |
| ID_Cliente | Texto | C001 | Sim | FK → CLIENTES |
| ID_Caso | Texto | CA001 | Sim | FK → CASOS |
| Tipo_Sequela | Texto | Limitativa - Membro Superior | Sim | Descrição da sequela permanente |
| Membros_Afetados | Texto | Mão direita | Sim | |
| CID | Texto | M79.3 | Sim | Classificação Internacional de Doenças |
| Data_Acidente | Data | 2022-04-10 | Sim | |
| Local_Acidente | Lista | Ambiente de Trabalho | Sim | Ambiente de Trabalho / A Serviço / Trajeto |
| Possui_CAT | Booleano | SIM | Sim | |
| Numero_CAT_INSS | Texto | 12345678 | Não | Obrigatório se Possui_CAT = SIM |
| Data_CAT | Data | 2022-04-12 | Não | |
| Possui_Auxilio_Doenca_Anterior | Booleano | SIM | Sim | |
| Periodo_Auxilio_Doenca | Texto | 2022-04-10 a 2022-10-10 | Não | |
| Possui_Laudo_Medico | Booleano | SIM | Sim | |
| Medico_Responsavel | Texto | Dr. Paulo Mendes | Não | |
| Grau_Incapacidade | Lista | Parcial Permanente | Sim | Parcial Permanente / Total Permanente / Parcial Temporária |
| Reducao_Capacidade_Pct | Número | 40 | Sim | % de redução da capacidade laboral |
| Observacoes_Tecnicas | Texto | Nexo técnico confirmado em laudo particular | Não | |

---

### ABA 6 — TAREFAS E PRAZOS

**Objetivo:** Controlar todas as atividades processuais e administrativas com prazo e responsável.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Tarefa | Texto | T001 | Sim | |
| ID_Caso | Texto | CA001 | Não | FK → CASOS |
| ID_Cliente | Texto | C003 | Não | FK → CLIENTES |
| Titulo | Texto | Confirmar presença na perícia | Sim | |
| Tipo | Lista | Perícia | Sim | Prazo / Audiência / Documento / Contato / Petição / Perícia / Protocolo / Outro |
| Data_Vencimento | Data | 2025-05-24 | Sim | |
| Data_Conclusao | Data | | Não | Preencher ao concluir |
| Responsavel | Texto | Jonas Inácio | Sim | |
| Prioridade | Lista | Urgente | Sim | |
| Status | Lista | Pendente | Sim | Pendente / Em Andamento / Concluída / Vencida |
| Alerta_Dias_Antes | Número | 2 | Não | Quantos dias antes alertar |
| Nome_Cliente | Texto | João da Silva Santos | Não | Denormalizacao para facilitar leitura |
| Numero_Processo | Texto | 5001234-45.2023.4.03.6100 | Não | |
| Observacoes | Texto | | Não | |

---

### ABA 7 — EVENTOS PROCESSUAIS

**Objetivo:** Histórico cronológico de movimentações e eventos em cada caso.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Evento | Texto | EV001 | Sim | |
| ID_Caso | Texto | CA001 | Sim | FK → CASOS |
| Data | Data | 2025-05-10 | Sim | |
| Tipo | Texto | Laudo Pericial | Sim | |
| Descricao | Texto | Perícia realizada pelo Dr. Silva — resultado favorável | Sim | |
| Fase_Apos_Evento | Texto | Aguardando Laudo | Sim | Fase após este evento |
| Responsavel | Texto | Jonas Inácio | Sim | |
| Resultado | Texto | Favorável | Não | |
| Proximo_Passo | Texto | Aguardar laudo em 30 dias | Não | |
| Observacoes | Texto | | Não | |

---

### ABA 8 — FINANCEIRO (LANÇAMENTOS)

**Objetivo:** Controlar todas as receitas e despesas do escritório.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Lancamento | Texto | F001 | Sim | |
| ID_Caso | Texto | CA002 | Não | FK → CASOS |
| ID_Cliente | Texto | C004 | Sim | FK → CLIENTES |
| ID_Contrato | Texto | CT004 | Não | FK → CONTRATOS |
| Nome_Cliente | Texto | Maria Oliveira Ferreira | Sim | Denormalização |
| Tipo | Lista | Honorário Êxito | Sim | Honorário Êxito / Honorário Fixo / RPV / Custo Operacional / Custo Captação / Outros |
| Natureza | Lista | Receita | Sim | Receita / Despesa |
| Descricao | Texto | Honorários de êxito — RPV recebida | Sim | |
| Valor | Número | 8000 | Sim | Valor positivo sempre |
| Data_Vencimento | Data | 2025-05-15 | Sim | |
| Data_Pagamento | Data | 2025-05-20 | Não | Preencher ao pagar/receber |
| Status | Lista | Pago | Sim | Previsto / A Vencer / Pago / Vencido / Cancelado |
| Forma_Pagamento | Texto | PIX | Não | |
| Canal | Lista | Google Ads | Não | Apenas para despesas de captação |
| Observacoes | Texto | | Não | |

---

### ABA 9 — ATENDIMENTO AO CLIENTE

**Objetivo:** Registrar todos os contatos com clientes para controle de relacionamento e NPS.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Atendimento | Texto | AT001 | Sim | |
| ID_Cliente | Texto | C003 | Sim | FK → CLIENTES |
| ID_Caso | Texto | CA001 | Não | FK → CASOS |
| Nome_Cliente | Texto | João da Silva Santos | Sim | |
| Data | Data | 2025-05-10 | Sim | |
| Tipo | Lista | Telefone | Sim | Telefone / WhatsApp / Email / Presencial / Videoconferência |
| Assunto | Texto | Atualização sobre perícia | Sim | |
| Duracao_Min | Número | 10 | Não | Duração em minutos |
| Responsavel | Texto | Jonas Inácio | Sim | |
| Satisfacao | Número | 4 | Não | Nota 1–5 após atendimento |
| Reclamacao | Booleano | NÃO | Sim | |
| Follow_Up_Necessario | Booleano | SIM | Não | |
| Data_Follow_Up | Data | 2025-06-10 | Não | Preencher se Follow_Up = SIM |
| Observacoes | Texto | Cliente ansioso com demora | Não | |

---

### ABA 10 — EQUIPE

**Objetivo:** Registrar os colaboradores e acompanhar métricas de produtividade.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Colaborador | Texto | COL001 | Sim | |
| Nome | Texto | Jonas Inácio | Sim | |
| Cargo | Lista | Gestor | Sim | Gestor / Advogado Sênior / Advogado Pleno / Advogado Júnior / Estagiário / Administrativo |
| OAB | Texto | SP 123456 | Não | Obrigatório para advogados |
| Email | Texto | jonas@advocacia.com | Sim | |
| Telefone | Texto | (11) 99999-0001 | Não | |
| Casos_Ativos | Número | 3 | Não | Calculado via COUNTIF |
| Meta_Casos_Mes | Número | 5 | Não | Meta de produção mensal |
| Data_Ingresso | Data | 2018-03-01 | Sim | |
| Status | Lista | Ativo | Sim | Ativo / Inativo / Férias |

---

### ABA 11 — CANAIS DE MARKETING

**Objetivo:** Acompanhar o desempenho e custo de cada canal de captação mensalmente.

| Coluna | Tipo | Exemplo | Obrigatório | Observação |
|---|---|---|---|---|
| ID_Canal | Texto | CM001 | Sim | |
| Nome | Lista | Google Ads | Sim | |
| Mes_Ano | Texto | 2025-05 | Sim | Formato YYYY-MM |
| Custo_Mes | Número | 3200 | Sim | Valor total investido |
| Leads_Gerados | Número | 18 | Sim | Leads atribuídos ao canal no mês |
| Conversoes | Número | 4 | Sim | Contratos fechados via esse canal |
| Taxa_Conversao | Número | 22.2 | Não | =Conversoes/Leads_Gerados×100 |
| CPL | Número | 177.78 | Não | =Custo_Mes/Leads_Gerados |
| CPA | Número | 800 | Não | =Custo_Mes/Conversoes (∞ se Conversoes=0) |

---

## 3. RELACIONAMENTO ENTRE TABELAS

```
CANAIS_MARKETING
       │
       ▼ (canal_origem)
     LEADS ──────────────────→ ID_Lead
       │ (convertido)
       ▼
   CLIENTES ──────────────────→ ID_Cliente
       │                              │
       ▼                              ▼
  CONTRATOS ──────────────→ ID_Contrato
       │                              │
       ▼                              ▼
     CASOS ──────────────────→ ID_Caso
       │                    │         │
       ▼                    ▼         ▼
  TAREFAS           EVENTOS       FINANCEIRO
                   PROCESSUAIS
       │
       ▼
  DADOS_TECNICOS
  (1 por caso)

EQUIPE ──→ responsavel em LEADS, CASOS, TAREFAS, ATENDIMENTO
ATENDIMENTO ──→ ID_Cliente (FK) + ID_Caso (FK opcional)
```

### IDs de relacionamento

| ID | Tabela origem | Usado em |
|---|---|---|
| ID_Lead | LEADS | CLIENTES.ID_Lead |
| ID_Cliente | CLIENTES | CONTRATOS, CASOS, ATENDIMENTO, FINANCEIRO, DADOS_TECNICOS |
| ID_Contrato | CONTRATOS | CASOS.ID_Contrato, FINANCEIRO.ID_Contrato |
| ID_Caso | CASOS | TAREFAS, EVENTOS, FINANCEIRO, DADOS_TECNICOS |
| ID_Tarefa | TAREFAS | (referência interna) |
| ID_Lancamento | FINANCEIRO | (referência interna) |

---

## 4. INDICADORES-CHAVE DO BI (KPIs)

### 4.1 KPIs Comerciais

| KPI | Definição | Meta Referência |
|---|---|---|
| Leads Recebidos/Mês | Total de entradas no funil | ≥ 30/mês |
| Leads por Canal | Distribuição por origem | Monitorar concentração |
| Taxa de Conversão Lead→Contrato | Contratos / Leads × 100 | ≥ 20% |
| Custo por Lead (CPL) | Investimento / Leads | < R$ 200 |
| Custo por Aquisição (CPA) | Investimento / Contratos | < R$ 1.000 |
| Tempo Médio até 1º Contato | Média de horas até contato | < 2 horas |
| Contratos Fechados/Mês | Total de novos contratos | Definir meta |
| Ticket Médio Contratado | Honorários estimados / Contratos | > R$ 10.000 |
| Motivos de Perda | Ranking de causas de perda | Monitorar |

### 4.2 KPIs Jurídicos

| KPI | Definição | Meta Referência |
|---|---|---|
| Casos Ativos | Total em andamento | Capacidade da equipe |
| Casos por Fase | Estoque por fase processual | Identificar gargalos |
| Taxa de Viabilidade | Casos aprovados / Triagens × 100 | ≥ 60% |
| Casos com CAT | % dos casos com CAT | Monitorar |
| Taxa de Judicialização | Casos judiciais / Total × 100 | Variável |
| Taxa de Perícia Favorável | Perícias fav. / Total perícias × 100 | ≥ 70% |
| Taxa de Sentença Procedente | Procedentes / Sentenças × 100 | ≥ 75% |
| Taxa de Êxito Geral | Casos com sucesso / Encerrados × 100 | ≥ 70% |
| Valor Médio de Atrasados | Média do valor dos benefícios retroativos | Monitorar |
| Tempo Médio até Perícia | Média de dias da distribuição à perícia | < 180 dias |
| Tempo Médio até Sentença | Média de dias até sentença | < 365 dias |
| Tempo Médio até Implantação | Após sentença até benefício ativo | < 90 dias |

### 4.3 KPIs de Controladoria

| KPI | Definição | Alerta |
|---|---|---|
| Tarefas Vencidas | Tarefas com data < hoje e não concluídas | > 0 = crítico |
| Tarefas por Responsável | Distribuição de carga por colaborador | > 10 pendentes |
| Processos parados +30 dias | Status ativo + dias_sem_movimentacao ≥ 30 | > 5 = alerta |
| Processos parados +60 dias | Status ativo + dias_sem_movimentacao ≥ 60 | > 0 = crítico |
| Processos parados +90 dias | Status ativo + dias_sem_movimentacao ≥ 90 | Urgente |
| Prazos críticos 7 dias | Tarefas com vencimento em ≤ 7 dias | Monitorar diário |
| Tempo Médio por Fase | Média de dias em cada fase | Identificar gargalos |
| Produtividade por Colaborador | Tarefas concluídas / Tarefas totais × 100 | < 70% = atenção |

### 4.4 KPIs Financeiros

| KPI | Fórmula | Interpretação |
|---|---|---|
| Honorários Contratados | SOMA(Contratos.Valor_Estimado_Honorario) | Potencial total |
| Honorários Recebidos | SOMA(Financeiro onde Pago e Receita) | Caixa realizado |
| Honorários a Receber | Contratados - Recebidos | Pipeline financeiro |
| Receita Futura Ponderada | SOMA(Honorarios × Probabilidade_Fase) | Forecast realista |
| CAC | Total_Investimento_Captacao / Novos_Clientes | < R$ 1.000 ideal |
| Inadimplência | Lançamentos Vencidos / A Receber × 100 | < 10% |
| Resultado Líquido | Receita_Realizada - Despesas_Pagas | Positivo = saudável |
| Margem Operacional | Resultado / Receita × 100 | > 40% |

### 4.5 KPIs de Atendimento

| KPI | Definição | Meta |
|---|---|---|
| Clientes sem contato +30 dias | Clientes.Dias_Sem_Contato ≥ 30 | 0 |
| Clientes sem contato +60 dias | Clientes.Dias_Sem_Contato ≥ 60 | 0 |
| NPS Médio | MÉDIA(Atendimento.Satisfacao) | ≥ 4/5 |
| Reclamações | COUNT(Atendimento.Reclamacao = SIM) | 0 |
| Indicações Recebidas | SOMA(Clientes.Qtd_Indicacoes) | Crescente |
| Índice de Promotores | Clientes com Nota 5 / Total × 100 | ≥ 50% |

---

## 5. FÓRMULAS E REGRAS DE CÁLCULO

### 5.1 Comercial

```
Taxa de Conversão (%)
  = COUNTIF(Leads!Status,"Convertido") / COUNTA(Leads!ID_Lead) × 100
  Sheets: =COUNTIF(B2:B100,"Convertido")/COUNTA(A2:A100)*100

Tempo Médio até 1º Contato (horas)
  = (Data_Contato_Inicial - Data_Entrada) × 24
  Sheets: =(C2-B2)*24  [onde B=Data_Entrada, C=Data_Contato_Inicial]
  Alerta: >2 horas = crítico para leads quentes

CPL (Custo por Lead)
  = Custo_Mes_Canal / Leads_Gerados_Canal
  Sheets: =Canais!D2/Canais!E2

Taxa de Conversão por Canal
  = COUNTIFS(Leads!Canal,"Google Ads",Leads!Status,"Convertido") / COUNTIF(Leads!Canal,"Google Ads") × 100
```

### 5.2 Jurídico

```
Dias sem Movimentação
  = HOJE() - Data_Ultima_Movimentacao
  Sheets: =TODAY()-D2  [D = Data_Ultima_Movimentacao]

Probabilidade de Êxito por Fase
  Atribuída manualmente ou via tabela PROBABILIDADE_FASE (ver seção 10)

Tempo Médio até Perícia
  = AVERAGEIFS(Casos!Data_Pericia,Casos!Pericita_Realizada,"SIM") - AVERAGEIF(Casos!Data_Abertura)
  Interpretação: quanto menor, mais eficiente é o fluxo

Taxa de Êxito
  = COUNTIF(Casos!Resultado_Final,"Procedente") / COUNTIFS(Casos!Status,"Encerrado") × 100
```

### 5.3 Financeiro

```
Honorários a Receber
  = SUMIFS(Financeiro!Valor, Financeiro!Natureza,"Receita", Financeiro!Status,"<>Pago", Financeiro!Status,"<>Cancelado")

Receita Futura Ponderada
  = SUMPRODUCT(Casos!Valor_Previsto_Honorario × VLOOKUP(Casos!Fase, TabelaProbabilidade, 2, 0))
  Interpretação: expectativa financeira ajustada pelo risco de cada fase

Resultado Líquido do Período
  = SUMIFS(Financeiro!Valor,Natureza,"Receita",Status,"Pago") 
    - SUMIFS(Financeiro!Valor,Natureza,"Despesa",Status,"Pago")

Inadimplência (%)
  = SUMIFS(Financeiro!Valor,Status,"Vencido") 
    / SUMIFS(Financeiro!Valor,Natureza,"Receita") × 100

CAC (Custo de Aquisição por Cliente)
  = SUMIFS(Financeiro!Valor,Tipo,"Custo Captação",Mes,MesAtual) 
    / COUNTIFS(Clientes!Data_Contratacao,">="&InicioMes,Data_Contratacao,"<="&FimMes)
```

### 5.4 Controladoria

```
Tarefas Vencidas por Responsável
  = COUNTIFS(Tarefas!Status,"Vencida",Tarefas!Responsavel,"Jonas Inácio")

Processos parados há X dias
  = COUNTIFS(Casos!Dias_Sem_Movimentacao,">="&60,Casos!Status,"Ativo")

Pontuação de Prioridade (ver seção 9)
  = SUM de critérios ponderados (financeiro, urgência, prova, fase, etc.)
```

---

## 6. PAINÉIS DO LOOKER STUDIO

### Painel 1 — EXECUTIVO

**Objetivo:** Visão consolidada para o gestor tomar decisões estratégicas diárias.

**KPIs principais:**
- Total de processos ativos
- Receita realizada vs. prevista
- Leads no funil (funil visual)
- Taxa de êxito acumulada
- Tarefas vencidas (contador + alerta)
- Receita futura ponderada

**Gráficos:**
- Scorecard: leads, contratos, casos ativos, receita, NPS
- Gráfico de barras: conversão mensal (leads → contratos)
- Gráfico de rosca: casos por fase
- Linha temporal: receita realizada por mês (últimos 12 meses)
- Tabela: alertas críticos (tarefas vencidas, processos parados, clientes em risco)

**Filtros:** Período (mês/ano), Responsável

**Alertas:** Tarefas vencidas > 0, Processos +60 dias > 0, NPS < 3

---

### Painel 2 — COMERCIAL

**Objetivo:** Avaliar a eficiência da captação e do funil de vendas.

**KPIs principais:**
- Leads por canal (ranking)
- Taxa de conversão por canal
- CPL e CPA por canal
- Tempo médio até 1º contato
- Motivos de perda

**Gráficos:**
- Funil visual: Novo → Contatado → Triagem → Documentação → Análise → Convertido
- Gráfico de barras horizontais: leads por canal
- Scorecard: melhor canal, pior canal, taxa global de conversão
- Tabela: todos os leads ativos com status e responsável
- Gráfico de pizza: motivos de perda

**Filtros:** Canal, Responsável, Período

**Alertas:** Lead sem 1º contato > 2 horas, Taxa de conversão < 15%

---

### Painel 3 — JURÍDICO PREVIDENCIÁRIO

**Objetivo:** Acompanhar o pipeline processual e indicadores de êxito.

**KPIs principais:**
- Casos por fase (funil processual)
- Taxa de perícia favorável
- Taxa de sentença procedente
- Taxa de êxito geral
- Tempo médio por fase

**Gráficos:**
- Gráfico de barras: casos por fase (administrativo + judicial separado)
- Scorecard: CAT (%), Auxílio-Doença anterior (%), Laudo médico (%)
- Mapa de calor: casos × fase × responsável
- Gráfico de dispersão: tempo na fase × resultado
- Tabela: casos com laudo desfavorável recente (alerta imediato)

**Filtros:** Tipo (Adm/Jud), Fase, Responsável, Período, Prioridade

**Alertas:** Perícia próxima 15 dias, Laudo desfavorável, Sem movimentação 60 dias

---

### Painel 4 — CONTROLADORIA

**Objetivo:** Garantir que nenhum prazo, tarefa ou processo seja negligenciado.

**KPIs principais:**
- Tarefas vencidas por responsável
- Processos parados +30/60/90 dias
- Prazos críticos 7 dias
- Produtividade da equipe

**Gráficos:**
- Tabela: todas as tarefas vencidas com responsável e caso vinculado
- Gráfico de barras: tarefas por responsável (concluídas vs. pendentes vs. vencidas)
- Timeline: prazos dos próximos 30 dias
- Scorecard: total vencidas, total urgentes, processos parados
- Gráfico de calor: responsável × tipo de tarefa

**Filtros:** Responsável, Tipo de Tarefa, Período, Prioridade

**Alertas:** Qualquer tarefa vencida = vermelho, Prazo < 3 dias = laranja

---

### Painel 5 — FINANCEIRO

**Objetivo:** Controlar a saúde financeira do escritório e prever receitas futuras.

**KPIs principais:**
- Resultado líquido do mês
- Honorários recebidos vs. a receber
- Receita futura ponderada por fase
- CAC (custo de aquisição por cliente)
- Inadimplência (%)

**Gráficos:**
- Gráfico de barras empilhadas: receitas vs. despesas por mês (últimos 12 meses)
- Scorecard: honorários recebidos, a receber, RPVs, resultado
- Tabela: forecast por fase (valor estimado × probabilidade × valor ponderado)
- Gráfico de barras: composição das despesas por tipo
- Gráfico de rosca: receitas por tipo (Êxito, Fixo, RPV)

**Filtros:** Período, Tipo de Lançamento, Responsável

**Alertas:** Honorário vencido, RPV recebida sem cobrança, Resultado negativo

---

### Painel 6 — ATENDIMENTO AO CLIENTE

**Objetivo:** Monitorar a qualidade do relacionamento e prevenir perdas de clientes.

**KPIs principais:**
- NPS médio
- Clientes sem contato +30 dias (lista)
- Reclamações abertas
- Indicações geradas
- Promotores vs. detratores

**Gráficos:**
- Tabela: clientes ordenados por dias sem contato (destaque >30 dias)
- Gráfico de barras: distribuição de notas NPS (1 a 5)
- Scorecard: total atendimentos, reclamações, indicações, NPS médio
- Ranking: clientes que mais indicaram (promotores)
- Gráfico de linha: evolução do NPS médio por mês

**Filtros:** Responsável, Período, Tipo de Atendimento, Status Relacionamento

**Alertas:** Cliente sem contato >30 dias = alerta, >60 dias = crítico, Reclamação = imediato

---

### Painel 7 — PRODUTIVIDADE DA EQUIPE

**Objetivo:** Avaliar a carga de trabalho, produtividade e distribuição de responsabilidades.

**KPIs principais:**
- Casos ativos por colaborador
- Tarefas concluídas vs. pendentes por colaborador
- Taxa de produtividade (concluídas / total × 100)
- Comparativo com meta

**Gráficos:**
- Gráfico de barras horizontais: casos ativos por colaborador (linha de meta)
- Gráfico de barras empilhadas: tarefas por colaborador (concluídas/pendentes/vencidas)
- Scorecard por colaborador: produtividade (%), casos ativos, tarefas vencidas
- Tabela: lista detalhada de tarefas por responsável

**Filtros:** Colaborador, Período, Tipo de Tarefa

**Alertas:** Tarefas vencidas por colaborador > 3, Produtividade < 70%

---

## 7. REGRAS DE ALERTA

### Alertas por Formatação Condicional no Google Sheets

```
Tabela LEADS — Sem 1º contato > 2 horas
Coluna: Horas_Ate_Contato
Regra: Se Status="Novo" E Data_Contato_Inicial="" E (HOJE()-Data_Entrada)*24>2
Cor: Vermelho (#FF0000)
Fórmula: =E(B2="Novo",C2="",D2="",(HOJE()-A2)*24>2)

Tabela LEADS — Documento pendente > 7 dias
Coluna: Status
Regra: Se Status="Documentação" E (HOJE()-Data_Entrada)>7
Cor: Laranja (#FF6600)
Fórmula: =E(B2="Documentação",(HOJE()-A2)>7)

Tabela CLIENTES — Sem atualização > 30 dias
Coluna: Dias_Sem_Contato
Regra: >30
Cor: Laranja, >60 = Vermelho
Fórmula linha: =E(H2<>"",H2>30)

Tabela CASOS — Sem movimentação > 60 dias
Coluna: Dias_Sem_Movimentacao
Regra: >30 amarelo, >60 laranja, >90 vermelho
Fórmula: =E(Status="Ativo",Dias_Sem_Movimentacao>=60)

Tabela TAREFAS — Tarefa vencida
Coluna: Data_Vencimento
Regra: Se Status<>"Concluída" E Data_Vencimento<HOJE()
Cor: Vermelho
Fórmula: =E(E2<>"Concluída",D2<HOJE())

Tabela CASOS — Perícia próxima 15 dias
Coluna: Data_Pericia
Regra: Se Pericia_Realizada=FALSO E (Data_Pericia-HOJE())<=15 E >0
Cor: Amarelo/Âmbar
Fórmula: =E(G2=FALSO,(F2-HOJE())<=15,(F2-HOJE())>=0)

Tabela FINANCEIRO — Honorário vencido
Coluna: Status
Regra: Natureza="Receita" E Status="Vencido"
Cor: Vermelho
```

### Automações via Google Apps Script

```javascript
// Script: Alerta Diário por Email (executar com trigger "A cada dia")
function alertaDiario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoje = new Date();
  const alertas = [];

  // Leads sem contato (> 2h)
  const leads = ss.getSheetByName('LEADS').getDataRange().getValues();
  leads.slice(1).forEach(row => {
    const status = row[6]; // Status
    const dtContato = row[8]; // Data_Contato_Inicial
    const dtEntrada = row[5]; // Data_Entrada
    if (status === 'Novo' && !dtContato) {
      const horasPassadas = (hoje - dtEntrada) / (1000 * 60 * 60);
      if (horasPassadas > 2) {
        alertas.push(`⚠️ LEAD sem contato há ${horasPassadas.toFixed(1)}h: ${row[1]}`);
      }
    }
  });

  // Tarefas vencidas
  const tarefas = ss.getSheetByName('TAREFAS').getDataRange().getValues();
  tarefas.slice(1).forEach(row => {
    const status = row[9]; // Status
    const dtVenc = row[4]; // Data_Vencimento
    if (status !== 'Concluída' && dtVenc < hoje) {
      alertas.push(`🔴 TAREFA VENCIDA: ${row[3]} — ${row[7]}`);
    }
  });

  // Processos parados > 60 dias
  const casos = ss.getSheetByName('CASOS').getDataRange().getValues();
  casos.slice(1).forEach(row => {
    const statusCaso = row[14]; // Status
    const diasParado = row[9]; // Dias_Sem_Movimentacao
    if (statusCaso === 'Ativo' && diasParado >= 60) {
      alertas.push(`⚫ PROCESSO PARADO ${diasParado} dias: ${row[3] || row[0]}`);
    }
  });

  // Perícias em até 15 dias
  casos.slice(1).forEach(row => {
    const dtPericia = row[16]; // Data_Pericia
    const periciaFeita = row[17]; // Pericia_Realizada
    if (dtPericia && !periciaFeita) {
      const diffDias = Math.ceil((new Date(dtPericia) - hoje) / (1000 * 60 * 60 * 24));
      if (diffDias >= 0 && diffDias <= 15) {
        alertas.push(`🩺 PERÍCIA em ${diffDias} dias: ${row[3] || row[0]}`);
      }
    }
  });

  // Clientes sem contato > 30 dias
  const clientes = ss.getSheetByName('CLIENTES').getDataRange().getValues();
  clientes.slice(1).forEach(row => {
    const diasSemContato = row[16]; // Dias_Sem_Contato
    if (diasSemContato >= 30) {
      alertas.push(`📵 CLIENTE sem contato há ${diasSemContato} dias: ${row[2]}`);
    }
  });

  if (alertas.length > 0) {
    const corpo = `Bom dia!\n\nAlerta automático do BI — ${hoje.toLocaleDateString('pt-BR')}\n\n` 
                  + alertas.join('\n') + '\n\nAcesse o sistema para tomar as providências.';
    MailApp.sendEmail('jonas@advocacia.com', `🚨 BI Jurídico — ${alertas.length} alerta(s) crítico(s)`, corpo);
  }
}

// Script: Atualizar Dias_Sem_Contato automaticamente
function atualizarDiasSemContato() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CLIENTES');
  const dados = sheet.getDataRange().getValues();
  const hoje = new Date();
  dados.slice(1).forEach((row, i) => {
    const dtContato = row[15]; // Data_Ultimo_Contato (col P)
    if (dtContato) {
      const dias = Math.floor((hoje - new Date(dtContato)) / (1000 * 60 * 60 * 24));
      sheet.getRange(i + 2, 17).setValue(dias); // col Q = Dias_Sem_Contato
    }
  });
}

// Script: Calcular Receita Futura Ponderada automaticamente
function atualizarReceitaFutura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const casos = ss.getSheetByName('CASOS');
  const probPorFase = {
    'Triagem': 0.10, 'Perícia Designada': 0.55, 'Perícia Realizada': 0.60,
    'Manifestação sobre Laudo': 0.70, 'Sentença': 0.72, 'Trânsito em Julgado': 1.00,
    'RPV/Precatório': 1.00, 'Encerrado': 1.00 // adicionar todas as fases
  };
  const dados = casos.getDataRange().getValues();
  dados.slice(1).forEach((row, i) => {
    const fase = row[5]; // Fase
    const honorarioEstimado = row[13]; // Valor_Previsto_Honorario
    const prob = probPorFase[fase] || 0.30;
    const ponderado = honorarioEstimado * prob;
    casos.getRange(i + 2, 16).setValue(ponderado); // col P = Receita_Futura_Ponderada
  });
}
```

---

## 8. FASES PROCESSUAIS PADRONIZADAS

### Fase Administrativa

| # | Fase | Próxima ação típica |
|---|---|---|
| 1 | Triagem | Solicitar documentos |
| 2 | Documentação Pendente | Cobrar documentos |
| 3 | Análise Técnica | Elaborar parecer de viabilidade |
| 4 | Requerimento Administrativo | Protocolar no INSS |
| 5 | Aguardando Análise INSS | Monitorar prazo legal (45 dias) |
| 6 | Exigência | Responder exigência |
| 7 | Recurso Administrativo | Elaborar recurso |
| 8 | Deferido | ✅ Cobrar honorários |
| 9 | Indeferido | Avaliar judicialização |
| 10 | Encaminhado para Judicial | Abrir caso judicial |

### Fase Judicial

| # | Fase | Próxima ação típica |
|---|---|---|
| 1 | Inicial em Elaboração | Concluir petição inicial |
| 2 | Distribuído | Aguardar citação |
| 3 | Aguardando Citação | Monitorar prazo |
| 4 | Contestação | Monitorar contestação |
| 5 | Réplica | Elaborar réplica |
| 6 | Perícia Designada | 🔔 Preparar cliente para perícia |
| 7 | Perícia Realizada | Aguardar laudo |
| 8 | Aguardando Laudo | Monitorar (prazo máximo 30 dias) |
| 9 | Manifestação sobre Laudo | Elaborar manifestação |
| 10 | Sentença | Avaliar recurso ou aguardar trânsito |
| 11 | Recurso | Elaborar razões recursais |
| 12 | Trânsito em Julgado | Iniciar implantação |
| 13 | Implantação | Monitorar ativação do benefício |
| 14 | RPV/Precatório | 💰 Cobrar honorários |
| 15 | Honorários Cobrados | Confirmar pagamento |
| 16 | Encerrado | Arquivar processo |

---

## 9. MODELO DE PONTUAÇÃO / PRIORIZAÇÃO DE CASOS

### Critérios e Pesos

| Critério | Peso | Escala | Como calcular |
|---|---|---|---|
| **Potencial Financeiro** | 25 pts | 0–25 | Valor_Causa/1000 (máx 25) |
| **Probabilidade de Êxito** | 20 pts | 0–20 | Probabilidade_Exito/5 |
| **Urgência Processual** | 20 pts | 0–20 | Perícia próxima=20, Prazo crítico=15, Normal=5 |
| **Tempo Parado** | 15 pts | 0–15 | 0–30 dias=15, 31–60=8, >60=0 (inverso) |
| **Qualidade da Prova** | 10 pts | 0–10 | CAT+Laudo+AD anterior=10, 2=7, 1=4, 0=0 |
| **Fase Processual** | 5 pts | 0–5 | Laudo fav=5, Pós-sentença=5, Pré-perícia=2 |
| **Risco de Insatisfação** | 5 pts | 0–5 | Dias_Sem_Contato>30=5, 15–30=3, <15=0 |

**Pontuação Total Máxima: 100 pontos**

### Classificação de Prioridade

| Pontuação | Prioridade | Ação recomendada |
|---|---|---|
| 80–100 | 🔴 Urgente | Atenção imediata, revisão diária |
| 60–79 | 🟠 Alta | Revisão semanal, não pode esperar |
| 40–59 | 🟡 Média | Revisão quinzenal |
| 0–39 | 🟢 Baixa | Revisão mensal |

### Fórmula Google Sheets

```
=MIN(25, B2/1000) + MIN(20, C2/5) + 
 IF(D2<=7, 20, IF(D2<=30, 10, 5)) + 
 MAX(0, 15 - E2/5) + 
 (F2*3 + G2*4 + H2*3) + 
 VLOOKUP(I2, TabelaFase, 2, 0) + 
 IF(J2>=30, 5, IF(J2>=15, 3, 0))
```

---

## 10. RECEITA FUTURA ESTIMADA (FORECAST)

### Metodologia

**Fórmula:**  
`Receita Futura Ponderada = Honorários Estimados × Probabilidade de Êxito da Fase`

### Tabela de Probabilidades por Fase

| Fase | Prob. Êxito | Justificativa |
|---|---|---|
| Triagem / Novo lead | 10% | Alta incerteza, sem documentos |
| Documentação em análise | 15% | Viabilidade ainda incerta |
| Análise Técnica concluída | 20% | Viabilidade confirmada internamente |
| Requerimento INSS protocolado | 25% | Chance de deferimento administrativo |
| Triagem jurídica aprovada | 30% | Caso viável, pronto para judicializar |
| Processo ajuizado (distribuído) | 40% | Ação em curso |
| Contestação / Réplica | 45% | Fase probatória sem perícia |
| Perícia designada | 55% | Juiz considerou necessária a perícia |
| Perícia realizada | 60% | Perícia ocorreu (resultado ainda incerto) |
| Laudo pericial favorável | 70% | Prova técnica positiva |
| Manifestação sobre laudo (fav.) | 75% | Consolidação da prova |
| Sentença procedente | 85% | Ganho de 1ª instância |
| Trânsito em julgado | 95% | Sem mais recursos ordinários |
| RPV expedida | 100% | Pagamento garantido |
| Benefício implantado | 100% | Caso ganho, direito assegurado |

### Exemplo de cálculo

```
Caso: Ricardo Pereira Lima
Fase: Manifestação sobre Laudo
Honorários estimados: R$ 17.400
Probabilidade: 75%

Receita Futura Ponderada = R$ 17.400 × 0,75 = R$ 13.050

Interpretação: Considerando todos os casos na carteira ativa com seus 
respectivos pesos, o Forecast Total representa a receita esperada de 
forma realista, descontando o risco de insucesso.
```

### Fórmula no Google Sheets

```
=SUMPRODUCT(
  (Casos!Valor_Previsto_Honorario) * 
  IFERROR(VLOOKUP(Casos!Fase, TabelaProbabilidades, 2, FALSE), 0.30)
)
```

---

## 11. MODELO MÍNIMO VIÁVEL (30 DIAS)

### Etapa 1 (Semana 1–2): Criar o alicerce

**Abas indispensáveis:**
1. LEADS (campos: ID, Nome, Telefone, Canal, Data_Entrada, Status, Responsável)
2. CLIENTES (campos: ID, Nome, CPF, Telefone, Data_Contratacao, Responsavel, Data_Ultimo_Contato)
3. CASOS (campos: ID, ID_Cliente, Numero, Fase, Data_Abertura, Data_Ultima_Movimentacao, Responsavel, Valor_Causa)
4. TAREFAS (campos: ID, ID_Caso, Titulo, Data_Vencimento, Responsavel, Status)

**Campos indispensáveis para começar:**
- Fase do processo (sem isso, não há controladoria)
- Data da última movimentação (gera o alerta de processos parados)
- Data do último contato com cliente (gera o alerta de relacionamento)
- Canal de origem do lead (sem isso, não há análise de captação)

**Indicadores para acompanhar primeiro (semana 1):**
1. Total de processos por fase
2. Tarefas vencidas
3. Clientes sem contato > 30 dias
4. Leads por canal (últimos 30 dias)

### Etapa 2 (Semana 3): Financeiro básico

5. FINANCEIRO (campos: ID, ID_Cliente, Tipo, Natureza, Valor, Data_Vencimento, Status)

**Indicadores:**
5. Honorários previstos vs. recebidos
6. Resultado do mês (receita - despesa)

### Etapa 3 (Semana 4): Dashboards e automações

- Criar 1 painel no Looker Studio conectado ao Google Sheets
- Configurar formatação condicional para alertas
- Implementar o script de alerta diário por e-mail

**Primeiro painel a criar:**
→ **Painel de Controladoria** (tarefas vencidas + processos parados + alertas)
→ Esse painel gera valor imediato e mais impacto na operação diária

### Erros críticos a evitar

| Erro | Por que é grave | Como evitar |
|---|---|---|
| Não padronizar status e fases | Impossibilita filtros e KPIs | Usar lista suspensa obrigatória |
| Não preencher data da última movimentação | Mata o alerta de processos parados | Tornar campo obrigatório |
| Misturar R$ previsto com R$ real | Distorce o financeiro | Separar Previsto / Pago em status |
| Não registrar o canal de origem | Perde análise de ROI de captação | Obrigatório no lead |
| Criar dashboards sem dado limpo | Visualização bonita mas inútil | Qualidade do dado > design |
| Montar tudo de uma vez | Causa paralisia e abandono | MVP primeiro, complexidade depois |

---

## 12. RECOMENDAÇÕES PRÁTICAS DE GESTÃO

### Rituais gerenciais com o BI

| Frequência | Ritual | KPIs revisados |
|---|---|---|
| **Diário (5 min)** | Checar alertas automáticos | Tarefas vencidas, perícias, 1º contato |
| **Semanal (30 min)** | Reunião com equipe | Processos parados, produtividade, leads |
| **Quinzenal (1h)** | Revisão de carteira | Casos por fase, prioridades, NPS |
| **Mensal (2h)** | Fechamento gerencial | Receita, CAC, taxa de êxito, forecast |
| **Trimestral (3h)** | Revisão estratégica | Crescimento, canais, equipe, metas |

### Governança dos dados

- Nomear **1 responsável** por cada aba (quem preenche e quem revisa)
- Usar **validação de dados** em todas as colunas de lista (Dados > Validação)
- **Bloquear células de fórmula** para evitar sobrescrição acidental
- Fazer **backup semanal** do Google Sheets (Download como .xlsx)
- Definir **SLA de atualização**: cada campo deve ser atualizado em até 24h após o evento

### Próximos passos após o MVP

1. **Integração com sistema jurídico** (Projuris, Thompsons): importar movimentações automaticamente
2. **CRM dedicado** (Salesforce, Pipedrive, ou solução nacional): migrar o módulo de leads
3. **Assinatura digital** integrada ao contrato → preenche automaticamente CLIENTES e CONTRATOS
4. **Portal do cliente**: cliente acessa status do próprio processo (reduz volume de contatos)
5. **Machine Learning de prioridade**: modelo treinado com dados históricos substituindo a pontuação manual
