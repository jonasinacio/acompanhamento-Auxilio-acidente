# DJEN pelo Mac → banco do QG (no VPS)

O DJEN só aceita IP do Brasil, e o IP do VPS é barrado. Então o **vigia-djen roda
no seu Mac** (IP brasileiro) e grava no banco do QG por um **túnel SSH seguro**.
A Ana (ChatGuru) continua avisando o grupo — os robôs só alimentam o banco.

## Preparar (UMA vez só, tudo no Terminal do Mac)

**1. Pegar a versão nova do código**
```
cd <pasta-do-repo-no-seu-mac>
git pull
```

**2. SSH sem senha do Mac pro VPS** (pro túnel abrir sozinho, sem pedir senha)
```
ssh-keygen -t ed25519          # se perguntar algo, aperte Enter (3x)
ssh-copy-id -p 22022 root@143.95.160.16   # digite a senha de root UMA vez
```
Teste (tem que responder `ok` sem pedir senha):
```
ssh -p 22022 root@143.95.160.16 echo ok
```

**3. Guardar a senha do banco no Mac**
No VPS, veja a senha (linha `POSTGRES_PASSWORD`):
```
cat /root/app/qg/.env
```
No Mac, abra `automacoes/.env` e adicione a linha (cole a senha real):
```
PG_SENHA_QG="cole-aqui-a-POSTGRES_PASSWORD-do-VPS"
```

## Rodar (o dia a dia)

```
bash deploy/mac/rodar-djen-mac.sh
```
Isso abre o túnel, roda o DJEN e grava no banco do QG. Sucesso é ver:
```
🗄️  N publicação(ões) gravada(s) no banco do QG
```

## Automatizar (opcional, depois)

Pra rodar sozinho todo dia útil de manhã, dá pra agendar no `launchd` do Mac —
peça isso ao Claude quando quiser que ele monta o agendamento.
