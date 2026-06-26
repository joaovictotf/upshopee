import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
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
  Camera, Package, Image, Info, Sparkles, Copy, ExternalLink,
  Wand2, RotateCw, Shirt, Zap, Lightbulb, ShoppingBag, Play, Trophy,
  Gem, Scissors, Monitor, Eye, Subtitles, Volume2, Music,
} from "lucide-react";
import { products as mockProducts, type Product } from "../lib/mock/products";

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

/* ───────────────────────────────────────────────────────────────
   Constants
   ─────────────────────────────────────────────────────────────── */

const STEPS = [
  { num: 1, label: "Produto", icon: Package },
  { num: 2, label: "Imagens", icon: Image },
  { num: 3, label: "Informações", icon: Info },
  { num: 4, label: "Estilo", icon: Sparkles },
  { num: 5, label: "Geração", icon: Wand2 },
  { num: 6, label: "Revisão", icon: Check },
  { num: 7, label: "Gemini", icon: Star },
] as const;

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
];

const DURATION_OPTIONS = ["15s", "30s", "60s"];
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

/* ───────────────────────────────────────────────────────────────
   Page component
   ─────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/dashboard/video-ia")({ component: VideoIaPage });

function VideoIaPage() {
  const { currentUserId } = useApp();

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
  const step2Valid = !!(primaryImage.preview || primaryImage.storagePath);
  const step3Valid = !!(productInfo.name.trim() && productInfo.description.trim() && productInfo.benefits.trim());
  const step4Valid = !!styleConfig.style;
  // Step 5 auto-advances on success
  const step6Valid = !!generatedContent.idea_title;
  // Step 7 is always actionable

  // ── Image helpers ──
  function emptySlot(): ImageSlot {
    return { file: null, preview: null, storagePath: null, uploading: false, progress: 0 };
  }

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return "Formato não aceito. Use JPG, PNG ou WEBP.";
    if (file.size > MAX_FILE_SIZE) return "Arquivo muito grande. Máximo 5 MB.";
    return null;
  }, []);

  // Upload a single image to Supabase Storage
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

    console.log("[uploadSingleImage] Uploading:", { fileName, storagePath, fileSize: file.size, fileType: file.type });

    try {
      const { data, error } = await supabase.storage
        .from("video-project-images")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("[uploadSingleImage] Supabase error:", error);
        setter({ uploading: false, progress: 0 });
        toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
        return null;
      }

      console.log("[uploadSingleImage] Success:", data?.path);
      setter({ uploading: false, progress: 100, storagePath });
      return storagePath;
    } catch (err: any) {
      console.error("[uploadSingleImage] Exception:", err);
      setter({ uploading: false, progress: 0 });
      toast.error(`Erro ao enviar ${file.name}: ${err?.message || "Erro desconhecido"}`);
      return null;
    }
  }, [currentUserId]);

  // Auto-upload primary image on select
  const handlePrimaryImageSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) { toast.error(error); return; }
    if (primaryImage.preview) URL.revokeObjectURL(primaryImage.preview);
    const preview = URL.createObjectURL(file);
    // Set preview immediately so user sees the image
    setPrimaryImage({ file, preview, storagePath: null, uploading: true, progress: 0 });
    // Start upload in background (fire-and-forget, state updates via setter callback)
    uploadSingleImage(file, (updates) => {
      setPrimaryImage((prev) => ({ ...prev, ...updates }));
    }).catch((err) => {
      console.error("[handlePrimaryImageSelect] uploadSingleImage rejected:", err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateFile, uploadSingleImage]);

  // Auto-upload additional image on select
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
      setAdditionalImages((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...updates };
        return next;
      });
    }).catch((err) => {
      console.error("[handleAdditionalImageSelect] uploadSingleImage rejected:", err);
    });
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

  // Drag-and-drop
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

  // ── Step 5: Call Edge Function ──
  const handleGenerate = useCallback(async () => {
    if (!currentUserId) return;
    setGenerating(true);
    setGenError(null);
    setGenStep(0);

    // Animate generation steps
    const stepInterval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1));
    }, 2000);

    try {
      const res = await fetch(
        "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/generate-video-script",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: {
              name: productInfo.name,
              description: productInfo.description,
              benefits: productInfo.benefits,
              targetAudience: productInfo.targetAudience || undefined,
              differentiators: productInfo.differentiators || undefined,
              problemSolved: productInfo.problemSolved || undefined,
              url: productInfo.url || undefined,
            },
            style: styleConfig,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Erro ${res.status} ao gerar conteúdo`);
      }

      setGeneratedContent(data.content);
      // Save/update project with generated content
      await saveProjectWithContent(data.content);
      toast.success("Conteúdo gerado com sucesso!");
      setCurrentStep(6);
    } catch (err: any) {
      console.error("[handleGenerate]", err);
      setGenError(err?.message || "Erro ao gerar conteúdo. Tente novamente.");
    } finally {
      clearInterval(stepInterval);
      setGenStep(GENERATION_STEPS.length - 1);
      setGenerating(false);
    }
  }, [currentUserId, productInfo, styleConfig]);

  const handleRegenerate = useCallback(async (variant?: string) => {
    // Modify style slightly for variation
    const variantStyle = variant
      ? { ...styleConfig, style: variant === "curta" ? "oferta-rapida" : variant === "comercial" ? "promocao" : "ugc" }
      : styleConfig;
    if (variant) setStyleConfig(variantStyle);

    setGenerating(true);
    setGenError(null);
    setGenStep(0);

    const stepInterval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, GENERATION_STEPS.length - 1));
    }, 2000);

    try {
      const res = await fetch(
        "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/generate-video-script",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: {
              name: productInfo.name,
              description: productInfo.description,
              benefits: productInfo.benefits,
              targetAudience: productInfo.targetAudience || undefined,
              differentiators: productInfo.differentiators || undefined,
              problemSolved: productInfo.problemSolved || undefined,
              url: productInfo.url || undefined,
            },
            style: variantStyle,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erro ao gerar");

      setGeneratedContent(data.content);
      await saveProjectWithContent(data.content);
      toast.success("Nova versão gerada!");
    } catch (err: any) {
      setGenError(err?.message || "Erro ao gerar. Tente novamente.");
    } finally {
      clearInterval(stepInterval);
      setGenStep(GENERATION_STEPS.length - 1);
      setGenerating(false);
    }
  }, [currentUserId, productInfo, styleConfig]);

  // ── Save project to database ──
  const saveProjectWithContent = useCallback(async (content?: GeneratedContent) => {
    if (!currentUserId) return;
    const c = content || generatedContent;

    if (projectId) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from as any)("video_projects")
        .update({
          idea_title: c.idea_title, hook: c.hook, script: c.script,
          voiceover: c.voiceover, screen_texts: c.screen_texts,
          cta: c.cta, caption: c.caption, hashtags: c.hashtags,
          final_prompt: c.final_prompt,
          style: styleConfig.style,
          duration: styleConfig.duration,
          voice_type: styleConfig.voiceType,
          has_text: styleConfig.hasText, has_music: styleConfig.hasMusic,
          status: content ? "content_generated" : "prompt_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);
    } else {
      // Create new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)("video_projects")
        .insert({
          user_id: currentUserId,
          product_name: productInfo.name,
          product_url: productInfo.url,
          status: content ? "content_generated" : "information_completed",
          benefits: productInfo.benefits,
          differentiators: productInfo.differentiators,
          problem_solved: productInfo.problemSolved,
          target_audience: productInfo.targetAudience,
          idea_title: c.idea_title, hook: c.hook, script: c.script,
          voiceover: c.voiceover, screen_texts: c.screen_texts,
          cta: c.cta, caption: c.caption, hashtags: c.hashtags,
          final_prompt: c.final_prompt,
          style: styleConfig.style,
          duration: styleConfig.duration,
          voice_type: styleConfig.voiceType,
          has_text: styleConfig.hasText, has_music: styleConfig.hasMusic,
        })
        .select("id")
        .single();

      if (error) { console.error("Save project error:", error); return; }
      if (data?.id) setProjectId(data.id);

      // Insert image records
      const allImages: { slot: ImageSlot; isPrimary: boolean; sortOrder: number }[] = [
        { slot: primaryImage, isPrimary: true, sortOrder: 0 },
        ...additionalImages.filter((s) => s.storagePath)
          .map((s, i) => ({ slot: s, isPrimary: false, sortOrder: i + 1 })),
      ];
      const imageRows = allImages.filter(({ slot }) => slot.storagePath).map(({ slot, isPrimary, sortOrder }) => ({
        project_id: data.id, user_id: currentUserId,
        storage_path: slot.storagePath!,
        file_name: slot.file?.name || null, mime_type: slot.file?.type || null,
        file_size: slot.file?.size || null, sort_order: sortOrder, is_primary: isPrimary,
      }));
      if (imageRows.length > 0) {
        await (supabase.from as any)("video_project_images").insert(imageRows);
      }
    }
  }, [currentUserId, projectId, generatedContent, productInfo, styleConfig, primaryImage, additionalImages]);

  // ── Step 3: Create project + advance ──
  const handleSubmitProject = useCallback(async () => {
    if (!currentUserId) { toast.error("Você precisa estar logado."); return; }
    setSubmitting(true);
    try {
      await saveProjectWithContent();
      toast.success("Projeto criado! Configure o estilo do vídeo.");
      setCurrentStep(4);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar o projeto.");
    } finally {
      setSubmitting(false);
    }
  }, [currentUserId, saveProjectWithContent]);

  // ── Step 7: Copy prompt + open Gemini ──
  const handleCopyAndOpen = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("video_projects")
      .update({ status: "opened_in_gemini", updated_at: new Date().toISOString() })
      .eq("id", projectId);

    await navigator.clipboard.writeText(generatedContent.final_prompt);
    toast.success("Prompt copiado!", { description: "Abrindo Gemini em uma nova aba..." });
    setTimeout(() => window.open("https://gemini.google.com/app", "_blank"), 600);
  }, [generatedContent.final_prompt, projectId]);

  // ── Navigation ──
  const handleContinue = useCallback(async () => {
    if (currentStep === 3) { await handleSubmitProject(); return; }
    if (currentStep === 4) { await saveProjectWithContent(); setCurrentStep(5); return; }
    if (currentStep === 6) {
      // Save as prompt_ready
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from as any)("video_projects")
        .update({ status: "prompt_ready", updated_at: new Date().toISOString() })
        .eq("id", projectId);
      toast.success("Projeto salvo! Pronto para abrir no Gemini.");
      setCurrentStep(7);
      return;
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

  // ── ProductInfo update ──
  const updateProductInfo = (field: keyof ProductInfo, value: string) =>
    setProductInfo((prev) => ({ ...prev, [field]: value }));

  // ── Generated content update ──
  const updateGenerated = (field: keyof GeneratedContent, value: string) =>
    setGeneratedContent((prev) => ({ ...prev, [field]: value }));

  // ── Validation map ──
  const canContinue: Record<number, boolean> = {
    1: step1Valid, 2: step2Valid, 3: step3Valid,
    4: step4Valid, 5: true, 6: step6Valid, 7: true,
  };
  const continueLabel: Record<number, string> = {
    1: "Continuar", 2: "Continuar", 3: "Criar projeto de vídeo",
    4: "Gerar conteúdo", 5: "", 6: "Salvar e continuar", 7: "",
  };

  /* ═══════════════════════════════════════════════════════════
     STEPPER
     ═══════════════════════════════════════════════════════════ */

  function StepIndicator() {
    return (
      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max items-center justify-center gap-1 px-2">
          {STEPS.map((step, idx) => {
            const isActive = step.num === currentStep;
            const isDone = step.num < currentStep;
            const isLast = idx === STEPS.length - 1;
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex items-center">
                <button
                  type="button"
                  onClick={() => { if (isDone) setCurrentStep(step.num); }}
                  disabled={!isDone && !isActive}
                  className={`flex shrink-0 flex-col items-center gap-1 transition-all ${
                    isDone ? "cursor-pointer" : isActive ? "cursor-default" : "cursor-not-allowed"}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    isActive ? "bg-[#EE4D2D] text-white shadow-md shadow-[#EE4D2D]/30 scale-110"
                    : isDone ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                    : "bg-gray-100 text-gray-400"}`}>
                    {isDone ? <Check className="h-4 w-4" /> : isActive ? <Icon className="h-4 w-4" /> : step.num}
                  </div>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${
                    isActive ? "text-[#EE4D2D]" : isDone ? "text-emerald-600" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </button>
                {!isLast && (
                  <div className="mx-0.5 mb-5 w-6 sm:w-10">
                    <div className={`h-0.5 rounded-full transition-colors duration-300 ${isDone ? "bg-emerald-400" : "bg-gray-200"}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 1 — Select Product
     ═══════════════════════════════════════════════════════════ */
  function Step1SelectProduct() {
    return (
      <div className="space-y-6">
        <div className="flex rounded-xl bg-gray-100 p-1">
          {(["existing", "manual"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => { setProductMode(mode); setSelectedProduct(null); }}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                productMode === mode ? "bg-white text-foreground shadow-sm shadow-black/[0.06]" : "text-muted-foreground hover:text-foreground"}`}>
              {mode === "existing" ? "Usar produto existente" : "Cadastrar manualmente"}
            </button>
          ))}
        </div>

        {productMode === "existing" ? (
          <>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar produto por nome, categoria ou palavra-chave..."
                className="h-11 rounded-xl border-gray-200 bg-white pl-10 pr-4 text-sm shadow-sm shadow-black/[0.02] focus-visible:ring-[#EE4D2D]/30" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <button key={product.id} type="button" onClick={() => setSelectedProduct(product)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                    selectedProduct?.id === product.id
                      ? "border-[#EE4D2D] bg-[#FFF8F5] ring-1 ring-[#EE4D2D]/20 shadow-sm shadow-[#EE4D2D]/10"
                      : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"}`}>
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <img src={product.image} alt={product.name} className="h-full w-full object-contain" loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground line-clamp-2">{product.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{product.category}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{tag}</span>))}
                    </div>
                  </div>
                  {selectedProduct?.id === product.id && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EE4D2D]">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>)}
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center">
                <Search className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Nenhum produto encontrado</p>
                <p className="mt-1 text-xs text-gray-400">Tente outro termo de busca.</p>
              </div>)}
          </>
        ) : (
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
            <Field label="Nome do produto" required>
              <Input id="mp-name" value={manualProduct.name} onChange={(e) => setManualProduct((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Camisa Feminina Seleção Brasileira 2026"
                className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm focus-visible:ring-[#EE4D2D]/30" />
            </Field>
            <Field label="Link do produto na Shopee" required>
              <Input id="mp-url" type="url" value={manualProduct.url} onChange={(e) => setManualProduct((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://shopee.com.br/..."
                className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm focus-visible:ring-[#EE4D2D]/30" />
            </Field>
            <Field label="Descrição breve" optional>
              <Textarea id="mp-desc" value={manualProduct.description} onChange={(e) => setManualProduct((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descreva o produto brevemente..." rows={3}
                className="resize-none rounded-lg border-gray-200 bg-white px-4 py-3 text-sm focus-visible:ring-[#EE4D2D]/30" />
            </Field>
          </div>
        )}

        {step1Valid && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"><Check className="h-4 w-4 text-white" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800 truncate">{productMode === "existing" ? selectedProduct?.name : manualProduct.name}</p>
              <p className="text-xs text-emerald-600">Produto selecionado. Pronto para continuar.</p>
            </div>
          </div>)}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 2 — Upload Images
     ═══════════════════════════════════════════════════════════ */
  function Step2UploadImages() {
    return (
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground">Imagem principal</Label>
            <span className="rounded-full bg-[#EE4D2D]/10 px-2 py-0.5 text-[10px] font-bold text-[#EE4D2D]">Obrigatória</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Esta será a imagem de capa do vídeo. O upload é automático ao selecionar.</p>
          <ImageUploadSlot image={primaryImage} onSelect={handlePrimaryImageSelect} onRemove={removePrimaryImage} large
            {...useDropHandler(handlePrimaryImageSelect)} />
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

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF8F5]"><Camera className="h-4 w-4 text-[#EE4D2D]" /></div>
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
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 3 — Product Information
     ═══════════════════════════════════════════════════════════ */
  function Step3ProductInfo() {
    return (
      <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-name" className="text-sm font-medium text-foreground">Nome do produto <span className="text-[#EE4D2D]">*</span></Label>
            <Input id="pi-name" value={productInfo.name} onChange={(e) => updateProductInfo("name", e.target.value)}
              placeholder="Nome completo do produto" className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm focus-visible:ring-[#EE4D2D]/30" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-category" className="text-sm font-medium text-foreground">Categoria <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <select id="pi-category" value={productInfo.category} onChange={(e) => updateProductInfo("category", e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#EE4D2D]/30">
              <option value="">Selecione uma categoria</option>
              {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pi-audience" className="text-sm font-medium text-foreground">Público-alvo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="pi-audience" value={productInfo.targetAudience} onChange={(e) => updateProductInfo("targetAudience", e.target.value)}
              placeholder="Ex: Mulheres 18-35, torcedores..." className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm focus-visible:ring-[#EE4D2D]/30" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-desc" className="text-sm font-medium text-foreground">Descrição curta <span className="text-[#EE4D2D]">*</span></Label>
            <Textarea id="pi-desc" value={productInfo.description} onChange={(e) => updateProductInfo("description", e.target.value)}
              placeholder="Breve descrição do produto (2-3 frases)" rows={2}
              className="resize-none rounded-lg border-gray-200 bg-white px-4 py-3 text-sm focus-visible:ring-[#EE4D2D]/30" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-url" className="text-sm font-medium text-foreground">Link do produto na Shopee <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input id="pi-url" type="url" value={productInfo.url} onChange={(e) => updateProductInfo("url", e.target.value)}
              placeholder="https://shopee.com.br/..." className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm focus-visible:ring-[#EE4D2D]/30" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-benefits" className="text-sm font-medium text-foreground">Principais benefícios <span className="text-[#EE4D2D]">*</span></Label>
            <Textarea id="pi-benefits" value={productInfo.benefits} onChange={(e) => updateProductInfo("benefits", e.target.value)}
              placeholder="Liste os 3-5 principais benefícios do produto (um por linha)" rows={4}
              className="resize-none rounded-lg border-gray-200 bg-white px-4 py-3 text-sm focus-visible:ring-[#EE4D2D]/30" />
            <p className="text-xs text-muted-foreground">Esses benefícios serão usados no roteiro do vídeo.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-diff" className="text-sm font-medium text-foreground">Diferenciais <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea id="pi-diff" value={productInfo.differentiators} onChange={(e) => updateProductInfo("differentiators", e.target.value)}
              placeholder="O que torna este produto diferente dos concorrentes?" rows={3}
              className="resize-none rounded-lg border-gray-200 bg-white px-4 py-3 text-sm focus-visible:ring-[#EE4D2D]/30" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pi-problem" className="text-sm font-medium text-foreground">Problema que resolve <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea id="pi-problem" value={productInfo.problemSolved} onChange={(e) => updateProductInfo("problemSolved", e.target.value)}
              placeholder="Qual problema ou necessidade este produto resolve?" rows={3}
              className="resize-none rounded-lg border-gray-200 bg-white px-4 py-3 text-sm focus-visible:ring-[#EE4D2D]/30" />
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 4 — Style Selection
     ═══════════════════════════════════════════════════════════ */
  function Step4Style() {
    return (
      <div className="space-y-6">
        {/* Style cards */}
        <div>
          <Label className="text-sm font-semibold text-foreground">Estilo do vídeo</Label>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">Escolha o estilo que melhor se adapta ao seu produto.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {STYLE_OPTIONS.map((opt) => {
              const active = styleConfig.style === opt.id;
              const Icon = opt.icon;
              return (
                <button key={opt.id} type="button" onClick={() => setStyleConfig((s) => ({ ...s, style: opt.id }))}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                    active ? "border-[#EE4D2D] bg-[#FFF8F5] ring-1 ring-[#EE4D2D]/20 shadow-sm shadow-[#EE4D2D]/10"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"}`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-[#EE4D2D]/10" : "bg-gray-50"}`}>
                    <Icon className={`h-4 w-4 ${active ? "text-[#EE4D2D]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-xs font-semibold leading-tight ${active ? "text-[#EE4D2D]" : "text-foreground"}`}>{opt.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground hidden sm:block">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration, Voice, Tone */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Duração</Label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              {DURATION_OPTIONS.map((d) => (
                <button key={d} type="button" onClick={() => setStyleConfig((s) => ({ ...s, duration: d }))}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    styleConfig.duration === d ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {d}
                </button>))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Voz</Label>
            <div className="flex rounded-lg bg-gray-100 p-1">
              {VOICE_OPTIONS.map((v) => (
                <button key={v.value} type="button" onClick={() => setStyleConfig((s) => ({ ...s, voiceType: v.value }))}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                    styleConfig.voiceType === v.value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {v.label}
                </button>))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Tom</Label>
            <select value={styleConfig.tone} onChange={(e) => setStyleConfig((s) => ({ ...s, tone: e.target.value }))}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#EE4D2D]/30">
              {TONE_OPTIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          <ToggleOption icon={Subtitles} label="Com textos na tela" active={styleConfig.hasText}
            onChange={() => setStyleConfig((s) => ({ ...s, hasText: !s.hasText }))} />
          <ToggleOption icon={Music} label="Com música de fundo" active={styleConfig.hasMusic}
            onChange={() => setStyleConfig((s) => ({ ...s, hasMusic: !s.hasMusic }))} />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 5 — Content Generation
     ═══════════════════════════════════════════════════════════ */
  function Step5Generation() {
    return (
      <div className="space-y-6">
        {/* Summary card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <h3 className="text-sm font-semibold text-foreground">Resumo da configuração</h3>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <SummaryRow label="Produto" value={productInfo.name} />
            <SummaryRow label="Estilo" value={STYLE_OPTIONS.find((s) => s.id === styleConfig.style)?.label || ""} />
            <SummaryRow label="Duração" value={styleConfig.duration} />
            <SummaryRow label="Voz" value={VOICE_OPTIONS.find((v) => v.value === styleConfig.voiceType)?.label || ""} />
            <SummaryRow label="Tom" value={TONE_OPTIONS.find((t) => t.value === styleConfig.tone)?.label || ""} />
            <SummaryRow label="Extras" value={[styleConfig.hasText && "Textos na tela", styleConfig.hasMusic && "Música de fundo"].filter(Boolean).join(", ") || "Nenhum"} />
          </div>
        </div>

        {/* Generate button */}
        {!generating && !genError && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF8F5]">
              <Wand2 className="h-8 w-8 text-[#EE4D2D]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">Pronto para gerar!</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              A IA vai criar o roteiro completo do vídeo com base no produto e estilo escolhido.
            </p>
            <Button onClick={handleGenerate}
              className="mt-5 h-12 rounded-xl bg-[#EE4D2D] px-8 text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
              <Wand2 className="mr-2 h-4 w-4" /> Gerar conteúdo
            </Button>
          </div>
        )}

        {/* Generating state */}
        {generating && (
          <div className="space-y-4 rounded-2xl border border-[#EE4D2D]/20 bg-white p-8 shadow-sm shadow-[#EE4D2D]/10">
            <div className="flex flex-col items-center">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#EE4D2D]/20" />
                <div className="absolute inset-0 animate-pulse rounded-full bg-[#EE4D2D]/10" />
                <Wand2 className="relative z-10 h-8 w-8 text-[#EE4D2D] animate-pulse" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Gerando conteúdo com IA...</h3>
              <div className="mt-4 w-full max-w-xs space-y-2">
                {GENERATION_STEPS.map((msg, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-medium transition-all duration-500 ${
                    i <= genStep ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-400"}`}>
                    {i < genStep ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                    : i === genStep ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#EE4D2D]" />
                    : <span className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                    {msg}
                  </div>))}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {genError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700">{genError}</p>
            <Button onClick={handleGenerate} variant="outline"
              className="mt-3 h-10 rounded-xl border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50">
              <RotateCw className="mr-1.5 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 6 — Review & Edit
     ═══════════════════════════════════════════════════════════ */
  function Step6Review() {
    return (
      <div className="space-y-6">
        {/* Regenerate buttons */}
        <div className="flex flex-wrap gap-2">
          <RegenButton icon={RotateCw} label="Gerar outra versão" onClick={() => handleRegenerate()} />
          <RegenButton icon={Zap} label="Versão mais curta" onClick={() => handleRegenerate("curta")} />
          <RegenButton icon={Trophy} label="Versão mais comercial" onClick={() => handleRegenerate("comercial")} />
          <RegenButton icon={Camera} label="Versão mais natural" onClick={() => handleRegenerate("natural")} />
        </div>

        {generating && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#EE4D2D]/20 bg-white py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#EE4D2D]" />
            <span className="text-sm font-medium text-[#EE4D2D]">Gerando nova versão...</span>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <EditableField label="Título da ideia" value={generatedContent.idea_title}
            onChange={(v) => updateGenerated("idea_title", v)} />
          <EditableField label="Hook (abertura)" value={generatedContent.hook}
            onChange={(v) => updateGenerated("hook", v)} />
          <EditableField label="Roteiro (3 cenas)" value={generatedContent.script}
            onChange={(v) => updateGenerated("script", v)} rows={6} />
          <EditableField label="Locução / Narração" value={generatedContent.voiceover}
            onChange={(v) => updateGenerated("voiceover", v)} rows={3} />
          <EditableField label="Textos na tela" value={generatedContent.screen_texts}
            onChange={(v) => updateGenerated("screen_texts", v)} rows={3} />
          <EditableField label="Chamada para ação (CTA)" value={generatedContent.cta}
            onChange={(v) => updateGenerated("cta", v)} />
          <EditableField label="Legenda" value={generatedContent.caption}
            onChange={(v) => updateGenerated("caption", v)} rows={2} />
          <EditableField label="Hashtags" value={generatedContent.hashtags}
            onChange={(v) => updateGenerated("hashtags", v)} />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 7 — Open in Gemini
     ═══════════════════════════════════════════════════════════ */
  function Step7Gemini() {
    return (
      <div className="space-y-6">
        {/* Instructions card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8F5]">
              <Monitor className="h-5 w-5 text-[#EE4D2D]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Como usar no Gemini</h3>
              <p className="text-xs text-muted-foreground">Siga os passos para gerar seu vídeo</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {[
              { step: 1, text: "Envie a imagem do produto", icon: Image },
              { step: 2, text: "Cole o prompt abaixo", icon: ClipboardIcon },
              { step: 3, text: "Selecione geração de vídeo", icon: Play },
              { step: 4, text: "Baixe o resultado", icon: DownloadIcon },
            ].map(({ step, text, icon: Icon }) => (
              <div key={step} className="flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EE4D2D] text-[11px] font-bold text-white">{step}</div>
                <div className="min-w-0">
                  <Icon className="mb-0.5 h-3.5 w-3.5 text-[#EE4D2D]" />
                  <p className="text-[11px] font-medium text-gray-600 leading-tight">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prompt code block */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06] overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-3">
            <span className="text-xs font-semibold text-gray-500">Prompt final para o Gemini</span>
            <span className="text-[10px] text-muted-foreground">{generatedContent.final_prompt.length} caracteres</span>
          </div>
          <div className="p-5">
            <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 font-mono select-all bg-gray-50 rounded-xl p-4 max-h-80 overflow-y-auto">
              {generatedContent.final_prompt}
            </pre>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleCopyAndOpen}
            className="h-12 flex-1 rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
            <Copy className="mr-2 h-4 w-4" /> Copiar prompt e abrir Gemini
          </Button>
          <Button variant="outline" onClick={async () => {
            await navigator.clipboard.writeText(generatedContent.final_prompt);
            toast.success("Prompt copiado para a área de transferência!");
          }}
            className="h-12 rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
            <Copy className="mr-2 h-4 w-4" /> Apenas copiar
          </Button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <DashboardShell title="Vídeo IA"
      subtitle="Crie vídeos profissionais para seus produtos com inteligência artificial. Siga os 7 passos abaixo.">
      <div className="mx-auto w-full max-w-4xl">
        {/* Stepper card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <StepIndicator />
        </div>

        <div className="mt-6">
          {/* Step title */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8F5]">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return <Icon className="h-5 w-5 text-[#EE4D2D]" />;
              })()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Etapa {currentStep}: {STEPS[currentStep - 1].label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {["Escolha o produto que será o tema do vídeo",
                  "Envie imagens de qualidade para o vídeo",
                  "Preencha as informações detalhadas do produto",
                  "Configure o estilo e formato do vídeo",
                  "Gere o roteiro com inteligência artificial",
                  "Revise e edite o conteúdo gerado",
                  "Copie o prompt e abra no Google Gemini",
                ][currentStep - 1]}
              </p>
            </div>
          </div>

          {/* Step body */}
          <div className="min-h-[300px]">
            {currentStep === 1 && <Step1SelectProduct />}
            {currentStep === 2 && <Step2UploadImages />}
            {currentStep === 3 && <Step3ProductInfo />}
            {currentStep === 4 && <Step4Style />}
            {currentStep === 5 && <Step5Generation />}
            {currentStep === 6 && <Step6Review />}
            {currentStep === 7 && <Step7Gemini />}
          </div>

          {/* Navigation buttons */}
          {currentStep !== 5 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={handleBack}
                disabled={currentStep === 1 || submitting || generating}
                className="h-11 rounded-xl border-gray-200 bg-white px-5 text-sm font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D] disabled:opacity-40">
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>

              {continueLabel[currentStep] && (
                <div className="flex flex-col items-end gap-1">
                  <Button type="button" onClick={currentStep === 4 ? handleGenerate : handleContinue}
                    disabled={!canContinue[currentStep] || submitting || generating}
                    className="h-11 min-w-[140px] rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98] disabled:opacity-40">
                    {submitting || generating ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processando...</span>
                    ) : (
                      <span className="flex items-center gap-2">{continueLabel[currentStep]}<ArrowRight className="h-4 w-4" /></span>
                    )}
                  </Button>
                  {currentStep === 2 && !step2Valid && (
                    <span className="text-[11px] text-muted-foreground">Envie pelo menos uma imagem para continuar</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5 has its own back button during generation/error */}
          {currentStep === 5 && !generating && (
            <div className="mt-8">
              <Button type="button" variant="outline" onClick={handleBack}
                disabled={generating}
                className="h-11 rounded-xl border-gray-200 bg-white px-5 text-sm font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
                <ChevronLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

/* ═════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function Field({ label, required, optional, children }: {
  label: string; required?: boolean; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}{" "}
        {required && <span className="text-[#EE4D2D]">*</span>}
        {optional && <span className="text-muted-foreground font-normal">(opcional)</span>}
      </Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-lg bg-gray-50 px-3 py-1.5">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="max-w-[180px] truncate text-right text-foreground">{value || "—"}</span>
    </div>
  );
}

function ToggleOption({ icon: Icon, label, active, onChange }: {
  icon: typeof Subtitles; label: string; active: boolean; onChange: () => void;
}) {
  return (
    <button type="button" onClick={onChange}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${
        active ? "border-[#EE4D2D] bg-[#FFF8F5] text-[#EE4D2D]" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function RegenButton({ icon: Icon, label, onClick }: { icon: typeof RotateCw; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function EditableField({ label, value, onChange, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="resize-y rounded-lg border-gray-200 bg-white px-4 py-2.5 text-sm focus-visible:ring-[#EE4D2D]/30" />
    </div>
  );
}

function ImageUploadSlot({ image, onSelect, onRemove, large = false, dragOver = false,
  onDragOver, onDragLeave, onDrop,
}: {
  image: ImageSlot; onSelect: (file: File) => void; onRemove: () => void; large?: boolean;
  dragOver?: boolean;
  onDragOver?: (e: DragEvent) => void; onDragLeave?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = !!(image.preview || image.storagePath);
  const heightClass = large ? "h-48 sm:h-56" : "h-32 sm:h-36";

  return (
    <div onClick={() => { if (!hasImage && !image.uploading) inputRef.current?.click(); }}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`group relative ${heightClass} cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
        hasImage ? "border-solid border-emerald-300"
        : image.uploading ? "border-dashed border-[#EE4D2D]/50"
        : dragOver ? "border-dashed border-[#EE4D2D] bg-[#FFF8F5]"
        : "border-dotted border-gray-300 bg-gray-50/80 hover:border-[#EE4D2D]/40 hover:bg-[#FFF8F5]/50"}`}>
      {image.uploading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90">
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#EE4D2D]" />
          <span className="text-xs font-medium text-[#EE4D2D]">Enviando...</span>
        </div>)}
      {hasImage ? (<>
        <img src={image.preview || ""} alt="Preview" className="h-full w-full object-cover" />
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
        {image.storagePath && (
          <div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30">
            <Check className="h-3 w-3 text-white" />
          </div>)}
      </>) : (
        <div className="flex h-full flex-col items-center justify-center px-3 text-center">
          <div className={`mb-1.5 flex items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-[#EE4D2D]/10 ${large ? "h-12 w-12" : "h-8 w-8"}`}>
            <Upload className={`${large ? "h-5 w-5" : "h-3.5 w-3.5"} text-gray-400 transition-colors group-hover:text-[#EE4D2D]/60`} />
          </div>
          <span className={`${large ? "text-xs" : "text-[11px]"} font-medium text-gray-400`}>
            {large ? "Clique ou arraste a imagem principal" : "Adicionar imagem"}
          </span>
          <span className="mt-0.5 text-[10px] text-gray-300">JPG, PNG ou WEBP</span>
        </div>)}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) onSelect(file); e.target.value = ""; }} />
    </div>
  );
}

// Simple SVG icons for Step 7
function ClipboardIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>;
}
function DownloadIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
