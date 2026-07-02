import { Flame, TrendingUp, ShoppingBag } from "lucide-react";
import type { Product } from "../../lib/mock/products";
import { brl } from "../../lib/format";
import { Button } from "../ui/button";

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06] transition-all hover:shadow-md hover:shadow-[#EE4D2D]/5 hover:ring-[#EE4D2D]/20 hover:-translate-y-0.5"
    >
      {/* Image section */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
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

        {/* Featured badge — top left */}
        {product.featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-[#EE4D2D] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Flame className="h-3 w-3" /> Mais vendido
          </span>
        )}

      </div>

      {/* Info section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Product name */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
          {product.name}
        </h3>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-[#FFF8F5] px-1.5 py-0.5 text-[10px] font-medium text-[#EE4D2D]/80"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Price grid */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[11px] text-gray-400">Custo fornecedor</div>
            <div className="mt-0.5 font-semibold text-gray-800">
              {brl(Math.min(product.supplierCostRJ, product.supplierCostSP))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400">Preço sugerido</div>
            <div className="mt-0.5 font-semibold text-gray-800">
              {brl(product.suggestedPrice)}
            </div>
          </div>
        </div>

        {/* Commission highlight */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-[#FFF8F5] px-3 py-2">
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#EE4D2D]/70">
            <TrendingUp className="h-3 w-3" /> Comissão est.
          </span>
          <span className="text-sm font-bold text-[#EE4D2D]">
            {brl(product.estimatedCommission)}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
          <span>
            Procura: <b className="text-gray-700">{product.demandLevel}</b>
          </span>
          <span>
            Concorrência:{" "}
            <b className="text-gray-700">{product.competitionLevel}</b>
          </span>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => onSelect(product)}
          className="mt-3 h-10 w-full rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]"
        >
          <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Vender este produto
        </Button>
      </div>
    </div>
  );
}
