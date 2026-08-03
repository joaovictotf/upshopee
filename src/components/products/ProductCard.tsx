import { Eye, ShoppingBag, Star, ExternalLink } from "lucide-react";
import type { Product } from "../../lib/mock/products";
import type { AffiliateProduct } from "../../lib/mock/affiliate-products";
import { brl } from "../../lib/format";

export type CatalogItem =
  | { kind: "legacy"; product: Product }
  | { kind: "affiliate"; product: AffiliateProduct };

/* ── Deterministic simulated metrics ──────────────────────────────
   Views, score and badge are not in the source data. They are pure
   functions of the product id (FNV-1a hash), so the same product
   shows the same numbers on every render, device and visitor. */

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable pseudo-random position, used by the page to interleave the grid.
 *  Folds in a time-window index so the order stays fixed inside a window
 *  and reshuffles when the window rolls over — never Math.random(). */
export function catalogOrder(id: string, windowIndex: number): number {
  return fnv1a(id + ":order:" + windowIndex);
}

function viewsFor(id: string): number {
  return 1200 + (fnv1a(id + ":views") % 88800);
}

function scoreFor(id: string): number {
  return (45 + (fnv1a(id + ":score") % 6)) / 10;
}

const AFFILIATE_BADGES = ["Em alta", "Mais vendido", "Alta conversão", "Tendência", "Oportunidade"];

function badgeFor(item: CatalogItem): string {
  if (item.kind === "legacy") return item.product.tags[0] ?? item.product.category;
  return AFFILIATE_BADGES[fnv1a(item.product.id + ":badge") % AFFILIATE_BADGES.length];
}

const compactViews = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const scoreFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const SORA = { fontFamily: "'Sora', sans-serif" } as const;

export function ProductCard({
  item,
  onSelectLegacy,
}: {
  item: CatalogItem;
  onSelectLegacy: (p: Product) => void;
}) {
  const { id, name, category, image } = item.product;
  const commission = item.kind === "affiliate" ? item.product.commissionBRL : item.product.estimatedCommission;
  const commissionPct =
    item.kind === "affiliate"
      ? item.product.commissionPct
      : Math.round((item.product.estimatedCommission / item.product.suggestedPrice) * 100);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-[var(--shadow-elevated)]">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[var(--muted-bg)]">
        <img
          src={image}
          alt={name}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.dataset.fallback === "1") return;
            img.dataset.fallback = "1";
            img.src = "https://placehold.co/600x600/EDEDEB/6E6E76?text=Produto";
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full border border-[var(--border)]/70 bg-[var(--surface)]/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--text)] backdrop-blur-sm">
          {badgeFor(item)}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3 md:p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[var(--text)]">
          {name}
        </h3>

        {/* Quiet row: category · score */}
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
          <span className="truncate">{category}</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            {scoreFmt.format(scoreFor(id))}
          </span>
        </div>

        <div className="my-2.5 h-px w-full bg-[var(--border)]" />

        {/* Money row — the hero. Label + views share the tiny top line so the
            value gets the card's full width and never collides at 320px. */}
        <div className="flex flex-wrap items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Comissão
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-[var(--muted)]">
            <Eye className="h-3 w-3" />
            {compactViews.format(viewsFor(id))}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span
            className="text-base font-bold leading-none text-emerald-600 sm:text-lg dark:text-emerald-400"
            style={SORA}
          >
            {brl(commission)}
          </span>
          <span className="text-[11px] font-semibold text-[var(--muted)]">
            {pctFmt.format(commissionPct)}%
          </span>
        </div>

        {/* CTA — text-xs + no icon below sm so the label stays on one line
            inside the ~114px-wide button of a 320px two-column grid. */}
        {item.kind === "affiliate" ? (
          <button
            onClick={() => window.open(item.product.shopeeUrl, "_blank", "noopener,noreferrer")}
            className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 text-xs font-semibold text-white transition-all hover:bg-[var(--accent-2)] active:scale-[0.98] sm:text-sm"
          >
            <ExternalLink className="hidden h-3.5 w-3.5 sm:block" />
            Afiliar na Shopee
          </button>
        ) : (
          <button
            onClick={() => onSelectLegacy(item.product)}
            className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--accent)] px-2 text-xs font-semibold text-white transition-all hover:bg-[var(--accent-2)] active:scale-[0.98] sm:text-sm"
          >
            <ShoppingBag className="hidden h-3.5 w-3.5 sm:block" />
            <span className="sm:hidden">Vender produto</span>
            <span className="hidden sm:inline">Vender este produto</span>
          </button>
        )}
      </div>
    </div>
  );
}
