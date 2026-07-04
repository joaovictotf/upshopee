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
  Gem, Scissors, Eye, Subtitles, Volume2, Music, Video,
} from "lucide-react";
import { products as mockProducts, type Product } from "../lib/mock/products";
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

// ── Step component props ──
interface Step1Props {
  productMode: ProjectMode; setProductMode: (m: ProjectMode) => void;
  productSearch: string; setProductSearch: (s: string) => void;
  selectedProduct: Product | null; setSelectedProduct: (p: Product | null) => void;
  manualProduct: { name: string; url: string; description: string };
  setManualProduct: (m: { name: string; url: string; description: string }) => void;
  filteredProducts: Product[];
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
  dailyCount: number; dailyLimitReached: boolean; dailyLimitChecked: boolean;
  isAdmin: boolean; handleBack: () => void;
}
interface Step5Props {
  productInfo: ProductInfo; styleConfig: StyleConfig;
  generating: boolean; genStep: number; genError: string | null;
  generatedContent: GeneratedContent;
  dailyCount: number; dailyLimitReached: boolean; dailyLimitChecked: boolean;
  isAdmin: boolean;
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
  { id: "texto-tela", label: "Texto na tela", icon: Subtitles, desc: "Sem voz, apenas textos e música" },
  { id: "sem-fala", label: "Vídeo sem fala", icon: Eye, desc: "Visual puro, só imagens e música" },
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

const DAILY_LIMIT = 3;

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
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between px-2 min-w-max">
        {steps.map((step, idx) => {
          const isActive = step.num === currentStep;
          const isDone = step.num < currentStep;
          const isLast = idx === steps.length - 1;
          const Icon = step.icon;
          return (
            <div key={step.num} className="flex items-center flex-1">
              <button type="button"
                onClick={() => { if (isDone) setCurrentStep(step.num); }}
                disabled={!isDone && !isActive}
                className="group flex flex-col items-center gap-1 mx-auto relative">
                <div className={`relative flex h-11 w-11 items-center justify-center rounded-[16px] transition-all duration-500 ${
                  isActive ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 scale-110"
                  : isDone ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-[var(--muted-bg)] text-[var(--muted)]"}`}>
                  {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  {isActive && (
                    <div className="absolute inset-0 rounded-[16px] animate-ping bg-[var(--accent)]/20" style={{ animationDuration: "2s" }} />
                  )}
                </div>
                <span className={`text-[11px] font-medium whitespace-nowrap transition-colors duration-500 mt-1 ${
                  isActive ? "text-[var(--accent)] font-semibold"
                  : isDone ? "text-emerald-600"
                  : "text-[var(--muted)]"}`}>{step.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-bounce" />
                )}
              </button>
              {!isLast && (
                <div className="flex-1 h-0.5 mx-1 mb-6 rounded-full transition-colors duration-500"
                  style={{ background: isDone ? "linear-gradient(90deg,#10B981,#EE4D2D)" : "#E5E7EB" }} />
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
  filteredProducts, step1Valid,
}: Step1Props) {
  return (
    <div className="vi-step-enter space-y-6" key={`step1-${productMode}`}>
      <div className="flex rounded-xl bg-[var(--muted-bg)] p-1">
        {(["existing", "manual"] as const).map((mode) => (
          <button key={mode} type="button" onClick={() => { setProductMode(mode); setSelectedProduct(null); }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
              productMode === mode ? "bg-[var(--surface)] text-foreground shadow-sm shadow-black/[0.06]" : "text-muted-foreground hover:text-foreground"}`}>
            {mode === "existing" ? "Usar produto existente" : "Cadastrar manualmente"}
          </button>
        ))}
      </div>

      {productMode === "existing" ? (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar produto por nome, categoria ou palavra-chave..."
              className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm shadow-sm shadow-black/[0.02] focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => setSelectedProduct(product)}
                className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-300 ${
                  selectedProduct?.id === product.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/20 shadow-md shadow-[#EE4D2D]/10"
                    : "border-gray-100 bg-[var(--surface)] hover:border-[var(--border)] hover:shadow-md hover:-translate-y-0.5"}`}>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--muted-bg)]">
                  <img src={product.image} alt={product.name} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-2">{product.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{product.category}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">{tag}</span>))}
                  </div>
                </div>
                {selectedProduct?.id === product.id && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] vi-bounce-in">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>)}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--border)] py-12 text-center">
              <Search className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-[var(--muted)]">Nenhum produto encontrado</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Tente outro termo de busca.</p>
            </div>)}
        </>
      ) : (
        <div className="vi-step-enter space-y-4 rounded-[16px] border border-gray-100 bg-[var(--surface)] p-6 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <Field label="Nome do produto" required>
            <Input id="mp-name" value={manualProduct.name} onChange={(e) => setManualProduct((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Camisa Feminina Seleção Brasileira 2026"
              className="h-11 rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
          </Field>
          <Field label="Link do produto na Shopee" required>
            <Input id="mp-url" type="url" value={manualProduct.url} onChange={(e) => setManualProduct((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://shopee.com.br/..."
              className="h-11 rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
          </Field>
          <Field label="Descrição breve" optional>
            <Textarea id="mp-desc" value={manualProduct.description} onChange={(e) => setManualProduct((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descreva o produto brevemente..." rows={3}
              className="resize-none rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
          </Field>
        </div>
      )}

      {step1Valid && (
        <div className="vi-step-enter flex items-center gap-3 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"><Check className="h-4 w-4 text-white" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800 truncate">{productMode === "existing" ? selectedProduct?.name : manualProduct.name}</p>
            <p className="text-xs text-emerald-600">Produto selecionado. Pronto para continuar.</p>
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
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Imagem principal</Label>
          <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">Opcional</span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Esta será a imagem de capa do vídeo. O upload é automático ao selecionar.</p>
        <ImageUploadSlot image={primaryImage} onSelect={handlePrimaryImageSelect} onRemove={removePrimaryImage} large {...primaryDrop} />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Label className="text-sm font-semibold text-foreground">Imagens adicionais</Label>
          <span className="text-xs text-muted-foreground">Até {MAX_ADDITIONAL_IMAGES} imagens <span className="hidden sm:inline">(opcional)</span></span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Adicione mais ângulos, detalhes ou variações. Upload automático ao selecionar.</p>
        <div className="grid grid-cols-3 gap-3">
          {additionalImages.map((slot, i) => {
            const drop = useDropHandler((file: File) => handleAdditionalImageSelect(file, i));
            return (<ImageUploadSlot key={i} image={slot}
              onSelect={(file) => handleAdditionalImageSelect(file, i)} onRemove={() => removeAdditionalImage(i)}
              {...drop} />);
          })}
        </div>
      </div>
      <div className="rounded-[16px] border border-gray-100 bg-[var(--surface)] p-4 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06] border-l-4 border-l-[#EE4D2D]/20">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]"><Camera className="h-4 w-4 text-[var(--accent)]" /></div>
          <div>
            <p className="text-sm font-medium text-foreground">Dicas para boas imagens</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              <li>• Fundo branco ou neutro destaca o produto</li>
              <li>• JPG, PNG, WEBP — máx. 5 MB cada</li>
              <li>• Imagens nítidas geram vídeos melhores</li>
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
    <div className="space-y-6 rounded-[16px] border border-gray-100 bg-[var(--surface)] p-6 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "0ms" }}>
          <Label htmlFor="pi-name" className="text-sm font-medium text-foreground">Nome do produto <span className="text-[var(--accent)]">*</span></Label>
          <Input id="pi-name" value={productInfo.name} onChange={(e) => update("name", e.target.value)}
            placeholder="Nome completo do produto" className="h-11 rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
        </div>
        <div className="vi-float-up space-y-2" style={{ animationDelay: "50ms" }}>
          <Label htmlFor="pi-category" className="text-sm font-medium text-foreground">Categoria <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <select id="pi-category" value={productInfo.category} onChange={(e) => update("category", e.target.value)}
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0">
            <option value="">Selecione uma categoria</option>
            {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div className="vi-float-up space-y-2" style={{ animationDelay: "100ms" }}>
          <Label htmlFor="pi-audience" className="text-sm font-medium text-foreground">Público-alvo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input id="pi-audience" value={productInfo.targetAudience} onChange={(e) => update("targetAudience", e.target.value)}
            placeholder="Ex: Mulheres 18-35, torcedores..." className="h-11 rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "150ms" }}>
          <Label htmlFor="pi-desc" className="text-sm font-medium text-foreground">Descrição curta <span className="text-[var(--accent)]">*</span></Label>
          <Textarea id="pi-desc" value={productInfo.description} onChange={(e) => update("description", e.target.value)}
            placeholder="Breve descrição do produto (2-3 frases)" rows={2}
            className="resize-none rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "200ms" }}>
          <Label htmlFor="pi-url" className="text-sm font-medium text-foreground">Link do produto na Shopee <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input id="pi-url" type="url" value={productInfo.url} onChange={(e) => update("url", e.target.value)}
            placeholder="https://shopee.com.br/..." className="h-11 rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "250ms" }}>
          <Label htmlFor="pi-benefits" className="text-sm font-medium text-foreground">Principais benefícios <span className="text-[var(--accent)]">*</span></Label>
          <Textarea id="pi-benefits" value={productInfo.benefits} onChange={(e) => update("benefits", e.target.value)}
            placeholder="Liste os 3-5 principais benefícios do produto (um por linha)" rows={4}
            className="resize-none rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
          <p className="text-xs text-muted-foreground">Esses benefícios serão usados no roteiro do vídeo.</p>
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "300ms" }}>
          <Label htmlFor="pi-diff" className="text-sm font-medium text-foreground">Diferenciais <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea id="pi-diff" value={productInfo.differentiators} onChange={(e) => update("differentiators", e.target.value)}
            placeholder="O que torna este produto diferente dos concorrentes?" rows={3}
            className="resize-none rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
        </div>
        <div className="vi-float-up space-y-2 sm:col-span-2" style={{ animationDelay: "350ms" }}>
          <Label htmlFor="pi-problem" className="text-sm font-medium text-foreground">Problema que resolve <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea id="pi-problem" value={productInfo.problemSolved} onChange={(e) => update("problemSolved", e.target.value)}
            placeholder="Qual problema ou necessidade este produto resolve?" rows={3}
            className="resize-none rounded-lg border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0" />
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
  dailyCount, dailyLimitReached, dailyLimitChecked,
  isAdmin, handleBack,
}: Step4Props) {
  return (
    <div className="space-y-6">
      {/* Daily limit badge (hidden for admins) */}
      {!isAdmin && dailyLimitChecked && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${dailyLimitReached ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>{dailyCount} de {DAILY_LIMIT} gerações disponíveis hoje{dailyLimitReached ? " — limite atingido!" : ""}</span>
        </div>
      )}

      {/* Style cards — redesigned */}
      <div>
        <Label className="text-sm font-semibold text-foreground">Estilo do vídeo</Label>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Escolha o estilo que melhor se adapta ao seu produto.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {STYLE_OPTIONS.map((opt) => {
            const active = styleConfig.style === opt.id;
            const Icon = opt.icon;
            return (
              <button key={opt.id} type="button" onClick={() => setStyleConfig((s) => ({ ...s, style: opt.id }))}
                className={`flex flex-col items-center gap-2 rounded-[16px] border-2 p-4 text-center transition-all duration-300 ${
                  active ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/20 shadow-md shadow-[#EE4D2D]/10 vi-pulse-card"
                  : "border-gray-100 bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:shadow-md hover:-translate-y-0.5"}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-[16px] transition-all duration-300 ${active ? "bg-[var(--accent)]/10" : "bg-[var(--muted-bg)]"}`}>
                  <Icon className={`h-6 w-6 transition-colors duration-300 ${active ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                </div>
                <div>
                  <span className={`text-sm font-semibold leading-tight truncate block ${active ? "text-[var(--accent)]" : "text-foreground"}`}>{opt.label}</span>
                  <p className="text-[11px] leading-tight text-muted-foreground mt-0.5 hidden sm:block">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice and Tone */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Voz</Label>
          <div className="flex rounded-lg bg-[var(--muted-bg)] p-1">
            {VOICE_OPTIONS.map((v) => (
              <button key={v.value} type="button" onClick={() => setStyleConfig((s) => ({ ...s, voiceType: v.value }))}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all duration-300 ${
                  styleConfig.voiceType === v.value ? "bg-[var(--surface)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {v.label}
              </button>))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Tom</Label>
          <select value={styleConfig.tone} onChange={(e) => setStyleConfig((s) => ({ ...s, tone: e.target.value }))}
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]/40 focus:shadow-sm focus:shadow-[#EE4D2D]/5 focus-visible:ring-0">
            {TONE_OPTIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
      </div>

      {/* Toggles — custom sliding pills */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <Subtitles className="h-4 w-4 text-[var(--muted)]" />
          <span className="text-sm font-medium text-foreground">Textos na tela</span>
          <button type="button" onClick={() => setStyleConfig((s) => ({ ...s, hasText: !s.hasText }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
              styleConfig.hasText ? "bg-[var(--accent)]" : "bg-gray-200"}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-[var(--surface)] shadow-sm transition-transform duration-300 ${
              styleConfig.hasText ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Music className="h-4 w-4 text-[var(--muted)]" />
          <span className="text-sm font-medium text-foreground">Música de fundo</span>
          <button type="button" onClick={() => setStyleConfig((s) => ({ ...s, hasMusic: !s.hasMusic }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
              styleConfig.hasMusic ? "bg-[var(--accent)]" : "bg-gray-200"}`}>
            <span className={`inline-block h-5 w-5 rounded-full bg-[var(--surface)] shadow-sm transition-transform duration-300 ${
              styleConfig.hasMusic ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {/* Daily limit warning (hidden for admins) */}
      {!isAdmin && dailyLimitReached && (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-6 text-center vi-step-enter">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-red-100"><Info className="h-7 w-7 text-red-500" /></div>
          </div>
          <h3 className="text-sm font-bold text-red-800">Limite diário atingido</h3>
          <p className="mt-1 text-xs text-red-600">Você já gerou {DAILY_LIMIT} roteiros hoje. O limite reseta à meia-noite.</p>
          <Button onClick={handleBack} variant="outline"
            className="mt-3 h-10 rounded-xl border-red-200 bg-[var(--surface)] text-sm font-medium text-red-600 hover:bg-red-50">
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
});

/* ───────────────────────────────────────────────────────────────
   STEP 5 — Content Generation (module-level, memoized)
   ─────────────────────────────────────────────────────────────── */

const Step5Generation = memo(function Step5Generation({
  productInfo, styleConfig,
  generating, genStep, genError, generatedContent,
  dailyCount, dailyLimitReached, dailyLimitChecked,
  isAdmin,
  handleGenerate, handleRegenerate,
}: Step5Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-[16px] border border-gray-100 bg-[var(--surface)] p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
        <h3 className="text-sm font-semibold text-foreground">Resumo da configuração</h3>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <SummaryRow label="Produto" value={productInfo.name} />
          <SummaryRow label="Estilo" value={STYLE_OPTIONS.find((s) => s.id === styleConfig.style)?.label || ""} />
          <SummaryRow label="Voz" value={VOICE_OPTIONS.find((v) => v.value === styleConfig.voiceType)?.label || ""} />
          <SummaryRow label="Tom" value={TONE_OPTIONS.find((t) => t.value === styleConfig.tone)?.label || ""} />
          <SummaryRow label="Extras" value={[styleConfig.hasText && "Textos na tela", styleConfig.hasMusic && "Música de fundo"].filter(Boolean).join(", ") || "Nenhum"} />
        </div>
      </div>

      {!generating && !genError && (
        <div className="vi-step-enter flex flex-col items-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-14 text-center shadow-sm relative overflow-hidden">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FFF8F5] to-[#FFE8E0]">
            <Wand2 className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-foreground">Pronto para criar seu vídeo!</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A IA vai analisar o produto e gerar um roteiro profissional com base no estilo escolhido.
          </p>
          {!isAdmin && dailyLimitChecked && (
            <p className="mt-2 text-xs text-muted-foreground">
              <span className={dailyLimitReached ? "text-red-500 font-semibold" : "text-[var(--accent)] font-semibold"}>
                {dailyCount}/{DAILY_LIMIT}
              </span> gerações hoje
            </p>
          )}
          <Button onClick={handleGenerate}
            disabled={!isAdmin && dailyLimitReached}
            className="mt-6 h-14 w-full max-w-sm rounded-[16px] bg-gradient-to-r from-[#EE4D2D] to-[#FF6B3D] text-base font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition-all hover:shadow-xl hover:shadow-[#EE4D2D]/35 active:scale-[0.98] disabled:opacity-40">
            <Wand2 className="mr-2 h-5 w-5" /> {dailyLimitReached ? "Limite diário atingido" : "Gerar conteúdo com IA"}
          </Button>
        </div>
      )}

      {generating && (
        <div className="vi-step-enter space-y-4 rounded-[16px] border border-[var(--accent)]/20 bg-[var(--surface)] p-8 shadow-lg shadow-[#EE4D2D]/10 relative overflow-hidden">
          <div className="vi-shimmer absolute inset-0 rounded-[16px] opacity-30 pointer-events-none" />
          <div className="flex flex-col items-center relative z-10">
            <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/20" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-0 animate-pulse rounded-full bg-[var(--accent)]/15" />
              <Wand2 className="relative z-10 h-10 w-10 text-[var(--accent)] animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-foreground">Gerando conteúdo com IA...</h3>
            <div className="mt-5 w-full max-w-xs space-y-2.5">
              {GENERATION_STEPS.map((msg, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium transition-all duration-500 ${
                  i <= genStep ? "bg-emerald-50 text-emerald-700" : "bg-[var(--muted-bg)] text-[var(--muted)]"}`}>
                  {i < genStep ? <Check className="h-4 w-4 text-emerald-500" />
                  : i === genStep ? <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                  : <span className="h-4 w-4 rounded-full border-2 border-[var(--border)]" />}
                  {msg}
                </div>))}
            </div>
          </div>
        </div>
      )}

      {genError && (
        <div className="vi-shake rounded-[16px] border border-red-200 bg-red-50 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100"><Info className="h-6 w-6 text-red-500" /></div>
          </div>
          <p className="text-sm font-medium text-red-700">{genError}</p>
          <Button onClick={handleGenerate} variant="outline"
            className="mt-3 h-10 rounded-xl border-red-200 bg-[var(--surface)] text-sm font-medium text-red-600 hover:bg-red-50">
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <RegenButton icon={RotateCw} label="Gerar outra versão" onClick={() => handleRegenerate()} />
        <RegenButton icon={Zap} label="Mais curta" onClick={() => handleRegenerate("curta")} />
        <RegenButton icon={Trophy} label="Mais comercial" onClick={() => handleRegenerate("comercial")} />
        <RegenButton icon={Camera} label="Mais natural" onClick={() => handleRegenerate("natural")} />
      </div>

      <div className="space-y-4 rounded-[16px] border border-gray-100 bg-[var(--surface)] p-6 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
        {([
          { field: "idea_title" as const, label: "Título da ideia", rows: 2 },
          { field: "hook" as const, label: "Hook (abertura)", rows: 2 },
          { field: "script" as const, label: "Roteiro (3 cenas)", rows: 6 },
          { field: "voiceover" as const, label: "Locução / Narração", rows: 3 },
          { field: "screen_texts" as const, label: "Textos na tela", rows: 3 },
          { field: "cta" as const, label: "Chamada para ação (CTA)", rows: 2 },
          { field: "caption" as const, label: "Legenda", rows: 2 },
          { field: "hashtags" as const, label: "Hashtags", rows: 2 },
          { field: "final_prompt" as const, label: "Prompt final em inglês", rows: 10 },
        ]).map(({ field, label, rows }) => (
          <div key={field} className="vi-float-up border border-gray-100 hover:border-[var(--border)] rounded-[16px] p-4 transition-all duration-300 focus-within:border-l-2 focus-within:border-l-[#EE4D2D] focus-within:shadow-sm">
            <EditableField label={label} value={generatedContent[field]}
              onChange={(v) => update(field, v)} rows={rows} />
          </div>
        ))}
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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
    tone: "entusiasmado", hasText: true, hasMusic: true,
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

  // Daily limit
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [dailyLimitChecked, setDailyLimitChecked] = useState(false);

  // Check daily limit when entering step 4 (admins are exempt)
  useEffect(() => {
    if (!currentUserId || currentStep < 4) return;
    if (isAdmin) { setDailyLimitReached(false); setDailyLimitChecked(true); return; }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    (supabase.from as any)("video_projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .gte("created_at", todayStart.toISOString())
      .then(({ count, error }: { count: number | null; error: any }) => {
        if (!error) {
          setDailyCount(count || 0);
          setDailyLimitReached((count || 0) >= DAILY_LIMIT);
          setDailyLimitChecked(true);
        }
      });
  }, [currentUserId, currentStep, isAdmin]);

  // Pre-fill step 3 from step 1
  useEffect(() => {
    if (currentStep === 3) {
      const source = productMode === "existing" && selectedProduct
        ? { name: selectedProduct.name, url: selectedProduct.sourceUrl, description: selectedProduct.description }
        : manualProduct;
      setProductInfo((prev) => ({
        ...prev,
        name: prev.name || source.name,
        url: prev.url || source.url,
        description: prev.description || source.description,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ── Product search ──
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return mockProducts.slice(0, 12);
    const q = productSearch.toLowerCase();
    return mockProducts.filter((p) =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.toLowerCase().includes(q)));
  }, [productSearch]);

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

  // ── Step 5: Call Edge Function ──
  const handleGenerate = useCallback(async () => {
    if (!currentUserId) {
      toast.error("Sessão não encontrada. Faça login novamente.");
      return;
    }
    if (!isAdmin && dailyLimitReached) {
      toast.error(`Limite diário de ${DAILY_LIMIT} roteiros atingido. Volte amanhã!`);
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
            product: { name: productInfo.name, description: productInfo.description, benefits: productInfo.benefits, targetAudience: productInfo.targetAudience || undefined, differentiators: productInfo.differentiators || undefined, problemSolved: productInfo.problemSolved || undefined, url: productInfo.url || undefined },
            style: styleConfig,
          }),
          signal: controller.signal,
        });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Erro ${res.status} ao gerar conteúdo`);
      setGeneratedContent(data.content);
      await saveProjectWithContent(data.content);
      setDailyCount((c) => c + 1);
      if (dailyCount + 1 >= DAILY_LIMIT) setDailyLimitReached(true);
      toast.success("Conteúdo gerado com sucesso!");
      setCurrentStep(6);
    } catch (err: any) {
      setGenError(err?.name === "AbortError" ? "Tempo limite excedido (35s). O servidor demorou muito. Tente novamente." : err?.message || "Erro ao gerar conteúdo. Tente novamente.");
    } finally {
      clearTimeout(timeoutId); clearInterval(stepInterval);
      setGenStep(GENERATION_STEPS.length - 1); setGenerating(false);
    }
  }, [currentUserId, productInfo, styleConfig, dailyLimitReached, dailyCount, isAdmin]);

  const handleRegenerate = useCallback(async (variant?: string) => {
    if (!isAdmin && dailyLimitReached) {
      toast.error(`Limite diário de ${DAILY_LIMIT} roteiros atingido. Volte amanhã!`);
      return;
    }
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
            product: { name: productInfo.name, description: productInfo.description, benefits: productInfo.benefits, targetAudience: productInfo.targetAudience || undefined, differentiators: productInfo.differentiators || undefined, problemSolved: productInfo.problemSolved || undefined, url: productInfo.url || undefined },
            style: variantStyle,
          }),
          signal: controller.signal,
        });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erro ao gerar");
      setGeneratedContent(data.content);
      await saveProjectWithContent(data.content);
      setDailyCount((c) => c + 1);
      if (dailyCount + 1 >= DAILY_LIMIT) setDailyLimitReached(true);
      toast.success("Nova versão gerada!");
    } catch (err: any) {
      setGenError(err?.name === "AbortError" ? "Tempo limite excedido (35s). Tente novamente." : err?.message || "Erro ao gerar. Tente novamente.");
    } finally {
      clearTimeout(timeoutId); clearInterval(stepInterval);
      setGenStep(GENERATION_STEPS.length - 1); setGenerating(false);
    }
  }, [currentUserId, productInfo, styleConfig, dailyLimitReached, dailyCount, isAdmin]);

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
      if (!isAdmin && dailyLimitReached) { toast.error(`Limite diário de ${DAILY_LIMIT} roteiros atingido. Volte amanhã!`); return; }
      await saveProjectWithContent(); setCurrentStep(5); return;
    }
    if (currentStep === 6) {
      await (supabase.from as any)("video_projects").update({ status: "prompt_ready", updated_at: new Date().toISOString() }).eq("id", projectId);
      toast.success("Projeto salvo! Pronto para abrir no Gemini.");
      setCurrentStep(7); return;
    }
    setCurrentStep((s) => Math.min(s + 1, 7));
  }, [currentStep, handleSubmitProject, saveProjectWithContent, projectId, dailyLimitReached, isAdmin]);

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
        @keyframes pulse-orange { 0%,100% { box-shadow: 0 0 0 0 rgba(238,77,45,0.4); } 50% { box-shadow: 0 0 0 12px rgba(238,77,45,0); } }
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
        <div className="rounded-[16px] border border-gray-100 bg-[var(--surface)] p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <StepIndicator currentStep={currentStep} setCurrentStep={setCurrentStep} steps={steps} />
          <div className="mt-2 h-0.5 w-full rounded-full bg-[var(--muted-bg)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${(currentStep / 7) * 100}%` }} />
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--surface)] border border-[var(--accent)]/10 shadow-sm">
              {(() => { const Icon = steps[currentStep - 1].icon; return <Icon className="h-6 w-6 text-[var(--accent)]" />; })()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Etapa {currentStep}: {steps[currentStep - 1].label}</h2>
              <p className="text-xs text-muted-foreground">{stepDescriptions[currentStep - 1]}</p>
            </div>
          </div>

          <div className="vi-step-enter min-h-[300px]" key={currentStep}>
            {currentStep === 1 && <Step1SelectProduct productMode={productMode} setProductMode={setProductMode} productSearch={productSearch} setProductSearch={setProductSearch} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} manualProduct={manualProduct} setManualProduct={setManualProduct} filteredProducts={filteredProducts} step1Valid={step1Valid} />}
            {currentStep === 2 && <Step2UploadImages primaryImage={primaryImage} additionalImages={additionalImages} handlePrimaryImageSelect={handlePrimaryImageSelect} handleAdditionalImageSelect={handleAdditionalImageSelect} removePrimaryImage={removePrimaryImage} removeAdditionalImage={removeAdditionalImage} />}
            {currentStep === 3 && <Step3ProductInfo productInfo={productInfo} setProductInfo={setProductInfo} />}
            {currentStep === 4 && <Step4Style styleConfig={styleConfig} setStyleConfig={setStyleConfig} dailyCount={dailyCount} dailyLimitReached={dailyLimitReached} dailyLimitChecked={dailyLimitChecked} isAdmin={isAdmin} handleBack={handleBack} />}
            {currentStep === 5 && <Step5Generation productInfo={productInfo} styleConfig={styleConfig} generating={generating} genStep={genStep} genError={genError} generatedContent={generatedContent} dailyCount={dailyCount} dailyLimitReached={dailyLimitReached} dailyLimitChecked={dailyLimitChecked} isAdmin={isAdmin} handleGenerate={handleGenerate} handleRegenerate={handleRegenerate} />}
            {currentStep === 6 && <Step6Review generatedContent={generatedContent} setGeneratedContent={setGeneratedContent} handleRegenerate={handleRegenerate} />}
            {currentStep === 7 && (isAdmin ? (
              <AdminStep7Video productInfo={productInfo} styleConfig={styleConfig} generatedContent={generatedContent} projectId={projectId} handleBack={handleBack} />
            ) : (
              <Step7GeminiChat productInfo={productInfo} styleConfig={styleConfig} generatedContent={generatedContent} projectId={projectId} handleBack={handleBack} handleCopyFinalPrompt={handleCopyFinalPrompt} />
            ))}
          </div>

          {currentStep !== 5 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={handleBack}
                disabled={currentStep === 1 || submitting || generating}
                className="group h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] disabled:opacity-40">
                <ChevronLeft className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" /> Voltar
              </Button>
              {continueLabel[currentStep] && (
                <Button type="button" onClick={currentStep === 4 ? handleGenerate : handleContinue}
                  disabled={submitting || generating || (currentStep === 4 && !isAdmin && dailyLimitReached)}
                  className="group h-11 min-w-0 sm:min-w-[140px] rounded-xl bg-[var(--accent)] text-sm font-semibold text-white shadow-sm shadow-[var(--accent)]/25 transition-all hover:bg-[var(--accent)]/90 hover:shadow-md hover:shadow-[var(--accent)]/30 active:scale-[0.98] disabled:opacity-40">
                  {submitting || generating ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processando...</span>) : (<span className="flex items-center gap-2">{continueLabel[currentStep]}<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>)}
                </Button>
              )}
            </div>
          )}
          {currentStep === 5 && !generating && (
            <div className="mt-8">
              <Button type="button" variant="outline" onClick={handleBack} disabled={generating}
                className="group h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">
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
  return (<div className="space-y-2"><Label className="text-sm font-medium text-foreground">{label} {required && <span className="text-[var(--accent)]">*</span>}{optional && <span className="text-muted-foreground font-normal">(opcional)</span>}</Label>{children}</div>);
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (<div className="flex items-baseline justify-between rounded-lg bg-[var(--muted-bg)] px-3 py-1.5"><span className="font-medium text-[var(--muted)]">{label}</span><span className="max-w-[180px] truncate text-right text-foreground">{value || "—"}</span></div>);
}


function RegenButton({ icon: Icon, label, onClick }: { icon: typeof RotateCw; label: string; onClick: () => void }) {
  return (<button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all duration-300 hover:border-[var(--accent)]/40 hover:text-[var(--accent)] hover:shadow-md active:scale-[0.97]"><Icon className="h-3.5 w-3.5" /> {label}</button>);
}

function EditableField({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (<div className="space-y-1.5"><Label className="text-xs font-semibold text-[var(--muted)] tracking-wide uppercase">{label}</Label><Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="resize-y rounded-xl bg-[var(--muted-bg)]/50 border-0 focus:bg-[var(--surface)] text-sm px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30" /></div>);
}

function ImageUploadSlot({ image, onSelect, onRemove, large = false, dragOver = false, onDragOver, onDragLeave, onDrop }: { image: ImageSlot; onSelect: (file: File) => void; onRemove: () => void; large?: boolean; dragOver?: boolean; onDragOver?: (e: DragEvent) => void; onDragLeave?: (e: DragEvent) => void; onDrop?: (e: DragEvent) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = !!(image.preview || image.storagePath);
  const heightClass = large ? "h-48 sm:h-56" : "h-32 sm:h-36";
  return (
    <div onClick={() => { if (!hasImage && !image.uploading) inputRef.current?.click(); }} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`group relative ${heightClass} cursor-pointer overflow-hidden rounded-[16px] border-2 transition-all duration-300 ${hasImage ? "border-solid border-emerald-300" : image.uploading ? "border-dashed border-[var(--accent)]/50" : dragOver ? "border-dashed border-[var(--accent)] bg-[var(--accent-soft)]" : "border-dashed border-[var(--border)] bg-[var(--muted-bg)]/80 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/50"}`}>
      {image.uploading && hasImage && image.storagePath && (
        <div className="absolute inset-0 z-20 vi-shimmer rounded-[16px] overflow-hidden pointer-events-none" />
      )}
      {image.uploading && !hasImage && (<div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface)]/90"><div className="mb-2 relative"><div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/20" /><Loader2 className="relative z-10 h-6 w-6 animate-spin text-[var(--accent)]" /></div><span className="text-xs font-medium text-[var(--accent)]">Enviando...</span></div>)}
      {hasImage ? (<><img src={image.preview || ""} alt="Preview" className="h-full w-full object-cover" />
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
        {image.storagePath && (<div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 vi-bounce-in"><Check className="h-3 w-3 text-white" /></div>)}</>)
        : (<div className="flex h-full flex-col items-center justify-center px-3 text-center"><div className={`mb-1.5 flex items-center justify-center rounded-full bg-[var(--muted-bg)] transition-all duration-300 group-hover:bg-[var(--accent)]/10 group-hover:scale-110 ${large ? "h-12 w-12" : "h-8 w-8"}`}><Upload className={`${large ? "h-5 w-5" : "h-3.5 w-3.5"} text-[var(--muted)] transition-colors duration-300 group-hover:text-[var(--accent)]/60`} /></div><span className={`${large ? "text-xs" : "text-[11px]"} font-medium text-[var(--muted)]`}>{large ? "Clique ou arraste a imagem principal" : "Adicionar imagem"}</span><span className="mt-0.5 text-[10px] text-gray-300">JPG, PNG ou WEBP</span></div>)}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) onSelect(file); e.target.value = ""; }} />
    </div>
  );
}
