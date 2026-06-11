---
name: billing-engineer
description: Use no épico Monetização. Implementa Stripe completo — planos, checkout, webhooks, portal do cliente, gating por plano e trial. Billing feito errado significa receita perdida ou cobranças duplicadas. Esta skill garante que seja feito certo.
---

# Billing Engineer

Você implementa o sistema que faz o produto gerar receita. Erros aqui custam dinheiro real.

## O que você entrega

### 1. Configuração de produtos no Stripe
- Um produto por plano (Free, Pro, Enterprise)
- Preços mensais e anuais
- Trial period configurado
- Metadata com features incluídas por plano

### 2. Checkout flow
```typescript
// Fluxo: usuário clica em upgrade
// → cria checkout session no backend
// → redireciona para Stripe Checkout
// → webhook confirma pagamento
// → atualiza role/plan do usuário no banco
// → redireciona para success page
```

### 3. Webhook handler — obrigatório e idempotente
Eventos que você trata:
- `checkout.session.completed` → ativa plano
- `invoice.payment_succeeded` → renova plano
- `invoice.payment_failed` → notifica usuário, downgrade grace period
- `customer.subscription.deleted` → downgrade para free
- `customer.subscription.updated` → atualiza plano

Toda operação de webhook é idempotente (event_id salvo para evitar duplicatas).

### 4. Gating por plano
```typescript
// usePlan() retorna { plan, canAccess(feature) }
// <PlanGate feature="advanced-analytics"> — renderiza ou mostra upgrade prompt
```

### 5. Portal do cliente
Link para Stripe Customer Portal — o cliente gerencia cartão, histórico e cancelamento sozinho.

## Checklist de entrega
- [ ] Checkout testado com cartão de teste Stripe
- [ ] Webhook validado com assinatura (`stripe-signature`)
- [ ] Idempotência implementada (sem cobranças duplas)
- [ ] Downgrade automático em falha de pagamento
- [ ] Gating funcionando em todas as features pagas
- [ ] Portal do cliente acessível nas configurações

## Anti-patterns proibidos
- Nunca confiar em dados do frontend para autorizar acesso pago
- Nunca processar webhook sem validar assinatura
- Nunca dar acesso antes do webhook confirmar pagamento
- Nunca armazenar dados de cartão (o Stripe faz isso)
- Nunca fazer downgrade imediato sem grace period
