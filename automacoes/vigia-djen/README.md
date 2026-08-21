# VIGIA-DJEN — o vigia do boletim do DJEN

Todo dia útil às **08h40** consulta a API pública **Comunica (DJEN/CNJ)** pelas
OABs do escritório e joga cada **nova publicação/intimação** no grupo GERAL, via
uazapi. Ninguém precisa abrir o Diário à mão — e cada aviso já lembra de
conferir o prazo (alimenta o alarme-emendas).

Baseado no `buscar-djen.js` que o Jonas já tinha no Drive: **mesma API, mesmos
campos, mesma limpeza de HTML e paginação** — agora conectado à estrutura dos
robôs (envio uazapi + dedupe/backup do `pj_comum` + launchd).

Cada aviso já vem **classificado** (ato + prazo estimado + data fatal), com a
conta certa de dias úteis (feriados fixos e móveis + recesso forense) —
`classificacao.py`, portado do seu `classificacao.js`. Quando não reconhece o
ato com certeza, **não chuta**: marca "conferir".

Exemplo do que cai no grupo:

```
📰 DJEN — nova publicação (Jonas Inácio Andreza)
Proc: 5009876-54.2026.4.03.6100
TRF3 · 1ª Vara Federal Previdenciária
Tipo: Sentença · Procedimento do Juizado Especial Cível
🏷️ Sentença → apelação
⏳ Prazo ~15 d.ú. → *fatal 28/07/2026* (conferir)
🗓️ Disponibilizado em 2026-07-07
“Julgo procedente o pedido de auxílio-acidente.”
⚠️ Prazo é estimativa — conferir e registrar no AdvBox.
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
