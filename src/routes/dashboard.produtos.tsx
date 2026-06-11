import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { products, categories, VALENTINE_CATEGORY, COPA_CATEGORY, type Product } from "../lib/mock/products";
import { ProductCard } from "../components/products/ProductCard";
import { GenerateListingFlow } from "../components/products/GenerateListingFlow";
import { Input } from "../components/ui/input";
import { Search, Heart, Sparkles, Trophy } from "lucide-react";

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
      else if (["Alta procura", "Boa margem", "Baixa concorrência"].includes(cat)) l = l.filter((p) => p.tags.includes(cat));
      else l = l.filter((p) => p.category === cat);
    }
    return l.sort((a, b) => {
      const pa = Number(!!a.pinned);
      const pb = Number(!!b.pinned);
      if (pa !== pb) return pb - pa;
      // Copa do Mundo aparece no topo (depois de pinned)
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
    <DashboardShell title="Produtos" subtitle="Encontre produtos validados e envie para sua loja Shopee em poucos cliques.">


      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
        </div>
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
                  className={`copa-chip relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${active ? "copa-chip-active" : ""}`}
                >
                  <Trophy className="h-3 w-3" />
                  {c}
                  <span className="copa-badge-new ml-1 rounded-full bg-white/90 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-green-700">Novo</span>
                </button>
              );
            }
            if (isValentine) {
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`valentine-chip relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${active ? "valentine-chip-active" : ""}`}
                >
                  <Heart className="h-3 w-3" />
                  {c}
                  <span className="ml-1 rounded-full bg-white/90 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-rose-600">Alta procura</span>
                </button>
              );
            }
            return (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>{c}</button>
            );
          })}
        </div>
      </div>

      {/* Banner Copa do Mundo */}
      {(cat === "Todos" || cat === COPA_CATEGORY) && (
        <div className="copa-banner relative mb-5 overflow-hidden rounded-2xl border border-green-200 p-5 shadow-sm">
          <div className="copa-shine pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="copa-badge-new inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 shadow-sm">
                  <Sparkles className="h-3 w-3" /> Novo · 10 produtos
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-green-800 md:text-2xl">🏆 Copa do Mundo 2026</h2>
              <p className="mt-1 max-w-2xl text-sm text-green-900/80">
                Produtos com alta demanda para a Copa — camisas, bolas, kits torcedor e muito mais com ótimas margens.
              </p>
            </div>
            <button
              onClick={() => setCat(COPA_CATEGORY)}
              className="inline-flex items-center gap-1.5 self-start rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110 md:self-auto"
              style={{ background: "linear-gradient(135deg, #15803d, #ca8a04)" }}
            >
              <Trophy className="h-3.5 w-3.5" /> Ver coleção completa
            </button>
          </div>
        </div>
      )}

      {/* Banner Valentine */}
      {(cat === "Todos" || cat === VALENTINE_CATEGORY) && (
        <div className="valentine-banner relative mb-5 overflow-hidden rounded-2xl border border-rose-200 p-5 shadow-sm">
          <div className="valentine-shine pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 shadow-sm">
                  <Sparkles className="h-3 w-3" /> Alta procura
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-rose-700 md:text-2xl">Dia dos Namorados</h2>
              <p className="mt-1 max-w-2xl text-sm text-rose-900/80">
                Produtos com alta procura para presentes românticos, kits especiais e ofertas sazonais.
              </p>
            </div>
            <button
              onClick={() => setCat(VALENTINE_CATEGORY)}
              className="inline-flex items-center gap-1.5 self-start rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110 md:self-auto"
            >
              <Heart className="h-3.5 w-3.5" /> Ver coleção completa
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {list.map((p) => <ProductCard key={p.id} product={p} onSelect={(prod) => { setSelected(prod); setOpen(true); }} />)}
      </div>

      <GenerateListingFlow product={selected} open={open} onClose={() => setOpen(false)} />
    </DashboardShell>
  );
}