import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { brl } from "../lib/format";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import {
  Search, Star, Copy, Check, ExternalLink,
  TrendingUp, X, ChevronDown, Sparkles, Info, Eye, EyeOff,
  Plus, Trash2, Edit3, Settings,
} from "lucide-react";
import { affiliateProducts, AFFILIATE_CATEGORIES, type AffiliateProduct } from "../lib/mock/affiliate-products";

export const Route = createFileRoute("/dashboard/produtos")({ component: Produtos });

const SORT_OPTIONS = [
  { value: "popular", label: "Mais populares" },
  { value: "commission", label: "Maior comissão" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "rating", label: "Melhor avaliados" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];
type AffiliateState = "idle" | "loading" | "success";
type LoadingStep = "connect" | "generate" | "finish";

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const AFFILIATED_KEY = "upshopee_affiliated";
const getAffiliated = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(AFFILIATED_KEY) || "[]")); }
  catch { return new Set(); }
};
const setAffiliated = (ids: Set<string>) => {
  localStorage.setItem(AFFILIATED_KEY, JSON.stringify([...ids]));
};

// ─── Main ─────────────────────────────────────────────────────────────────────
function Produtos() {
  const { isAdmin } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Todas");
  const [sort, setSort] = useState<SortValue>("popular");
  const [affiliated, setAffiliatedState] = useState<Set<string>>(getAffiliated);
  const [detailProduct, setDetailProduct] = useState<AffiliateProduct | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [affiliateModal, setAffiliateModal] = useState<AffiliateProduct | null>(null);

  // Persist affiliation changes
  useEffect(() => { setAffiliated(affiliated); }, [affiliated]);

  // Filter + sort
  const list = useMemo(() => {
    let l = [...affiliateProducts];
    if (q) l = l.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (cat !== "Todas") l = l.filter((p) => p.category === cat);
    switch (sort) {
      case "popular": l.sort((a, b) => b.salesCount - a.salesCount); break;
      case "commission": l.sort((a, b) => b.commissionAmount - a.commissionAmount); break;
      case "price-asc": l.sort((a, b) => a.price - b.price); break;
      case "price-desc": l.sort((a, b) => b.price - a.price); break;
      case "rating": l.sort((a, b) => b.rating - a.rating); break;
    }
    return l;
  }, [q, cat, sort]);

  const addAffiliated = (id: string) => {
    setAffiliatedState((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  return (
    <DashboardShell
      title="Produtos para Afiliados"
      subtitle="Escolha produtos, gere seu link de afiliado e ganhe comissões na Shopee"
    >
      {/* ═══ FILTER BAR ═══ */}
      <div className="sticky top-16 z-10 bg-background pb-4 pt-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto pelo nome..."
              className="h-10 rounded-lg border-gray-200 bg-white pl-10 pr-4 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdmin(!showAdmin)}
                className="gap-1.5 border-gray-200 text-gray-600 text-xs"
              >
                <Settings className="h-3.5 w-3.5" />
                {showAdmin ? "Fechar admin" : "Gerenciar Catálogo"}
              </Button>
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortValue)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#EE4D2D]/20"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category pills */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
          {AFFILIATE_CATEGORIES.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-[#EE4D2D] bg-[#EE4D2D] text-white"
                    : "border-gray-200 bg-white text-gray-500 hover:border-[#EE4D2D]/40 hover:text-[#EE4D2D]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          {list.length} produto{list.length !== 1 ? "s" : ""} encontrado{list.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ═══ ADMIN PANEL ═══ */}
      {showAdmin && isAdmin && (
        <AdminPanel products={list} />
      )}

      {/* ═══ PRODUCT GRID ═══ */}
      {list.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isAffiliated={affiliated.has(p.id)}
              onAffiliate={(prod) => addAffiliated(prod.id)}
              onDetail={setDetailProduct}
              onAffiliateModal={setAffiliateModal}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <Search className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Nenhum produto encontrado</p>
          <p className="mt-1 text-xs text-gray-400">Tente ajustar sua busca ou limpar os filtros.</p>
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          isAffiliated={affiliated.has(detailProduct.id)}
          onClose={() => setDetailProduct(null)}
          onAffiliate={(prod) => { addAffiliated(prod.id); setAffiliateModal(prod); setDetailProduct(null); }}
        />
      )}

      {/* ═══ AFFILIATION SUCCESS MODAL ═══ */}
      {affiliateModal && (
        <AffiliationModal
          product={affiliateModal}
          onClose={() => setAffiliateModal(null)}
        />
      )}
    </DashboardShell>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product,
  isAffiliated,
  onAffiliate,
  onDetail,
  onAffiliateModal,
}: {
  product: AffiliateProduct;
  isAffiliated: boolean;
  onAffiliate: (p: AffiliateProduct) => void;
  onDetail: (p: AffiliateProduct) => void;
  onAffiliateModal: (p: AffiliateProduct) => void;
}) {
  const [state, setState] = useState<AffiliateState>(isAffiliated ? "success" : "idle");
  const [step, setStep] = useState<LoadingStep>("connect");

  const handleClick = () => {
    if (state === "success") return;
    setState("loading");
    setStep("connect");

    const t1 = setTimeout(() => setStep("generate"), 600);
    const t2 = setTimeout(() => setStep("finish"), 1200);
    const t3 = setTimeout(() => {
      setState("success");
      onAffiliate(product);
      onAffiliateModal(product);
    }, 1500);

    // Cleanup if unmounted mid-animation (not strictly needed but clean)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  };

  // Sync parent affiliation state
  useEffect(() => { if (isAffiliated) setState("success"); }, [isAffiliated]);

  const scoreColor = product.score >= 85 ? "bg-emerald-500" : product.score >= 70 ? "bg-[#EE4D2D]" : "bg-amber-500";

  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-200 hover:shadow-sm hover:border-gray-300">
      {/* Image — click to open detail */}
      <button
        onClick={() => onDetail(product)}
        className="relative block w-full overflow-hidden bg-gray-100"
      >
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        {product.badge && (
          <span className={`absolute top-2 left-2 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
            product.badge.includes("Copa") || product.badge === "Copa 2026"
              ? "bg-green-600 text-white"
              : product.badge === "Trending"
              ? "bg-[#EE4D2D] text-white"
              : product.badge === "Premium"
              ? "bg-amber-500 text-white"
              : product.badge === "Top" || product.badge === "Best-seller"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700"
          }`}>
            {product.badge}
          </span>
        )}
      </button>

      <div className="flex flex-col flex-1 p-4">
        {/* Name */}
        <button onClick={() => onDetail(product)} className="text-left mb-2">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug hover:text-[#EE4D2D] transition-colors">
            {product.name}
          </h3>
        </button>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-lg font-bold text-gray-900">{brl(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">{brl(product.originalPrice)}</span>
          )}
        </div>

        {/* Rating + sales */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {product.rating}
          </span>
          <span className="text-gray-300">•</span>
          <span>{product.salesCount.toLocaleString("pt-BR")} vendidos</span>
        </div>

        {/* Commission */}
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mb-2">
          <TrendingUp className="h-3 w-3" />
          Comissão: {brl(product.commissionAmount)} ({product.commission}%)
        </div>

        {/* Score bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>Score</span>
            <span>{product.score}/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full ${scoreColor} transition-all`} style={{ width: `${product.score}%` }} />
          </div>
        </div>

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.tags.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{t}</span>
            ))}
          </div>
        )}

        <div className="mt-auto">
          <button
            onClick={handleClick}
            disabled={state === "loading"}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
              state === "success"
                ? "bg-emerald-500 text-white cursor-default"
                : state === "loading"
                ? "bg-gray-300 text-gray-500 cursor-wait"
                : "bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
            }`}
          >
            {state === "idle" && "Se afiliar"}
            {state === "loading" && (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {step === "connect" && "Conectando..."}
                {step === "generate" && "Gerando seu link..."}
                {step === "finish" && "Finalizando..."}
              </span>
            )}
            {state === "success" && (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" /> Afiliado
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductDetailModal({
  product,
  isAffiliated,
  onClose,
  onAffiliate,
}: {
  product: AffiliateProduct;
  isAffiliated: boolean;
  onClose: () => void;
  onAffiliate: (p: AffiliateProduct) => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [affState, setAffState] = useState<AffiliateState>(isAffiliated ? "success" : "idle");

  const handleAffiliate = () => {
    if (affState === "success") return;
    setAffState("loading");
    setTimeout(() => {
      setAffState("success");
      onAffiliate(product);
    }, 1500);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {/* Image gallery */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={product.images[imgIdx] || product.images[0]}
            alt={product.name}
            className="h-56 w-full object-cover"
          />
          {product.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {product.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`h-2 w-2 rounded-full transition-all ${i === imgIdx ? "bg-white w-4" : "bg-white/60"}`}
                />
              ))}
            </div>
          )}
        </div>

        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{product.name}</DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold text-gray-900">{brl(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">{brl(product.originalPrice)}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-gray-600">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {product.rating}
          </span>
          <span className="text-gray-400">{product.salesCount.toLocaleString("pt-BR")} vendidos</span>
        </div>

        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <TrendingUp className="h-4 w-4" /> Comissão de afiliado
          </div>
          <p className="mt-1 text-emerald-800">
            <strong>{brl(product.commissionAmount)}</strong> por venda ({product.commission}% de comissão)
          </p>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Score do produto</span>
            <span>{product.score}/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#EE4D2D]"
              style={{ width: `${product.score}%` }}
            />
          </div>
        </div>

        {product.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.tags.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">{t}</span>
            ))}
          </div>
        )}

        <div className="mt-5">
          <button
            onClick={handleAffiliate}
            disabled={affState === "loading"}
            className={`w-full rounded-lg py-3 text-sm font-semibold transition-all ${
              affState === "success"
                ? "bg-emerald-500 text-white cursor-default"
                : affState === "loading"
                ? "bg-gray-300 text-gray-500"
                : "bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
            }`}
          >
            {affState === "idle" && "Se afiliar a este produto"}
            {affState === "loading" && (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Gerando link...
              </span>
            )}
            {affState === "success" && (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" /> Afiliado com sucesso!
              </span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Affiliation Success Modal ─────────────────────────────────────────────────
function AffiliationModal({
  product,
  onClose,
}: {
  product: AffiliateProduct;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(product.shopeeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = product.shopeeUrl;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <div className="text-center mb-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">
            🎉
          </div>
          <DialogHeader className="mt-3">
            <DialogTitle className="text-lg font-semibold">Você agora é afiliado(a)!</DialogTitle>
          </DialogHeader>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Produto</span>
            <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">{product.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Comissão</span>
            <span className="font-semibold text-emerald-600">
              {brl(product.commissionAmount)} por venda ({product.commission}%)
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <button
            onClick={handleCopy}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
              copied ? "bg-emerald-500 text-white" : "bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
            }`}
          >
            {copied ? (
              <><Check className="h-4 w-4" /> Link copiado!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copiar link do produto</>
            )}
          </button>

          <a
            href="https://shopee.com.br/affiliate"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <ExternalLink className="h-4 w-4" /> Abrir Shopee Afiliados
          </a>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">Como funciona:</p>
          <ol className="space-y-1.5 text-xs text-gray-500">
            <li>1. Copie o link do produto acima</li>
            <li>2. Abra o Shopee Afiliados</li>
            <li>3. Cole o link e gere SEU link</li>
            <li>4. Compartilhe e ganhe comissões</li>
          </ol>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
        >
          Fechar
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ products }: { products: AffiliateProduct[] }) {
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("upshopee_hidden_products") || "[]")); }
    catch { return new Set(); }
  });

  const toggle = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("upshopee_hidden_products", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Settings className="h-4 w-4" /> Gerenciar Catálogo
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Controle de visibilidade dos produtos. Produtos ocultos não aparecem para usuários normais.
      </p>
      <div className="max-h-[400px] overflow-y-auto border border-gray-100 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-left text-gray-500">
              <th className="px-3 py-2 font-medium">Produto</th>
              <th className="px-3 py-2 font-medium">Preço</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">Categoria</th>
              <th className="px-3 py-2 font-medium text-center">Visível</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => {
              const isHidden = hidden.has(p.id);
              return (
                <tr key={p.id} className={`hover:bg-gray-50 ${isHidden ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[200px]">{p.name}</td>
                  <td className="px-3 py-2 text-gray-600">{brl(p.price)}</td>
                  <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{p.category}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggle(p.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] hover:bg-gray-100"
                    >
                      {isHidden ? (
                        <><EyeOff className="h-3 w-3" /> Oculto</>
                      ) : (
                        <><Eye className="h-3 w-3" /> Visível</>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
