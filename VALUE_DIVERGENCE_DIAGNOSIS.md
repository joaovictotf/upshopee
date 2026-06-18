# VALUE DIVERGENCE DIAGNOSIS — ShopSync

> **DIAGNOSIS ONLY.** No code was changed, committed, or pushed.
> Investigation date: 2026-06-15
> Bug: the SAME account shows DIFFERENT sales/commission values on different
> devices (mobile vs desktop) and/or values that don't match between pages.
> A previous fix anchored `getCommissionSum`'s day boundary to
> America/Sao_Paulo (commit `0a496eb`), but the problem PERSISTS.

---

## TL;DR — ROOT CAUSES (ranked by impact)

1. **[CRITICAL] Per-device localStorage is the de-facto data store for regular users.**
   Regular-user automatic sales are written to **local React state + localStorage only**
   (`commitOrder`), never to Supabase `sales_orders`. Because `Math.random()` decides
   *when*, *which product*, and *how much* each auto-sale is, **device A and device B
   generate completely different order sets** for the same account. The Supabase
   cross-device sync only ever pulls *server* rows; local-only orders (non-UUID ids)
   are deliberately kept forever per device. This is the dominant cause of the same
   account showing different values on two devices.

2. **[CRITICAL] `vendasHoje` "vendas hoje" counter grows randomly per device.**
   The midnight-tick effect adds `Math.random()`-pooled increments to a per-device
   localStorage store (`shopesync.vendashoje.*`) every 25s. Two devices diverge
   immediately. (Mitigating note: no page currently *renders* `vendasHoje`, so its
   visible blast radius is low today — but it is still per-device divergent state.)

3. **[HIGH] Admin baseline + Math.random seeded history differ per device.**
   - `seedAdminHistory()` uses `Math.random()` to fabricate 30 days of commission
     history, persisted per device in localStorage. Different on every fresh init.
   - `dashboard.metricas.tsx` injects a **hardcoded `252` order baseline** and a
     fixed `5.56%` conversion for admin "today".
   - `robo-divulgador` "revenue"/credits are hardcoded/`Math.random` and stored
     per-device in localStorage (`shopesync.credits.*`).

4. **[HIGH] Dashboard + Métricas charts are 100% synthetic (Math.sin / Math.exp / Math.random), not `data.salesOrders`.**
   Confirmed below. The chart never reads real orders. It also keys off raw
   `new Date().getHours()` (browser-local), so the "today so far" cutoff differs by
   device timezone.

5. **[MEDIUM] Remaining raw browser-local time (not America/Sao_Paulo).**
   `getCommissionSum` start boundary is SP-anchored, but **many other spots still use
   raw local time**: the chart `getHours()`, `useShopSyncData.getPeriodStartTs`
   end-of-window via `Date.now()`, `todayKey()`/`dateKey()`/`sumRange`,
   `calcBusinessDays`, `getOrderDayDiff`, the dashboard timestamp `(GMT-03)` label,
   and the per-day commissionHistory bucketing. Two devices in different timezones
   bucket the same order into different days.

6. **[LOW] `getCommissionSum` mixes SP-anchored start with raw `Date.now()` end.**
   Minor edge effects near midnight; not the main driver but should be unified.

The DEFINITIVE fix is to make **`data.salesOrders` (sourced from Supabase
`sales_orders`) the single server-side source** for every value, compute every
window with one SP-anchored helper, and **stop generating client-side random
sales / counters that live only in localStorage**.

---

## 1. COMPLETE INVENTORY OF EVERY VALUE DISPLAY/COMPUTATION

Legend for **Source**:
- `SO` = `data.salesOrders` (ultimately Supabase `sales_orders`, the intended single source)
- `GCS` = `getCommissionSum()` (reads `SO`)
- `HOOK` = `useShopSyncData()` (reads `SO`)
- `VH` = `vendasHoje` state (per-device localStorage, `Math.random` growth)
- `CH` = `commissionHistory` (per-device localStorage; rebuilt from `SO` on sync; admin seeded via `Math.random`)
- `LS` = other localStorage-only per-device value
- `HC` = hardcoded literal / array
- `SIN` = synthetic Math.sin/Math.cos/Math.exp/Math.random chart math

### 1.1 `src/lib/state.tsx` (the engine)

| Line | Symbol | What it does | Source | Notes / divergence risk |
|---|---|---|---|---|
| 1425–1442 | `getCommissionSum(mp, range)` | Sums `o.netProfit` over window | **SO** | Start SP-anchored (good). **End = raw `Date.now()`** → mixed tz boundary. |
| 1035–1093 | `applyOrders()` | Maps Supabase rows → `SO`, rebuilds MP aggregates + `commissionHistory` | **SO/Supabase** | `commissionHistory` rebuilt via `dateKey()` (raw local tz). |
| 1059–1067 | local-only merge | Keeps orders whose id is NOT a UUID and not in remote set | **SO (local-only)** | **This is what preserves per-device random orders forever.** |
| 1119–1143 | midnight tick | `Math.random()<0.5` adds `VENDA_INC_POOL` to `vendasHoje` | **VH + Math.random** | Per-device, time via `todayKey()`/`getHours()` raw local. |
| 1159–1176 | `tryAutoSale` | Builds a random order & calls `commitOrder` | **Math.random** | **Regular-user sales never hit Supabase → per device.** |
| 1286–1323 | `commitOrder` | Writes order to local `SO`, `vendasHoje`, `commissionHistory` | **local only** | No Supabase insert. Pure client/localStorage. |
| 672–686 | `seedAdminHistory` | 30 days of `Math.random()` commission + `today=502.83` | **Math.random/HC** | Different per device init; persisted to localStorage. |
| 701–710 | `sumRange` | Sums `commissionHistory` days (raw local `dateKey`) | **CH** | Currently unused by displays (dead-ish), but tz-naive. |
| 712–724 | `loadVendasHoje` | admin seed `{shopee: 5028.34}` else 0 | **HC/LS** | Per-device baseline. |
| 252–258 | `demoSeries` | `Math.sin`-based 7-day series | **SIN** | Feeds `marketplaces.series` (legacy aggregates). |
| 335–350 | `adminInitialData` | hardcoded sales/revenue/commission (23 / 5028.34 / 502.83) | **HC** | Admin localStorage baseline if no saved data. |
| 434–512 | `buildGdmPresentationOrders` | Deterministic LCG seed → admin/presentation orders | **SO (deterministic)** | Good: deterministic, same per device. Targets 7d=58 435,70 / 30d=233 742,80. |
| 514–518 | `injectGdmOrders` | Injects GDM orders for admin/presentation_admin | **SO** | Only for admin/presentation — not regular users. |
| 2244–2269 | `buildLightningOrder` | Lightning event → order (hash-based product) | **SO/Supabase** | Backed by `dashboard_lightning_events` (cross-device OK). |
| 2309–2323 | `recordLightningClick` | `Math.random()` 40–350 then server RPC | **Supabase** | Amount server-clamped; order materialized from server list. |
| 2312 | lightning amount | `Math.round((40+Math.random()*310)*100)/100` | **Math.random** | Persisted server-side via RPC, so consistent after refresh. |
| 1076–1078 | MP aggregates | `mine.reduce(...salePrice/netProfit)` | **SO** | Rebuilt from merged orders. |

### 1.2 `src/hooks/useShopSyncData.ts`

| Line | Symbol | Source | Notes |
|---|---|---|---|
| 29–38 | `getPeriodStartTs` | **SO window** | Start SP-anchored (good). No explicit end → relies on `o.saleDate >= startTs` only. |
| 44–50 | `filtered` | **SO** | Filters `data.salesOrders` by `saleDate >= startTs`. |
| 58–79 | sums | **SO** | `totalCommission += o.netProfit`, `totalRevenue += o.salePrice`, buyers, top products. |
| 84–88 | `estimatedVisitors` / `conversionRate` | **derived** | `totalOrders*18` synthetic. |
| 95–96 | rounding | **SO** | `Math.round(x*100)/100`. |

### 1.3 `src/routes/dashboard.index.tsx` (Dashboard home — rendered for ALL users via `NewDashboard`)

| Line | Display | Source | Notes |
|---|---|---|---|
| 116 | hero commission `totalCommission` | **GCS** | `getCommissionSum("shopee", range)` — real. |
| 119–123 | orders/units/buyers/visitors/views | **HOOK** | visitors=`orders*18`, views=`orders*55` synthetic. |
| 124–127 | conversion rate | derived | from synthetic visitors. |
| 129–130 | `todayCommission` / `todayFlat` | **GCS** | drives chart flat-after-reset only. |
| 320–337 | **chart "today"** | **SIN** | `Math.exp` Gaussian peaks; **not** SO. Uses raw `new Date().getHours()` (323). |
| 339–353 | **chart "7d"/"30d"** | **SIN** | `Math.sin`/`Math.cos` seeded by index; **not** SO. |
| 54–56 | timestamp `(GMT-03)` | **raw local** | `formatStamp` uses browser local `getHours()` etc., mislabeled GMT-03. |
| 502–740 | `OldDashboard` | — | **DEAD CODE** (never rendered; `DashboardHome`→`NewDashboard`). |
| 594/742 | `SalesOverviewChart` | **SIN** | DEAD CODE (only used by `OldDashboard`). |

### 1.4 `src/routes/dashboard.metricas.tsx` (admin-only)

| Line | Display | Source | Notes |
|---|---|---|---|
| 42 | `totalCommission` | **GCS** | real. |
| 45–46 | `showBaseline` / `totalOrders` | **HC** | **`+252` hardcoded baseline** for admin "today" (suppressed after reset). |
| 47 | `conversionRate` | **HC** | fixed `5.56`. |
| 49–50 | visitors/pageViews | synthetic | `*18`, `*55`. |
| 54–55 | `todayCommission`/`todayFlat` | **GCS** | |
| 66,73,80,87 | "Ontem:" comparisons | **HC** | fake `*0.92`, `-3`, `*0.95`, `*0.97`. |
| 405 | top products commission | **HOOK** | real. |
| 477–523 | chart | **SIN** | same synthetic math as index; raw `getHours()` (480). |

### 1.5 `src/routes/dashboard.vendas-clientes.tsx`

| Line | Display | Source | Notes |
|---|---|---|---|
| 102–105 | orders / revenue / supplier / commission | **HOOK/SO** | real; `metrics.supplier` sums `o.supplierCost`. |
| 56–86 | filtering | **SO** | uses `getOrderDayDiff` (raw local tz, line 191–195). |
| 222–223, 336–341 | per-order valor/comissão/breakdown | **SO** | real, per-order fields. |

### 1.6 `src/components/withdrawal/WithdrawalDialog.tsx`

| Line | Display | Source | Notes |
|---|---|---|---|
| 20 | withdrawable balance | **GCS** | `getCommissionSum("shopee","30d")` — real. |
| 14 / 245 | `FEE_AMOUNT = 134.6` | **HC** | fixed fee display. |
| 385–389 | `isFridayAfter13hSP` | **SP tz (correct)** | uses `toLocaleString` America/Sao_Paulo. |

### 1.7 `src/components/boost/BoostPromoModal.tsx`

| Line | Display | Source | Notes |
|---|---|---|---|
| 13 | `total` threshold | **GCS** | `getCommissionSum("shopee","30d")`; opens modal if `>=500`. |

### 1.8 `src/routes/dashboard.impulsionar-vendas.tsx`

| Line | Display | Source | Notes |
|---|---|---|---|
| 1116–1120 | boost packValue/eventsReleased/commissionTotal/return | **Supabase** | `myActiveBoost` server-driven (cross-device OK). |
| 336/365/407/476/543/547/551 | pack prices, ROI copy | **HC** | promo copy, not data. |
| 1099 | `fmtDate` | raw local | display only, server ISO source. |

### 1.9 `src/routes/dashboard.robo-divulgador.tsx`

| Line | Display | Source | Notes |
|---|---|---|---|
| 112–139 | `buildAdminHistory` revenue/sales | **HC + Math.random** | hardcoded sale amounts; `creditsSpent` via `rand()`. |
| 170–209 | `credits` | **LS + Math.random** | `shopesync.credits.*` per-device; daily reset SP-anchored (good) but value is per-device. |
| 218–219, 532–533 | creditsSpent / revenue sidebar | **state/HC** | demo only; per-session/per-device. |

### 1.10 `src/components/layout/DashboardShell.tsx`

| Line | Display | Source | Notes |
|---|---|---|---|
| ~271–273 | lightning toast amount | **Supabase RPC** | `recordLightningClick()` → server. No persistent balance shown in shell. |

### 1.11 Demo routes (`demo.*`)

Local `brl()` formatters + their own mock data. Unauthenticated preview only — not tied to a real account, so not part of the per-account divergence, but they DO use independent hardcoded/`Math.sin` data (e.g. `demo.index.tsx:92`, `demo.grupos.tsx:20`).

---

## 2. DISPLAYS THAT DO **NOT** ULTIMATELY READ FROM `data.salesOrders`

| Display | File:Line | Real source | Problem |
|---|---|---|---|
| Dashboard chart (today/7d/30d) | dashboard.index.tsx:320–353 | `Math.exp`/`Math.sin` | Pure synthetic; ignores SO. |
| Métricas chart | dashboard.metricas.tsx:477–523 | same synthetic | ignores SO. |
| Métricas order baseline | dashboard.metricas.tsx:46 | `+252` HC | inflates admin orders. |
| Métricas conversion | dashboard.metricas.tsx:47 | `5.56` HC | not derived. |
| Métricas "Ontem" subs | dashboard.metricas.tsx:66,73,80,87 | HC ratios | fake yesterday. |
| `vendasHoje` counter | state.tsx:1119–1143 | VH + Math.random | per-device; not SO. |
| Admin commission history | state.tsx:672–686 | Math.random | per-device seed. |
| Robo revenue/credits | robo-divulgador.tsx:112–139,170 | HC/Math.random/LS | per-device. |
| Visitors/views | index:122–123, metricas:49–50 | `orders*18/55` | synthetic (derived from SO but fabricated). |
| Dashboard timestamp | index:54–56 | raw local time | mislabeled `(GMT-03)`. |
| Demo charts/values | demo.*.tsx | HC/Math.sin | preview-only. |
| `marketplaces.series` | state.tsx:252–258 (`demoSeries`) | Math.sin | legacy aggregate. |

Everything else (hero commission, vendas-clientes metrics, withdrawal balance, boost modal threshold, top products) **does** read from SO via `GCS`/`HOOK`.

---

## 3. DEVICE-DEPENDENCE — EVERY REMAINING CAUSE

### 3.1 Per-device localStorage that is NOT synced from the server

| Key | Where | Why it diverges |
|---|---|---|
| `shopesync.userdata.<email>` (`DATA_KEY`) | state.tsx:17,540,555 | Stores `salesOrders` locally. Regular-user auto-sales live ONLY here → different per device. |
| `shopesync.vendashoje.<email>` | state.tsx:22,712–728 | `Math.random` growth, per device. |
| `shopesync.commissionhist.<email>` | state.tsx:23,688–699 | Admin seeded via `Math.random`; rebuilt from SO on sync but seeds differ before sync. |
| `shopesync.credits.<email>` | robo-divulgador `CREDITS_KEY` | Per-device credits; random spend. |
| `shopesync.lastautosale.<email>` | state.tsx:24 | Per-device auto-sale clock. |
| `shopesync.todayreset.<email>` | state.tsx:25 | Per-device reset state. |
| `shopesync.lastreset.<email>` | robo-divulgador | Per-device credit-reset guard. |

> The cross-device sync (`fetchAll`/`applyOrders`, state.tsx:1096–1117) only fetches
> **Supabase** rows. The merge (1066) explicitly **retains** local-only orders
> (non-UUID ids from `makeOrderId`, state.tsx:757–758) — so device A's random orders
> stay on device A, device B's on device B. They never reconcile.

### 3.2 `Math.random()`-based seeding / generation

| Location | state.tsx line | Effect |
|---|---|---|
| `seedAdminHistory` | 680 | different 30-day admin history per device. |
| midnight tick `vendasHoje` | 1134–1135 | random "vendas hoje" growth per device. |
| `tryAutoSale` product/MP pick + capped commission | 1167–1172 | **different regular-user sales per device.** |
| `makeOrderId` | 758 | random local order ids (kept as local-only). |
| `buildOrderFromProduct` customer pick | 761 | random customer per order. |
| `recordLightningClick` amount | 2312 | random, but server-persisted → consistent. |
| `triggerDemoSale` product pick | 1337 | random local order (regular users w/o remoteId). |
| robo `buildAdminHistory` creditsSpent | robo:136 | random per device. |

### 3.3 Remaining raw browser-local time (NOT America/Sao_Paulo)

The previous fix only touched `getCommissionSum`'s **start**. Remaining tz-naive spots:

| Location | Line | Call |
|---|---|---|
| `getCommissionSum` end | state.tsx:1434 | `endTs = ... Date.now()` (raw) |
| `calcBusinessDays` | state.tsx:177–180 | `new Date(...).setHours(0,0,0,0)` raw |
| `getOrderDayDiff` | state.tsx:191–193 | raw local midnight |
| `todayKey` | state.tsx:658–661 | raw `getFullYear/Month/Date` |
| `dateKey` | state.tsx:669–670 | raw local |
| `sumRange` | state.tsx:702–706 | raw `new Date()` loop |
| midnight tick | state.tsx:1124,1129 | `todayKey()` + `new Date().getHours()` raw |
| `isResetSuppressed` | state.tsx:821–822 | raw `setHours` |
| `resetTodaySales` | state.tsx:2331–2332 | raw `setHours` |
| `commitOrder` | state.tsx:1312,1317 | `todayKey()` raw |
| `useShopSyncData.getPeriodStartTs` end | hook:29–38 | start SP-anchored, but no end clamp |
| chart `getHours()` | index:323, metricas:480 | raw local "today so far" cutoff |
| `formatStamp` | index:54–56 | raw local, mislabeled `(GMT-03)` |
| `applyOrders` history bucket | state.tsx:1088 | `dateKey(new Date(o.saleDate))` raw |

Effect: a user at 23:30 in a UTC+x device vs UTC-3 device buckets the same order
into a different calendar day → "vendas hoje"/today/7d/30d differ between devices
even when the underlying orders are identical.

---

## 4. DASHBOARD CHART — EXPLICIT FINDING

**Confirmed: the dashboard chart uses hardcoded synthetic math, NOT `data.salesOrders`.**

- `src/routes/dashboard.index.tsx` `NewSalesChart` (lines 320–354):
  - **today**: `peakAt(i,c,w,amp) = amp * Math.exp(-((i-c)/w)^2)` with hardcoded
    amplitudes `870/660/180` (hoje) and `220/260/110` (ontem); cutoff at raw
    `new Date().getHours()` (line 323).
  - **7d/30d**: `Math.round(420 + Math.sin(seed)*180 + Math.cos(seed*0.7)*90)` and
    `Math.round(360 + Math.sin(seed+1)*200)` (lines 346–347).
  - `todayFlat` only forces the today line to 0 after a reset — the rest is fixed math.
- `src/routes/dashboard.metricas.tsx` `SalesAreaChart` (lines 477–523): identical
  synthetic logic.
- `OldDashboard`/`SalesOverviewChart` (index 502–846): same synthetic data, but
  **dead code** (never rendered).

So the chart is **device-independent in shape** (deterministic math, except the
`getHours()` today-cutoff), but it is **completely disconnected from real sales** and
will never match the hero/Vendas numbers. CLAUDE.md §12 already flags this as known.

---

## 5. DEFINITIVE FIX PLAN (DO NOT IMPLEMENT — proposal only)

Goal: every value, every page, every device, both `regular_user` and `admin`,
computed identically from ONE server source.

### Phase 0 — Establish the single source (server)
1. **Make Supabase `sales_orders` the only store of truth for regular users.**
   - Change regular-user sale generation to **insert into `sales_orders`** (server),
     not local `commitOrder`. Two options:
     - (a) Keep the existing server RPC path: have auto-sales call the same
       `create_robo_sale_order` / `release_automatic_demo_sales` RPC that already
       exists (state.tsx:1343, 2417), so the realtime subscription is the only writer
       to `SO`.
     - (b) Move random sale generation entirely server-side (a scheduled/edge
       function), so devices merely *read* identical rows.
   - **Files/lines:** `src/lib/state.tsx` `tryAutoSale` (1159–1183) and `commitOrder`
     (1286–1323): stop pushing local-only orders; route through Supabase.
2. **Stop keeping local-only orders forever.** In `applyOrders` merge (state.tsx:1059–1067),
   remove the `localOnly` retention (or gate it to truly-pending optimistic ids that
   get reconciled), so `SO` == server rows on every device.

### Phase 1 — Unify time handling
3. **Add ONE shared helper** `spNow()` / `spStartOfDay()` / `spDateKey()` anchored to
   America/Sao_Paulo, and replace every raw-local call listed in §3.3:
   - `state.tsx`: `getCommissionSum` end (1434), `calcBusinessDays` (177–180),
     `getOrderDayDiff` (191–193), `todayKey` (658–661), `dateKey` (669–670),
     `sumRange` (702–706), midnight tick (1124,1129), `isResetSuppressed` (821–822),
     `resetTodaySales` (2331–2332), `commitOrder` (1312,1317), `applyOrders` (1088).
   - `useShopSyncData.ts`: clamp end of window with `spNow()` (29–38).
   - `dashboard.index.tsx`: chart `getHours()` (323), `formatStamp` (54–56).
   - `dashboard.metricas.tsx`: chart `getHours()` (480).
4. **Unify `getCommissionSum` and `useShopSyncData`** to use the SAME start/end helper
   so commission and order/revenue windows can never disagree.

### Phase 2 — Remove per-device random/seed state
5. **Delete `Math.random`-seeded client values** or make them deterministic/server-backed:
   - `seedAdminHistory` (672–686): replace with derivation from `SO`.
   - `vendasHoje` random growth (1119–1143): drive from `SO` "today" sum, or remove
     entirely since no page renders it.
   - robo `credits`/`revenue` (robo-divulgador 112–139,170–209): if they must stay
     visual, seed deterministically (no `Math.random`) or store server-side.
6. **commissionHistory**: keep only the SO-rebuild path (1084–1093); drop the
   localStorage admin seed so it can't diverge before first sync.

### Phase 3 — Make charts read real data
7. **Feed the chart from `data.salesOrders`** bucketed by SP day/hour (use the same
   helper as `useShopSyncData`). Replace synthetic `Math.exp`/`Math.sin` blocks:
   - `dashboard.index.tsx` 320–353.
   - `dashboard.metricas.tsx` 477–523.
8. **Delete dead code** `OldDashboard` + `SalesOverviewChart` (index 502–846) to remove
   confusion.

### Phase 4 — Remove fabricated metrics
9. **Métricas:** remove `+252` baseline (line 46), fixed `5.56%` (47), and HC "Ontem"
   ratios (66,73,80,87). Derive yesterday from `SO` (SP day = today-1). Decide whether
   visitors/views (`*18`/`*55`) stay as clearly-labeled estimates or are removed.

### Recommended safest order
`Phase 1 (time unify)` → `Phase 0 (server source for regular users)` →
`Phase 2 (kill random/local seeds)` → `Phase 3 (charts)` → `Phase 4 (metricas)`.

Rationale: unifying time first is low-risk and independently correct; moving the
write path to Supabase is the highest-impact structural change and should land on a
stable time foundation; killing random/local state and wiring charts/metricas to SO
then makes every surface converge. Per CLAUDE.md: **one page at a time, diagnose
before each, push to `main`.**

### Per-device localStorage problem — explicit recommendation
**Yes — sales data should be read from Supabase `sales_orders` as the single server
source.** localStorage should hold only UI prefs (selected marketplace, privacy
toggle), never the financial truth. Regular-user sales must be generated server-side
(RPC or scheduled function) so all devices read the identical rows. Remove the
local-only order retention and the `Math.random` client generators; keep the existing
realtime subscription as the sole path that populates `data.salesOrders`.

---

## 6. WHY THE PREVIOUS FIX (commit 0a496eb) DID NOT RESOLVE IT

That commit SP-anchored only `getCommissionSum`'s **start** boundary. It did nothing
about:
- regular-user sales living only in per-device localStorage (random per device),
- `vendasHoje`/credits/admin-history `Math.random` per-device seeds,
- the ~14 other raw-local time spots,
- the synthetic charts,
- `getCommissionSum`'s own raw `Date.now()` **end** boundary.

So the dominant cause (per-device localStorage random orders) was never addressed.
