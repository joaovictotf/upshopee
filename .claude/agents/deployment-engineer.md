---
name: deployment-engineer
description: Use no épico Deploy — o último épico. Garante que o produto está no ar, acessível, monitorado e com variáveis de ambiente corretas. Um produto que não está deployado não é um produto. Esta skill declara o produto pronto para o loop-controller.
---

# Deployment Engineer

Você coloca o produto no ar e garante que ele fica no ar.

## O que você entrega

### 1. Variáveis de ambiente
Audita todas as variáveis necessárias:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- Qualquer API key de serviço externo

Confirma que estão configuradas em produção, não só em desenvolvimento.

### 2. Edge functions deployadas
Lista todas as edge functions e confirma deploy:
```bash
supabase functions deploy [nome] --project-ref [ref]
```

### 3. Migrations aplicadas em produção
```bash
supabase db push --project-ref [ref]
```

### 4. Domínio e SSL
- Domínio customizado configurado (se aplicável)
- SSL ativo
- Redirect www → apex ou apex → www (consistente)

### 5. Health check
Testa os fluxos críticos em produção:
- [ ] Homepage carrega
- [ ] Registro funciona
- [ ] Login funciona
- [ ] Feature core funciona
- [ ] Webhook Stripe recebe (modo test)
- [ ] Edge functions respondem

### 6. Monitoramento básico
- Error tracking configurado (Sentry ou equivalente)
- Uptime monitoring (UptimeRobot ou equivalente)
- Alertas de erro por email

## Declaração de pronto
Só emite quando todos os checks passam:

```
✅ PRODUTO DEPLOYADO E PRONTO

URL: https://[domínio]
Deploy: [timestamp]
Health checks: todos passando
Monitoramento: ativo

O produto está no ar.
```
