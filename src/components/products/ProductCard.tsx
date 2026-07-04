import { Flame, TrendingUp, ShoppingBag } from "lucide-react";
import type { Product } from "../../lib/mock/products";
import { brl } from "../../lib/format";
import { Button } from "../ui/button";

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-[16px] bg-[var(--surface)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border)] transition-all duration-200 hover:shadow-[var(--shadow-elevated)] hover:ring-[var(--border-warm)] hover:-translate-y-0.5"
    >
      {/* Image section */}
      <div className="relative aspect-square overflow-hidden bg-[var(--muted-bg)]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.dataset.fallback === "1") return;
            img.dataset.fallback = "1";
            img.src = "https://placehold.co/600x600/fce7f3/be185d?text=Produto";
          }}
          className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />

        {/* Category badge — top right */}
        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {product.category}
        </span>

        {/* Commission badge — gradient pill on image corner */}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--accent-gradient)] px-2.5 py-1 text-[10px] font-bold text-white shadow-[var(--shadow-glow)]">
          <TrendingUp className="h-3 w-3" /> {brl(product.estimatedCommission)}
        </span>

        {/* Featured badge */}
        {product.featured && (
          <span className="absolute left-2 top-10 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Flame className="h-3 w-3" /> Mais vendido
          </span>
        )}

      </div>

      {/* Info section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Product name */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text)]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {product.name}
        </h3>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Price grid */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[11px] text-[var(--muted)]">Custo fornecedor</div>
            <div className="mt-0.5 font-semibold text-[var(--text)]">
              {brl(Math.min(product.supplierCostRJ, product.supplierCostSP))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--muted)]">Preço sugerido</div>
            <div className="mt-0.5 font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
              {brl(product.suggestedPrice)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>
            Procura: <b className="text-[var(--text)]">{product.demandLevel}</b>
          </span>
          <span>
            Concorrência:{" "}
            <b className="text-[var(--text)]">{product.competitionLevel}</b>
          </span>
        </div>

        {/* CTA Button — revealed on hover */}
        <Button
          onClick={() => onSelect(product)}
          className="mt-3 h-10 w-full rounded-full bg-[var(--accent-gradient)] text-sm font-semibold text-white shadow-[var(--accent-glow)] transition-all hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 active:scale-[0.98] opacity-90 group-hover:opacity-100"
        >
          <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Vender este produto
        </Button>
      </div>
    </div>
  );
}
