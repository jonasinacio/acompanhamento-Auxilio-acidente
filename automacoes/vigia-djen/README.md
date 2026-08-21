# VIGIA-DJEN — o vigia do boletim do DJEN

Todo dia útil às **08h40** consulta a API pública **Comunica (DJEN/CNJ)** pelas
OABs do escritório e joga cada **nova publicação/intimação** no grupo GERAL, via
uazapi. Ninguém precisa abrir o Diário à mão — e cada aviso já lembra de
conferir o prazo (alimenta o alarme-emendas).

Baseado no `buscar-djen.js` que o Jonas já tinha no Drive: **mesma API, mesmos
campos, mesma limpeza de HTML e paginação** — agora conectado à estrutura dos
robôs (envio uazapi + dedupe/backup do `pj_comum` + launchd).

Exemplo do que cai no grupo:

```
📰 DJEN — nova publicação (Jonas Inácio Andreza)
Proc: 1002345-67.2026.8.26.0100
TJSP · 3ª Vara Cível - Foro Central
Tipo: Intimação · Procedimento Comum Cível
🗓️ Disponibilizado em 2026-07-07
“Fica a parte autora intimada para, no prazo de 15 dias, emendar a inicial.”
⚠️ Conferir prazo e registrar (emenda/recurso se for o caso).
```

## Como funciona

- Consulta `GET comunicaapi.pje.jus.br/api/v1/comunicacao` por `numeroOab`+`ufOab`
  na janela dos últimos `DJEN_DIAS` dias (padrão 3, pra cobrir fim de semana).
- Pagina de 100 em 100; limpa o HTML do inteiro teor.
- Manda cada publicação **nova** (dedupe pelo `id` da publicação).

## Configuração

Já vem com a OAB do escritório (dado **público**, aparece nas próprias
publicações):

```python
# config.py
OABS = [{"oab": "160291", "uf": "MG", "quem": "Jonas Inácio Andreza"}]
```

Tem mais sócios? Acrescente dicts na lista. Um só, rápido, via ambiente:
`DJEN_OAB=160291 DJEN_UF=MG`.

## Uso

```bash
cd ~/pj-automacoes/vigia-djen
python3 robo_djen.py --dry --mock     # testa sem rede (dados de exemplo)
python3 robo_djen.py --dry            # de verdade, mostra sem enviar (precisa de rede)
python3 robo_djen.py --send           # envia e carimba
cp com.pj.vigia-djen.plist ~/Library/LaunchAgents/   # roda 08h40
launchctl load ~/Library/LaunchAgents/com.pj.vigia-djen.plist
```

> ⚠️ Do ambiente do Claude a API do DJEN não é alcançável — por isso os testes
> usam `--mock`. Na máquina do escritório roda sem `--mock`.
>
> A **data de disponibilização** nem sempre é o início da contagem do prazo
> (depende do meio e do tribunal). Todo prazo é **estimativa a conferir** antes
> de protocolar — por isso o aviso pede pra conferir.
