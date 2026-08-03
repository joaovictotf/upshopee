# UpShopee — Project Memory for Claude Code

> Memória permanente do projeto. Vale para qualquer sessão do Claude Code, em qualquer conta.
> **Última atualização: 2026-08-03** — reescrito a partir do código real (rotas, migrations, bundle publicado), não da doc anterior.

---

## 1. VISÃO GERAL

- **Nome:** UpShopee (ex-ShopeSync)
- **O que é:** SaaS para afiliados e sellers da Shopee. O usuário conecta contas, acompanha vendas e comissões, usa a IA Divulgadora, gera vídeos com IA, participa de grupos e assiste aulas.
- **Status:** protótipo funcional de apresentação. Lançamento real: agosto de 2026.
- **REGRA DE OURO:** todo fluxo financeiro (vendas, comissões, saques) é VISUAL. Nenhuma transação real acontece no produto. O site precisa parecer e se comportar como produto real o tempo todo.
  - **Exceção conhecida:** as Edge Functions `evopay-create-pix` / `evopay-webhook` criam cobrança PIX real. **O Impulsionar não está liberado para nenhum usuário** — o código está dormente e é intencional. **Não remover.** Antes de expor qualquer entrada para o Impulsionar, falar com o Juam.

---

## 2. STACK

Confirmado no `package.json`:

| Camada | Tecnologia | Versão |
|---|---|---|
| UI | React | ^19.2.0 |
| Router | TanStack Router (file-based) | ^1.168.25 |
| Data fetching | TanStack Query | ^5.83.0 |
| Build | Vite | ^7.3.1 |
| Estilo | Tailwind CSS v4 | ^4.2.1 |
| Componentes | shadcn/ui + Radix | várias |
| Linguagem | TypeScript | ^5.8.3 |
| Backend/Auth/DB | Supabase | ^2.106.0 |
| Forms | react-hook-form + zod | ^7.71 / ^3.24 |
| Gráficos | recharts | ^2.15.4 |
| Toasts | sonner | ^2.0.7 |
| Package manager | npm (há `bun.lock` legado no repo) | — |

O plugin `@cloudflare/vite-plugin` **já foi removido**. `wrangler.jsonc` continua no repo como resíduo.

**Supabase project ID:** `ndawyrqzqhzbyjdmkdge`

---

## 3. REPO & DEPLOY

- **GitHub:** `https://github.com/joaovictotf/upshopee.git` (remote `origin`) — confirmado por `git remote -v` em 03/08/2026. A doc antiga dizia `shopesyncnew`; estava errado.
- **Pasta local:** `C:\Users\vinic\upshopee-novo`
- **Deploy:** **Vercel** — projeto `upshopee` (`prj_uVLs45AHIGaDPjQlZZcpKdwmXgWM`), confirmado em `.vercel/repo.json`. Build `npm run build`, output `dist`, SPA fallback via `vercel.json`.
- `.lovable/project.json` contém só o marcador de template (`tanstack_start_ts_2026-05-12`), sem vínculo de projeto ativo. Indício forte de que a Lovable **não publica mais** — mas confirmar com o Juam antes de apagar a pasta.

### Como verificar que está no repo certo
```bash
git remote -v                                    # deve mostrar joaovictotf/upshopee.git
git rev-parse --abbrev-ref --symbolic-full-name @{u}   # deve mostrar origin/main
```

### Branch
O repo tem `master` e `main`. **Sempre trabalhar e dar push em `main`.** Branch atual: `main`.

```bash
git add .
git commit -m "descrição"
git push origin main
```

Nunca usar `--force` em `main` (ver §14).

### Line endings — LEIA ANTES DE COMMITAR
O repo não tem `.gitattributes`. Por isso ~154 arquivos aparecem como modificados no `git status` sendo que a diferença é **só CRLF vs LF** — `git diff --ignore-all-space` retorna vazio.

Antes de qualquer commit, verificar o que é mudança real:

```bash
git diff --ignore-all-space --stat
```

Se aparecer vazio, não há mudança de conteúdo. **Nunca commitar os 154 arquivos de ruído junto com uma alteração real** — isso torna o histórico inútil e impossibilita rollback preciso.

---

## 4. ESTRUTURA

```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardShell.tsx   ← header, logout, atalhos admin
│   │   ├── BottomDock.tsx       ← NAVEGAÇÃO PRINCIPAL (array NAV)
│   │   ├── DemoShell.tsx
│   │   └── LightScope.tsx
│   ├── OfertasLanding.tsx       ← landing parametrizável (padrão bom, reusar)
│   ├── Step7GeminiChat.tsx
│   ├── AdminStep7Video.tsx
│   ├── boost/ products/ withdrawal/ ui/
├── hooks/
│   ├── useShopSyncData.ts       ← agrega data.salesOrders por período
│   ├── use-metrics.ts
│   ├── use-theme.tsx
│   └── use-mobile.tsx
├── integrations/supabase/
│   ├── client.ts                ← client público (lazy via Proxy)
│   ├── client.server.ts         ← SERVICE_ROLE, só servidor
│   └── types.ts
├── lib/
│   ├── state.tsx                ← AppProvider (2.551 linhas — God object, ver §11)
│   ├── mock/products.ts
│   ├── format.ts  utils.ts  error-capture.ts  error-page.ts
├── routes/                      ← ver §5
└── routeTree.gen.ts             ← gerado pelo TanStack Router, NÃO editar
```

---

## 5. ROTAS

### Navegação real (`BottomDock.tsx`) — é isso que o usuário vê

| Rota | Label no dock |
|---|---|
| `/dashboard` | Dashboard |
| `/dashboard/produtos` | Produtos |
| `/dashboard/grupos` | Grupos de Divulgação |
| `/dashboard/robo-divulgador` | IA Divulgadora |
| `/dashboard/video-ia` | Vídeo IA |
| `/dashboard/conectar-contas` | Integrações |
| `/dashboard/aulas` | Aulas |
| `/dashboard/suporte` | Suporte |
| `/dashboard/configuracoes` | Configurações |
| `/dashboard/validar-cadastros` | Validar Cadastros — **só admin** |
| `/dashboard/suporte-admin` | Responder Tickets — **só admin** |

### Existem mas não estão no dock
- `/dashboard/metricas` — acessível por link interno
- `/dashboard/impulsionar-vendas` — **não liberado** (ver §1)
- `/demo/*` — preview sem login
- `/conta-em-analise` — ainda referenciada em `login.tsx:185` apesar da aprovação instantânea

### Públicas
`/` → **redireciona para `/ofertas4`** · `/login` · `/register` · `/redefinir-senha` · `/pagamento-bloqueado` · `/ofertas` `/ofertas2` `/ofertas3` `/ofertas4` · `/planos2` `/planos3` `/planosup` · `/mercadolivrecombr`

### Arquivos órfãos (candidatos a remoção)
- `dashboard.impulsionar-vendas.backup.tsx` — 922 linhas mortas
- `planos2` / `planos3` / `planosup` — ~270 KB, `planos2` e `planos3` diferem em **12 linhas** (só links de checkout)

---

## 6. PAPÉIS DE USUÁRIO

| Papel | Acesso |
|---|---|
| `admin` | Tudo. Painéis admin, botão raio, reset de vendas. |
| `presentation_admin` | Modo apresentação (GDM). |
| `regular_user` | Só os próprios dados. |

E-mails admin: `victor@shopesync.com`, `rikelme@shopsync.com`

⚠️ Hoje `isAdmin` é resolvido no client por `isAdminEmail()` (`state.tsx:849`), **sem consultar `user_roles`**. Isso é um problema aberto — ver §11.

Padrão de feature nova: **admin vê primeiro**, depois libera geral via `adminOnly`.

---

## 7. BANCO (Supabase)

### Tabelas

| Tabela | Para quê |
|---|---|
| `profiles` | Perfis + status da conta |
| `user_roles` | Papéis (fonte correta de permissão) |
| `sales_orders` | **FONTE ÚNICA DE VERDADE** das vendas |
| `user_products` | Produtos enviados para validação |
| `user_marketplace_connections` | Conexões com marketplace |
| `dashboard_lightning_events` | Eventos do botão raio |
| `withdrawal_requests` | Saques (visual) |
| `boost_campaigns` · `boost_simulated_events` | Impulsionar (dormente) |
| `video_projects` · `video_project_images` · `video_prompt_versions` | Vídeo IA |
| `support_tickets` · `support_messages` | Suporte |
| `registration_tokens` · `approved_emails` | Legado, inativos |

### RPCs em uso (19)

**Produtos/conexões:** `upsert_my_product_for_validation` · `validate_user_product` · `validate_user_pending_products` · `validate_all_pending_products` · `validate_marketplace_connection` · `validate_user_pending_connections` · `validate_all_pending_connections` · `reject_marketplace_connection`

**Contas:** `approve_user` · `reject_user` · `cron_auto_approve_pending_accounts`

**Vendas:** `create_robo_sale_order` · `admin_create_demo_sale_order` · `admin_bulk_demo_commission_shopee` · `release_automatic_demo_sales` · `reset_today_sales`

**Boost/saque:** `admin_create_boost_campaign` · `admin_cancel_boost_campaign` · `release_due_boost_events` · `create_withdrawal_request`

### Edge Functions
`evopay-create-pix` · `evopay-webhook` · `generate-video-chat` · `generate-video-script` · `send-registration`

---

## 8. LINKS DE PAGAMENTO (CRÍTICO — não perder)

### Em produção — `/ofertas4` (é para onde `/` redireciona)

| Plano | Método | Link |
|---|---|---|
| Mensal | PIX | https://go.ironpayapp.com.br/zbu0e9tvo9 |
| Mensal | Cartão | https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=Q7TO6PU |
| Vitalício | PIX | https://go.ironpayapp.com.br/wqqa7uihfe |
| Vitalício | Cartão | https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=4XWIBWR |

### Outras landings (hashes diferentes, conferir no arquivo antes de mexer)
`ofertas` · `ofertas2` · `ofertas3` têm configs próprias em cada arquivo de rota.
`planos2` / `planos3` / `planosup` usam IronPay + PerfectPay + Wiven.

Hashes IronPay presentes no código: `zbu0e9tvo9` `wqqa7uihfe` `knwcyeiala` `jxzfsyhoci` `paqjh` `a7brsesrse` `bsyspglspg` `k32yu4hx10` `kteiyf8epw` `rnaqezkbld`

**Nunca alterar link de pagamento sem confirmar com o Juam qual landing está no ar.**

---

## 9. IDENTIDADE VISUAL

- **Cor primária:** `#EE4D2D` (laranja Shopee). Landings usam `#F4541E` → `#FF7A45`.
- **Fontes:** Inter (corpo), Sora (títulos)
- **O app tem tema claro E escuro**, alternados pelo botão no `BottomDock` (`hooks/use-theme.tsx`, chave `upshopee-theme` no localStorage). **O foco é o modo escuro** — é onde o produto fica mais bonito. Todo componente novo precisa funcionar nos dois.
- **Nunca hardcodar cor.** Usar os tokens de `src/styles.css`, que já trocam sozinhos:

| Token | Claro | Escuro |
|---|---|---|
| `--bg` | `#F7F7F5` | `#0A0A0C` |
| `--surface` | `#FFFFFF` | `#141417` |
| `--surface-2` | `#F2F2F0` | `#1A1A1E` |
| `--text` | `#17171A` | `#FFFFFF` |
| `--muted` | `#6E6E76` | `#A0A0A8` |
| `--border` | `#E8E8E4` | `#26262B` |
| `--accent` | `#F4541E` (igual nos dois) | |

- **Exceção:** `/dashboard` e `/dashboard/metricas` passam `forceLight` no `DashboardShell` e ficam claras sempre. Todas as outras páginas do dashboard seguem o toggle.
- **Landings (`ofertas*`, `planos*`):** sempre escuras, CSS próprio.

---

## 10. REGRAS DE OURO

1. **Fonte única:** todo valor de venda/comissão vem de `data.salesOrders`. Nada hardcoded, nada divergente entre páginas.
2. **Mobile-first 320px+:** sem scroll horizontal, sem elemento cortado. Empilha no mobile, grid no desktop.
3. **Nunca escrever "demo/fake/simulado"** perto de valores, comissões, vendas ou cards de pedido. O aviso discreto de demo já existe — não adicionar outro.
4. **Nenhuma transação real** (exceção documentada no §1).
5. **Diagnóstico antes do fix.** Investigar e reportar antes de mudar código. Nunca mexer às cegas.
6. **Uma página por vez.** Nunca mudança grande espalhada por vários arquivos.
7. **Conferir `git diff --ignore-all-space`** antes de commitar (ver §3).

---

## 11. PENDÊNCIAS (ordem de prioridade)

### 🔴 CRÍTICO — bloqueia lançamento

**1. Senha de admin no bundle publicado**
`src/lib/state.tsx:8` → `const ADMIN_PASSWORD = "12345678";`
Confirmado presente em `dist/assets/index-DXWVEmc-.js`, junto com os e-mails de admin.
Agravante: `state.tsx:1255-1265` faz auto-provisionamento de conta admin usando `password || ADMIN_PASSWORD`.

Correção:
1. Trocar as senhas reais no Supabase (fora do código)
2. Deletar `ADMIN_PASSWORD` e o bloco de auto-provisionamento
3. Fazer `isAdmin` depender só de `user_roles` server-side
4. Conferir se as policies RLS de admin usam `auth.uid()` + `user_roles`, não lista de e-mail

**2. `.env` versionado no git**
`.gitignore` tem `.env*`, mas o arquivo foi commitado antes da regra. As chaves são *publishable* (impacto baixo), mas o padrão é ruim e já está no histórico.

**3. Duas policies RLS com `USING (true)`**
Migrations `20260522211315` e `20260609173538`. Revisar se a exposição é intencional.

### 🟡 IMPORTANTE

**4. Gráfico do dashboard é falso**
`routes/dashboard.index.tsx:701-702` usa `Math.sin` nos ranges 7d/30d, sem relação com `data.salesOrders`. Viola a Regra de Ouro #1 — os cards mostram um valor e a curva embaixo mostra outro.

**5. `QueryClient` recriado a cada render**
`routes/__root.tsx:74` → `const queryClient = new QueryClient();` dentro do componente. Zera o cache do React Query em todo re-render do root. Correção de uma linha.

**6. Fonte de verdade dividida**
`loadUserData()` (`state.tsx:540`) lê do `localStorage`; `fetchAll()` (linhas 1110-1147) faz merge com o Supabase preservando ordens locais (GDM, seed, lightning) que só existem no navegador. Trocar de navegador = perder dados.

**7. Falta `.gitattributes`** (ver §3)

### 🟢 DEPOIS DO LANÇAMENTO

- Quebrar `state.tsx` (2.551 linhas) em módulos: auth / vendas / boost / produtos
- Consolidar `planos2`/`planos3`/`planosup` no padrão `OfertasLanding` (economiza ~180 KB)
- Remover `dashboard.impulsionar-vendas.backup.tsx`, `wrangler.jsonc`, `/conta-em-analise`
- Typecheck leva **mais de 8 minutos** — sintoma dos arquivos de 1.300+ linhas com JSX inline
- Chunk principal do bundle: 1,1 MB
- Supabase próprio, popup de grupo de alunos no WhatsApp

---

## 12. FLUXO DE TRABALHO

1. **Diagnóstico SEMPRE antes do fix.** Investigar, reportar o achado, só então mexer.
2. **Uma página por vez.**
3. **Antes de commitar:** rodar `git diff --ignore-all-space --stat` e commitar só o que mudou de verdade.
4. **Push em `main`.**
5. **`routeTree.gen.ts`** é gerado. Rota nova → regenera com `npm run dev`. Nunca editar na mão.
6. **Modelo:** Opus para tarefas delicadas (auth, RLS, state.tsx, qualquer coisa que toque em pagamento ou permissão). Sonnet dá conta do resto — ajuste de layout, copy, CSS.
7. **A sessão roda com `--dangerously-skip-permissions`.** Não há confirmação antes de editar arquivo. Por isso, em tarefa de auth, RLS ou pagamento: **diagnosticar e reportar antes de escrever qualquer linha**. O diagnóstico prévio é a rede de proteção que sobrou no lugar do prompt de permissão.
8. **Prompts para o Claude Code são escritos em inglês.** Só texto que aparece literalmente no site fica em português, entre aspas, marcado como copy que não deve ser traduzida.

---

## 13. CONTATO

- **Suporte WhatsApp:** https://wa.me/5534992017453
- **Instagram:** https://www.instagram.com/shope_sync/

---

## 14. HISTÓRICO DE CRISES

| Incidente | Causa raiz | Correção | Lição |
|---|---|---|---|
| Site inteiro caiu, todos bloqueados | Gate de auth/pagamento com `?? "pending"` bloqueou todo mundo, inclusive admins | `git reset --hard` + force push na `main` | Nunca mexer em gate de auth sem testar TODOS os papéis |
| Loop infinito de redirect no `/login` | Mudança de auth state disparava redirect em loop | Revertido | Testar redirect em todo estado de auth |
| Lovable desconectou do GitHub | Force push reescreveu o histórico | Reconexão manual | Evitar `--force` na `main` |

**Lição mestre: uma página por vez. Diagnóstico primeiro. Push na `main`.**
