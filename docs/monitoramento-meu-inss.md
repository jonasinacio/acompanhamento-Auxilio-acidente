# Rotina de monitoramento do Meu INSS
**Adendo ao Manual Operacional v4.1 · Jonas Inácio Advocacia**

## O problema
O Meu INSS **não tem API oficial** — não dá para automatizar a captura de exigências e decisões.
Sem uma rotina disciplinada, uma exigência de prazo curto pode passar batido e derrubar o benefício.

## Decisão (padrão — ajuste se quiser)
| Item | Definição |
|------|-----------|
| Quem loga no Meu INSS | **Natália** (tem acesso e avalia a exigência) · apoio do **Pedro** (documentos) |
| Quem coordena a fila | **Bia** (garante que todo caso foi conferido e cobra pendências) |
| Frequência | **2x por semana — segunda e quarta**, junto das revisões que já existem |
| Onde registra | Tudo no **ADVBOX** (prazo, status) e o documento no **Drive** |

> Casa com o que já definimos: a Bia revisa a fila administrativa na **quarta**; a conferência técnica no Meu INSS acontece **segunda e quarta** para não deixar exigência sem prazo no meio da semana.

## Checklist da conferência (segunda e quarta)
Para cada caso com status **PROTOCOLO ADM** ou **EXIGÊNCIA ADM** / aguardando decisão:
- [ ] Abrir o Meu INSS e verificar **cartas, exigências e decisões** do caso
- [ ] **Exigência nova?** Registrar no ADVBOX o **prazo fatal + prazo interno**, classificar (simples/complexa) e acionar **Pedro** se faltar documento
- [ ] **Decisão saiu?** Salvar no Drive (`04 - Administrativo`), comunicar o cliente e encaminhar a rota (deferido / indeferido → reanálise)
- [ ] Baixar **CNIS/laudos** novos, se houver
- [ ] Atualizar status e fila no ADVBOX

**Reação a exigência:** até **1 dia útil** após a ciência (SLA do manual, status EXIGÊNCIA ADM).
**Condição de saída:** todo caso administrativo ativo conferido; nenhuma exigência sem prazo e responsável.

## Escalar para Jonas quando
- Exigência complexa, risco de indeferimento, ou decisão que exija definição de rota.

## Futuro (fora do escopo atual)
Existem legaltechs que monitoram o INSS via procuração/gov.br. Se o volume crescer, vale avaliar — mas
hoje a rotina manual disciplinada é o caminho seguro e sem risco de termos de uso.
