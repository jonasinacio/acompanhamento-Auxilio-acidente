# PJ-AUTOMAÇÕES — robôs do escritório (padrão ARAUTO)

Três robôs internos que estendem o padrão do **ARAUTO** (robô de avisos de
audiência) para o resto da operação do Manual v4.1. Todos seguem a mesma
arquitetura — *mãe → motor → régua → estado → saída* — e compartilham uma única
biblioteca (`pj_comum.py`), então você ajusta os senders **num lugar só**.

| Robô | O que faz | Fonte | Dispara | launchd |
|---|---|---|---|---|
| **avisos-pericia** | avisa o cliente nos marcos da perícia (D-15/D-7/D-2/D+1) + cutuca Pedro e Bia | `OFICIAL_PERICIAS_2026.xlsx` | WhatsApp cliente + grupo GERAL | 09h05 |
| **alarme-emendas** | vigia o prazo fatal das emendas, escalando até o Jonas | `OFICIAL_EMENDAS_2026.xlsx` | só grupo GERAL | 09h10 |
| **gatilhos-status** | mudança de status → tarefa obrigatória; atraso de SLA → painel | `OFICIAL_CASOS_2026.xlsx` | só grupo GERAL | 09h15 |

Rodam em cascata depois do ARAUTO (09h), cada um 5 min à frente, pra não
competirem pela janela de envio.

## Instalação (Mac, ao lado do ARAUTO)

```bash
# copie a pasta automacoes/ inteira para ~/pj-automacoes
cp -R automacoes ~/pj-automacoes
cd ~/pj-automacoes
pip3 install -r avisos-pericia/requirements.txt   # openpyxl (serve p/ os três)

# credenciais: copie o modelo e preencha o .env (fica FORA do git):
cp .env.example .env
$EDITOR .env        # preencha ADVBOX_TOKEN, ChatGuru e Z-API
```

O `pj_comum.py` carrega o `.env` sozinho. (Se preferir, exporte as mesmas
variáveis no `~/.zshrc` — tanto faz.)

## 🔒 Segurança de credenciais (leia)

- **Segredo nunca vai pro chat, e-mail ou git.** Só no `.env` local (ignorado
  pelo git) ou no `~/.zshrc`. O `.env.example` — sem valores — é o único que é
  versionado.
- **Vazou? Revogue e gere outro.** Um token colado em conversa ou commit deve
  ser considerado comprometido: gere um novo no serviço (AdvBox: *Configurações
  → Integrações e API*) e invalide o antigo.
- As planilhas reais (dados de cliente, LGPD) também ficam fora do git.

Depois, em cada pasta: `python3 criar_planilha_modelo.py` → `python3 robo_*.py --dry`
para ensaiar, e por fim carregue o `.plist` no launchd. Cada robô tem seu README.

## Princípios (herdados do ARAUTO)

- **`--dry` por padrão** — nada é enviado sem `--send` explícito.
- **Régua fechada** — os marcos/SLAs vêm do manual; mudar é editar `config.py`.
- **Carimbo + dedupe** — cada aviso sai 1x; estado em JSON e/ou na mãe.
- **Travas naturais** — STATUS manda; falta de dado vira alerta interno, nunca
  falha silenciosa; backup da mãe antes de escrever.
- **Segredo só em env** — nenhuma credencial no repositório; planilhas reais
  (dados de cliente, LGPD) ficam fora do git (`.gitignore`).

## Testar e ensaiar

```bash
python3 test_robos.py          # suíte de regressão dos 3 robôs + puxa (mães isoladas)
```

Para **ensaiar o --send inteiro sem disparar mensagem** (exercita carimbo e
dedupe, mas nada sai): `PJ_FAKE_SEND=1 python3 robo_pericias.py --send`. Todo
envio vira um "FAKE-OK". Nunca deixe `PJ_FAKE_SEND` ligado em produção.

## Dias úteis e feriados

Os robôs de prazo (emendas, SLA) contam **dias úteis**. O `feriados.txt` já vem
com os **feriados nacionais de 2026**; **complete** com os estaduais/municipais
do seu foro e o **recesso forense**. Feriado a menos faz o robô achar que há
mais prazo do que existe — sempre confira o prazo fatal também no ADVBOX.

## Estrutura

```
pj-automacoes/
├── pj_comum.py          ← senders (ChatGuru/Z-API), datas, dias úteis, estado, backup
├── feriados.txt         ← (opcional) feriados do foro, 1 por linha
├── avisos-pericia/
├── alarme-emendas/
└── gatilhos-status/
```

## Fase 2 (quando quiser)

Hoje as "mães" são preenchidas à mão ou coladas do ADVBOX. O próximo passo é um
`puxa_advbox.py` por robô (igual ao do ARAUTO) que casa pelo nº do processo e
**só acrescenta o que não existe** — descomente a linha dele no `run_diario.sh`.
