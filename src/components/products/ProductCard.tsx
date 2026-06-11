import { Sparkles, Flame, TrendingUp } from "lucide-react";
import type { Product } from "../../lib/mock/products";
import { COPA_CATEGORY } from "../../lib/mock/products";
import { brl } from "../../lib/format";
import { Button } from "../ui/button";

export function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const isCopa = product.category === COPA_CATEGORY;
  return (
    <div className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5${isCopa ? " copa-card" : ""}`}>
      <div className="relative aspect-square overflow-hidden bg-white">
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
          className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105"
        />
        {product.featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow">
            <Flame className="h-3 w-3" /> Mais vendido
          </span>
        )}
        {isCopa && (
          <span className="copa-badge-new absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-green-600 to-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            🏆 NOVO
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">{t}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Custo fornecedor</div>
            <div className="font-semibold">{brl(Math.min(product.supplierCostRJ, product.supplierCostSP))}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Preço sugerido</div>
            <div className="font-semibold">{brl(product.suggestedPrice)}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><TrendingUp className="h-3 w-3" /> Comissão</span>
          <span className="text-sm font-bold text-primary">{brl(product.estimatedCommission)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Procura: <b className="text-foreground">{product.demandLevel}</b></span>
          <span>Concorrência: <b className="text-foreground">{product.competitionLevel}</b></span>
        </div>
        <Button onClick={() => onSelect(product)} className="mt-3 w-full">
          <Sparkles className="mr-1 h-3.5 w-3.5" /> Gerar anúncio
        </Button>
      </div>
    </div>
  );
}