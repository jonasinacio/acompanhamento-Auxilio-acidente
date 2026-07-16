# Biblioteca de mensagens — Z-API + Flowter
**Esteira Previdenciária · Jonas Inácio Advocacia**

Cada bloco abaixo vai no campo **Body** da ação **HTTP Request** do Flowter, no gatilho da etapa indicada.
Rota do Z-API: `POST https://api.z-api.io/instances/{INSTANCIA}/token/{TOKEN}/send-text`
Header: `Client-Token: {token-de-seguranca}`

## Variáveis (mapear para os campos do Flowter)
- `{{telefone}}` → telefone do cliente no formato `55` + DDD + número (ex.: `5511999999999`)
- `{{cliente}}` → primeiro nome do cliente
- `{{escritorio}}` → nome/assinatura do escritório
- `{{data}}` `{{hora}}` `{{local}}` → dados da perícia

> Quebras de linha estão como `\n` (padrão JSON). **Todas as mensagens já incluem o rodapé padrão** com os links clicáveis (WhatsApp + Instagram). Como são URLs completas (`https://...`), o WhatsApp as transforma em links automaticamente. Envie sempre pelo **número dedicado**, em horário comercial.

## Rodapé padrão (já embutido em cada payload abaixo)
```
Caso queira saber mais, fale com nossa equipe: https://wa.me/553135001770
📌 Este número serve apenas para orientar sobre o andamento do seu processo.
⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).
✅ Perfil oficial: https://instagram.com/jonasinacio.adv
```

---

## 🟢 Automáticos (fato objetivo, só avanço)

### 1. CONTRATO ASSINADO — boas-vindas
```json
{
  "phone": "{{telefone}}",
  "message": "Olá, {{cliente}}! Aqui é da {{escritorio}}. Recebemos seu contrato e já começamos a cuidar do seu caso. 🙌\nO próximo passo é reunir seus documentos — em instantes enviamos a lista. Qualquer dúvida, é só responder por aqui.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 2. AGUARDANDO DOCS — lembrete D+3
```json
{
  "phone": "{{telefone}}",
  "message": "Oi, {{cliente}}! Passando para lembrar dos documentos que combinamos, para dar andamento ao seu caso. Assim que você enviar, seguimos com a próxima etapa. Precisa de ajuda para localizar algum deles?\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 3. AGUARDANDO DOCS — lembrete D+5
```json
{
  "phone": "{{telefone}}",
  "message": "Olá, {{cliente}}. Ainda estamos no aguardo de alguns documentos para avançar com o seu processo — eles são importantes para deixarmos tudo pronto. Consegue nos enviar até esta semana?\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 4. PROTOCOLO ADM — pedido administrativo protocolado
```json
{
  "phone": "{{telefone}}",
  "message": "Boa notícia, {{cliente}}! Demos entrada no seu pedido junto ao INSS. Agora acompanhamos o andamento e avisamos assim que houver retorno. Seguimos de olho nos prazos por você.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 5. AJUIZADO — ação judicial protocolada
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, seu processo foi protocolado na Justiça hoje ✅. A partir de agora acompanhamos cada movimentação e avisamos sempre que houver novidade relevante. Estamos com você nessa.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 6. EXIGÊNCIA ADM / EMENDA — quando depende de documento do cliente
```json
{
  "phone": "{{telefone}}",
  "message": "Oi, {{cliente}}! Para dar sequência ao seu caso, precisamos de um documento. Já te enviamos a descrição do que é — assim que chegar, seguimos na hora. Conte com a gente se tiver dúvida.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 7. PERÍCIA DESIGNADA — D-15 (aviso da data)
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, sua perícia médica foi marcada 📅\nData: {{data}} às {{hora}}\nLocal: {{local}}\nNos próximos dias enviamos a orientação completa de preparo. Guarde essa data com atenção — é uma etapa muito importante do seu processo.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 8. PERÍCIA DESIGNADA — D-7 (orientação de preparo)
```json
{
  "phone": "{{telefone}}",
  "message": "Oi, {{cliente}}! Faltam poucos dias para sua perícia ({{data}}). Orientações:\n• Leve documento com foto e todos os laudos, exames e receitas\n• Chegue com antecedência ao local: {{local}}\n• Relate suas limitações com sinceridade e clareza — sem exagerar nem omitir\nQualquer dúvida, estamos aqui.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### 9. PERÍCIA DESIGNADA — D-2 (confirmação)
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, tudo certo para sua perícia em {{data}}, às {{hora}}, no local {{local}}? Confirma pra gente que está tudo ok e que você tem os documentos em mãos? É uma etapa importante e você está preparado(a). 💪\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

---

## 🟠 Com autorização (assunto sensível — humano decide)

### 10. SENTENÇA — houve decisão (NÃO anunciar ganho/perda no automático)
> Enviar **somente após Jonas/Natália avaliarem** e autorizarem. A Bia dispara na mão.
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, seu processo teve uma decisão importante. Nossa equipe já está analisando o conteúdo e em breve entra em contato para te explicar o que significa e quais os próximos passos. Obrigado pela confiança.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

---

## Checklist antes de ligar
- [ ] Número **dedicado** conectado no Z-API (não o principal)
- [ ] Cláusula de **opt-in de WhatsApp** no contrato
- [ ] Variáveis do Flowter mapeadas (telefone com `55` + DDD)
- [ ] Testar cada fluxo com o seu próprio número antes de ativar (conferir se os links abrem)
- [ ] Envios só em horário comercial, personalizados
