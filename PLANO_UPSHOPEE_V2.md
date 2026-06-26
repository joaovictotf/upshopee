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

### FASE 3 — Produtos para Afiliados (catálogo próprio, curadoria manual)

**Verédito técnico:** ✅ Totalmente viável com a stack atual. Sem API da Shopee, sem scraping, sem promessa de parceria oficial.

**O que é:** uma nova aba onde admins cadastram manualmente produtos interessantes para afiliados. O usuário navega, filtra, vê análise ShopSync, copia o link do produto, abre a Shopee Afiliados oficial, gera seu link pessoal e salva na ferramenta.

**Fluxo do usuário:**
1. Acessa "Produtos para Afiliados" no dashboard
2. Visualiza catálogo curado com busca, filtros e ordenação
3. Escolhe um produto → vê detalhes e análise ShopSync (pontuação, vantagens, pontos de atenção)
4. Clica em "Gerar meu link de afiliado" → modal com instruções
5. Copia o link normal do produto → abre a Shopee Afiliados em nova aba
6. Gera seu link pessoal na Shopee → volta pra ShopSync → cola o link
7. Produto salvo com link afiliado → aparece na lista de salvos

**O que o admin pode fazer (painel administrativo):**
- Cadastrar, editar, remover, desativar produtos
- Upload de imagens, informar preço, comissão, avaliação
- Categorias, tags, selos (Alta oportunidade, Bom para vídeo, etc.)
- Pontuação ShopSync (score 0-100, calculado automaticamente)
- Importar CSV (validação, preview, confirmação)
- Revisão de produtos vencidos/desatualizados

**Estrutura de dados (4 tabelas novas):**
- `affiliate_product_catalog` — produtos do catálogo (nome, preço, comissão, score, tags, etc.)
- `affiliate_product_images` — imagens do produto
- `affiliate_product_categories` — categorias
- `user_affiliate_products` — produtos salvos pelo usuário (com link afiliado dele)

**Telas principais:**
- Catálogo (busca + filtros + cards + paginação)
- Detalhes do produto (galeria + análise + instruções)
- Modal "Gerar meu link" (instruções + copiar link + abrir Shopee)
- Painel admin (CRUD + CSV import)
- Lista de produtos salvos do usuário

**Etapas de implementação:**
1. Banco (migrations: tabelas, RLS, storage buckets)
2. Admin panel (cadastro, edição, CSV import)
3. Catálogo público (busca, filtros, cards, detalhes)
4. Fluxo de afiliação (copiar link, abrir Shopee, salvar link)
5. Qualidade (mobile, validações, segurança, avisos)

---

### FASE 4 — ShopSync Vídeo IA (roteiro + prompt para Gemini do usuário)

**Verédito técnico:** ✅ Viável e inteligente. A ShopSync NÃO gera o vídeo — ela prepara roteiro e prompt. O usuário gera o vídeo na conta Google DELE via Gemini.

**O que é:** uma nova aba onde o usuário envia fotos de um produto, informa o estilo desejado, e a IA (Gemini API, via Edge Function) gera: ideia do vídeo, roteiro completo, cenas sugeridas, narração, textos na tela, chamada final, hashtags e um prompt profissional pronto pra colar no Gemini. O usuário então abre o Gemini na conta Google dele, cola o prompt, envia a imagem e gera o vídeo.

**Fluxo do usuário (7 etapas guiadas):**
1. **Selecionar produto** — escolhe de Meus Produtos, do catálogo, ou cadastra manualmente
2. **Enviar imagens** — 1 principal + até 3 adicionais (JPG/PNG/WEBP)
3. **Informações** — nome, benefícios, público-alvo, diferenciais (a IA sugere conteúdo)
4. **Estilo do vídeo** — 13 estilos (Destaque, UGC, Unboxing, Antes/Depois, etc.), tom, duração, voz
5. **Geração** — IA cria: gancho, roteiro, cenas, narração, textos, CTA, hashtags, prompt final
6. **Revisão** — usuário edita, troca estilo, gera versão alternativa
7. **Abrir no Gemini** — copia o prompt, abre gemini.google.com, cola, gera o vídeo

**Arquitetura técnica:**
| Etapa | Tecnologia | Custo |
|-------|-----------|-------|
| Análise e geração de roteiro | **Gemini API** (Edge Function) | Tier gratuito |
| Upload de imagens | Supabase Storage | Incluso |
| Frontend multi-etapas | React + shadcn/ui (já no projeto) | — |
| Salvamento de projetos | Supabase (tabelas novas) | Incluso |

**Estrutura de dados (2-3 tabelas novas):**
- `video_projects` — projetos de vídeo (status, estilo, roteiro, prompt final)
- `video_project_images` — imagens enviadas por projeto
- `video_prompt_versions` (opcional) — histórico de versões do prompt

**Segurança:**
- Chave Gemini NUNCA no frontend (Edge Function apenas)
- Imagens privadas por padrão (RLS, URLs assinadas)
- Aviso claro: geração do vídeo ocorre na conta Google do usuário
- Checkbox: usuário confirma autorização das imagens

**Etapas de implementação:**
1. Banco (migrations: tabelas, storage buckets, RLS)
2. Frontend multi-etapas (seleção → upload → informações → estilo → geração → revisão → Gemini)
3. Edge Function Gemini (análise + geração de roteiro e prompt)
4. Histórico e salvamento de projetos
5. Qualidade (mobile, validações, segurança, avisos legais)

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
FASE 1 ✅ → Trocar nome "UpShopee" em tudo
FASE 2 ✅ → Redesenhar cada página (Shopee style) + remover abas desnecessárias
FASE 3 🔜 → Produtos para Afiliados (catálogo próprio, curadoria manual)
FASE 4 🔜 → ShopSync Vídeo IA (roteiro + prompt, Gemini do usuário)
```

---

## PRÓXIMO PASSO IMEDIATO

Começar **FASE 3 — Produtos para Afiliados**: criar as migrations das 4 tabelas + storage buckets.
