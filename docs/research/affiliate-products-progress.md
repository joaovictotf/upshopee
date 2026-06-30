# Affiliate Products — Research Progress

> Last updated: 2026-06-29
> Status: **BLOCKED — Batch 2 has 10 broken image URLs. See §5.**

---

## 1. Summary

| Metric | Count |
|---|---|
| Products requested | 50 |
| Links received | 20 |
| Products PARTIALLY_VERIFIED | 20 |
| Products WAITING_REVIEW | 30 |
| Images URL_VALID_VISUAL_UNVERIFIED | 10 |
| Images BROKEN | 10 |
| Images MISSING | 30 |
| Products ready for dataset generation | 0 |
| Target minimum | 45 |
| Remaining needed before generation | 45 |

---

## 2. Batch Status

| Batch | Range | Status | Pages | Images |
|---|---|---|---|---|
| 1 | 1–10 | Received and checked | 10 PARTIALLY_VERIFIED | 10 URL_VALID_VISUAL_UNVERIFIED |
| 2 | 11–20 | Received and checked | 10 PARTIALLY_VERIFIED | 10 BROKEN (HTTP 404) |
| 3 | 21–30 | Waiting | — | — |
| 4 | 31–40 | Waiting | — | — |
| 5 | 41–50 | Waiting | — | — |

---

## 3. Products 1–10 — Validation detail

All 10 product URLs use the `-i.SHOP_ID.ITEM_ID` format. All 10 product pages are Shopee SPAs — tool-based fetching returns empty content; visual confirmation requires a browser.

All 10 image URLs were tested and returned valid JPEG files from `down-br.img.susercontent.com`.

| # | Listing name | Price | Page | Image | Image size |
|---|---|---|---|---|---|
| 1 | Kit 6 Colmeia Organizadora de Gavetas | R$ 40.76 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 1024×1024 460KB |
| 2 | Caixa Organizadora Transparente com Tampa 20L | R$ 44.90 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG ~49KB |
| 3 | Prateleira de Parede Madeira e Ferro Adesiva | R$ 44.98 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 800×800 112KB |
| 4 | Jogo de Panelas Antiaderente 5 Peças Teflon | R$ 255.00 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 1.3MB |
| 5 | Garrafa Térmica Inox 500ml | R$ 54.50 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 956×956 218KB |
| 6 | Kit 10 Potes Herméticos BPA Free | R$ 20.61 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 1024×1024 946KB |
| 7 | Luminária LED Dobrável 3 Tons USB Bivolt | R$ 35.90 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 1024×1024 740KB |
| 8 | Tapete 2x3 Antiderrapante Peludo Felpudo | R$ 163.63 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 1024×1024 244KB |
| 9 | Mini Ventilador Portátil USB 3 Velocidades | R$ 22.99 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 1024×1024 226KB |
| 10 | Jogo de Toalhas de Banho 02 Peças Casa Dona | R$ 68.09 | PARTIALLY_VERIFIED | URL_VALID_VISUAL_UNVERIFIED | JPEG 992×992 105KB |

---

## 4. Products 11–20 — Validation detail

All 10 product URLs use the `-i.SHOP_ID.ITEM_ID` format. All 10 product pages are Shopee SPAs — same limitation as batch 1.

**All 10 image URLs returned HTTP 404.** The Shopee CDN rejected every request from this batch. Possible causes: expired listing images, CDN hotlink protection, or regional restrictions. These 10 products need replacement image URLs.

| # | Listing name | Price | Page | Image | Image error |
|---|---|---|---|---|---|
| 11 | Camisa Feminina Seleção Brasileira 2026 | R$ 62.99 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 12 | Bolsa Feminina Transversal Matelassê | R$ 45.90 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 13 | Óculos de Sol Vintage Redondo UV400 | R$ 19.90 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 14 | Camisa Messi Argentina 10 | R$ 59.90 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 15 | 5 Pares Meias Invisíveis Cano Baixo | R$ 12.99 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 16 | Relógio Esportivo Digital à Prova D'Água | R$ 49.99 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 17 | Conjunto Moletom Feminino Canguru Jogger | R$ 89.99 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 18 | Bermuda Tactel Masculina 2026 Verão | R$ 39.90 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 19 | Biquíni Feminino Cortininha Com Bojo | R$ 39.90 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |
| 20 | Corrente Aço Inoxidável 60cm Elo 3mm | R$ 24.90 | PARTIALLY_VERIFIED | BROKEN | HTTP 404 |

---

## 5. Products 21–50 — Waiting for links

All 30 products are WAITING_REVIEW with MISSING images. No URLs have been submitted.

---

## 6. Validation rules applied

| Check | Tool used | Possible outcomes |
|---|---|---|
| URL format (`-i.SHOP_ID.ITEM_ID`) | String match | Valid / Invalid format |
| Product page resolution | WebFetch | Content received / Empty (SPA) / HTTP error |
| Page title match listing name | WebFetch | Match / Mismatch / Invisible (SPA) |
| Image URL resolution | WebFetch | Valid image / HTTP 404 / HTTP 403 / Timeout |
| Image format (magic bytes) | WebFetch | JPEG / PNG / WebP / GIF / Not an image |
| Visual match to product | Not available | URL_VALID_VISUAL_UNVERIFIED (default) |

**Limitation:** Shopee product pages are fully client-rendered. No tool in this environment can extract page content from them. This makes `PARTIALLY_VERIFIED` the highest achievable page status without manual browser confirmation.

---

## 7. Blockers before dataset generation

1. **Products 11–20:** 10 broken image URLs require replacement images or new listings.
2. **Products 21–50:** 30 products await URLs, names, prices, and images.
3. **All 20 products:** Pages need manual browser verification to confirm the listing name and price still match. The user verified these manually; the tool environment cannot replicate this check.

---

## 8. Rejected links

None.

---

## 9. Duplicates

None.
