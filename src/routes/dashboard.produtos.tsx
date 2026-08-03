import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { products, categories, type Product } from "../lib/mock/products";
import { affiliateProducts } from "../lib/mock/affiliate-products";
import { ProductCard, catalogOrder, type CatalogItem } from "../components/products/ProductCard";
import { GenerateListingFlow } from "../components/products/GenerateListingFlow";
import { Input } from "../components/ui/input";
import { RolePickerDialog } from "../components/products/RolePickerDialog";
import { Search, Package } from "lucide-react";

export const Route = createFileRoute("/dashboard/produtos")({ component: Produtos });

const catalog: CatalogItem[] = [
  ...products.map((product) => ({ kind: "legacy" as const, product })),
  ...affiliateProducts.map((product) => ({ kind: "affiliate" as const, product })),
];

const allCategories = [
  ...categories,
  ...Array.from(new Set(affiliateProducts.map((p) => p.category))).filter(
    (c) => !categories.includes(c),
  ),
];

function Produtos() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [rolePickProduct, setRolePickProduct] = useState<Product | null>(null);

  const list = useMemo(() => {
    let l = catalog;
    if (q) l = l.filter((it) => it.product.name.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "Todos") {
      if (cat === "Mais vendidos") l = l.filter((it) => it.kind === "legacy" && it.product.featured);
      else if (["Alta procura", "Boa margem", "Baixa concorrência"].includes(cat))
        l = l.filter((it) => it.kind === "legacy" && it.product.tags.includes(cat));
      else l = l.filter((it) => it.product.category === cat);
    }
    return [...l].sort((a, b) => {
      const pa = Number(a.kind === "legacy" && !!a.product.pinned);
      const pb = Number(b.kind === "legacy" && !!b.product.pinned);
      if (pa !== pb) return pb - pa;
      return catalogOrder(a.product.id) - catalogOrder(b.product.id);
    });
  }, [q, cat]);

  return (
    <DashboardShell
      title="Produtos"
    >
      <div className="page-enter">
        {/* ═══ SEARCH + FILTERS ═══ */}
        <div className="sticky top-16 z-10 -mx-4 px-4 pb-4 md:-mx-8 md:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar produto..."
                className="h-11 rounded-full border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm text-[var(--text)] transition-all focus-visible:ring-[var(--accent)]/30 placeholder:text-[var(--muted)]"
              />
            </div>

            {/* Category chips — horizontal scroll on mobile */}
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 lg:flex-wrap scrollbar-none">
              {allCategories.map((c) => {
                const active = cat === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ PRODUCT GRID ═══ */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {list.map((it) => (
            <ProductCard
              key={it.product.id}
              item={it}
              onSelectLegacy={(prod) => setRolePickProduct(prod)}
            />
          ))}
        </div>

        {list.length === 0 && (
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--muted-bg)]">
              <Package className="h-8 w-8 text-[var(--muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Nenhum produto encontrado
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tente ajustar sua busca ou limpar os filtros.
            </p>
            <button
              onClick={() => { setQ(""); setCat("Todos"); }}
              className="btn-ghost mt-4 text-xs"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <GenerateListingFlow
        product={selected}
        open={open}
        onClose={() => setOpen(false)}
      />

      <RolePickerDialog
        open={!!rolePickProduct}
        productName={rolePickProduct?.name || ""}
        onSelectVendedor={() => {
          if (rolePickProduct) {
            setSelected(rolePickProduct);
            setOpen(true);
            setRolePickProduct(null);
          }
        }}
        onSelectAfiliado={() => {
          setRolePickProduct(null);
          window.open("https://affiliate.shopee.com.br/dashboard", "_blank", "noopener,noreferrer");
        }}
        onClose={() => setRolePickProduct(null)}
      />
    </DashboardShell>
  );
}
