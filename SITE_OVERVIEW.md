# 🏪 UpShopee — Site Overview (Comprehensive)

> **Generated:** 2026-06-29
> **Based on:** Full codebase audit — CLAUDE.md, PLANO_UPSHOPEE_V2.md, all route files, global state (~2300 lines), Supabase types, Edge Functions, DashboardShell, and auth system.
> **Purpose:** Single-source reference for any Claude Code session working on this project.

---

## 1. WHAT IS UPSHOPEE?

**UpShopee** (formerly ShopeSync) is a **SaaS dashboard for Shopee affiliates and sellers**. Users connect Shopee accounts, track sales and commissions, boost products, manage affiliate groups, use the "Robô Divulgador" automation tool, and generate AI video scripts for product promotion.

- **Status:** Functional presentation prototype → Real launch: **August 2026**
- **GOLDEN RULE:** All financial flows (sales, commissions, withdrawals, boost, payments) are **VISUAL only** — no real transactions ever happen. The product must look and behave like a real product at all times.
- **GitHub:** https://github.com/joaovictotf/upshopee
- **Deploy:** Lovable (watches `main` branch) — **always push to `main`**, never `master`

---

## 2. TECH STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| UI Framework | React | ^19.2.0 | |
| Router | TanStack Router (file-based) | ^1.168.25 | Auto-generates `src/routeTree.gen.ts` |
| Build tool | Vite | ^7.3.1 | |
| Styling | Tailwind CSS v4 | ^4.2.1 | |
| Components | shadcn/ui + Radix UI | various | Located in `src/components/ui/` |
| Language | TypeScript | ^5.8.3 | |
| Backend/Auth/DB | **Supabase** | ^2.106.0 | Project ID: `ndawyrqzqhzbyjdmkdge` |
| Forms | react-hook-form + zod | ^7.x / ^3.x | |
| Charts | recharts | ^2.15.4 | |
| Package mgr | Bun (preferred) / npm | — | |
| Legacy CF | @cloudflare/vite-plugin | ^1.25.5 | To be removed on Vercel migration |

---

## 3. VISUAL IDENTITY

- **Primary color:** `#EE4D2D` (Shopee orange)
- **Font:** Inter
- **Dashboard theme:** LIGHT — white / `#FFF8F5` backgrounds. **Zero black backgrounds** inside the dashboard.
- **Landing /planos:** Dark theme (`#080808`) — the ONLY exception to the light theme.
- All cards use `rounded-2xl border border-gray-100 bg-white shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]`

---

## 4. USER ROLES (3 total)

| Role | Access | How it's checked |
|---|---|---|
| `admin` | Full access. All data. Admin panels. Lightning/reset buttons. | `profile?.role === 'admin'` + email check in `isAdminEmail()` |
| `presentation_admin` | Demo presentation mode. Sees GDM presentation data. | `user_roles` table with `role = "presentation_admin"` |
| `regular_user` | Normal user. Sees their own data. Gets auto-sales every ~5h. | Default for all non-admin/non-presentation users |

**Admin emails (hardcoded):** `victor@shopesync.com`, `rikelme@shopsync.com`
**Admin password:** `12345678` (known issue: hardcoded in client bundle — to be fixed post-launch)

**New feature pattern:** Admin sees first, then released to all via `adminOnly` toggle.

**Authorization flow:**
- `DashboardGate` (`src/routes/dashboard.tsx`) checks `authReady`, `user`, `accountStatus`, and `bankInfo`
- Payment-blocked users go to `/pagamento-bloqueado`
- Non-logged-in users go to `/login`
- Accounts with `approval_status = "pending"` are signed out on login

---

## 5. COMPLETE ROUTE MAP

### Public Routes (no auth required)

| Route | File | Purpose |
|---|---|---|
| `/` | `src/routes/index.tsx` | Landing page |
| `/login` | `src/routes/login.tsx` | Login page (Shopee-style redesign ✅) |
| `/register` | `src/routes/register.tsx` | Registration page |
| `/planos` | `src/routes/planos.tsx` | Pricing page (dark theme, payment modal) |
| `/planos2` | `src/routes/planos2.tsx` | Pricing page variant 2 |
| `/planos3` | `src/routes/planos3.tsx` | Pricing page variant 3 |
| `/conta-em-analise` | `src/routes/conta-em-analise.tsx` | Account under review page |
| `/pagamento-bloqueado` | `src/routes/pagamento-bloqueado.tsx` | Payment blocked page |
| `/redefinir-senha` | `src/routes/redefinir-senha.tsx` | Password reset page |

### Dashboard Routes (auth required — gated by `DashboardGate`)

| Route | File | Purpose | Admin-only? |
|---|---|---|---|
| `/dashboard` | `src/routes/dashboard.tsx` | **Layout gate** (auth check, bank info gate) | No |
| `/dashboard/` | `src/routes/dashboard.index.tsx` | **Dashboard home** — KPIs, chart, lightning, recent sales | No |
| `/dashboard/produtos` | `src/routes/dashboard.produtos.tsx` | **Product catalog** — browse/search local products, add to my products | No |
| `/dashboard/impulsionar-vendas` | `src/routes/dashboard.impulsionar-vendas.tsx` | **Boost sales** — 4 paid packs (Início/Aceleração/Escala/Máximo) via EvoPay PIX | No |
| `/dashboard/grupos` | `src/routes/dashboard.grupos.tsx` | **Affiliate groups** — WhatsApp group management, member stats | No |
| `/dashboard/robo-divulgador` | `src/routes/dashboard.robo-divulgador.tsx` | **Bot publisher** — automated product sharing to WhatsApp groups | No |
| `/dashboard/video-ia` | `src/routes/dashboard.video-ia.tsx` | **Video IA** — 7-step AI video script generator (Gemini-powered) | No |
| `/dashboard/conectar-contas` | `src/routes/dashboard.conectar-contas.tsx` | **Connect accounts** — Shopee marketplace connection | No |
| `/dashboard/configuracoes` | `src/routes/dashboard.configuracoes.tsx` | **Settings** — bank info, privacy, account details | No |
| `/dashboard/metricas` | `src/routes/dashboard.metricas.tsx` | **Metrics** — detailed analytics page | No |
| `/dashboard/validar-cadastros` | `src/routes/dashboard.validar-cadastros.tsx` | **Validate registrations** — admin panel for user/product validation | ✅ Admin |
| `/dashboard/impulsionar-vendas/backup` | `src/routes/dashboard.impulsionar-vendas.backup.tsx` | Backup of boost page | No |

### Demo Routes (unauthenticated preview)

| Route | File | Purpose |
|---|---|---|
| `/demo` | `src/routes/demo.tsx` | Demo shell layout |
| `/demo/` | `src/routes/demo.index.tsx` | Demo dashboard home |
| `/demo/produtos` | `src/routes/demo.produtos.tsx` | Demo product catalog |
| `/demo/grupos` | `src/routes/demo.grupos.tsx` | Demo groups |
| `/demo/robo-divulgador` | `src/routes/demo.robo-divulgador.tsx` | Demo bot publisher |
| `/demo/vendas-clientes` | `src/routes/demo.vendas-clientes.tsx` | Demo sales/customers |
| `/demo/precificacao` | `src/routes/demo.precificacao.tsx` | Demo pricing tool |

### Pages NOT yet implemented (referenced in docs but files don't exist)
- `dashboard.meus-produtos.tsx` — "My Products" page
- `dashboard.precificacao.tsx` — Pricing calculator page
- `dashboard.tutoriais.tsx` — Tutorials page
- `dashboard.adicionar-adms.tsx` — Add admins page

---

## 6. SIDEBAR NAVIGATION (DashboardShell.tsx)

All items from the `baseNav` array (lines 57-70), rendered for all users:

| Label | Route | Icon | Special? |
|---|---|---|---|
| Dashboard | `/dashboard` | `LayoutDashboard` | `exact: true` |
| Produtos | `/dashboard/produtos` | `Package` | |
| Impulsionar vendas | `/dashboard/impulsionar-vendas` | `Zap` | `special: "impulsionar"` (orange badge) |
| Grupos de Divulgação | `/dashboard/grupos` | `Megaphone` | |
| Robô Divulgador | `/dashboard/robo-divulgador` | `Bot` | |
| Vídeo IA | `/dashboard/video-ia` | `Video` | |
| Conectar Contas | `/dashboard/conectar-contas` | `Plug` | |
| Configurações | `/dashboard/configuracoes` | `Settings` | |

**Admin-only extra nav items:**
| Label | Route | Icon |
|---|---|---|
| Validar Cadastros | `/dashboard/validar-cadastros` | `ShieldCheck` |

Note: The sidebar has the `Vendas e Clientes` and `Métricas` labels commented out or absent in the current version.

---

## 7. DATABASE (Supabase — project `ndawyrqzqhzbyjdmkdge`)

### Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | User profiles + roles + approval | `user_id`, `full_name`, `email`, `approval_status`, `is_demo`, `demo_expires_at`, `password_reset_required` |
| `user_roles` | Role assignments | `user_id`, `role` (enum: `admin`, `user`, `presentation_admin`) |
| `sales_orders` | **SINGLE SOURCE OF TRUTH** — all sales/commissions | `id`, `user_id`, `product_name`, `commission`, `marketplace`, `sale_price`, `supplier_cost`, `is_demo`, `source` |
| `user_products` | Central product validation table | `id`, `user_id`, `local_id`, `name`, `validation_status`, `status` |
| `user_marketplace_connections` | Marketplace connection requests | `user_id`, `marketplace`, `status` (enum: `pending_validation`, `approved`, `rejected`) |
| `boost_campaigns` | Boost/impulsionar campaigns | `user_id`, `pack_id`, `pack_name`, `pack_value`, `status` |
| `boost_simulated_events` | Scheduled boost sales events | `campaign_id`, `user_id`, `product_name`, `commission`, `status` |
| `dashboard_lightning_events` | Admin lightning bolt sales events | `user_id`, `amount` |
| `withdrawal_requests` | Withdrawal requests (visual only) | `user_id`, `requested_amount`, `pix_key`, `status` |
| `registration_tokens` | Legacy — no longer active | — |
| `approved_emails` | Legacy — no longer active | — |

### Enums
| Enum | Values |
|---|---|
| `app_role` | `admin`, `user`, `presentation_admin` |
| `approval_status` | `pending`, `approved`, `rejected`, `blocked_payment` |
| `connection_status` | `pending_validation`, `approved`, `rejected` |
| `product_validation_status` | `pending_validation`, `approved`, `rejected` |

### RPCs (Supabase functions — 30+)
Key ones: `reset_today_sales`, `upsert_my_product_for_validation`, `approve_user`, `cron_auto_approve_pending_accounts`, `create_robo_sale_order`, `admin_create_demo_sale_order`, `admin_bulk_demo_commission_shopee`, `admin_create_boost_campaign`, `create_withdrawal_request`, `record_lightning_click`, `release_automatic_demo_sales`, `release_due_boost_events`, `has_lightning_access`, `has_role`, and many admin validation functions.

---

## 8. GLOBAL STATE (src/lib/state.tsx — ~2400 lines)

The `AppProvider` context powers the entire app. It manages:

### Auth
- **Login flow:** Supabase `signInWithPassword` + profile/role fetch + approval check
- **Registration:** Supabase `signUp` with auto-confirm → `signOut` (pending users can't access)
- **Admin auto-provision:** Admin accounts are auto-created on first login attempt
- **Session listener:** `onAuthStateChange` → `hydrate()` rebuilds all state
- **Payment block polling:** Every 8 seconds checks `approval_status` for `blocked_payment`

### Data Structures (in `UserData`)
```typescript
type UserData = {
  salesOrders: SalesOrder[];    // SINGLE SOURCE OF TRUTH
  meusProdutos: SavedProduct[];
  marketplaces: Record<Marketplace, MarketplaceData>;
};
```

### Realtime Sync (Supabase subscriptions — 7 active channels)
1. **sales_orders** — admin: all rows; user: their own rows. Rebuilds commission history on each INSERT.
2. **profiles** — admin-only: rebuilds accounts list on any change.
3. **user_products** — admin: all rows; user: their own rows. Syncs validation status.
4. **user_marketplace_connections** — admin: all; user: their own.
5. **boost_simulated_events** + **boost_campaigns** — user: their active boost.
6. **dashboard_lightning_events** — admin/presentation: lightning order refresh.
7. **withdrawal_requests** — user: their withdrawal status.

### Auto-Sale System (for regular users)
- **Trigger:** Every 60s, tries to generate a sale IF a product has been ready for >5h AND last auto-sale was >5h ago.
- **Commission pool:** `[12.9, 15.4, 18.7, 22.3, 24.9, 27.5, 29.9]` — random pick.
- **All automated sales go through RPCs** (`create_robo_sale_order`) so all devices see the same data.
- **Admins do NOT get auto-sales** — they use the lightning button instead.

### GDM (Presentation Dashboard)
- `presentation_admin` users see **deterministic seed orders** (`buildGdmPresentationOrders()`)
- 7-day target: R$ 58,435.70; 30-day target: R$ 233,742.80
- Orders have `id` prefix `gdm-` and `source: "gdm_presentation_data"`
- Injected on login, removable filter keeps them out of regular user views

### Admin-Only Features
- **Lightning button** (`recordLightningClick`): random R$40-350 sale, persisted as `dashboard_lightning_events`
- **Reset today sales** (`resetTodaySales`): deletes today's lightning events + calls `reset_today_sales` RPC
- **Account management:** approve/reject/block/unblock users
- **Product validation:** approve/reject individual or batch, `bulkApproveAllProductsAndMakeReady()`
- **Manual commission** (`addManualCommissionToUser`): admin adds a sale for a specific user
- **Bulk commission** (`bulkAdminDemoCommissionShopee`): admin adds commission for ALL approved users
- **Boost campaigns** (`adminCreateBoostCampaign`): create/cancel boost for any user
- **Presentation admin management:** `grantPresentationAdmin` / `revokePresentationAdmin`
- **Admin presentation mode toggle:** sees the app as a regular user would

### LocalStorage Keys
- `shopesync.user` — logged-in user cache
- `shopesync.userdata.{email}` — persisted user data (products, orders)
- `shopesync.selectedMarketplace` — active marketplace filter
- `shopesync.privacy` — privacy mode toggle
- `shopesync_admin_presentation_mode` — admin presentation mode
- `shopesync_admin_demo_connections` — admin's demo connections (sessionStorage)
- `shopesync.vendashoje.{email}` — today's sales cache
- `shopesync.commissionhist.{email}` — commission history cache
- `shopesync.lastautosale.{email}` — last auto-sale timestamp
- `shopesync.todayreset.{email}` — last reset timestamp

---

## 9. PAYMENT/PLAN SYSTEM

### Plans
| Plan | Price | Payment |
|---|---|---|
| Monthly | R$ 145/mo | PIX or Card |
| Lifetime (promo from R$528) | R$ 285 | PIX or Card |

### Payment Links (CRITICAL — never lose)
| Plan | Method | Link |
|---|---|---|
| Monthly | PIX | https://go.ironpayapp.com.br/knwcyeiala |
| Monthly | Card | https://go.perfectpay.com.br/PPU38CQC838 |
| Lifetime | PIX | https://go.ironpayapp.com.br/jxzfsyhoci |
| Lifetime | Card | https://go.perfectpay.com.br/PPU38CQC83E |

### Payment Processing
- **EvoPay** handles PIX payment collection (IronPay token in `.env`)
- Edge Function `evopay-create-pix` generates PIX QR codes
- Edge Function `evopay-webhook` receives payment confirmations and activates boost packs
- All financial flows are **visual/test only** — no real money moves

---

## 10. EDGE FUNCTIONS (Supabase — 4 total)

| Function | Path | Purpose | Deployed? |
|---|---|---|---|
| `evopay-create-pix` | `supabase/functions/evopay-create-pix/index.ts` | Generates PIX QR codes via EvoPay API for boost pack payments | ✅ ACTIVE v5 |
| `evopay-webhook` | `supabase/functions/evopay-webhook/index.ts` | Receives EvoPay webhooks, activates boost on completed payment | ✅ ACTIVE v6 |
| `generate-video-script` | `supabase/functions/generate-video-script/index.ts` | Calls Gemini API to generate full video script from product + style data | ✅ ACTIVE v2 |
| `generate-video-chat` | `supabase/functions/generate-video-chat/index.ts` | Embedded chat — user refines video script via Gemini conversation | ✅ ACTIVE v1 |

### Edge Function Architecture Pattern
All functions follow the same template:
1. CORS preflight (OPTIONS → 204)
2. Method check (POST only)
3. Input validation (zod or manual check)
4. Gemini/EvoPay API call with AbortController timeout (25s)
5. Fallback response on failure
6. Structured envelope: `{ ok: boolean, ...data }` or `{ ok: false, error: string }`

### Secrets
- `GEMINI_API_KEY` — Google AI Studio API key (NB: current key has quota issues)
- `EVOPAY_TOKEN` — IronPay/EvoPay integration token
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc. — Supabase internal

---

## 11. THE VIDEO IA FEATURE (7-step flow)

**File:** `src/routes/dashboard.video-ia.tsx` (~1250 lines)

| Step | Label | Icon | What happens |
|---|---|---|---|
| 1 | Produto | `Package` | Select existing product from catalog OR enter manual product details |
| 2 | Imagens | `Image` | Upload 1 primary image + up to 3 additional images (JPG/PNG/WEBP, max 5MB each) |
| 3 | Informações | `Info` | Product details: name, description, benefits, target audience, differentiators, problem solved |
| 4 | Estilo | `Sparkles` | Choose from 13 video styles, duration (15s/30s/60s), voice type, tone, on-screen text, music |
| 5 | Geração | `Wand2` | Calls `generate-video-script` Edge Function → Gemini generates full script |
| 6 | Revisão | `Check` | Edit all generated fields: title, hook, script, voiceover, on-screen texts, CTA, caption, hashtags, final prompt |
| 7 | Gemini | `Star` | **NEW — Embedded chat:** converse with Gemini to refine the script without leaving the app |

### GeneratedContent type (output of step 5)
```typescript
{
  idea_title: string;   // Video title idea
  hook: string;         // Opening hook
  script: string;       // Full scene-by-scene script
  voiceover: string;    // Narration text
  screen_texts: string; // On-screen text overlays
  cta: string;          // Call to action
  caption: string;      // Social media caption
  hashtags: string;     // Hashtags
  final_prompt: string; // English prompt for external video generators
}
```

### 13 Video Styles
`produto-destaque`, `oferta-rapida`, `problema-solucao`, `demonstracao`, `unboxing`, `ugc`, `cinematografico`, `achadinho`, `antes-depois`, `narracao`, `texto-tela`, `sem-fala`, `promocao`

### Architecture
- **No video is generated by UpShopee** — the app generates scripts and prompts
- Gemini API calls happen exclusively in Edge Functions (key never exposed to frontend)
- Images uploaded to Supabase Storage
- The embedded chat (step 7) maintains conversation context with product/style/content data

---

## 12. THE "PRODUTOS PARA AFILIADOS" PLAN (FASE 3 — NOT YET BUILT)

**Status:** 🔜 Planned, not started

A new tab where admins manually curate interesting products for affiliates:
- **4 new tables:** `affiliate_product_catalog`, `affiliate_product_images`, `affiliate_product_categories`, `user_affiliate_products`
- **User flow:** Browse catalog → see product details + ShopSync score → copy product link → open Shopee Afiliados → generate personal affiliate link → save back
- **Admin flow:** CRUD products, upload images, set price/commission/tags, CSV import, review stale products
- **ShopSync score:** 0-100 calculated automatically
- **5 screens:** Catalog, Product details, "Generate my link" modal, Admin CRUD panel, User's saved products

---

## 13. GOLDEN RULES (DO NOT VIOLATE)

1. **Single data source:** All sales/commission values across ALL pages must read from `data.salesOrders`. No hardcoded or diverging values.
2. **Mobile-first 320px+:** Every page and component must work on small screens. No horizontal scroll. No cut-off elements. Stack vertically on mobile, grid on desktop.
3. **Never show "demo/fake/simulated"** near values, commissions, sales, or order cards. The discrete demo notice already exists — do not add another.
4. **No real financial transactions** — ever. Implement payment/withdrawal flows as visual/test only.
5. **Diagnosis before fix:** Always investigate and report before changing any code. Never change things "blind."
6. **One page at a time:** Never make large sweeping changes across multiple files at once.

---

## 14. WORKFLOW RULES

1. **Diagnosis ALWAYS before fix** — investigate every flow before touching code. Report findings first.
2. **One page at a time** — never big changes everywhere at once.
3. **Push to `main`** — always end tasks with `git add . && git commit -m "..." && git push origin main`
4. **Route tree is auto-generated** — `src/routeTree.gen.ts` is generated by TanStack Router. Don't edit manually.
5. **Never force push to `main`** — broke Lovable sync in the past.

---

## 15. CRISIS HISTORY

| Incident | Root Cause | Fix | Lesson |
|---|---|---|---|
| Entire site broke, all users blocked | Auth/payment gate defaulted `?? "pending"` which blocked everyone including admins | `git reset --hard` + force push | Never change auth gates without testing every role |
| Infinite redirect loop on `/login` | Auth state change caused redirect logic to loop | Reverted problematic auth check | Test redirect logic for every auth state |
| GitHub disconnected from Lovable | Force push rewrote history | Re-connected via Lovable dashboard | Avoid `--force` on `main` |

---

## 16. WHAT SHOULD NEVER BE TOUCHED

### 🚫 ABSOLUTELY DO NOT MODIFY:
- **`dashboard.impulsionar-vendas.tsx`** — Design and functionality must remain intact (explicitly stated in PLANO_UPSHOPEE_V2.md: "NÃO MEXER")
- **`evopay-create-pix` and `evopay-webhook` Edge Functions** — Payment integration is already complete
- **`generate-video-script` Edge Function** — Already working (step 5 depends on it)
- **Database schema** — Current structure is maintained and stable
- **Payment links / offer hashes** — Critical production values

### ⚠️ TREAT WITH EXTREME CARE:
- **`state.tsx`** — Core of the entire app. Changes here affect everything. Always understand the full ripple effect.
- **`DashboardShell.tsx`** — Shared layout used by every dashboard page
- **`CLAUDE.md`** — Master project memory document
