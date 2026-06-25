# 🏗️ PLANO UPSHOPEE V2 — Rebranding + Redesign + Shope Vídeos

> **Data:** 2026-06-25
> **Objetivo:** Transformar o ShopeSync no UpShopee — novo nome, design refeito (estilo Shopee oficial), e nova aba de geração de vídeos com IA.

---

## REGRAS DESTE PLANO

1. **Uma fase por vez** — nunca tudo de uma vez (já quebrou o site antes).
2. **Diagnóstico antes de qualquer mudança** — investigar, reportar, só então alterar.
3. **Cada fase termina com build + push no main + deploy na Vercel.**
4. **Impulsionar Vendas NÃO será alterado** (design e funcionamento intactos).
5. **O site atual continua funcionando** — as mudanças são incrementais.

---

## FASES (em ordem de prioridade)

### FASE 1 — Trocar nome e branding (rápido, baixo risco)

**Status:** ✅ COMPLETA (commit `5cfb14b` — 2026-06-25)
**Arquivos alterados:** 25 files, +93/-93 (balanced diff)
**O que foi feito:** substituir "ShopeSync" / "ShopSync" / "SHOPSYNC" por "UpShopee" em todo texto visível ao usuário.
**O que NÃO foi alterado:** localStorage keys, admin emails, Supabase refs, payment URLs, file paths, function names (useShopSyncData).

**O que:** substituir "ShopeSync" / "ShopeSync" / "ShopSync" por "UpShopee" em todo o site.

**Onde procurar:**
- Título da página (index.html, __root.tsx)
- Sidebar (DashboardShell.tsx)
- Landing pages (/planos, /planos2, /planos3)
- Página de login e cadastro
- Todas as páginas do dashboard
- CLAUDE.md
- .env (nomes de variáveis)
- package.json (name, description)
- Termos, modais, textos de erro, toasts
- Página de bloqueio (pagamento-bloqueado)
- Página de reembolso
- WhatsAppSupportButton

**Como:** prompt para o Claude Code buscar TODAS as ocorrências e trocar.

---

### FASE 2 — Redesign página por página (estilo Shopee oficial)

**Referência visual:** idêntico à Shopee — laranja #EE4D2D, fonte Inter, limpo, profissional, mobile-first.

**Ordem de redesign (uma página por vez):**

| # | Página | Arquivo |
|---|--------|---------|
| 1 | Login | src/routes/login.tsx | ✅ COMPLETA (commit `d13e119` — 2026-06-25) |
| 2 | Cadastro | src/routes/register.tsx |
| 3 | Dashboard principal | src/routes/dashboard.index.tsx |
| 4 | Produtos | src/routes/dashboard.produtos.tsx |
| 5 | Meus Produtos | src/routes/dashboard.meus-produtos.tsx |
| 6 | Vendas/Clientes | src/routes/dashboard.vendas-clientes.tsx |
| 7 | Métricas | src/routes/dashboard.metricas.tsx |
| 8 | Conectar Contas | src/routes/dashboard.conectar-contas.tsx |
| 9 | Robô Divulgador | src/routes/dashboard.robo-divulgador.tsx |
| 10 | Grupos de Divulgação | src/routes/dashboard.grupos.tsx |
| 11 | Configurações | src/routes/dashboard.configuracoes.tsx |
| 12 | Tutoriais | src/routes/dashboard.tutoriais.tsx |
| 13 | Landing /planos | src/routes/planos.tsx (+ /planos2, /planos3) |
| 14 | Reembolso | src/routes/reembolso.tsx |
| 15 | Bloqueio | src/routes/pagamento-bloqueado.tsx |
| 16 | Validar Cadastros (admin) | src/routes/dashboard.validar-cadastros.tsx |
| ⚠️ | **Impulsionar Vendas** | **NÃO MEXER** |

**Cada página segue o mesmo processo:**
1. Diagnóstico: Claude Code lê a página atual e reporta estrutura
2. Redesign: aplica o visual Shopee (cores, espaçamento, tipografia, cards, botões)
3. Mobile-first: 320px+, sem scroll horizontal
4. Build → testa → commit → push

---

### FASE 3 — Nova aba: Shope Vídeos (gerador de vídeos com IA)

**O que é:** uma nova página no dashboard onde o usuário envia a foto de um produto, escolhe um estilo de vídeo, e o sistema gera um vídeo curto que ele pode baixar e postar como afiliado.

**Fluxo do usuário:**
1. Acessa a aba "Shope Vídeos" no dashboard
2. Faz upload da foto do produto
3. Escolhe opções:
   - Gênero do narrador (homem/mulher)
   - Tom (feliz, triste, empolgada, neutro)
   - Texto personalizado que vai ser falado no vídeo
   - OU usa um texto gerado automaticamente pela IA
4. Clica "Gerar vídeo"
5. O sistema processa (pode levar alguns segundos)
6. Aparece o vídeo pronto → botão "Baixar"
7. A pessoa baixa e posta no TikTok/Shopee

**Arquitetura técnica (recomendação):**

| Etapa | Tecnologia | Custo |
|-------|-----------|-------|
| Geração de roteiro/texto | **Gemini API** (gratuito, tier free) | Grátis |
| Narração / voz | **ElevenLabs** ou **Edge TTS** (gratuito) | Grátis |
| Montagem do vídeo | **Remotion** (React pra vídeo, já usado) | Grátis |
| Armazenamento | Supabase Storage | Incluso no Free |

**OU (alternativa mais simples):**
Usar **Gemini** pra tudo (texto + descrição) e renderizar o vídeo com **Remotion** (React), combinando a imagem do produto + texto animado + música de fundo. Sem avatar falando — só um vídeo de apresentação do produto com texto e efeitos.

**Benefício da segunda opção:** não depende de API externa paga, usa tecnologia que você já domina (React/Remotion), pode ser gerado 100% no Supabase via Edge Function.

**O que precisa construir:**
1. Nova rota: `src/routes/dashboard.shope-videos.tsx`
2. Entrada na sidebar (DashboardShell, array NAV)
3. Componente de upload de imagem
4. Formulário de opções (gênero, tom, texto)
5. Edge Function no Supabase que:
   - Recebe a imagem + opções
   - Chama Gemini API pra gerar roteiro (se não foi fornecido texto)
   - Renderiza o vídeo com Remotion
   - Retorna o link do vídeo pronto
6. Player de preview + botão de download
7. Supabase Storage pra guardar os vídeos gerados

---

## O QUE NÃO MEXER

- **Impulsionar Vendas** (design e funcionamento intactos)
- **EvoPay** (integração de pagamento já pronta)
- **Edge Functions** existentes (evopay-create-pix, evopay-webhook)
- **Banco de dados** (estrutura atual mantida)
- **Redefinição de senha** (fluxo já implementado)
- **Dados bancários** (modal + Configurações)

---

## RESUMO DA ORDEM COMPLETA

```
FASE 1 → Trocar nome "UpShopee" em tudo (rápido, ~1 prompt)
FASE 2 → Redesenhar cada página, uma por vez (~16 prompts)
FASE 3 → Construir Shope Vídeos (vários prompts, página + backend + IA)
```

---

## PRÓXIMO PASSO IMEDIATO

Se você aprovar este plano, começamos pela **FASE 1** (trocar o nome). É rápida e de baixo risco — serve como aquecimento e já vai deixar o site com o nome novo.
