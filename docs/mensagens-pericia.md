# Pacote de mensagens da PERÍCIA — Z-API + Flowter
**Esteira Previdenciária · Jonas Inácio Advocacia**

Jornada completa da perícia médica. Cada bloco vai no **Body** do HTTP Request do Flowter.
Todas já trazem o **rodapé padrão** (links clicáveis + aviso anti-golpe).

Variáveis: `{{telefone}}` `{{cliente}}` `{{data}}` `{{hora}}` `{{local}}`
Rota Z-API: `POST .../send-text` · Header `Client-Token`

> Regra de ouro: nunca orientar a mentir/exagerar/omitir. O preparo organiza a verdade.

| # | Momento | Gatilho | Tipo |
|---|---------|---------|------|
| P1 | D-15 · marcação | entra em PERÍCIA DESIGNADA | Auto |
| P2 | D-7 · orientação | 7 dias antes | Auto |
| P3 | D-2 · confirmação | 2 dias antes | Auto |
| P4 | D-1 · véspera | 1 dia antes | Auto |
| P5 | D+1 · pós-perícia | 1 dia depois | Auto |
| P6 | Remarcada | data da perícia alterada | Auto |
| P7 | Não compareceu | perícia marcada como não realizada | Manual/condicional |

---

### P1. D-15 — perícia marcada
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, sua perícia médica foi marcada 📅\nData: {{data}} às {{hora}}\nLocal: {{local}}\nNos próximos dias enviamos a orientação completa de preparo. Guarde essa data com atenção — é uma etapa muito importante do seu processo.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### P2. D-7 — orientação de preparo
```json
{
  "phone": "{{telefone}}",
  "message": "Oi, {{cliente}}! Faltam poucos dias para sua perícia ({{data}}). Orientações:\n• Leve documento com foto e todos os laudos, exames e receitas\n• Chegue com antecedência ao local: {{local}}\n• Relate suas limitações com sinceridade e clareza — sem exagerar nem omitir\nQualquer dúvida, estamos aqui.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### P3. D-2 — confirmação de presença
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, tudo certo para sua perícia em {{data}}, às {{hora}}, no local {{local}}? Confirma pra gente que está tudo ok e que você tem os documentos em mãos? É uma etapa importante e você está preparado(a). 💪\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### P4. D-1 — véspera (lembrete final)
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, sua perícia é amanhã, {{data}}, às {{hora}}, no local {{local}}. Separe hoje seus documentos (identidade com foto, laudos, exames e receitas) e descanse. Chegue com antecedência. Qualquer dúvida de última hora, é só chamar. Boa sorte! 💪\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### P5. D+1 — pós-perícia (coleta o relato do cliente)
```json
{
  "phone": "{{telefone}}",
  "message": "Oi, {{cliente}}! Como foi a sua perícia ontem? Conte pra gente rapidamente como o médico te avaliou e se surgiu alguma dúvida. Esse retorno nos ajuda a acompanhar o seu processo. Obrigado!\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### P6. Perícia REMARCADA (nova data)
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, atenção: sua perícia foi remarcada 📅\nNova data: {{data}} às {{hora}}\nLocal: {{local}}\nMantenha seus documentos prontos — vamos te orientar novamente conforme a data se aproxima. Qualquer dúvida, estamos aqui.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

### P7. NÃO COMPARECEU (reagendar — enviar com cautela)
> Disparar quando a perícia for marcada como não realizada. Idealmente a Bia confirma antes de enviar.
```json
{
  "phone": "{{telefone}}",
  "message": "{{cliente}}, notamos que a sua perícia de {{data}} não foi realizada. Isso pode afetar o andamento do seu processo, então precisamos resolver rápido. Entre em contato com a gente para reagendarmos e orientarmos os próximos passos.\n\n———\nCaso queira saber mais, fale com nossa equipe: https://wa.me/553135001770\n📌 Este número serve apenas para orientar sobre o andamento do seu processo.\n⚠️ Cuidado com golpes: nunca informe senhas, dados ou contas bancárias. Não fazemos esse tipo de pedido por mensagem (golpe do falso advogado).\n✅ Perfil oficial: https://instagram.com/jonasinacio.adv"
}
```

---

## Como ligar no Flowter
- **P1–P5:** gatilho na etapa `PERÍCIA DESIGNADA`, com prazos calculados a partir da **data da perícia** (D-15, D-7, D-2, D-1, D+1).
- **P6:** gatilho quando o campo de data da perícia é **alterado**.
- **P7:** melhor **condicional/manual** — a Bia confirma a falta antes de enviar (evita constranger quem compareceu e o sistema não registrou).
- Não empilhe mensagens muito próximas: D-2, D-1 e D+1 já são três seguidas — mantenha o texto enxuto e o número dedicado.
