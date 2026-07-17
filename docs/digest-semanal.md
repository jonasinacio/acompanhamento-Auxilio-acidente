# Digest semanal automático
**Esteira Previdenciária · Jonas Inácio Advocacia**

Um resumo da carteira que chega **toda segunda de manhã**: perícias e prazos dos próximos 7 dias,
casos parados e distribuição por status.

## Como funciona
```
data/casos.csv  →  scripts/gerar-digest.mjs  →  docs/digest-latest.md (+ entregue a você)
```
- **`data/casos.csv`** — a fonte de dados. Colunas: `numero, cliente, status, ultimaMovimentacao, valorPrevisto, dataPrevista, dataPericia, periciaRealizada, tipoSequela`. Datas em `AAAA-MM-DD`.
- **`scripts/gerar-digest.mjs`** — lê o CSV e gera o digest. Rodar na mão: `node scripts/gerar-digest.mjs`
- **`services/digestService.ts`** — a mesma lógica em TypeScript, para o app usar num botão "Gerar digest".

## Como manter atualizado
Escolha um caminho para o `data/casos.csv`:
1. **Exportar do app** (ele já tem exportação CSV) e substituir o arquivo, ou
2. **Editar o CSV** direto (planilha simples).

> Enquanto o `casos.csv` for os dados de exemplo, o digest sai com esses casos. Troque pelos reais.

## Agendamento
Uma **rotina semanal** roda o gerador toda **segunda-feira de manhã** e te entrega o digest.
- Para **mudar o dia/horário** ou **pausar**: é só me pedir.
- O digest também fica salvo em `docs/digest-latest.md` a cada geração.

## Parâmetros ajustáveis
No script/service dá para mudar:
- **Janela** de "próximos dias" (padrão 7) — perícias e prazos
- **Corte de "parado"** (padrão 30 dias sem movimentação)
