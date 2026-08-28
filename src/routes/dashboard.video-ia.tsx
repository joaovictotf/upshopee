import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, memo, type DragEvent } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Upload, X, ChevronLeft, ArrowRight, Check, Loader2, Star,
  Camera, Package, Image, Info, Sparkles, Copy, Send,
  Wand2, RotateCw, Shirt, Zap, Lightbulb, ShoppingBag, Play, Trophy,
  Gem, Scissors, Eye, Volume2, Video,
} from "lucide-react";
import { products as mockProducts } from "../lib/mock/products";
import type { AffiliateProduct } from "../lib/mock/affiliate-products";
import { fetchMyAffiliateRows, rowsToAffiliateProducts } from "../lib/my-affiliate-products";
import { generateVideoPrompt } from "../lib/video-prompt-engine";
import Step7GeminiChat from "../components/Step7GeminiChat";
import AdminStep7Video from "../components/AdminStep7Video";

/* ───────────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────────── */

type ProductInfo = {
  name: string; url: string; description: string;
  category: string; benefits: string; targetAudience: string;
  differentiators: string; problemSolved: string;
};

type ImageSlot = {
  file: File | null; preview: string | null;
  storagePath: string | null; uploading: boolean; progress: number;
};

type StyleConfig = {
  style: string; duration: string;
  voiceType: string; tone: string; hasText: boolean; hasMusic: boolean;
};

type GeneratedContent = {
  idea_title: string; hook: string; script: string;
  voiceover: string; screen_texts: string;
  cta: string; caption: string; hashtags: string; final_prompt: string;
};

type ProjectMode = "existing" | "manual";

/**
 * Descrição mínima para produto que não tem uma.
 *
 * O catálogo de afiliado (mock/affiliate-products.ts) não tem campo de
 * descrição — só o catálogo legado (mock/products.ts) tem. Sem isto, escolher
 * qualquer um dos 300 produtos do catálogo mandava descrição vazia e a Edge
 * Function recusava a geração ("product.name and product.description are
 * required"). Ela está CERTA em recusar: não se escreve roteiro a partir do
 * nada. Quem tem que resolver é o cliente, aqui.
 *
 * Usa só o que o catálogo realmente sabe: nome e categoria. Nada de material,
 * medida, especificação ou promessa — este texto vira roteiro que uma pessoa
 * de verdade vai publicar, e não existe fonte para inventar nada disso. O
 * prompt da Edge Function já proíbe o modelo de fabricar características.
 */
function deriveDescription(name: string, category: string): string {
  const cleanName = name.trim().replace(/[.\s]+$/, "");
  if (!cleanName) return "";
  const cleanCategory = category.trim();
  return cleanCategory
    ? `${cleanName}. Produto da categoria ${cleanCategory}.`
    : `${cleanName}.`;
}

/* ───────────────────────────────────────────────────────────────
   ETAPA 1 — as duas origens de produto pronto
   ───────────────────────────────────────────────────────────────
   A lista junta catálogos de formatos diferentes (mock/products.ts e
   mock/affiliate-products.ts), então as duas origens são normalizadas para
   este tipo. São exatamente os campos que a etapa 1 desenha e que a etapa 3
   recebe pré-preenchidos — nada é inventado só para caber num formato maior. */
type Step1Group = "legacy" | "affiliate";

type Step1Item = {
  id: string;
  name: string;
  category: string;
  image: string;
  sourceUrl: string;
  description: string;
  tags: string[];
  keywords: string[];
  group: Step1Group;
};

/* Os três produtos que destravam os vídeos de demonstração da etapa 7.
   detectVideo(), em AdminStep7Video.tsx, casa por PEDAÇO DO NOME — é de lá
   que estes fragmentos vêm, e renomear o produto no mock quebra o vídeo.
   Ficam no topo da lista porque a "Toalha" é o item ~46 de 52 no mock: sem
   isto o admin só a encontra digitando na busca. */
const DEMO_VIDEO_NAME_FRAGMENTS = ["álbum", "figurinha", "toalha"];

const isDemoVideoProduct = (name: string) => {
  const n = name.toLowerCase();
  return DEMO_VIDEO_NAME_FRAGMENTS.some((fragment) => n.includes(fragment));
};

/** Catálogo legado na ordem em que a etapa 1 mostra: primeiro os três de
 *  demonstração, depois os fixados, depois o resto na ordem do arquivo. */
const LEGACY_ITEMS: Step1Item[] = mockProducts
  .map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    image: p.image,
    sourceUrl: p.sourceUrl,
    description: p.description,
    tags: p.tags,
    keywords: p.keywords,
    group: "legacy" as const,
    rank: isDemoVideoProduct(p.name) ? 0 : p.pinned ? 1 : 2,
  }))
  .sort((a, b) => a.rank - b.rank)
  .map(({ rank: _rank, ...item }) => item);

/** Sem busca o legado aparece cortado, como já era antes desta lista ter duas
 *  origens. A busca varre os 52 inteiros. */
const LEGACY_PREVIEW_COUNT = 12;

/** Produto afiliado → item da etapa 1. A descrição fica vazia de propósito: o
 *  catálogo de afiliado não tem texto de descrição, e a etapa 3 já é onde o
 *  usuário escreve a dele. Melhor campo vazio do que texto inventado. */
const affiliateToStep1Item = (p: AffiliateProduct): Step1Item => ({
  id: p.id, // "af-001" — nunca colide com os "p1".."p52" do legado
  name: p.name,
  category: p.category,
  image: p.image,
  sourceUrl: p.shopeeUrl,
  description: "",
  tags: [],
  keywords: [],
  group: "affiliate",
});

const GROUP_LABEL: Record<Step1Group, string> = {
  legacy: "Produtos da plataforma",
  affiliate: "Meus produtos afiliados",
};

// ── Step component props ──
interface Step1Props {
  productMode: ProjectMode; setProductMode: (m: ProjectMode) => void;
  productSearch: string; setProductSearch: (s: string) => void;
  selectedProduct: Step1Item | null; setSelectedProduct: (p: Step1Item | null) => void;
  manualProduct: { name: string; url: string; description: string };
  setManualProduct: (m: { name: string; url: string; description: string }) => void;
  productGroups: Array<{ group: Step1Group; items: Step1Item[] }>;
  hasAnyResult: boolean;
  step1Valid: boolean;
}
interface Step2Props {
  primaryImage: ImageSlot;
  additionalImages: ImageSlot[];
  handlePrimaryImageSelect: (f: File) => void;
  handleAdditionalImageSelect: (f: File, i: number) => void;
  removePrimaryImage: () => void;
  removeAdditionalImage: (i: number) => void;
}
interface Step3Props {
  productInfo: ProductInfo; setProductInfo: (p: ProductInfo) => void;
}
interface Step4Props {
  styleConfig: StyleConfig; setStyleConfig: (s: StyleConfig) => void;
}
interface Step5Props {
  productInfo: ProductInfo; styleConfig: StyleConfig;
  generating: boolean; genStep: number; genError: string | null;
  generatedContent: GeneratedContent;
  handleGenerate: () => void; handleRegenerate: (v?: string) => void;
}
interface Step6Props {
  generatedContent: GeneratedContent; setGeneratedContent: (c: GeneratedContent) => void;
  handleRegenerate: (v?: string) => void;
}

/* ───────────────────────────────────────────────────────────────
   Constants
   ─────────────────────────────────────────────────────────────── */


const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ADDITIONAL_IMAGES = 3;

const CATEGORY_OPTIONS = [
  "Moda", "Eletrônicos", "Casa", "Beleza", "Acessórios",
  "Colecionáveis", "Esportes", "Brinquedos", "Papelaria", "Outro",
];

const STYLE_OPTIONS = [
  { id: "produto-destaque", label: "Produto em destaque", icon: ShoppingBag, desc: "Foco total no produto com close-ups e detalhes" },
  { id: "oferta-rapida", label: "Oferta rápida", icon: Zap, desc: "Ritmo acelerado, preço e urgência" },
  { id: "problema-solucao", label: "Problema e solução", icon: Lightbulb, desc: "Mostra o problema, depois o produto como solução" },
  { id: "demonstracao", label: "Demonstração", icon: Play, desc: "Uso prático do produto em ação" },
  { id: "unboxing", label: "Unboxing", icon: Package, desc: "Abertura de caixa e primeira impressão" },
  { id: "ugc", label: "Estilo UGC", icon: Camera, desc: "Linguagem natural, como se fosse um cliente real" },
  { id: "cinematografico", label: "Cinematográfico", icon: Gem, desc: "Visual premium, câmera lenta, luz suave" },
  { id: "achadinho", label: "Achadinho da Shopee", icon: ShoppingBag, desc: "Tom de descoberta, 'olha o que eu achei'" },
  { id: "antes-depois", label: "Antes e depois", icon: Scissors, desc: "Comparação dramática de resultado" },
  { id: "narracao", label: "Narração", icon: Volume2, desc: "Foco na locução explicativa" },
  { id: "promocao", label: "Vídeo para promoção", icon: Trophy, desc: "Foco em desconto e oferta limitada" },
  { id: "comparacao-precos", label: "Comparação de preços", icon: Gem, desc: "Mostra a vantagem de preço e custo-benefício" },
  { id: "review-produto", label: "Review do produto", icon: Eye, desc: "Avaliação completa com teste, prós e contras" },
  { id: "rotina-dia", label: "Rotina / Dia a dia", icon: Camera, desc: "Produto integrado na rotina diária, estilo vlog" },
];

const VOICE_OPTIONS = [
  { value: "feminina", label: "Feminina" },
  { value: "masculina", label: "Masculina" },
  { value: "sem-voz", label: "Sem voz" },
];
const TONE_OPTIONS = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "entusiasmado", label: "Entusiasmado" },
  { value: "urgente", label: "Urgente" },
  { value: "emocional", label: "Emocional" },
];

const GENERATION_STEPS = [
  "Analisando produto...",
  "Criando roteiro...",
  "Gerando textos...",
  "Montando prompt final...",
];


function emptySlot(): ImageSlot {
  return { file: null, preview: null, storagePath: null, uploading: false, progress: 0 };
}

/* ───────────────────────────────────────────────────────────────
   Shared utilities
   ─────────────────────────────────────────────────────────────── */

function useDropHandler(callback: (file: File) => void) {
  const [dragOver, setDragOver] = useState(false);
  return {
    dragOver,
    onDragOver: (e: DragEvent) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: (e: DragEvent) => { e.preventDefault(); setDragOver(false); },
    onDrop: (e: DragEvent) => {
      e.preventDefault(); setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) callback(file);
    },
  };
}

/* ───────────────────────────────────────────────────────────────
   Step Indicator (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const StepIndicator = memo(function StepIndicator({
  currentStep, setCurrentStep, steps,
}: { currentStep: number; setCurrentStep: (s: number) => void; steps: { readonly num: number; readonly label: string; readonly icon: any }[] }) {
  return (
    <div>
      {/* Mobile: icon badge + label + slim gradient progress bar */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: "var(--accent-gradient, var(--accent))" }}
            >
              {(() => { const Icon = steps[currentStep - 1].icon; return <Icon className="h-4 w-4" />; })()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Etapa {currentStep} de {steps.length}
              </p>
              <p className="truncate text-sm font-bold text-[var(--text)]">
                {steps[currentStep - 1].label}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]">
            {Math.round((currentStep / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--muted-bg)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(currentStep / steps.length) * 100}%`,
              background: "var(--accent-gradient, var(--accent))",
              boxShadow: "var(--accent-glow)",
            }}
          />
        </div>
      </div>

      {/* Desktop: continuous thin track with icon nodes */}
      <div className="hidden sm:flex items-start justify-between gap-0">
        {steps.map((step, idx) => {
          const isActive = step.num === currentStep;
          const isDone = step.num < currentStep;
          const isLast = idx === steps.length - 1;
          const Icon = step.icon;
          return (
            <div key={step.num} className="flex items-start flex-1 min-w-0">
              <button
                type="button"
                onClick={() => { if (isDone) setCurrentStep(step.num); }}
                disabled={!isDone && !isActive}
                className={`group flex flex-col items-center gap-2 mx-auto relative shrink-0 ${isDone ? "cursor-pointer" : "cursor-default"}`}
              >
                <div
                  className={`relative flex items-center justify-center rounded-full transition-all duration-500 ${
                    isActive
                      ? "h-12 w-12 text-white scale-110 shadow-[var(--accent-glow)]"
                      : isDone
                        ? "h-10 w-10 text-white group-hover:scale-105"
                        : "h-10 w-10 border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                  style={isActive || isDone ? { background: "var(--accent-gradient, var(--accent))" } : undefined}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : isActive ? (
                    <span className="text-sm font-bold">{step.num}</span>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping bg-[var(--accent)]/20"
                      style={{ animationDuration: "2s" }}
                    />
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap transition-colors duration-500 ${
                    isActive
                      ? "text-[var(--accent)] font-semibold"
                      : isDone
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mx-1 mt-5 rounded-full transition-colors duration-500"
                  style={{ background: isDone ? "var(--accent)" : "var(--border)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 1 — Select Product (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step1SelectProduct = memo(function Step1SelectProduct({
  productMode, setProductMode, productSearch, setProductSearch,
  selectedProduct, setSelectedProduct, manualProduct, setManualProduct,
  productGroups, hasAnyResult, step1Valid,
}: Step1Props) {
  return (
    <div className="vi-step-enter space-y-6" key={`step1-${productMode}`}>
      {/* Segmented pill control */}
      <div className="flex rounded-2xl bg-[var(--muted-bg)] p-1.5">
        {(["existing", "manual"] as const).map((mode) => (
          <button key={mode} type="button" onClick={() => { setProductMode(mode); setSelectedProduct(null); }}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-all duration-300 ${
              productMode === mode
                ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
            {mode === "existing" ? "Usar produto existente" : "Cadastrar manualmente"}
          </button>
        ))}
      </div>

      {productMode === "existing" ? (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
            <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar produto por nome, categoria ou palavra-chave..."
              className="h-12 rounded-xl border-[var(--border)] bg-[var(--surface)] pl-11 pr-4 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
          </div>
          {productGroups.map(({ group, items }) => (
          <div key={group} className="space-y-3">
            {/* Cabeçalho do grupo: diz de onde o produto veio sem precisar de
                um selo em cada card. */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {GROUP_LABEL[group]}
              </span>
              <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--muted)]">
                {items.length}
              </span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <button key={product.id} type="button" onClick={() => setSelectedProduct(product)}
                className={`group relative flex items-start gap-3 rounded-2xl border p-3 text-left transition-all duration-300 ${
                  selectedProduct?.id === product.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-glow)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-elevated)]"
                }`}>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--muted-bg)]">
                  <img src={product.image} alt={product.name} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text)] line-clamp-2">{product.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{product.category}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">{tag}</span>))}
                  </div>
                </div>
                {selectedProduct?.id === product.id && (
                  <div className="absolute right-2.5 top-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] vi-bounce-in">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>)}
              </button>
            ))}
            </div>
          </div>
          ))}
          {!hasAnyResult && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-12 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted-bg)]">
                <Search className="h-6 w-6 text-[var(--muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--muted)]">Nenhum produto encontrado</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Tente outro termo de busca.</p>
            </div>)}
        </>
      ) : (
        <div className="vi-step-enter space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <Field label="Nome do produto" required>
            <Input id="mp-name" value={manualProduct.name} onChange={(e) => setManualProduct((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Camisa Feminina Seleção Brasileira 2026"
              className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
          </Field>
          <Field label="Link do produto na Shopee" required>
            <Input id="mp-url" type="url" value={manualProduct.url} onChange={(e) => setManualProduct((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://shopee.com.br/..."
              className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
          </Field>
          <Field label="Descrição breve" optional>
            <Textarea id="mp-desc" value={manualProduct.description} onChange={(e) => setManualProduct((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descreva o produto brevemente..." rows={3}
              className="resize-none rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
          </Field>
        </div>
      )}

      {step1Valid && (
        <div className="vi-step-enter flex items-center gap-3 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full vi-bounce-in" style={{ background: "var(--accent-gradient, var(--accent))" }}>
            <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] truncate">{productMode === "existing" ? selectedProduct?.name : manualProduct.name}</p>
            <p className="text-xs font-medium text-[var(--accent)]">Produto selecionado. Pronto para continuar.</p>
          </div>
        </div>)}
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 2 — Upload Images (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step2UploadImages = memo(function Step2UploadImages({
  primaryImage, additionalImages,
  handlePrimaryImageSelect, handleAdditionalImageSelect,
  removePrimaryImage, removeAdditionalImage,
}: Step2Props) {
  const primaryDrop = useDropHandler(handlePrimaryImageSelect);
  return (
    <div className="space-y-6">
      {/* Primary image section card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <Camera className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <Label className="text-sm font-semibold text-[var(--text)]">Imagem principal</Label>
          <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">Opcional</span>
        </div>
        <p className="mb-3 mt-2 text-xs text-[var(--muted)]">Esta será a imagem de capa do vídeo. O upload é automático ao selecionar.</p>
        <ImageUploadSlot image={primaryImage} onSelect={handlePrimaryImageSelect} onRemove={removePrimaryImage} large {...primaryDrop} />
      </div>

      {/* Additional images section card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <Image className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <Label className="text-sm font-semibold text-[var(--text)]">Imagens adicionais</Label>
          <span className="text-xs text-[var(--muted)]">Até {MAX_ADDITIONAL_IMAGES} imagens <span className="hidden sm:inline">(opcional)</span></span>
        </div>
        <p className="mb-3 mt-2 text-xs text-[var(--muted)]">Adicione mais ângulos, detalhes ou variações. Upload automático ao selecionar.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {additionalImages.map((slot, i) => {
            const drop = useDropHandler((file: File) => handleAdditionalImageSelect(file, i));
            const isTrailingOrphan = i === additionalImages.length - 1 && additionalImages.length % 2 === 1;
            return (
              <div key={i} className={isTrailingOrphan ? "col-span-2 sm:col-span-1" : undefined}>
                <ImageUploadSlot image={slot}
                  onSelect={(file) => handleAdditionalImageSelect(file, i)} onRemove={() => removeAdditionalImage(i)}
                  {...drop} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 border-l-4 border-l-[var(--accent)]/50">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <Lightbulb className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Dicas para boas imagens</p>
            <ul className="mt-1.5 space-y-1 text-xs text-[var(--muted)]">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />Fundo branco ou neutro destaca o produto</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />JPG, PNG, WEBP — máx. 5 MB cada</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />Imagens nítidas geram vídeos melhores</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 3 — Product Information (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step3ProductInfo = memo(function Step3ProductInfo({
  productInfo, setProductInfo,
}: Step3Props) {
  const update = (field: keyof ProductInfo, value: string) =>
    setProductInfo((prev) => ({ ...prev, [field]: value }));
  return (
    <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
          <Info className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text)]">Informações do produto</h3>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "0ms" }}>
          <Label htmlFor="pi-name" className="text-sm font-medium text-[var(--text)]">Nome do produto <span className="text-[var(--accent)]">*</span></Label>
          <Input id="pi-name" value={productInfo.name} onChange={(e) => update("name", e.target.value)}
            placeholder="Nome completo do produto" className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
        </div>
        <div className="vi-float-up space-y-2" style={{ animationDelay: "50ms" }}>
          <Label htmlFor="pi-category" className="text-sm font-medium text-[var(--text)]">Categoria <span className="text-[var(--muted)] font-normal">(opcional)</span></Label>
          <select id="pi-category" value={productInfo.category} onChange={(e) => update("category", e.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] outline-none transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10">
            <option value="">Selecione uma categoria</option>
            {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div className="vi-float-up space-y-2" style={{ animationDelay: "100ms" }}>
          <Label htmlFor="pi-audience" className="text-sm font-medium text-[var(--text)]">Público-alvo <span className="text-[var(--muted)] font-normal">(opcional)</span></Label>
          <Input id="pi-audience" value={productInfo.targetAudience} onChange={(e) => update("targetAudience", e.target.value)}
            placeholder="Ex: Mulheres 18-35, torcedores..." className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "150ms" }}>
          <Label htmlFor="pi-desc" className="text-sm font-medium text-[var(--text)]">Descrição curta <span className="text-[var(--accent)]">*</span></Label>
          <Textarea id="pi-desc" value={productInfo.description} onChange={(e) => update("description", e.target.value)}
            placeholder="Breve descrição do produto (2-3 frases)" rows={2}
            className="resize-none rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "200ms" }}>
          <Label htmlFor="pi-url" className="text-sm font-medium text-[var(--text)]">Link do produto na Shopee <span className="text-[var(--muted)] font-normal">(opcional)</span></Label>
          <Input id="pi-url" type="url" value={productInfo.url} onChange={(e) => update("url", e.target.value)}
            placeholder="https://shopee.com.br/..." className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "250ms" }}>
          <Label htmlFor="pi-benefits" className="text-sm font-medium text-[var(--text)]">Principais benefícios <span className="text-[var(--accent)]">*</span></Label>
          <Textarea id="pi-benefits" value={productInfo.benefits} onChange={(e) => update("benefits", e.target.value)}
            placeholder="Liste os 3-5 principais benefícios do produto (um por linha)" rows={4}
            className="resize-none rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
          <p className="text-xs text-[var(--muted)]">Esses benefícios serão usados no roteiro do vídeo.</p>
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "300ms" }}>
          <Label htmlFor="pi-diff" className="text-sm font-medium text-[var(--text)]">Diferenciais <span className="text-[var(--muted)] font-normal">(opcional)</span></Label>
          <Textarea id="pi-diff" value={productInfo.differentiators} onChange={(e) => update("differentiators", e.target.value)}
            placeholder="O que torna este produto diferente dos concorrentes?" rows={3}
            className="resize-none rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "350ms" }}>
          <Label htmlFor="pi-problem" className="text-sm font-medium text-[var(--text)]">Problema que resolve <span className="text-[var(--muted)] font-normal">(opcional)</span></Label>
          <Textarea id="pi-problem" value={productInfo.problemSolved} onChange={(e) => update("problemSolved", e.target.value)}
            placeholder="Qual problema ou necessidade este produto resolve?" rows={3}
            className="resize-none rounded-xl border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10" />
        </div>
      </div>
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 4 — Style Selection (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step4Style = memo(function Step4Style({
  styleConfig, setStyleConfig,
}: Step4Props) {
  return (
    <div className="space-y-6">
      {/* Style cards */}
      <div>
        <Label className="text-sm font-semibold text-[var(--text)]">Estilo do vídeo</Label>
        <p className="mb-3 mt-1 text-xs text-[var(--muted)]">Escolha o estilo que melhor se adapta ao seu produto.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {STYLE_OPTIONS.map((opt) => {
            const active = styleConfig.style === opt.id;
            const Icon = opt.icon;
            return (
              <button key={opt.id} type="button" onClick={() => setStyleConfig((s) => ({ ...s, style: opt.id }))}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-300 active:scale-[0.98] ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-glow)] vi-pulse-card"
                    : "border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-card)]"
                }`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                  active ? "bg-[var(--accent)]/10" : "bg-[var(--muted-bg)]"
                }`}>
                  <Icon className={`h-6 w-6 transition-colors duration-300 ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                </div>
                <div>
                  <span className={`text-sm font-semibold leading-tight truncate block ${active ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{opt.label}</span>
                  <p className="text-[11px] leading-tight text-[var(--muted)] mt-0.5 hidden sm:block">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice and Tone */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[var(--text)]">Voz</Label>
          <div className="flex rounded-xl bg-[var(--muted-bg)] p-1">
            {VOICE_OPTIONS.map((v) => (
              <button key={v.value} type="button" onClick={() => setStyleConfig((s) => ({ ...s, voiceType: v.value }))}
                className={`flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all duration-300 ${
                  styleConfig.voiceType === v.value
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-card)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}>
                {v.label}
              </button>))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[var(--text)]">Tom</Label>
          <select value={styleConfig.tone} onChange={(e) => setStyleConfig((s) => ({ ...s, tone: e.target.value }))}
            className="h-11 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] outline-none transition-colors duration-200 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10">
            {TONE_OPTIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
      </div>

      {/* Antes havia dois toggles aqui, "Textos na tela" e "Música de fundo".
          Saíram: ligá-los produzia vídeo que quebra a regra do produto. O que
          fica é o aviso do que o vídeo sempre vai ser. */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
        <p className="text-xs leading-relaxed text-[var(--muted)]">
          Todo vídeo sai <span className="font-semibold text-[var(--text)]">sem texto na tela</span>,{" "}
          <span className="font-semibold text-[var(--text)]">sem música de fundo</span> e com{" "}
          <span className="font-semibold text-[var(--text)]">uma voz humana só</span>. É o formato
          que rende no story e no reels.
        </p>
      </div>
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 5 — Content Generation (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step5Generation = memo(function Step5Generation({
  productInfo, styleConfig,
  generating, genStep, genError, generatedContent,
  handleGenerate, handleRegenerate,
}: Step5Props) {
  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <Info className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Resumo da configuração</h3>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <SummaryRow label="Produto" value={productInfo.name} />
          <SummaryRow label="Estilo" value={STYLE_OPTIONS.find((s) => s.id === styleConfig.style)?.label || ""} />
          <SummaryRow label="Voz" value={VOICE_OPTIONS.find((v) => v.value === styleConfig.voiceType)?.label || ""} />
          <SummaryRow label="Tom" value={TONE_OPTIONS.find((t) => t.value === styleConfig.tone)?.label || ""} />
          <SummaryRow label="Extras" value="Sem texto na tela e sem música" />
        </div>
      </div>

      {/* Ready state */}
      {!generating && !genError && (
        <div className="vi-step-enter flex flex-col items-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-12 text-center relative overflow-hidden sm:py-14">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-soft)] sm:h-24 sm:w-24">
            <Wand2 className="h-9 w-9 text-[var(--accent)] sm:h-10 sm:w-10" />
          </div>
          <h3 className="mt-5 px-4 text-lg font-bold text-[var(--text)] sm:text-xl">Pronto para criar seu vídeo!</h3>
          <p className="mt-2 max-w-sm px-6 text-sm text-[var(--muted)]">
            A IA vai analisar o produto e gerar um roteiro profissional com base no estilo escolhido.
          </p>
          <Button onClick={handleGenerate}
            className="mt-6 h-14 w-[calc(100%-2rem)] max-w-sm rounded-2xl text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{
              background: "var(--accent-gradient, var(--accent))",
              boxShadow: "var(--accent-glow)",
            }}>
            <Wand2 className="mr-2 h-5 w-5" /> Gerar conteúdo com IA
          </Button>
        </div>
      )}

      {/* Generating state */}
      {generating && (
        <div className="vi-step-enter space-y-4 rounded-2xl border border-[var(--accent)]/20 bg-[var(--surface)] p-6 relative overflow-hidden sm:p-8">
          <div className="vi-shimmer absolute inset-0 rounded-2xl opacity-30 pointer-events-none" />
          <div className="flex flex-col items-center relative z-10">
            <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/20" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-0 animate-pulse rounded-full bg-[var(--accent)]/15" />
              <Wand2 className="relative z-10 h-10 w-10 text-[var(--accent)] animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-[var(--text)]">Gerando conteúdo com IA...</h3>
            <div className="mt-5 w-full max-w-xs space-y-2.5">
              {GENERATION_STEPS.map((msg, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium transition-all duration-500 ${
                  i <= genStep
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-[var(--muted-bg)] text-[var(--muted)]"
                }`}>
                  {i < genStep ? (
                    <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  ) : i === genStep ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--border)]" />
                  )}
                  {msg}
                </div>))}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {genError && (
        <div className="vi-shake rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <Info className="h-6 w-6 text-[var(--accent)]" />
            </div>
          </div>
          <p className="text-sm font-medium text-[var(--accent)]">{genError}</p>
          <Button onClick={handleGenerate} variant="outline"
            className="mt-3 h-10 rounded-xl border-[var(--accent)]/20 bg-[var(--surface)] text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">
            <RotateCw className="mr-1.5 h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 6 — Review & Edit (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step6Review = memo(function Step6Review({
  generatedContent, setGeneratedContent,
  handleRegenerate,
}: Step6Props) {
  const update = (field: keyof GeneratedContent, value: string) =>
    setGeneratedContent((prev) => ({ ...prev, [field]: value }));

  /* A etapa mostra DOIS campos. idea_title, hook, script, voiceover,
     screen_texts, cta e caption continuam sendo gerados e salvos nas colunas
     de video_projects — só saíram da tela. screen_texts em especial não pode
     ser oferecido: estes vídeos não levam texto na tela. */
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent.final_prompt);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie à mão.");
      return;
    }
    setCopied(true);
    toast.success("Prompt copiado!");
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* O prompt e o botão de copiar. É o que as sete etapas existem para
          entregar, então é o que domina a tela. */}
      <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-6">
        <EditableField label="Prompt final em inglês" value={generatedContent.final_prompt}
          onChange={(v) => update("final_prompt", v)} rows={10} />
        <Button onClick={handleCopyPrompt}
          className="mt-4 h-14 w-full rounded-2xl text-base font-semibold text-white transition-all active:scale-[0.98] sm:h-16 sm:text-lg"
          style={{ background: "var(--accent-gradient, var(--accent))", boxShadow: "var(--accent-glow)" }}>
          {copied ? (
            <><Check className="mr-2 h-5 w-5 shrink-0" strokeWidth={2.5} /> Prompt copiado!</>
          ) : (
            <><Copy className="mr-2 h-5 w-5 shrink-0" /> Copiar prompt</>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          {copied ? "Pronto — o prompt está na área de transferência." : "Copie o prompt para gerar seu vídeo."}
        </p>
      </div>

      {/* Regeneration options — antes eram quatro pílulas discretas em cima da
          lista de campos; ninguém achava. */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <RotateCw className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <h4 className="text-sm font-bold text-[var(--text)]">Quer testar outra versão?</h4>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Cada versão sai diferente da anterior. Escolha um caminho:
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <RegenButton icon={RotateCw} label="Gerar outra versão" onClick={() => handleRegenerate()} />
          <RegenButton icon={Zap} label="Mais curta" onClick={() => handleRegenerate("curta")} />
          <RegenButton icon={Trophy} label="Mais comercial" onClick={() => handleRegenerate("comercial")} />
          <RegenButton icon={Camera} label="Mais natural" onClick={() => handleRegenerate("natural")} />
        </div>
      </div>

      {/* Hashtags */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <EditableField label="Hashtags" value={generatedContent.hashtags}
          onChange={(v) => update("hashtags", v)} rows={2} />
      </div>
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   Page component
   ─────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/dashboard/video-ia")({ component: VideoIaPage });

function VideoIaPage() {
  const { currentUserId, isAdmin } = useApp();

  const steps = useMemo(() => [
    { num: 1, label: "Produto", icon: Package },
    { num: 2, label: "Imagens", icon: Image },
    { num: 3, label: "Informações", icon: Info },
    { num: 4, label: "Estilo", icon: Sparkles },
    { num: 5, label: "Geração", icon: Wand2 },
    { num: 6, label: "Revisão", icon: Check },
    { num: 7, label: isAdmin ? "Gerar Vídeo" : "Gemini", icon: isAdmin ? Video : Star },
  ] as const, [isAdmin]);

  const stepDescriptions = useMemo(() => [
    "Escolha o produto que será o tema do vídeo",
    "Envie imagens de qualidade para o vídeo",
    "Preencha as informações detalhadas do produto",
    "Configure o estilo e formato do vídeo",
    "Gere o roteiro com inteligência artificial",
    "Revise e edite o conteúdo gerado",
    isAdmin ? "Gere o vídeo final com IA — escolha um produto afiliado" : "Refine o roteiro no chat e gere o vídeo no Gemini",
  ] as const, [isAdmin]);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [productMode, setProductMode] = useState<ProjectMode>("existing");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Step1Item | null>(null);
  const [manualProduct, setManualProduct] = useState({ name: "", url: "", description: "" });

  // Step 2
  const [primaryImage, setPrimaryImage] = useState<ImageSlot>(emptySlot());
  const [additionalImages, setAdditionalImages] = useState<ImageSlot[]>([emptySlot(), emptySlot(), emptySlot()]);

  // Step 3
  const [productInfo, setProductInfo] = useState<ProductInfo>({
    name: "", url: "", description: "", category: "",
    benefits: "", targetAudience: "", differentiators: "", problemSolved: "",
  });

  // Step 4
  const [styleConfig, setStyleConfig] = useState<StyleConfig>({
    style: "produto-destaque", duration: "30s", voiceType: "feminina",
    // Regra fixa do produto: nunca texto na tela, nunca música de fundo.
    // Os campos continuam existindo porque a Edge Function e as colunas
    // has_text/has_music de video_projects os esperam — mas não são mais
    // configuráveis, e é por isso que os dois toggles saíram da etapa 4.
    tone: "entusiasmado", hasText: false, hasMusic: false,
  });

  // Step 5-6
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({
    idea_title: "", hook: "", script: "", voiceover: "", screen_texts: "",
    cta: "", caption: "", hashtags: "", final_prompt: "",
  });
  const [projectId, setProjectId] = useState<string | null>(null);

  // Pre-fill step 3 from step 1
  useEffect(() => {
    if (currentStep === 3) {
      const source = productMode === "existing" && selectedProduct
        ? {
            name: selectedProduct.name,
            url: selectedProduct.sourceUrl,
            description: selectedProduct.description,
            category: selectedProduct.category,
          }
        : { ...manualProduct, category: "" };
      setProductInfo((prev) => ({
        ...prev,
        name: prev.name || source.name,
        url: prev.url || source.url,
        category: prev.category || source.category,
        // Ordem importa: o que o usuário digitou vence; a descrição do
        // catálogo vem depois; a derivada é o último recurso.
        description:
          prev.description || source.description || deriveDescription(source.name, source.category),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ── Produtos afiliados do usuário (mesma leitura da aba "Meus produtos") ──
  // null = ainda carregando; [] = não afiliou nada. Nos dois casos a etapa 1
  // segue funcionando com o legado + cadastro manual.
  const [myAffiliates, setMyAffiliates] = useState<Step1Item[] | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setMyAffiliates([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await fetchMyAffiliateRows(currentUserId);
      if (cancelled) return;
      setMyAffiliates(rowsToAffiliateProducts(rows).map(affiliateToStep1Item));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  // ── Product search — varre as duas origens, legado sempre no topo ──
  const productGroups = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const matches = (item: Step1Item) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q));

    const legacy = LEGACY_ITEMS.filter(matches);
    const groups: Array<{ group: Step1Group; items: Step1Item[] }> = [
      // Sem busca o legado vem cortado; com busca, inteiro. Os afiliados do
      // usuário nunca são cortados — são poucos e são o que ele veio buscar.
      { group: "legacy", items: q ? legacy : legacy.slice(0, LEGACY_PREVIEW_COUNT) },
      { group: "affiliate", items: (myAffiliates ?? []).filter(matches) },
    ];
    return groups.filter((g) => g.items.length > 0);
  }, [productSearch, myAffiliates]);

  const hasAnyResult = productGroups.length > 0;

  // ── Validation ──
  const step1Valid = productMode === "existing" ? !!selectedProduct
    : !!(manualProduct.name.trim() && manualProduct.url.trim());

  // ── Image helpers ──
  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return "Formato não aceito. Use JPG, PNG ou WEBP.";
    if (file.size > MAX_FILE_SIZE) return "Arquivo muito grande. Máximo 5 MB.";
    return null;
  }, []);

  const uploadSingleImage = useCallback(async (
    file: File,
    setter: (updates: Partial<ImageSlot>) => void,
  ): Promise<string | null> => {
    if (!currentUserId) {
      console.error("[uploadSingleImage] No currentUserId — upload aborted");
      setter({ uploading: false, progress: 0 });
      return null;
    }
    setter({ uploading: true, progress: 0 });
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${currentUserId}/${fileName}`;
    try {
      const { data, error } = await supabase.storage
        .from("video-project-images")
        .upload(storagePath, file, { cacheControl: "3600", upsert: true });
      if (error) {
        console.error("[uploadSingleImage] Supabase error:", error);
        setter({ uploading: false, progress: 0 });
        toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        return null;
      }
      setter({ uploading: false, progress: 100, storagePath });
      return storagePath;
    } catch (err: any) {
      console.error("[uploadSingleImage] Exception:", err);
      setter({ uploading: false, progress: 0 });
      toast.error(`Erro ao enviar ${file.name}: ${err?.message || "Erro desconhecido"}`);
      return null;
    }
  }, [currentUserId]);

  const handlePrimaryImageSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) { toast.error(error); return; }
    if (primaryImage.preview) URL.revokeObjectURL(primaryImage.preview);
    const preview = URL.createObjectURL(file);
    setPrimaryImage({ file, preview, storagePath: null, uploading: true, progress: 0 });
    uploadSingleImage(file, (updates) => { setPrimaryImage((prev) => ({ ...prev, ...updates })); })
      .catch((err) => { console.error("[handlePrimaryImageSelect] uploadSingleImage rejected:", err); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateFile, uploadSingleImage]);

  const handleAdditionalImageSelect = useCallback((file: File, index: number) => {
    const error = validateFile(file);
    if (error) { toast.error(error); return; }
    const preview = URL.createObjectURL(file);
    setAdditionalImages((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next[index] = { file, preview, storagePath: null, uploading: true, progress: 0 };
      return next;
    });
    uploadSingleImage(file, (updates) => {
      setAdditionalImages((prev) => { const next = [...prev]; next[index] = { ...next[index], ...updates }; return next; });
    }).catch((err) => { console.error("[handleAdditionalImageSelect] uploadSingleImage rejected:", err); });
  }, [validateFile, uploadSingleImage]);

  const removePrimaryImage = useCallback(() => {
    if (primaryImage.preview) URL.revokeObjectURL(primaryImage.preview);
    setPrimaryImage(emptySlot());
  }, [primaryImage.preview]);

  const removeAdditionalImage = useCallback((index: number) => {
    setAdditionalImages((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next[index] = emptySlot();
      return next;
    });
  }, []);

  /* O prompt final NÃO vem mais da IA. Ele é montado offline por
     generateVideoPrompt — de graça, sem chamada de rede e sempre com as regras
     obrigatórias (vertical, fotorrealista, sem texto, sem música, uma voz só).
     O RESTO do conteúdo (roteiro, locução, legenda, hashtags) continua vindo
     da Edge Function: só a origem deste campo mudou.

     recentPromptsRef guarda os últimos prompts para passar em `avoid`, e é
     por isso que clicar em "gerar de novo" nunca devolve o mesmo texto. */
  const recentPromptsRef = useRef<string[]>([]);

  /* Corpo `product` das duas chamadas da Edge Function, num lugar só.
     A descrição digitada pela pessoa na etapa 3 sempre vence; a derivada só
     entra quando o campo está vazio. */
  const buildProductPayload = useCallback(() => ({
    name: productInfo.name,
    description:
      productInfo.description.trim() || deriveDescription(productInfo.name, productInfo.category),
    benefits: productInfo.benefits,
    targetAudience: productInfo.targetAudience || undefined,
    differentiators: productInfo.differentiators || undefined,
    problemSolved: productInfo.problemSolved || undefined,
    url: productInfo.url || undefined,
  }), [productInfo]);

  const withOfflinePrompt = useCallback((content: GeneratedContent): GeneratedContent => {
    const final_prompt = generateVideoPrompt(
      { name: productInfo.name, category: productInfo.category },
      recentPromptsRef.current,
    );
    recentPromptsRef.current = [final_prompt, ...recentPromptsRef.current].slice(0, 8);
    return { ...content, final_prompt };
  }, [productInfo.name, productInfo.category]);

  // ── Step 5: Call Edge Function ──
  const handleGenerate = useCallback(async () => {
    if (!currentUserId) {
      toast.error("Sessão não encontrada. Faça login novamente.");
      return;
    }

    // Advance to step 5 immediately — show generation animation
    setCurrentStep(5);
    setGenerating(true);
    setGenError(null);
    setGenStep(0);
    const stepInterval = setInterval(() => { setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1)); }, 2000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch(
        "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/generate-video-script",
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: buildProductPayload(),
            style: styleConfig,
          }),
          signal: controller.signal,
        });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Erro ${res.status} ao gerar conteúdo`);
      const content = withOfflinePrompt(data.content);
      setGeneratedContent(content);
      await saveProjectWithContent(content);
      toast.success("Conteúdo gerado com sucesso!");
      setCurrentStep(6);
    } catch (err: any) {
      setGenError(err?.name === "AbortError" ? "Tempo limite excedido (35s). O servidor demorou muito. Tente novamente." : err?.message || "Erro ao gerar conteúdo. Tente novamente.");
    } finally {
      clearTimeout(timeoutId); clearInterval(stepInterval);
      setGenStep(GENERATION_STEPS.length - 1); setGenerating(false);
    }
  }, [currentUserId, productInfo, styleConfig, withOfflinePrompt, buildProductPayload]);

  const handleRegenerate = useCallback(async (variant?: string) => {
    const variantStyle = variant
      ? { ...styleConfig, style: variant === "curta" ? "oferta-rapida" : variant === "comercial" ? "promocao" : "ugc" }
      : styleConfig;
    if (variant) setStyleConfig(variantStyle);
    setGenerating(true); setGenError(null); setGenStep(0);
    const stepInterval = setInterval(() => { setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1)); }, 2000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch(
        "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/generate-video-script",
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: buildProductPayload(),
            style: variantStyle,
          }),
          signal: controller.signal,
        });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erro ao gerar");
      const content = withOfflinePrompt(data.content);
      setGeneratedContent(content);
      await saveProjectWithContent(content);
      toast.success("Nova versão gerada!");
    } catch (err: any) {
      setGenError(err?.name === "AbortError" ? "Tempo limite excedido (35s). Tente novamente." : err?.message || "Erro ao gerar. Tente novamente.");
    } finally {
      clearTimeout(timeoutId); clearInterval(stepInterval);
      setGenStep(GENERATION_STEPS.length - 1); setGenerating(false);
    }
  }, [currentUserId, productInfo, styleConfig, withOfflinePrompt, buildProductPayload]);

  // ── Save project to database ──
  const saveProjectWithContent = useCallback(async (content?: GeneratedContent) => {
    if (!currentUserId) return;
    const c = content || generatedContent;
    if (projectId) {
      await (supabase.from as any)("video_projects")
        .update({ idea_title: c.idea_title, hook: c.hook, script: c.script, voiceover: c.voiceover, screen_texts: c.screen_texts, cta: c.cta, caption: c.caption, hashtags: c.hashtags, final_prompt: c.final_prompt, style: styleConfig.style, duration: styleConfig.duration, voice_type: styleConfig.voiceType, has_text: styleConfig.hasText, has_music: styleConfig.hasMusic, status: content ? "content_generated" : "prompt_ready", updated_at: new Date().toISOString() })
        .eq("id", projectId);
    } else {
      const { data, error } = await (supabase.from as any)("video_projects")
        .insert({ user_id: currentUserId, product_name: productInfo.name, product_url: productInfo.url, status: content ? "content_generated" : "information_completed", benefits: productInfo.benefits, differentiators: productInfo.differentiators, problem_solved: productInfo.problemSolved, target_audience: productInfo.targetAudience, idea_title: c.idea_title, hook: c.hook, script: c.script, voiceover: c.voiceover, screen_texts: c.screen_texts, cta: c.cta, caption: c.caption, hashtags: c.hashtags, final_prompt: c.final_prompt, style: styleConfig.style, duration: styleConfig.duration, voice_type: styleConfig.voiceType, has_text: styleConfig.hasText, has_music: styleConfig.hasMusic })
        .select("id").single();
      if (error) { console.error("Save project error:", error); return; }
      if (data?.id) setProjectId(data.id);
      const allImages = [{ slot: primaryImage, isPrimary: true, sortOrder: 0 }, ...additionalImages.filter((s) => s.storagePath).map((s, i) => ({ slot: s, isPrimary: false, sortOrder: i + 1 }))];
      const imageRows = allImages.filter(({ slot }) => slot.storagePath).map(({ slot, isPrimary, sortOrder }) => ({ project_id: data.id, user_id: currentUserId, storage_path: slot.storagePath!, file_name: slot.file?.name || null, mime_type: slot.file?.type || null, file_size: slot.file?.size || null, sort_order: sortOrder, is_primary: isPrimary }));
      if (imageRows.length > 0) await (supabase.from as any)("video_project_images").insert(imageRows);
    }
  }, [currentUserId, projectId, generatedContent, productInfo, styleConfig, primaryImage, additionalImages]);

  // ── Step 3: Create project + advance ──
  const handleSubmitProject = useCallback(async () => {
    if (!currentUserId) { toast.error("Você precisa estar logado."); return; }
    setSubmitting(true);
    try { await saveProjectWithContent(); toast.success("Projeto criado! Configure o estilo do vídeo."); setCurrentStep(4); }
    catch (err: any) { toast.error(err?.message || "Erro ao criar o projeto."); }
    finally { setSubmitting(false); }
  }, [currentUserId, saveProjectWithContent]);

  // ── Step 7: Copy prompt to clipboard ──
  const handleCopyFinalPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(generatedContent.final_prompt);
    toast.success("Prompt copiado com sucesso!");
  }, [generatedContent.final_prompt]);

  // ── Navigation ──
  const handleContinue = useCallback(async () => {
    if (currentStep === 3) { await handleSubmitProject(); return; }
    if (currentStep === 4) {
      await saveProjectWithContent(); setCurrentStep(5); return;
    }
    if (currentStep === 6) {
      await (supabase.from as any)("video_projects").update({ status: "prompt_ready", updated_at: new Date().toISOString() }).eq("id", projectId);
      toast.success("Projeto salvo! Pronto para abrir no Gemini.");
      setCurrentStep(7); return;
    }
    setCurrentStep((s) => Math.min(s + 1, 7));
  }, [currentStep, handleSubmitProject, saveProjectWithContent, projectId]);

  const handleBack = useCallback(() => {
    if (currentStep === 1) return;
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (primaryImage.preview) URL.revokeObjectURL(primaryImage.preview);
      additionalImages.forEach((s) => { if (s.preview) URL.revokeObjectURL(s.preview); });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const continueLabel: Record<number, string> = {
    1: "Continuar", 2: "Continuar", 3: "Criar projeto de vídeo",
    4: "Gerar conteúdo", 5: "", 6: "Salvar e continuar", 7: "",
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
     ───────────────────────────────────────────────────────────── */

  return (
    <DashboardShell title="Vídeo IA"
      subtitle="Crie vídeos profissionais para seus produtos com inteligência artificial. Siga os 7 passos abaixo.">
      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-orange { 0%,100% { box-shadow: 0 0 0 0 rgba(244,84,30,0.4); } 50% { box-shadow: 0 0 0 12px rgba(244,84,30,0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes particle-burst { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx),var(--ty)) scale(0); opacity: 0; } }
        @keyframes cursor-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes subtle-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @keyframes float-up { 0% { transform: translateY(6px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .vi-step-enter { animation: fade-up 0.35s ease-out both; }
        .vi-pulse-card { animation: pulse-orange 2s ease-out; }
        .vi-shimmer { background: linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent); background-size: 200% 100%; animation: shimmer 2s infinite; }
        .vi-bounce-in { animation: bounce-in 0.5s ease-out both; }
        .vi-particle { animation: particle-burst 0.7s ease-out forwards; }
        .vi-shake { animation: subtle-shake 0.4s ease-out; }
        .vi-float-up { animation: float-up 0.3s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .vi-step-enter,.vi-pulse-card,.vi-shimmer,.vi-bounce-in,.vi-particle,.vi-shake,.vi-float-up { animation: none; } }
      `}</style>
      <div className="mx-auto w-full max-w-4xl">
        {/* Stepper card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
          <StepIndicator currentStep={currentStep} setCurrentStep={setCurrentStep} steps={steps} />
        </div>

        <div className="mt-6">
          {/* Current step header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] border border-[var(--accent)]/10 shadow-[var(--shadow-card)] sm:h-12 sm:w-12">
              {(() => { const Icon = steps[currentStep - 1].icon; return <Icon className="h-5 w-5 text-[var(--accent)] sm:h-6 sm:w-6" />; })()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[var(--text)] sm:text-lg">Etapa {currentStep}: {steps[currentStep - 1].label}</h2>
              <p className="text-xs text-[var(--muted)]">{stepDescriptions[currentStep - 1]}</p>
            </div>
          </div>

          {/* Step content */}
          <div className="vi-step-enter min-h-[300px]" key={currentStep}>
            {currentStep === 1 && <Step1SelectProduct productMode={productMode} setProductMode={setProductMode} productSearch={productSearch} setProductSearch={setProductSearch} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} manualProduct={manualProduct} setManualProduct={setManualProduct} productGroups={productGroups} hasAnyResult={hasAnyResult} step1Valid={step1Valid} />}
            {currentStep === 2 && <Step2UploadImages primaryImage={primaryImage} additionalImages={additionalImages} handlePrimaryImageSelect={handlePrimaryImageSelect} handleAdditionalImageSelect={handleAdditionalImageSelect} removePrimaryImage={removePrimaryImage} removeAdditionalImage={removeAdditionalImage} />}
            {currentStep === 3 && <Step3ProductInfo productInfo={productInfo} setProductInfo={setProductInfo} />}
            {currentStep === 4 && <Step4Style styleConfig={styleConfig} setStyleConfig={setStyleConfig} />}
            {currentStep === 5 && <Step5Generation productInfo={productInfo} styleConfig={styleConfig} generating={generating} genStep={genStep} genError={genError} generatedContent={generatedContent} handleGenerate={handleGenerate} handleRegenerate={handleRegenerate} />}
            {currentStep === 6 && <Step6Review generatedContent={generatedContent} setGeneratedContent={setGeneratedContent} handleRegenerate={handleRegenerate} />}
            {/* Etapa 7: admin gera o vídeo direto (AdminStep7Video, intocado).
                Usuário comum vê antes o aviso de que a geração por IA é
                liberada na aula ao vivo, com o caminho para agendar. */}
            {currentStep === 7 && (isAdmin ? (
              <AdminStep7Video productInfo={productInfo} styleConfig={styleConfig} generatedContent={generatedContent} projectId={projectId} handleBack={handleBack} />
            ) : (
              <Step7GeminiChat productInfo={productInfo} styleConfig={styleConfig} generatedContent={generatedContent} projectId={projectId} currentUserId={currentUserId} handleBack={handleBack} handleCopyFinalPrompt={handleCopyFinalPrompt} />
            ))}
          </div>

          {/* Footer navigation — hidden on step 5 while generating */}
          {currentStep !== 5 && (
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
              <Button type="button" variant="outline" onClick={handleBack}
                disabled={currentStep === 1 || submitting || generating}
                className="group h-11 w-full sm:w-auto rounded-xl border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] disabled:opacity-40">
                <ChevronLeft className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" /> Voltar
              </Button>
              {continueLabel[currentStep] && (
                <Button type="button" onClick={currentStep === 4 ? handleGenerate : handleContinue}
                  disabled={submitting || generating}
                  className="group h-11 w-full sm:w-auto sm:min-w-[160px] rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: "var(--accent-gradient, var(--accent))",
                    boxShadow: "var(--accent-glow)",
                  }}>
                  {submitting || generating ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processando...</span>) : (<span className="flex items-center gap-2">{continueLabel[currentStep]}<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>)}
                </Button>
              )}
            </div>
          )}
          {currentStep === 5 && !generating && (
            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <Button type="button" variant="outline" onClick={handleBack} disabled={generating}
                className="group h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">
                <ChevronLeft className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" /> Voltar
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

/* ═════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS (module-level — already stable since never nested)
   ═════════════════════════════════════════════════════════════ */

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[var(--text)]">
        {label}{" "}
        {required && <span className="text-[var(--accent)]">*</span>}
        {optional && <span className="text-[var(--muted)] font-normal">(opcional)</span>}
      </Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-xl bg-[var(--muted-bg)] px-3 py-2">
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <span className="max-w-[180px] truncate text-right font-semibold text-[var(--text)]">{value || "—"}</span>
    </div>
  );
}

function RegenButton({ icon: Icon, label, onClick }: { icon: typeof RotateCw; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--surface-2)] px-2.5 text-xs font-semibold text-[var(--text)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:shadow-[var(--shadow-card)] active:scale-[0.97]">
      <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function EditableField({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[var(--muted)] tracking-wide uppercase">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="resize-y rounded-xl bg-[var(--muted-bg)]/50 border-0 focus:bg-[var(--surface)] text-sm px-4 py-2.5 outline-none focus:ring-1 focus:ring-[var(--accent)]/30 text-[var(--text)]" />
    </div>
  );
}

function ImageUploadSlot({ image, onSelect, onRemove, large = false, dragOver = false, onDragOver, onDragLeave, onDrop }: { image: ImageSlot; onSelect: (file: File) => void; onRemove: () => void; large?: boolean; dragOver?: boolean; onDragOver?: (e: DragEvent) => void; onDragLeave?: (e: DragEvent) => void; onDrop?: (e: DragEvent) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = !!(image.preview || image.storagePath);
  const heightClass = large ? "h-48 sm:h-56" : "h-32 sm:h-36";
  return (
    <div onClick={() => { if (!hasImage && !image.uploading) inputRef.current?.click(); }} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`group relative ${heightClass} cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
        hasImage
          ? "border-solid border-[var(--accent)]/60"
          : image.uploading
            ? "border-dashed border-[var(--accent)]/50"
            : dragOver
              ? "border-dashed border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-dashed border-[var(--border)] bg-[var(--muted-bg)]/80 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/50"
      }`}>
      {image.uploading && hasImage && image.storagePath && (
        <div className="absolute inset-0 z-20 vi-shimmer rounded-2xl overflow-hidden pointer-events-none" />
      )}
      {image.uploading && !hasImage && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface)]/90">
          <div className="mb-2 relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/20" />
            <Loader2 className="relative z-10 h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
          <span className="text-xs font-medium text-[var(--accent)]">Enviando...</span>
        </div>
      )}
      {hasImage ? (
        <>
          <img src={image.preview || ""} alt="Preview" className="h-full w-full object-cover" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
          {image.storagePath && (
            <div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] vi-bounce-in">
              <Check className="h-3 w-3 text-white" />
            </div>)}
        </>)
        : (
          <div className="flex h-full flex-col items-center justify-center px-3 text-center">
            <div className={`mb-1.5 flex items-center justify-center rounded-full bg-[var(--muted-bg)] transition-all duration-300 group-hover:bg-[var(--accent)]/10 group-hover:scale-110 ${large ? "h-12 w-12" : "h-8 w-8"}`}>
              <Upload className={`${large ? "h-5 w-5" : "h-3.5 w-3.5"} text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--accent)]/60`} />
            </div>
            <span className={`${large ? "text-xs" : "text-[11px]"} font-medium text-[var(--muted)]`}>
              {large ? "Clique ou arraste a imagem principal" : "Adicionar imagem"}
            </span>
            <span className="mt-0.5 text-[10px] text-[var(--muted)]">JPG, PNG ou WEBP</span>
          </div>)}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) onSelect(file); e.target.value = ""; }} />
    </div>
  );
}
