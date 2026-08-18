import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { products, categories, type Product } from "../lib/mock/products";
import { affiliateProducts, type AffiliateProduct } from "../lib/mock/affiliate-products";
import { ProductCard, catalogOrder, type CatalogItem } from "../components/products/ProductCard";
import { MyProductCard } from "../components/products/MyProductCard";
import { GenerateListingFlow } from "../components/products/GenerateListingFlow";
import { NewProductsAnnouncement } from "../components/products/NewProductsAnnouncement";
import { Input } from "../components/ui/input";
import { RolePickerDialog } from "../components/products/RolePickerDialog";
import { Search, Package } from "lucide-react";
import { spWindowIndex, msUntilNextSpWindow } from "../lib/timeWindow";
import { supabase } from "../integrations/supabase/client";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/dashboard/produtos")({ component: Produtos });

/** Resolve o `product_n` gravado no banco de volta para o produto do catálogo.
 *  O banco guarda só o número — nome, preço e imagem vivem no bundle. */
const affiliateByN = new Map<number, AffiliateProduct>(
  affiliateProducts.map((p) => [p.n, p]),
);

type MyProductRow = {
  product_n: number;
  last_clicked_at: string;
  click_count: number;
};

type SubTab = "catalogo" | "meus";

/** Sub-abas da própria página. NÃO viram item do dock: o dock já tem 10 itens
 *  e estoura a largura em 320px. */
const SUB_TABS: Array<{ id: SubTab; label: string }> = [
  { id: "catalogo", label: "Catálogo" },
  { id: "meus", label: "Meus produtos" },
];

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

// Products reshuffle every 6h, aligned to round America/Sao_Paulo local
// hours (00:00, 06:00, 12:00, 18:00) — see src/lib/timeWindow.ts.
const WINDOW_MS = 6 * 60 * 60 * 1000;

/** Isolated so its per-second tick only re-renders this line, never the
 *  302-card grid above it. */
function ProdutosCountdown() {
  const [msLeft, setMsLeft] = useState(() => msUntilNextSpWindow(WINDOW_MS));

  useEffect(() => {
    const id = setInterval(() => setMsLeft(msUntilNextSpWindow(WINDOW_MS)), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = Math.max(0, Math.ceil(msLeft / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  // Pure presentational read of the existing totalSeconds — does not touch the timer.
  const closingSoon = totalSeconds < 60;

  return (
    <div
      // mt-16: the sticky search/filter bar above renders its "stuck" box
      // ~64px (its own top-16 offset) lower than the space flow reserves for
      // it — a pre-existing quirk from the .page-enter wrapper's transform
      // interacting with position:sticky, not something introduced here.
      // This clearance keeps the card from being painted over by it.
      className={`mt-16 mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 transition-colors duration-500 sm:px-5 ${
        closingSoon
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] motion-reduce:animate-none" />
        <span className="relative block h-2 w-2 rounded-full bg-[var(--accent)]" />
      </span>

      <span className="text-xs font-semibold text-[var(--muted)]">Produtos atualizam em</span>

      <div className="flex items-center gap-1 sm:ml-auto" aria-hidden="true">
        {[
          { value: String(h), unit: "h" },
          { value: String(m).padStart(2, "0"), unit: "m" },
          { value: String(s).padStart(2, "0"), unit: "s" },
        ].map(({ value, unit }) => (
          <span
            key={unit}
            className={`flex h-8 min-w-[2.25rem] items-baseline justify-center gap-0.5 rounded-lg px-1.5 text-sm font-bold tabular-nums transition-colors duration-500 ${
              closingSoon
                ? "bg-[var(--surface)] text-[var(--accent)]"
                : "bg-[var(--muted-bg)] text-[var(--text)]"
            }`}
          >
            {value}
            <span className="text-[10px] font-medium text-[var(--muted)]">{unit}</span>
          </span>
        ))}
      </div>

      {/* Screen readers get the plain sentence; the boxes above are decorative. */}
      <span className="sr-only">
        Produtos atualizam em {h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
      </span>
    </div>
  );
}

function Produtos() {
  const { currentUserId } = useApp();
  const [tab, setTab] = useState<SubTab>("catalogo");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [selected, setSelected] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [rolePickProduct, setRolePickProduct] = useState<Product | null>(null);
  const [windowIndex, setWindowIndex] = useState(() => spWindowIndex(WINDOW_MS));
  // null = ainda carregando. A busca roda na montagem, não na troca de aba,
  // porque a contagem no rótulo tem que aparecer sem o usuário trocar de aba.
  const [mine, setMine] = useState<MyProductRow[] | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setMine([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = (await (supabase
          .from("user_affiliate_products" as never)
          .select("product_n, last_clicked_at, click_count")
          // O filtro por user_id é obrigatório mesmo com RLS: a policy de admin
          // permite SELECT em tudo, e sem isto a lista do admin viria com as
          // linhas dos outros usuários misturadas.
          .eq("user_id", currentUserId)
          .order("last_clicked_at", { ascending: false }) as unknown)) as {
          data: MyProductRow[] | null;
          error: { message: string } | null;
        };
        if (cancelled) return;
        if (error) {
          console.warn("[meus-produtos] falha ao carregar:", error.message);
          setMine([]);
          return;
        }
        setMine(data ?? []);
      } catch (err) {
        if (!cancelled) {
          console.warn("[meus-produtos] falha ao carregar:", err);
          setMine([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  /** Reflete o clique em "Afiliar na Shopee" na hora, sem esperar o servidor —
   *  a RPC do card já está a caminho e é idempotente. */
  const handleAffiliated = useCallback((product: AffiliateProduct) => {
    setMine((prev) => {
      if (!prev) return prev;
      const previous = prev.find((row) => row.product_n === product.n);
      const rest = prev.filter((row) => row.product_n !== product.n);
      const now = new Date().toISOString();
      return [
        {
          product_n: product.n,
          last_clicked_at: now,
          click_count: (previous?.click_count ?? 0) + 1,
        },
        ...rest,
      ];
    });
  }, []);

  const handleRemoved = useCallback((productN: number) => {
    setMine((prev) => (prev ? prev.filter((row) => row.product_n !== productN) : prev));
  }, []);

  // Linhas do banco → produtos do catálogo, na ordem que veio (clique mais
  // recente primeiro). Um `n` que não existe mais no catálogo é descartado em
  // silêncio: o catálogo é regerado por script e pode encolher.
  const myProducts = useMemo(
    () =>
      (mine ?? [])
        .map((row) => affiliateByN.get(row.product_n))
        .filter((p): p is AffiliateProduct => !!p),
    [mine],
  );

  // Fires once per 6h window, right at the boundary, rather than polling —
  // negligible cost, and it only touches state when the window actually rolls.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = msUntilNextSpWindow(WINDOW_MS) + 500;
      timeoutId = setTimeout(() => {
        setWindowIndex(spWindowIndex(WINDOW_MS));
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

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
      return catalogOrder(a.product.id, windowIndex) - catalogOrder(b.product.id, windowIndex);
    });
  }, [q, cat, windowIndex]);

  return (
    <DashboardShell
      title="Produtos"
    >
      <div className="page-enter">
        {/* ═══ SUB-ABAS ═══ */}
        <div className="flex pt-4">
          <div className="flex w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-auto">
            {SUB_TABS.map(({ id, label }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 sm:flex-none sm:px-5 sm:text-sm ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {label}
                  {/* A contagem no rótulo existe para o usuário saber que tem
                      coisa lá dentro sem precisar trocar de aba. */}
                  {id === "meus" && mine !== null && mine.length > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                        active ? "bg-white/25 text-white" : "bg-[var(--muted-bg)] text-[var(--text)]"
                      }`}
                    >
                      {mine.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ MEUS PRODUTOS ═══ */}
        {tab === "meus" &&
          (mine === null ? (
            <p className="py-20 text-center text-xs text-[var(--muted)]">
              Carregando seus produtos...
            </p>
          ) : myProducts.length === 0 ? (
            <div className="mt-16 flex flex-col items-center justify-center px-2 text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--muted-bg)]">
                <Package className="h-8 w-8 text-[var(--muted)]" />
              </div>
              <p
                className="text-sm font-semibold text-[var(--text)]"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Você ainda não afiliou nenhum produto
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--muted)]">
                Quando você clicar em "Afiliar na Shopee" em um produto do catálogo, ele aparece
                aqui — com as vendas dele na Shopee e o gerador de conteúdo prontos para usar.
              </p>
              <button onClick={() => setTab("catalogo")} className="btn-ghost mt-4 text-xs">
                Ir para o catálogo
              </button>
            </div>
          ) : (
            <div className="pt-4">
              <p className="mb-3 text-xs text-[var(--muted)]">
                {myProducts.length === 1
                  ? "1 produto afiliado"
                  : `${myProducts.length} produtos afiliados`}{" "}
                · o mais recente primeiro
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {myProducts.map((product) => (
                  <MyProductCard key={product.id} product={product} onRemoved={handleRemoved} />
                ))}
              </div>
            </div>
          ))}

        {/* ═══ CATÁLOGO ═══
            Escondido em vez de desmontado: trocar de aba não pode perder a
            busca, o filtro e a posição do scroll, e remontar 302 cards a cada
            ida e volta é caro no celular. */}
        <div className={tab === "catalogo" ? undefined : "hidden"}>
        {/* ═══ SEARCH + FILTERS ═══ */}
        <div className="sticky top-16 z-10 -mx-4 bg-[var(--bg)]/80 px-4 pb-4 pt-4 backdrop-blur md:-mx-8 md:px-8">
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

        {/* Scrolls normally with the content — not inside the sticky bar above */}
        <ProdutosCountdown />

        {/* ═══ PRODUCT GRID ═══ */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {list.map((it) => (
            <ProductCard
              key={it.product.id}
              item={it}
              onSelectLegacy={(prod) => setRolePickProduct(prod)}
              onAffiliated={handleAffiliated}
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

      {/* One-time (localStorage-gated) announcement of the 50 new products */}
      <NewProductsAnnouncement />
    </DashboardShell>
  );
}
