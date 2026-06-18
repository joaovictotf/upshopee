# ShopeSync — Code Audit Report

Scope: TanStack Start + Supabase SaaS app (`src/`, `supabase/migrations/`). Findings below were confirmed by reading the referenced files; each carries a real `file:line`, severity, code evidence, and a one-line fix. A small number of items that could not be fully confirmed within this pass are explicitly marked **(unconfirmed)**.

---

## BROKEN / BUGS

### B1. Client-side self-approval bypass — any visitor approves their own account
- **Description:** Registration uses the public anon client to set its own `approval_status` to `"approved"`, defeating the account-approval gate entirely.
- **File:line:** `src/routes/register.tsx:52-57`
- **Severity:** CRITICAL
- **Code-evidence:**
  ```ts
  if (signUpData.user) {
    await supabase
      .from("profiles" as never)
      .update({ approval_status: "approved" } as never)
      .eq("id", signUpData.user.id);
  ```
- **Fix:** Remove the client update; set approval server-side (DB default/trigger or admin-only server function) and enforce via RLS.

### B2. Placeholder WhatsApp link ships to users — primary CTA on payment-blocked page is broken
- **Description:** The main support CTA on the payment-blocked screen points at a literal placeholder string.
- **File:line:** `src/routes/pagamento-bloqueado.tsx:12` (used at `:44`)
- **Severity:** CRITICAL
- **Code-evidence:**
  ```ts
  const WHATSAPP_PAYMENT_SUPPORT_URL = "INSERIR_LINK_DO_WHATSAPP_AQUI";
  ```
- **Fix:** Replace with the real `https://wa.me/...` URL.

### B3. Profile update error ignored — success shown even when approval write fails
- **Description:** The `.update()` result (`{ error }`) is never checked, so a failed/blocked write still reports success and signs the user out silently.
- **File:line:** `src/routes/register.tsx:53-61`
- **Severity:** HIGH
- **Code-evidence:**
  ```ts
  await supabase.from("profiles" as never).update(...).eq("id", signUpData.user.id);
  await supabase.auth.signOut();
  ...
  toast.success("Cadastro realizado! Faça login...");
  ```
- **Fix:** Capture and handle `{ error }` from the update before proceeding.

### B4. Withdrawal request failure ignored — success screen shown regardless
- **Description:** `handleAlreadyPaid` calls `submitWithdrawalRequest` with no error handling; an `{ ok: false }` result is ignored and the user always sees success.
- **File:line:** `src/components/withdrawal/WithdrawalDialog.tsx:116-117`
- **Severity:** HIGH
- **Code-evidence:**
  ```ts
  await submitWithdrawalRequest(amountNum, pixKey.trim(), pixKeyType, fullName.trim());
  setStep("success");
  ```
- **Fix:** Check the returned `{ ok, error }` and show a failure state/toast when not ok.

### B5. Admin email domain typo breaks admin detection
- **Description:** Admin list mixes domains: `victor@shopesync.com` vs `rikelme@shopsync.com` (missing the "e"), likely breaking admin detection for one account.
- **File:line:** `src/lib/state.tsx:6`
- **Severity:** HIGH
- **Code-evidence:**
  ```ts
  export const ADMIN_EMAILS = ["victor@shopesync.com", "rikelme@shopsync.com"]
  ```
- **Fix:** Confirm the correct domain and make both entries consistent.

### B6. Registration-token admin policy references non-existent schema columns
- **Description:** The admin token policy checks `profiles.id`/`profiles.role = 'full_admin'`, but profiles is keyed on `user_id` and has no `role` column (roles live in `user_roles` with enum `admin`/`user`), so the policy never matches.
- **File:line:** `supabase/migrations/20260609_registration_tokens.sql:15-23`
- **Severity:** HIGH
- **Code-evidence:**
  ```sql
  CREATE POLICY "Admins can do everything"
  ON registration_tokens FOR ALL
  USING ( EXISTS ( SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'full_admin' ) );
  ```
- **Fix:** Rewrite as `public.has_role(auth.uid(), 'admin')` to match the real role model.

### B7. Non-null assertion on `.find()` can crash listing flow
- **Description:** `suppliers.find(...)!` returns `undefined` if no supplier matches; later `supplier.name` then throws.
- **File:line:** `src/components/products/GenerateListingFlow.tsx:47` (deref at `:90`)
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  const supplier = suppliers.find((s) => s.id === supplierId)!;
  ```
- **Fix:** Handle the undefined case (fallback supplier or guard before use).

### B8. Side-effect inside state updater can double-fire under StrictMode
- **Description:** `runSend` calls `saveMeuProduto` from inside a `setSendProgress` updater when progress hits 100, which can double-invoke under React StrictMode.
- **File:line:** `src/components/products/GenerateListingFlow.tsx:76-115`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  setSendProgress((p) => { if (p >= 100) { clearInterval(id); ... saveMeuProduto(saved); ... } ... })
  ```
- **Fix:** Move the save out of the state updater into an effect/`onComplete` guarded by a ref.

### B9. visibilitychange listener leaked / duplicated on repeat checkout
- **Description:** Listener added in `openCheckout` is never removed if the user doesn't return visible, and a second click adds a duplicate listener with a stale closure.
- **File:line:** `src/components/withdrawal/WithdrawalDialog.tsx:96-104`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  document.addEventListener("visibilitychange", onVisible);
  ```
- **Fix:** Register the listener in a `useEffect` keyed on `step` and clean it up on unmount/step change.

### B10. "Painel de Mineração" button has no handler
- **Description:** A styled button looks clickable but has no `onClick`.
- **File:line:** `src/routes/dashboard.index.tsx:209-211`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```tsx
  <button className="rounded-md border border-white/40 ...">Painel de Mineração</button>
  ```
- **Fix:** Wire it to its route/action or remove the button.

### B11. `MBar` `tinted` prop declared but never used
- **Description:** Callers pass `tinted` expecting tinted bars, but the component never reads the prop.
- **File:line:** `src/routes/dashboard.impulsionar-vendas.tsx:660` (callers `:432-434`)
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  tinted?: boolean;   // typed, never read
  ```
- **Fix:** Apply `tinted` styling in `MBar` or drop the prop and the caller args.

### B12. `getOrderStatus` dead range bound
- **Description:** `bd >= 4 && bd < 5` is equivalent to `bd === 4` for integer business-day counts; the `< 5` bound is dead/misleading.
- **File:line:** `src/lib/state.tsx:213`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  if (bd >= 4 && bd < 5) return "Pedido entregue";
  ```
- **Fix:** Simplify to `if (bd === 4)`.

### B13. Non-null assertion on `.find()` in pricing route
- **Description:** `products.find(...)!` will crash if state IDs ever drift.
- **File:line:** `src/routes/dashboard.precificacao.tsx:21-22`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  const product = products.find((p) => p.id === productId)!;
  ```
- **Fix:** Guard with a fallback (`?? products[0]`) or early-return when undefined.

---

## DEAD CODE

### D1. Backup route file checked in as a live route
- **Description:** A full duplicate page is wired as a real route alongside the live version.
- **File:line:** `src/routes/dashboard.impulsionar-vendas.backup.tsx:26-28`
- **Severity:** HIGH
- **Code-evidence:**
  ```ts
  export const Route = createFileRoute("/dashboard/impulsionar-vendas/backup")({ component: ImpulsionarVendasPage });
  ```
- **Fix:** Delete the file and its entries in `routeTree.gen.ts`.

### D2. `planos2.tsx` is a near byte-for-byte duplicate of `planos.tsx`
- **Description:** Only the `LINKS` checkout URLs differ between the two landing pages.
- **File:line:** `src/routes/planos2.tsx:957-965` vs `src/routes/planos.tsx:957-965`
- **Severity:** HIGH
- **Code-evidence:**
  ```ts
  // planos2: cartao: 'https://go.perfectpay.com.br/PPU38CQD4TD'
  // planos:  cartao: 'https://go.perfectpay.com.br/PPU38CQC838'
  ```
- **Fix:** Delete `planos2.tsx` after confirming which checkout links are canonical.

### D3. Entire legacy dashboard component tree is unrendered
- **Description:** `DashboardHome` only renders `NewDashboard`; the `Old*` components are dead.
- **File:line:** `src/routes/dashboard.index.tsx:90-92`; dead: `OldDashboard:502`, `ShopeeHeroPanel:604`, `MetricsBlock:704`, `MetricTile:730`, `SalesOverviewChart:742`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  function DashboardHome() { return <NewDashboard />; }
  ```
- **Fix:** Delete the unused `Old*` components and their now-unused icon imports.

### D4. Dead placeholder check in WithdrawalDialog
- **Description:** `checkoutConfigured` compares the URL to a placeholder literal, but the URL is a hardcoded real https link, so the `!checkoutConfigured` warning branch is unreachable.
- **File:line:** `src/components/withdrawal/WithdrawalDialog.tsx:58-60, 249-254`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  (WITHDRAWAL_FEE_CHECKOUT_URL as string) !== "INSERIR_LINK_DO_CHECKOUT_AQUI"
  ```
- **Fix:** Remove the dead placeholder check or drive it from env/config.

### D5. Unused `useCountdown` hook in both landing pages
- **File:line:** `src/routes/planos.tsx:18-28` and `src/routes/planos2.tsx:18-28`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  function useCountdown(initialSecs: number) { ... }
  ```
- **Fix:** Remove the unused hook.

### D6. `getGlobalPrivacy` exported but never imported
- **File:line:** `src/lib/format.ts:5`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  export const getGlobalPrivacy = () => _privacy;
  ```
- **Fix:** Remove the unused export.

### D7. `todayBR` exported but never used
- **File:line:** `src/lib/format.ts:14-15`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  export const todayBR = () => new Date().toLocaleDateString(...)
  ```
- **Fix:** Remove the unused export.

---

## FRAGILITY / RISKS

### F1. `getClaims` may not cryptographically verify the JWT
- **Description:** Auth gating relies entirely on `getClaims`; with only a publishable key and no asymmetric JWKS it can fall back to decoding without server-verified signature.
- **File:line:** `src/integrations/supabase/auth-middleware.ts:63-66`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error('Unauthorized: Invalid token');
  ```
- **Fix:** Verify with `supabase.auth.getUser(token)` or ensure asymmetric JWT signing keys so `getClaims` validates the signature.

### F2. `signUp` profile write assumed to succeed without a session
- **Description:** When email confirmation is enabled, `signUp` returns a `user` but no session, so the RLS-bound profile update silently no-ops, yet the code treats it as done.
- **File:line:** `src/routes/register.tsx:52-58`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  if (signUpData.user) {
    await supabase.from("profiles" as never).update(...)...
    await supabase.auth.signOut();
  }
  ```
- **Fix:** Branch on `signUpData.session` presence and move the profile write server-side.

### F3. Withdrawal amount parsing strips dots — 100x value risk
- **Description:** Parsing strips all dots as thousands separators, so `1500.50` becomes `150050`.
- **File:line:** `src/components/withdrawal/WithdrawalDialog.tsx:53-56`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  Number(String(amount).replace(/\./g, "").replace(",", "."))
  ```
- **Fix:** Detect the decimal separator robustly or use a masked numeric input.

### F4. Session bootstrap has no error handling — app can hang on load
- **Description:** `getSession().then()` has no `.catch`; a rejected fetch leaves `authReady` false forever.
- **File:line:** `src/lib/state.tsx:945`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  supabase.auth.getSession().then(({ data }) => { hydrate(...); });
  ```
- **Fix:** Add `.catch(() => setAuthReady(true))`.

### F5. `hydrate` awaits Supabase queries with no try/catch
- **Description:** A thrown error (not the `.error` field) becomes an unhandled rejection and leaves `authReady` unset.
- **File:line:** `src/lib/state.tsx:846-938`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  const profileRes = await supabase.from("profiles")...;
  const rolesRes = await supabase.from("user_roles")...
  ```
- **Fix:** Wrap the body in try/catch and ensure `setAuthReady(true)` in a `finally`.

### F6. Auto-sale effect uses `.length` dep, reads full array via closure
- **Description:** Deps list `data.meusProdutos.length` but `tryAutoSale` reads the full array; replacing contents without changing length uses a stale list.
- **File:line:** `src/lib/state.tsx:1161, 1183`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  }, [user, isAdmin, data.meusProdutos.length, lastAutoSaleAt]);
  ```
- **Fix:** Depend on `data.meusProdutos` (or a content hash) rather than `.length`.

### F7. Hardcoded admin email grants privilege at signup
- **Description:** Admin is granted by a hardcoded email string in a trigger; anyone registering that address gains full admin.
- **File:line:** `supabase/migrations/20260521044257_36e95420-06f4-438d-8376-cabaf7c217d4.sql:71`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```sql
  is_admin boolean := lower(new.email) = 'victor@shopesync.com';
  ```
- **Fix:** Seed the initial admin via a one-off manual `user_roles` insert instead of email matching.

### F8. Forced 20s policy gate re-runs every mount (no persistence)
- **Description:** `policyAccepted` is local state with no persistence, so returning users are re-blocked for 20s each visit.
- **File:line:** `src/routes/dashboard.impulsionar-vendas.tsx:133, 150` (modal `:168-180`)
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  const [policyAccepted, setPolicyAccepted] = useState(false);
  ```
- **Fix:** Persist acceptance in `localStorage`.

### F9. `totalUnits` is just the order count
- **Description:** `totalUnits` reuses `filtered.length` (order count), so any "units sold" metric is wrong when an order has >1 item.
- **File:line:** `src/hooks/useShopSyncData.ts:82`
- **Severity:** MEDIUM
- **Code-evidence:**
  ```ts
  const totalUnits = filtered.length;
  ```
- **Fix:** Sum a real per-order quantity field.

### F10. Clipboard write not awaited — false success toast
- **File:line:** `src/components/products/GenerateListingFlow.tsx:151`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  onClick={() => { navigator.clipboard.writeText(listingText); toast.success("Anúncio copiado com sucesso."); }}
  ```
- **Fix:** `.then(() => toast.success(...)).catch(() => toast.error(...))`.

### F11. Currency totals accumulate floating-point drift
- **Description:** Commission/vendas accumulate without rounding to cents.
- **File:line:** `src/lib/state.tsx:1297, 1314, 1319`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  commission: cur.commission + order.netProfit,
  ```
- **Fix:** Round on accumulation (`Math.round(x*100)/100`).

### F12. `logout()` does not await/catch `signOut`
- **File:line:** `src/lib/state.tsx:1278-1279`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  const logout = () => { supabase.auth.signOut(); ... }
  ```
- **Fix:** `await`/`.catch` the sign-out.

### F13. `getProductImage` may call `.trim()` on a non-string
- **File:line:** `src/lib/state.tsx:139-148`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  return url.trim() || PLACEHOLDER_IMG;
  ```
- **Fix:** Coerce with `String(url).trim()` or guard `typeof url === "string"`.

### F14. `maskEmail`/`maskPhone` assume well-formed input
- **Description:** `e.split("@")` with no `@` makes `d` undefined → `...@undefined`.
- **File:line:** `src/lib/state.tsx:747-755`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  const [u, d] = e.split("@");
  ```
- **Fix:** Validate presence of `@`/digit length before masking.

### F15. `reset_today_sales` discards lightning-events delete count
- **Description:** Function deletes from `dashboard_lightning_events` but only reports `sales_orders` deletions.
- **File:line:** `supabase/migrations/20260611120000_reset_today_sales.sql:27-31`
- **Severity:** LOW
- **Code-evidence:**
  ```sql
  DELETE FROM public.dashboard_lightning_events
   WHERE user_id = auth.uid() AND created_at >= _start;
  RETURN _deleted;
  ```
- **Fix:** Aggregate both counts or document that the return covers only sales_orders.

### F16. Hook hardcodes `isLoading`/`error`
- **Description:** Underlying load failures are invisible to consumers.
- **File:line:** `src/hooks/useShopSyncData.ts:103-104`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  isLoading: false,
  error: null,
  ```
- **Fix:** Thread real loading/error state from the app context.

### F17. `conversionRate` derived from a fabricated visitor count
- **Description:** `estimatedVisitors = orders*18` makes conversion always ~5.56%.
- **File:line:** `src/hooks/useShopSyncData.ts:84-88`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  const estimatedVisitors = Math.max(totalOrders * 18, 1);
  ```
- **Fix:** Use real visitor data or remove the metric.

---

## UX / VISUAL POLISH

### U1. New dashboard hero has no privacy toggle
- **Description:** `privacy` is consumed but the only toggle lived in the dead `OldDashboard`, so users can't unmask values.
- **File:line:** `src/routes/dashboard.index.tsx:176-249` (old toggle at `:621-627`)
- **Severity:** MEDIUM
- **Code-evidence:** `NewShopeeHeroPanel` renders `{privacy ? "•••••" : ...}` with no control to flip `privacy`.
- **Fix:** Add an Eye/EyeOff toggle to `NewShopeeHeroPanel` calling `setPrivacy`.

### U2. Mobile hamburger toggle has no accessible label
- **File:line:** `src/routes/planos.tsx:221-227` (and `planos2.tsx:221-227`)
- **Severity:** MEDIUM
- **Code-evidence:**
  ```tsx
  <button className="md:hidden ..." onClick={...}>{mobileMenuOpen ? "✕" : "☰"}</button>
  ```
- **Fix:** Add `aria-label="Abrir menu"` and `aria-expanded={mobileMenuOpen}`.

### U3. Privacy mode only strips the `R$` symbol, leaving the value visible
- **File:line:** `src/lib/format.ts:9`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  return _privacy ? s.replace(/^R\$\s?/, "") : s;
  ```
- **Fix:** Mask the digits (e.g. `••••`) instead of only removing the currency symbol.

### U4. Guarantee/Final-CTA buttons bypass the payment modal
- **Description:** These CTAs hard-link a single checkout URL, unlike the pricing cards which use the modal flow.
- **File:line:** `src/routes/planos.tsx:1233-1235` and `:1303-1305`
- **Severity:** LOW
- **Code-evidence:**
  ```tsx
  <a href="https://go.ironpayapp.com.br/jxzfsyhoci" ...>🛡️ QUERO MEU ACESSO COM GARANTIA</a>
  ```
- **Fix:** Route these CTAs through the same `setPaymentModal` flow.

### U5. Dead `href="#"` no-op anchor in legacy chart footer
- **File:line:** `src/routes/dashboard.index.tsx:841`
- **Severity:** LOW
- **Code-evidence:**
  ```tsx
  <a href="#" className="text-[#EE4D2D] underline ...">Crie anúncios aqui !</a>
  ```
- **Fix:** Remove with the dead component (D3).

---

## CONSISTENCY

### C1. Brand name flip-flops between "ShopeSync" and "ShopSync"
- **File:line:** `src/routes/planos.tsx:194` ("ShopeSync") vs `:467`/`:1328`/`:1349` ("ShopSync"); `src/routes/dashboard.index.tsx:141` vs `:577`
- **Severity:** MEDIUM
- **Code-evidence:** `<span ...>ShopeSync</span>` … `automatizaram com ShopSync.`
- **Fix:** Pick one brand spelling and apply globally.

### C2. Asset folder path inconsistent: `/brand/` vs `/brands/`
- **Description:** One of these paths is likely a 404.
- **File:line:** `src/routes/planos.tsx:193` & `pagamento-bloqueado.tsx:30` use `/brand/...`; `dashboard.index.tsx:33,197` use `/brands/...`
- **Severity:** MEDIUM
- **Code-evidence:** `src="/brand/shopesync-logo.png"` vs `src="/brands/shopee-logo.svg"`
- **Fix:** Consolidate to a single public assets folder and update references.

### C3. Two access-blocked screens use divergent styling systems
- **Description:** Theme tokens vs hardcoded colors.
- **File:line:** `src/routes/conta-em-analise.tsx:9-11` (theme tokens) vs `pagamento-bloqueado.tsx:27-33` (hardcoded)
- **Severity:** LOW
- **Code-evidence:** `bg-background` / `bg-primary/15` vs `bg-white` / `bg-orange-100 text-orange-600`
- **Fix:** Standardize both on theme tokens.

### C4. HTML lang is `en` but all UI copy is Portuguese
- **File:line:** `src/routes/__root.tsx:108`
- **Severity:** LOW
- **Code-evidence:** `<html lang="en">`
- **Fix:** Change to `<html lang="pt-BR">`.

### C5. Leftover scaffolding metadata ("Lovable")
- **File:line:** `src/routes/__root.tsx:80, 85`
- **Severity:** LOW
- **Code-evidence:** `{ name: "author", content: "Lovable" }` / `{ name: "twitter:site", content: "@Lovable" }`
- **Fix:** Update author/twitter:site to the real brand handles.

### C6. Gallery image filenames diverge between impulsionar files
- **File:line:** `dashboard.impulsionar-vendas.backup.tsx:763-770` (`/resultados/resultado-N.jpg`) vs `dashboard.impulsionar-vendas.tsx:681-689` (`/resultados/photo_...jpg`)
- **Severity:** LOW
- **Code-evidence:** `"/resultados/resultado-1.jpg"` vs `"/resultados/photo_4994789065806777341_w.jpg"`
- **Fix:** Removing the backup (D1) resolves it; verify the live filenames exist in `public/resultados`.

---

## SECURITY

### S1. Registration tokens are world-readable (including anon)
- **Description:** A `USING (true)` SELECT policy lets anyone harvest valid pending tokens for free self-registration.
- **File:line:** `supabase/migrations/20260609_registration_tokens.sql:25-27`
- **Severity:** CRITICAL
- **Code-evidence:**
  ```sql
  CREATE POLICY "Anyone can read token to validate"
  ON registration_tokens FOR SELECT
  USING (true);
  ```
- **Fix:** Validate tokens via a `SECURITY DEFINER` RPC instead of a public full-table SELECT.

### S2. Any authenticated user can consume/mutate any pending token
- **Description:** The UPDATE policy only checks status and binds nothing to the caller, so any user can mark any pending token used and mutate its columns.
- **File:line:** `supabase/migrations/20260609_registration_tokens_update_policy.sql:4-7`
- **Severity:** HIGH
- **Code-evidence:**
  ```sql
  CREATE POLICY "Authenticated users can mark token as used"
  ON registration_tokens FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'pendente')
  WITH CHECK (status = 'usado');
  ```
- **Fix:** Move consumption into a `SECURITY DEFINER` RPC that sets `used_by = auth.uid()` and validates expiry; drop this broad client UPDATE policy.

### S3. Hardcoded admin password committed in client source
- **File:line:** `src/lib/state.tsx:8`
- **Severity:** HIGH
- **Code-evidence:**
  ```ts
  const ADMIN_PASSWORD = "12345678";
  ```
- **Fix:** Remove the hardcoded credential; never ship passwords in client code.

### S4. "Admins update profiles" policy has no WITH CHECK
- **Description:** Update is unconstrained on the resulting row (e.g. could repoint `user_id`/ownership).
- **File:line:** `supabase/migrations/20260521044257_36e95420-06f4-438d-8376-cabaf7c217d4.sql:50-52`
- **Severity:** LOW
- **Code-evidence:**
  ```sql
  create policy "Admins update profiles"
    on public.profiles for update to authenticated
    using (public.has_role(auth.uid(), 'admin'));
  ```
- **Fix:** Add `with check (public.has_role(auth.uid(), 'admin'))`.

### S5. Errors with `statusCode` are forwarded to the client
- **Description:** Any thrown object carrying a `statusCode` is re-thrown rather than masked; only `statusCode`-less errors get the generic 500 page.
- **File:line:** `src/start.ts:6-18`
- **Severity:** LOW
- **Code-evidence:**
  ```ts
  if (error != null && typeof error === "object" && "statusCode" in error) {
    throw error;
  }
  ```
- **Fix:** Whitelist safe status codes/messages instead of forwarding any object with `statusCode`.

---

## Prioritized Findings (severity order)

| Finding | File:line | Category | Severity | Recommended fix |
|---|---|---|---|---|
| Client-side self-approval bypass | `src/routes/register.tsx:52-57` | BROKEN/BUGS | CRITICAL | Set approval server-side + enforce via RLS; remove client update |
| Placeholder WhatsApp link in payment CTA | `src/routes/pagamento-bloqueado.tsx:12` | BROKEN/BUGS | CRITICAL | Replace with real `wa.me` URL |
| Registration tokens world-readable | `supabase/migrations/20260609_registration_tokens.sql:25-27` | SECURITY | CRITICAL | Validate via SECURITY DEFINER RPC, not public SELECT |
| Profile update error ignored | `src/routes/register.tsx:53-61` | BROKEN/BUGS | HIGH | Check `{ error }` before reporting success |
| Withdrawal failure ignored | `src/components/withdrawal/WithdrawalDialog.tsx:116-117` | BROKEN/BUGS | HIGH | Check `{ ok, error }` and show failure |
| Admin email domain typo | `src/lib/state.tsx:6` | BROKEN/BUGS | HIGH | Fix `shopsync` → correct domain |
| Token admin policy references non-existent columns | `supabase/migrations/20260609_registration_tokens.sql:15-23` | BROKEN/BUGS | HIGH | Use `has_role(auth.uid(),'admin')` |
| Any user can consume/mutate any token | `supabase/migrations/20260609_registration_tokens_update_policy.sql:4-7` | SECURITY | HIGH | Move to SECURITY DEFINER RPC; drop broad UPDATE policy |
| Hardcoded admin password in client | `src/lib/state.tsx:8` | SECURITY | HIGH | Remove credential from client code |
| Backup route wired as live route | `src/routes/dashboard.impulsionar-vendas.backup.tsx:26-28` | DEAD CODE | HIGH | Delete file + routeTree entries |
| `planos2.tsx` duplicate page | `src/routes/planos2.tsx:957-965` | DEAD CODE | HIGH | Delete after confirming canonical checkout links |
| `getClaims` may not verify signature | `src/integrations/supabase/auth-middleware.ts:63-66` | FRAGILITY/RISKS | MEDIUM | Use `getUser(token)` or asymmetric JWT keys |
| signUp profile write assumed without session | `src/routes/register.tsx:52-58` | FRAGILITY/RISKS | MEDIUM | Branch on session; write server-side |
| Withdrawal amount dot-strip (100x risk) | `src/components/withdrawal/WithdrawalDialog.tsx:53-56` | FRAGILITY/RISKS | MEDIUM | Robust decimal parsing / masked input |
| Session bootstrap no error handling | `src/lib/state.tsx:945` | FRAGILITY/RISKS | MEDIUM | Add `.catch(() => setAuthReady(true))` |
| `hydrate` no try/catch | `src/lib/state.tsx:846-938` | FRAGILITY/RISKS | MEDIUM | try/catch + `setAuthReady(true)` in finally |
| Auto-sale stale-list dep | `src/lib/state.tsx:1161,1183` | FRAGILITY/RISKS | MEDIUM | Depend on array/content hash, not `.length` |
| Hardcoded admin email grants privilege | `supabase/migrations/20260521044257_...:71` | FRAGILITY/RISKS | MEDIUM | Seed admin via manual `user_roles` insert |
| Forced 20s policy gate re-runs each mount | `src/routes/dashboard.impulsionar-vendas.tsx:133,150` | FRAGILITY/RISKS | MEDIUM | Persist acceptance in localStorage |
| `totalUnits` = order count | `src/hooks/useShopSyncData.ts:82` | FRAGILITY/RISKS | MEDIUM | Sum real quantity field |
| `.find()!` crash in listing flow | `src/components/products/GenerateListingFlow.tsx:47` | BROKEN/BUGS | MEDIUM | Guard undefined supplier |
| Save side-effect in state updater | `src/components/products/GenerateListingFlow.tsx:76-115` | BROKEN/BUGS | MEDIUM | Move save to effect guarded by ref |
| visibilitychange listener leak/dup | `src/components/withdrawal/WithdrawalDialog.tsx:96-104` | BROKEN/BUGS | MEDIUM | Register in useEffect + cleanup |
| "Painel de Mineração" button no handler | `src/routes/dashboard.index.tsx:209-211` | BROKEN/BUGS | MEDIUM | Wire handler or remove |
| `MBar` `tinted` prop unused | `src/routes/dashboard.impulsionar-vendas.tsx:660` | BROKEN/BUGS | MEDIUM | Apply or drop prop |
| Legacy dashboard tree dead | `src/routes/dashboard.index.tsx:90-92` | DEAD CODE | MEDIUM | Delete `Old*` components + imports |
| New hero missing privacy toggle | `src/routes/dashboard.index.tsx:176-249` | UX/VISUAL POLISH | MEDIUM | Add Eye/EyeOff toggle |
| Hamburger no aria-label | `src/routes/planos.tsx:221-227` | UX/VISUAL POLISH | MEDIUM | Add `aria-label`/`aria-expanded` |
| Brand name inconsistency | `src/routes/planos.tsx:194` vs `:467` | CONSISTENCY | MEDIUM | Standardize spelling |
| Asset path `/brand/` vs `/brands/` | `src/routes/planos.tsx:193` vs `dashboard.index.tsx:33` | CONSISTENCY | MEDIUM | Consolidate folder |
| `getOrderStatus` dead range bound | `src/lib/state.tsx:213` | BROKEN/BUGS | LOW | Simplify to `bd === 4` |
| `.find()!` in pricing route | `src/routes/dashboard.precificacao.tsx:21-22` | BROKEN/BUGS | LOW | Fallback/guard |
| Dead placeholder check (withdrawal) | `src/components/withdrawal/WithdrawalDialog.tsx:58-60` | DEAD CODE | LOW | Remove or env-drive |
| Unused `useCountdown` | `src/routes/planos.tsx:18-28` | DEAD CODE | LOW | Remove hook |
| `getGlobalPrivacy` unused export | `src/lib/format.ts:5` | DEAD CODE | LOW | Remove export |
| `todayBR` unused export | `src/lib/format.ts:14-15` | DEAD CODE | LOW | Remove export |
| Clipboard write not awaited | `src/components/products/GenerateListingFlow.tsx:151` | FRAGILITY/RISKS | LOW | `.then/.catch` toast |
| Currency float drift | `src/lib/state.tsx:1297,1314,1319` | FRAGILITY/RISKS | LOW | Round to cents |
| `logout()` not awaited/caught | `src/lib/state.tsx:1278-1279` | FRAGILITY/RISKS | LOW | `await`/`.catch` signOut |
| `getProductImage` may `.trim()` non-string | `src/lib/state.tsx:139-148` | FRAGILITY/RISKS | LOW | `String(url).trim()` |
| `maskEmail`/`maskPhone` malformed input | `src/lib/state.tsx:747-755` | FRAGILITY/RISKS | LOW | Validate before masking |
| `reset_today_sales` discards delete count | `supabase/migrations/20260611120000_reset_today_sales.sql:27-31` | FRAGILITY/RISKS | LOW | Aggregate/document counts |
| Hook hardcodes loading/error | `src/hooks/useShopSyncData.ts:103-104` | FRAGILITY/RISKS | LOW | Thread real state |
| Fabricated conversionRate | `src/hooks/useShopSyncData.ts:84-88` | FRAGILITY/RISKS | LOW | Use real data / remove |
| Privacy mode leaves value visible | `src/lib/format.ts:9` | UX/VISUAL POLISH | LOW | Mask digits |
| Guarantee/Final CTAs bypass modal | `src/routes/planos.tsx:1233-1235` | UX/VISUAL POLISH | LOW | Route through payment flow |
| Dead `href="#"` anchor | `src/routes/dashboard.index.tsx:841` | UX/VISUAL POLISH | LOW | Remove with dead component |
| Blocked screens divergent styling | `src/routes/conta-em-analise.tsx:9-11` vs `pagamento-bloqueado.tsx:27-33` | CONSISTENCY | LOW | Standardize on theme tokens |
| HTML lang `en` vs pt copy | `src/routes/__root.tsx:108` | CONSISTENCY | LOW | `lang="pt-BR"` |
| Leftover "Lovable" metadata | `src/routes/__root.tsx:80,85` | CONSISTENCY | LOW | Update brand handles |
| Gallery filenames diverge | `dashboard.impulsionar-vendas.backup.tsx:763-770` | CONSISTENCY | LOW | Resolved by deleting backup |
| Admins-update-profiles no WITH CHECK | `supabase/migrations/20260521044257_...:50-52` | SECURITY | LOW | Add `with check` |
| Errors with statusCode forwarded | `src/start.ts:6-18` | SECURITY | LOW | Whitelist safe codes |

---

### Notes / unconfirmed
- **Protected-route guards (unconfirmed):** I confirmed `login.tsx`/`register.tsx` are public and that `auth-middleware.ts` exists, but did not fully trace that every `/dashboard/*` route is gated server-side. Verify the dashboard layout enforces auth before relying on it.
- **`/brand/` vs `/brands/` 404 (unconfirmed):** the path inconsistency is confirmed in source; whether a specific asset 404s depends on what exists under `public/` and was not verified on disk.
- Confirmed-clean during this pass: `create_robo_sale_order` and `admin_create_boost_campaign` RPCs (auth + ownership + `search_path` guards), `dashboard_lightning_events` RLS, `user_roles` write-blocking, `error-page.ts`/`error-capture.ts`/`utils.ts`, and `client.server.ts` (service-role key read only from `process.env`, not bundled to client).
