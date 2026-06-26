import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import {
  useApp,
  MARKETPLACE_LABEL,
  type Marketplace,
  type SavedProduct,
  getProductImage,
} from "../lib/state";
import { brl } from "../lib/format";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Copy,
  ExternalLink,
  Megaphone,
  Package,
  Sparkles,
  Clock,
  Store,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/meus-produtos")({
  component: MeusProdutos,
});

const LOGO: Record<Marketplace, string> = {
  shopee: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
};
const FALLBACK: Record<Marketplace, string> = {
  shopee: "/brands/shopee-logo.svg",
};

function MPLogo({ mp, className }: { mp: Marketplace; className?: string }) {
  return (
    <img
      src={LOGO[mp]}
      alt={MARKETPLACE_LABEL[mp]}
      className={className}
      onError={(e) => {
        const t = e.currentTarget;
        t.onerror = null;
        t.src = FALLBACK[mp];
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════

function MeusProdutos() {
  const { data } = useApp();
  const [detail, setDetail] = useState<SavedProduct | null>(null);
  const [gen, setGen] = useState<SavedProduct | null>(null);

  return (
    <DashboardShell
      title="Meus Produtos"
      subtitle="Acompanhe os produtos enviados para configuração nas suas lojas."
    >
      {data.meusProdutos.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm shadow-black/[0.02]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8F5]">
            <Package className="h-7 w-7 text-[#EE4D2D]/60" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-gray-900">
            Nenhum produto enviado ainda
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">
            Escolha um produto na aba Produtos, gere o anúncio e envie para sua
            loja para acompanhar tudo por aqui.
          </p>
          <Link to="/dashboard/produtos">
            <Button className="mt-5 h-10 rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
              <Sparkles className="mr-1.5 h-4 w-4" /> Escolher produtos
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.meusProdutos.map((p) => (
            <MeuProdutoCard
              key={p.id}
              p={p}
              onDetail={() => setDetail(p)}
              onGen={() => setGen(p)}
            />
          ))}
        </div>
      )}

      <DetailDialog
        product={detail}
        onClose={() => setDetail(null)}
        onGen={(p) => {
          setDetail(null);
          setGen(p);
        }}
      />
      <GeneratorDialog product={gen} onClose={() => setGen(null)} />
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRODUCT CARD
// ═══════════════════════════════════════════════════════════════════════

function MeuProdutoCard({
  p,
  onDetail,
  onGen,
}: {
  p: SavedProduct;
  onDetail: () => void;
  onGen: () => void;
}) {
  const isReady =
    p.status === "Pronto para venda" || p.status === "Disponível na loja";
  const isPending = p.productValidationStatus === "pending_validation";

  return (
    <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06] transition-all hover:shadow-md hover:shadow-[#EE4D2D]/5">
      {/* ═══ TOP: Image + Info ═══ */}
      <div className="flex gap-3">
        {/* Image */}
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-2">
          <img
            src={getProductImage(p as unknown as Record<string, unknown>)}
            alt={p.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              t.onerror = null;
              t.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
            {p.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-400">{p.category}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {p.marketplaces.map((mp) => (
              <span
                key={mp}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
              >
                <span className="grid h-3 w-6 place-items-center rounded-sm bg-white p-0.5">
                  <MPLogo mp={mp} className="max-h-2.5 max-w-full object-contain" />
                </span>
                {MARKETPLACE_LABEL[mp]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ METRICS GRID ═══ */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="Fornecedor" value={p.supplierName || "—"} />
        <MiniMetric
          label="Preço fornecedor"
          value={p.supplierCost != null ? brl(p.supplierCost) : "—"}
        />
        <MiniMetric
          label="Preço recomendado"
          value={p.recommendedPrice != null ? brl(p.recommendedPrice) : "—"}
        />
        <MiniMetric
          label="Lucro líquido"
          value={
            p.estimatedNetProfit != null ? brl(p.estimatedNetProfit) : "—"
          }
          accent
        />
      </div>

      {/* ═══ STATUS SECTION ═══ */}
      <div className="mt-3 rounded-xl bg-[#FFF8F5] p-3">
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              isReady
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isReady ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {p.status}
          </span>

          {/* Status description */}
          <span className="inline-flex items-center gap-1 text-[11px] text-[#EE4D2D]/60">
            <Clock className="h-3 w-3" />
            {isReady
              ? "Produto disponível na loja"
              : isPending
                ? "Aguardando validação da equipe"
                : "Prazo estimado: até 1 dia útil"}
          </span>
        </div>

        {/* Progress bar */}
        <StatusProgress ready={isReady} />

        {/* Contextual message */}
        {isPending && (
          <p className="mt-2 text-[10px] text-gray-500">
            Seu produto está em análise e será liberado assim que a
            configuração for validada.
          </p>
        )}
        {isReady && !isPending && (
          <p className="mt-2 text-[10px] text-emerald-600/80">
            Produto liberado para venda e acompanhamento pelo painel.
          </p>
        )}
      </div>

      {/* ═══ ACTIONS ═══ */}
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D] hover:bg-[#FFF8F5]"
          onClick={onDetail}
        >
          Ver detalhes
        </Button>
        <Button
          size="sm"
          className="h-9 flex-1 rounded-xl bg-[#EE4D2D] text-xs font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]"
          onClick={onGen}
        >
          <Megaphone className="mr-1 h-3.5 w-3.5" /> Gerar texto
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════

function StatusProgress({ ready }: { ready?: boolean }) {
  const steps = ["Enviado", "Anúncio", "Fornecedor", "Aguardando", "Pronto"];
  const current = ready ? steps.length - 1 : 2;

  return (
    <div className="mt-3 flex items-center gap-1">
      {steps.map((s, i) => {
        const filled = i <= current;
        return (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                filled ? "bg-[#EE4D2D]" : "bg-gray-200"
              }`}
            />
            <div
              className={`mt-1 text-[9px] font-medium ${
                filled ? "text-[#EE4D2D]" : "text-gray-400"
              }`}
            >
              {s}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MINI METRIC
// ═══════════════════════════════════════════════════════════════════════

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2">
      <div className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div
        className={`mt-0.5 truncate text-xs font-semibold ${
          accent ? "text-[#EE4D2D]" : "text-gray-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL DIALOG
// ═══════════════════════════════════════════════════════════════════════

function DetailDialog({
  product,
  onClose,
  onGen,
}: {
  product: SavedProduct | null;
  onClose: () => void;
  onGen: (p: SavedProduct) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-0 bg-white shadow-xl shadow-black/[0.08]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product image + supplier info */}
          <div className="flex gap-4">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 p-3">
              <img
                src={getProductImage(
                  product as unknown as Record<string, unknown>
                )}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.onerror = null;
                  t.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-600">
                <Store className="h-3.5 w-3.5 text-gray-400" />{" "}
                {product.supplierName}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />{" "}
                {product.supplierLocation}
              </div>
              <div className="flex flex-wrap gap-1">
                {product.marketplaces.map((mp) => {
                  const ready =
                    product.status === "Pronto para venda" ||
                    product.status === "Disponível na loja";
                  return (
                    <span
                      key={mp}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px]"
                    >
                      <span className="grid h-3 w-6 place-items-center rounded-sm bg-white p-0.5">
                        <MPLogo
                          mp={mp}
                          className="max-h-2.5 max-w-full object-contain"
                        />
                      </span>
                      {MARKETPLACE_LABEL[mp]}:{" "}
                      <span
                        className={`font-semibold ${
                          ready ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {product.status}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Price grid */}
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric
              label="Preço fornecedor"
              value={
                product.supplierCost != null
                  ? brl(product.supplierCost)
                  : "—"
              }
            />
            <MiniMetric
              label="Margem"
              value={`${product.margin ?? "—"}%`}
            />
            <MiniMetric
              label="Preço recomendado"
              value={
                product.recommendedPrice != null
                  ? brl(product.recommendedPrice)
                  : "—"
              }
              accent
            />
            <MiniMetric
              label="Lucro líquido"
              value={
                product.estimatedNetProfit != null
                  ? brl(product.estimatedNetProfit)
                  : "—"
              }
              accent
            />
          </div>

          {/* Generated listing */}
          <div className="rounded-xl border border-gray-100 bg-[#FFF8F5] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#EE4D2D]/70">
              Anúncio gerado
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {product.generatedTitle}
            </div>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-600">
              {product.generatedDescription}
            </p>
          </div>

          {/* Promotion text */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Texto de divulgação
            </div>
            <pre className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
              {product.promotionText}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
              onClick={() => {
                navigator.clipboard.writeText(product.generatedDescription);
                toast.success("Anúncio copiado.");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copiar anúncio
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
              onClick={() => {
                navigator.clipboard.writeText(product.promotionText);
                toast.success("Texto copiado.");
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> Copiar divulgação
            </Button>
            <Button
              className="h-9 rounded-xl bg-[#EE4D2D] text-xs font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]"
              onClick={() => onGen(product)}
            >
              <Megaphone className="mr-1 h-3.5 w-3.5" /> Gerar novo texto
            </Button>
            <Link to="/dashboard/grupos">
              <Button
                variant="outline"
                className="h-9 rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-700 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
              >
                Abrir grupos <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GENERATOR DIALOG
// ═══════════════════════════════════════════════════════════════════════

type Tom = "Direto" | "Oferta" | "Urgente" | "Simples" | "Profissional";

function generateText(p: SavedProduct, tom: Tom) {
  const preco = p.recommendedPrice != null ? brl(p.recommendedPrice) : "—";
  switch (tom) {
    case "Direto":
      return `${p.name}\n\n${p.generatedDescription || ""}\n\nPor ${preco}. Envio rápido. Garanta o seu!`;
    case "Oferta":
      return `🔥 OFERTA! ${p.name} por apenas ${preco}.\n\n${p.generatedDescription || ""}\n\nAproveite antes que acabe.`;
    case "Urgente":
      return `⏰ ÚLTIMAS UNIDADES! ${p.name}\n\n${p.generatedDescription || ""}\n\nPor ${preco}. Não fique de fora!`;
    case "Simples":
      return `${p.name} disponível em configuração para venda.\n\n${p.generatedDescription || ""}\n\nValor estimado: ${preco}.`;
    case "Profissional":
      return `Produto disponível: ${p.name}.\n\n${p.generatedDescription || ""}\n\nValor de venda recomendado: ${preco}. Categoria: ${p.category}. Fornecedor verificado.`;
  }
}

function GeneratorDialog({
  product,
  onClose,
}: {
  product: SavedProduct | null;
  onClose: () => void;
}) {
  const [tom, setTom] = useState<Tom>("Oferta");
  const [text, setText] = useState("");

  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl border-0 bg-white shadow-xl shadow-black/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF8F5]">
              <Sparkles className="h-4 w-4 text-[#EE4D2D]" />
            </div>
            Gerar texto de divulgação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product name */}
          <div>
            <Label className="text-xs font-medium text-gray-500">Produto</Label>
            <div className="mt-1 rounded-xl border border-gray-100 bg-[#FFF8F5] px-3 py-2.5 text-sm font-medium text-gray-900">
              {product.name}
            </div>
          </div>

          {/* Tone selector */}
          <div>
            <Label className="text-xs font-medium text-gray-500">
              Tom da mensagem
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(
                ["Direto", "Oferta", "Urgente", "Simples", "Profissional"] as Tom[]
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setTom(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    tom === t
                      ? "border-[#EE4D2D] bg-[#EE4D2D] text-white shadow-sm shadow-[#EE4D2D]/25"
                      : "border-gray-200 bg-white text-gray-500 hover:border-[#EE4D2D]/40 hover:text-[#EE4D2D]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            className="h-10 w-full rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]"
            onClick={() => setText(generateText(product, tom) || "")}
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Gerar texto
          </Button>

          {/* Generated text + copy */}
          {text && (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="rounded-xl border-gray-200 bg-white text-xs leading-relaxed focus-visible:ring-[#EE4D2D]/30"
              />
              <Button
                variant="outline"
                className="h-10 w-full rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  toast.success("Texto copiado com sucesso.");
                }}
              >
                <Copy className="mr-1.5 h-4 w-4" /> Copiar texto
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
