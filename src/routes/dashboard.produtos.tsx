import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { products, categories, VALENTINE_CATEGORY, COPA_CATEGORY, type Product } from "../lib/mock/products";
import { ProductCard } from "../components/products/ProductCard";
import { GenerateListingFlow } from "../components/products/GenerateListingFlow";
import { Input } from "../components/ui/input";
import { Search, Heart, Trophy } from "lucide-react";

export const Route = createFileRoute("/dashboard/produtos")({ component: Produtos });

function Produtos() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    let l = [...products];
    if (q) l = l.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "Todos") {
      if (cat === "Mais vendidos") l = l.filter((p) => p.featured);
      else if (["Alta procura", "Boa margem", "Baixa concorrência"].includes(cat))
        l = l.filter((p) => p.tags.includes(cat));
      else l = l.filter((p) => p.category === cat);
    }
    return l.sort((a, b) => {
      const pa = Number(!!a.pinned);
      const pb = Number(!!b.pinned);
      if (pa !== pb) return pb - pa;
      const ca = Number(a.category === COPA_CATEGORY);
      const cb = Number(b.category === COPA_CATEGORY);
      if (ca !== cb) return cb - ca;
      const va = Number(a.category === VALENTINE_CATEGORY);
      const vb = Number(b.category === VALENTINE_CATEGORY);
      if (va !== vb) return vb - va;
      return 0;
    });
  }, [q, cat]);

  return (
    <DashboardShell
      title="Produtos"
      subtitle="Encontre produtos validados e envie para sua loja Shopee em poucos cliques."
    >
      {/* ═══ SEARCH + FILTERS ═══ */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="h-11 rounded-xl border-gray-200 bg-white pl-10 pr-4 text-sm shadow-sm shadow-black/[0.02] transition-shadow focus-visible:ring-[#EE4D2D]/30"
          />
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const isValentine = c === VALENTINE_CATEGORY;
            const isCopa = c === COPA_CATEGORY;
            const active = cat === c;

            if (isCopa) {
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`copa-chip relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "copa-chip-active" : ""
                  }`}
                >
                  <Trophy className="h-3 w-3" />
                  {c}
                  <span className="copa-badge-new ml-1 rounded-full bg-white/90 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-green-700">
                    Novo
                  </span>
                </button>
              );
            }

            if (isValentine) {
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`valentine-chip relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "valentine-chip-active" : ""
                  }`}
                >
                  <Heart className="h-3 w-3" />
                  {c}
                  <span className="ml-1 rounded-full bg-white/90 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-rose-600">
                    Alta procura
                  </span>
                </button>
              );
            }

            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-[#EE4D2D] bg-[#EE4D2D] text-white shadow-sm shadow-[#EE4D2D]/25"
                    : "border-gray-200 bg-white text-gray-500 hover:border-[#EE4D2D]/40 hover:text-[#EE4D2D]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ PRODUCT GRID ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {list.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onSelect={(prod) => {
              setSelected(prod);
              setOpen(true);
            }}
          />
        ))}
      </div>

      {list.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <Search className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Nenhum produto encontrado
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Tente ajustar sua busca ou limpar os filtros.
          </p>
        </div>
      )}

      <GenerateListingFlow
        product={selected}
        open={open}
        onClose={() => setOpen(false)}
      />
    </DashboardShell>
  );
}
