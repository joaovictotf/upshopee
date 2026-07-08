import { TrendingUp, ShoppingBag } from "lucide-react";
import type { Product } from "../../lib/mock/products";
import { brl } from "../../lib/format";

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/30"
    >
      {/* Image */}
      <div className="aspect-[4/5] overflow-hidden bg-[var(--muted-bg)]">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.dataset.fallback === "1") return;
            img.dataset.fallback = "1";
            img.src = "https://placehold.co/600x750/fce7f3/be185d?text=Produto";
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        {/* Name */}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text)]">
          {product.name}
        </h3>

        {/* Commission */}
        <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
          <TrendingUp className="h-3.5 w-3.5" />
          Comissão estimada: {brl(product.estimatedCommission)}
        </span>

        {/* CTA */}
        <button
          onClick={() => onSelect(product)}
          className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] text-sm font-semibold text-white transition-all hover:bg-[var(--accent-2)] active:scale-[0.98]"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Vender este produto
        </button>
      </div>
    </div>
  );
}
