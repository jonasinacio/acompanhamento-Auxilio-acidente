# Rodar o SENTINELA no seu VPS (sem o Mac)

Este kit deixa o SENTINELA no ar 24/7 no seu servidor Linux:

- **vigia-djen** → dispara sozinho todo dia útil às **08h40** (systemd timer);
- **webhook do ZapSign** → fica **sempre escutando** (systemd service), com auto-restart.

Os robôs de planilha (perícia, emendas, gatilhos, documentos, painel) entram numa
segunda fase, quando ligarmos a fonte dos dados (AdvBox/Drive) — hoje eles
dependem das "mães", que ficam no seu Mac/Drive.

---

## Passo a passo (uma vez)

### 1. Entrar no servidor por SSH

Do seu Mac (Terminal):
```bash
ssh root@SEU_IP        # troque SEU_IP pelo IP do VPS
```

### 2. Baixar o código

Como o repositório é privado, gere um **token de leitura** no GitHub
(*Settings → Developer settings → Personal access tokens → Fine-grained*, com
acesso de leitura só a este repositório) e clone:

```bash
cd /opt
git clone -b claude/automation-example-hr9txp \
  https://SEU_TOKEN@github.com/jonasinacio/acompanhamento-Auxilio-acidente.git sentinela-repo
cd sentinela-repo
```
> Quando o PR for mesclado na `main`, troque `-b claude/automation-example-hr9txp`
> por `-b main`.

### 3. Rodar o instalador

```bash
sudo bash deploy/instalar-vps.sh
```
Ele instala Python, cria o usuário de serviço, liga o timer do DJEN e o serviço
do webhook, e cria um `.env` a partir do modelo.

### 4. Preencher as credenciais

```bash
nano /opt/sentinela-repo/automacoes/.env
```
Preencha `UAZAPI_URL`, `UAZAPI_TOKEN`, `UAZAPI_GRUPO_GERAL` e, para o webhook,
`ZAPSIGN_SEGREDO`. Salve e reinicie o webhook:
```bash
systemctl restart sentinela-webhook
```

### 5. Testar

```bash
# DJEN agora (deve cair no grupo):
systemctl start sentinela-djen
journalctl -u sentinela-djen --no-pager -n 50

# webhook vivo?
curl http://localhost:8765/
journalctl -u sentinela-webhook -f
```

---

## Abrir a porta do webhook

O ZapSign precisa alcançar o servidor. Libere a porta **8765** no firewall do
VPS **e** no painel de segurança do provedor (OCI/HostGator):

```bash
# Ubuntu (ufw):        ufw allow 8765/tcp
# AlmaLinux (firewalld): firewall-cmd --add-port=8765/tcp --permanent && firewall-cmd --reload
```

No ZapSign (*Configurações → Webhooks*), evento **documento assinado**, URL:
```
http://SEU_IP:8765/zapsign/SEU_SEGREDO
```

### HTTPS (recomendado depois)

Muitos serviços exigem `https`. Quando tiver um domínio apontando pro VPS, ponha
um **nginx + Let's Encrypt (certbot)** na frente, fazendo proxy pra
`localhost:8765`. Aí a URL do webhook vira `https://seu-dominio/zapsign/SEU_SEGREDO`.
(Peça que eu te passo essa config quando chegar a hora.)

---

## Comandos do dia a dia

```bash
systemctl status sentinela-webhook      # o webhook está no ar?
systemctl list-timers sentinela-djen    # quando é o próximo disparo do DJEN
journalctl -u sentinela-webhook -f      # ver o webhook ao vivo
journalctl -u sentinela-djen -n 50      # última rodada do DJEN

# atualizar o código depois de mudanças no GitHub:
cd /opt/sentinela-repo && git pull && sudo bash deploy/instalar-vps.sh
```
