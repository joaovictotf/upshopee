import { useCallback, useEffect, useRef, useState, memo } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import {
  Check, Sparkles, Copy, Image, Wand2, Subtitles, Play,
  Send, Star, ChevronLeft, Loader2, User, Phone,
  CreditCard, Mail, Clock, ArrowRight, AtSign,
} from "lucide-react";

// ── Types (mirrored from dashboard.video-ia.tsx) ────────────

export type ProductInfo = {
  name: string; url: string; description: string;
  category: string; benefits: string; targetAudience: string;
  differentiators: string; problemSolved: string;
};

export type StyleConfig = {
  style: string; duration: string;
  voiceType: string; tone: string; hasText: boolean; hasMusic: boolean;
};

export type GeneratedContent = {
  idea_title: string; hook: string; script: string;
  voiceover: string; screen_texts: string;
  cta: string; caption: string; hashtags: string; final_prompt: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

interface Step7GeminiChatProps {
  productInfo: ProductInfo;
  styleConfig: StyleConfig;
  generatedContent: GeneratedContent;
  projectId: string | null;
  handleBack: () => void;
  handleCopyFinalPrompt: () => void;
}

// ── Props equality comparator (prevents re-renders on parent re-renders) ──

function arePropsEqual(prev: Step7GeminiChatProps, next: Step7GeminiChatProps): boolean {
  return (
    prev.projectId === next.projectId &&
    prev.handleBack === next.handleBack &&
    prev.handleCopyFinalPrompt === next.handleCopyFinalPrompt &&
    JSON.stringify(prev.productInfo) === JSON.stringify(next.productInfo) &&
    JSON.stringify(prev.styleConfig) === JSON.stringify(next.styleConfig) &&
    JSON.stringify(prev.generatedContent) === JSON.stringify(next.generatedContent)
  );
}

// ── LocalStorage helpers ──

const REGISTERED_KEY = "upshopee_video_registered";
const QUEUE_NUMBER_KEY = "upshopee_queue_number";
const QUEUE_LAST_UPDATE_KEY = "upshopee_queue_last_update";
const REG_FORM_DATA_KEY = "upshopee_reg_form_data";

function getRegistered(): boolean {
  try { return localStorage.getItem(REGISTERED_KEY) === "1"; } catch { return false; }
}
function setRegistered() {
  try { localStorage.setItem(REGISTERED_KEY, "1"); } catch {}
}

function getQueueNumber(): number {
  try {
    const raw = localStorage.getItem(QUEUE_NUMBER_KEY);
    if (raw === null) return -1; // not set
    return parseInt(raw, 10);
  } catch { return -1; }
}
function getQueueLastUpdate(): number {
  try {
    const raw = localStorage.getItem(QUEUE_LAST_UPDATE_KEY);
    if (raw === null) return 0;
    return parseInt(raw, 10);
  } catch { return 0; }
}
function setQueueState(number: number, lastUpdate: number) {
  try {
    localStorage.setItem(QUEUE_NUMBER_KEY, String(number));
    localStorage.setItem(QUEUE_LAST_UPDATE_KEY, String(lastUpdate));
  } catch {}
}

// ── Compute current queue number accounting for elapsed 2h intervals ──

function computeQueueNumber(storedNumber: number, storedLastUpdate: number): number {
  if (storedNumber <= 0) return 0;
  const now = Date.now();
  const elapsed = now - storedLastUpdate;
  const intervalsPassed = Math.floor(elapsed / (2 * 60 * 60 * 1000)); // 2 hours in ms
  const newNumber = Math.max(0, storedNumber - intervalsPassed);
  const newLastUpdate = storedLastUpdate + intervalsPassed * (2 * 60 * 60 * 1000);
  setQueueState(newNumber, newLastUpdate);
  return newNumber;
}

// ── CSS for animations ──

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes vi-bounce-in {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .vi-bounce-in { animation: vi-bounce-in 0.5s ease-out both; }
  @keyframes ad-msg-enter {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ad-msg-enter { animation: ad-msg-enter 0.3s ease-out both; }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(238,77,45,0.4); }
    50% { box-shadow: 0 0 0 12px rgba(238,77,45,0); }
  }
  .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
}
@media (prefers-reduced-motion: reduce) {
  .vi-bounce-in, .ad-msg-enter, .pulse-glow { animation: none; }
}
`;

// ═══════════════════════════════════════════════════════════════
// Registration Form (Phase 1)
// ═══════════════════════════════════════════════════════════════

const GOOGLE_SHEETS_URL = "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/send-registration";

type RegFormData = {
  nome: string;
  cpf: string;
  celular: string;
  tiktok: string;
  email: string;
};

type RegPhase = "loading" | "form" | "submitting" | "queue";

function RegistrationGate({
  productInfo,
  onUnlocked,
}: {
  productInfo: ProductInfo;
  onUnlocked: () => void;
}) {
  // Try to load saved form data so user doesn't lose work on refresh
  const savedForm = useRef<RegFormData | null>(null);
  try {
    const raw = localStorage.getItem(REG_FORM_DATA_KEY);
    if (raw) savedForm.current = JSON.parse(raw);
  } catch {}

  const [phase, setPhase] = useState<RegPhase>(() => {
    // If already registered, skip to queue check
    if (getRegistered()) return "queue";
    return "form";
  });

  const [form, setForm] = useState<RegFormData>(() => ({
    nome: savedForm.current?.nome ?? "",
    cpf: savedForm.current?.cpf ?? "",
    celular: savedForm.current?.celular ?? "",
    tiktok: savedForm.current?.tiktok ?? "",
    email: savedForm.current?.email ?? "",
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof RegFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [queueNumber, setQueueNumber] = useState<number>(() => {
    const stored = getQueueNumber();
    if (stored >= 0) {
      const lastUpdate = getQueueLastUpdate();
      return computeQueueNumber(stored, lastUpdate);
    }
    return 0;
  });

  // ── Queue timer: decrease by 1 every 2 hours ──
  const queueIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "queue" || queueNumber <= 0) return;
    const tick = () => {
      setQueueNumber((prev) => {
        const next = Math.max(0, prev - 1);
        setQueueState(next, Date.now());
        return next;
      });
    };
    queueIntervalRef.current = setInterval(tick, 2 * 60 * 60 * 1000); // 2h
    return () => {
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    };
  }, [phase, queueNumber]);

  // ── Auto-unlock when queue hits 0 ──
  useEffect(() => {
    if (phase === "queue" && queueNumber <= 0 && getRegistered()) {
      onUnlocked();
    }
  }, [phase, queueNumber, onUnlocked]);

  // ── Validate form ──
  const validate = (): boolean => {
    const errs: Partial<Record<keyof RegFormData, string>> = {};
    if (!form.nome.trim()) errs.nome = "Nome completo é obrigatório";
    if (!form.cpf.trim()) errs.cpf = "CPF é obrigatório";
    else if (!/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(form.cpf.replace(/\s/g, "").replace(/\.|-/g, "").padStart(11, "0")))
      errs.cpf = "CPF inválido";
    if (!form.celular.trim()) errs.celular = "Celular é obrigatório";
    if (!form.tiktok.trim()) errs.tiktok = "TikTok é obrigatório";
    if (!form.email.trim()) errs.email = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Email inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit form ──
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    // Save form data before sending
    try { localStorage.setItem(REG_FORM_DATA_KEY, JSON.stringify(form)); } catch {}

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          cpf: form.cpf,
          celular: form.celular,
          tiktok: form.tiktok,
          email: form.email,
          produto: productInfo.name,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Erro ${res.status} ao enviar cadastro`);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Erro ao processar cadastro");
      }
    } catch (err: any) {
      setSubmitting(false);
      const msg = err?.name === "AbortError"
        ? "Tempo esgotado. Verifique sua conexão e tente novamente."
        : err?.message || "Erro ao enviar cadastro. Verifique sua conexão.";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    // Generate random queue number 13-19
    const q = Math.floor(Math.random() * 7) + 13;
    setQueueNumber(q);
    setQueueState(q, Date.now());
    setRegistered();
    setSubmitting(false);
    setPhase("queue");
    // Clear saved form data
    try { localStorage.removeItem(REG_FORM_DATA_KEY); } catch {}

    toast.success("Cadastro enviado com sucesso!");
  };

  // ── Update form field ──
  const updateField = (field: keyof RegFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // ═══════════════════════════════════════════════════════════
  // PHASE 2 — Queue waiting
  // ═══════════════════════════════════════════════════════════

  if (phase === "queue") {
    return (
      <div className="flex flex-col items-center space-y-6 pb-20">
        {/* Success checkmark */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30 vi-bounce-in">
          <Check className="h-12 w-12 text-white" />
        </div>

        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold text-[var(--text)]">
            Cadastro enviado com sucesso!
          </h3>
          <p className="text-[var(--muted)] max-w-sm">
            Seu acesso ao criador de vídeos será liberado automaticamente
          </p>
        </div>

        {/* Queue position card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center w-full max-w-sm pulse-glow">
          <p className="text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
            Sua posição na fila
          </p>
          <p className="mt-1 text-5xl font-black text-[var(--accent)]">
            Nº {queueNumber}
          </p>
          <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
            ⏳ Tempo de espera aproximado: 12 horas
          </p>
          <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
            A liberação acontece automaticamente.<br />
            Aguarde alguns instantes...
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
            <Clock className="h-3.5 w-3.5" />
            <span>Atualiza a cada 2 horas</span>
          </div>
        </div>

        {queueNumber <= 0 && (
          <Button
            onClick={onUnlocked}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#EE4D2D] to-[#FF6B3D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98] transition-all duration-300"
          >
            Liberado! <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 1 — Registration form
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col space-y-5">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10 vi-bounce-in">
          <Sparkles className="h-7 w-7 text-[var(--accent)]" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text)]">
          Quase lá! Preencha seus dados para liberar o acesso
        </h3>
        <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
          Seus dados são enviados com segurança e usados apenas para validação
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm shadow-black/[0.02]">
        <div className="space-y-4">
          {/* Nome completo */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-[var(--muted)]" />
              Nome completo
            </label>
            <Input
              value={form.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              placeholder="Seu nome completo"
              disabled={submitting}
              className={`h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)]/60 ${errors.nome ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
              autoComplete="name"
            />
            {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
          </div>

          {/* CPF */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-[var(--muted)]" />
              CPF
            </label>
            <Input
              value={form.cpf}
              onChange={(e) => updateField("cpf", e.target.value)}
              placeholder="000.000.000-00"
              disabled={submitting}
              className={`h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)]/60 ${errors.cpf ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
              autoComplete="off"
            />
            {errors.cpf && <p className="text-xs text-red-500">{errors.cpf}</p>}
          </div>

          {/* Celular com DDD */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-[var(--muted)]" />
              Celular com DDD
            </label>
            <Input
              value={form.celular}
              onChange={(e) => updateField("celular", e.target.value)}
              placeholder="(34) 99999-9999"
              disabled={submitting}
              className={`h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)]/60 ${errors.celular ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
              autoComplete="tel"
            />
            {errors.celular && <p className="text-xs text-red-500">{errors.celular}</p>}
          </div>

          {/* TikTok */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
              <AtSign className="h-3.5 w-3.5 text-[var(--muted)]" />
              Seu @ do TikTok
            </label>
            <Input
              value={form.tiktok}
              onChange={(e) => updateField("tiktok", e.target.value)}
              placeholder="@seuuser"
              disabled={submitting}
              className={`h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)]/60 ${errors.tiktok ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
              autoComplete="off"
            />
            {errors.tiktok && <p className="text-xs text-red-500">{errors.tiktok}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-[var(--muted)]" />
              Email
            </label>
            <Input
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="seu@email.com"
              disabled={submitting}
              type="email"
              className={`h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)]/60 ${errors.email ? "border-red-400 ring-1 ring-red-400/30" : ""}`}
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            <span>{submitError}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 rounded-lg text-xs text-red-600 hover:bg-red-100"
              onClick={handleSubmit}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-[#EE4D2D] to-[#FF6B3D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98] transition-all duration-300 disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Enviar cadastro
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        <p className="mt-3 text-center text-[11px] text-[var(--muted)]/60">
          Ao enviar, você concorda com o uso dos seus dados para validação de acesso.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

function Step7GeminiChat({
  productInfo,
  styleConfig,
  generatedContent,
  projectId,
  handleBack,
  handleCopyFinalPrompt,
}: Step7GeminiChatProps) {
  // ── Registration gate state ──
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!getRegistered()) return false;
    const stored = getQueueNumber();
    if (stored < 0) return false;
    const lastUpdate = getQueueLastUpdate();
    const q = computeQueueNumber(stored, lastUpdate);
    return q <= 0;
  });

  const handleUnlocked = useCallback(() => {
    localStorage.removeItem(QUEUE_NUMBER_KEY);
    localStorage.removeItem(QUEUE_LAST_UPDATE_KEY);
    setUnlocked(true);
  }, []);

  // ── Inject animation CSS once ──
  useEffect(() => {
    const styleId = "step7-gemini-anim";
    if (document.getElementById(styleId)) return;
    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = ANIM_CSS;
    document.head.appendChild(el);
  }, []);

  // ── If not unlocked, show registration gate ──
  if (!unlocked) {
    return (
      <>
        <style>{ANIM_CSS}</style>
        <RegistrationGate productInfo={productInfo} onUnlocked={handleUnlocked} />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3 — Gemini Chat (existing functionality, unchanged)
  // ═══════════════════════════════════════════════════════════

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Seu roteiro está pronto! 🎬\n\n**${generatedContent.idea_title}**\n\nPosso ajustar qualquer coisa:\n• "Deixa o tom mais urgente"\n• "Faz uma versão mais curta"\n• "Muda a cena 2"\n• "Adiciona mais emoção"\n• "Quero estilo UGC"\n\nOu qualquer outra modificação! O que você gostaria de mudar?`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(30);

  // ── Cleanup interval on unmount ──
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Auto-scroll + auto-focus ──
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { if (!redirecting) inputRef.current?.focus(); }, [redirecting]);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/generate-video-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          product: { name: productInfo.name, description: productInfo.description, benefits: productInfo.benefits, targetAudience: productInfo.targetAudience, differentiators: productInfo.differentiators, problemSolved: productInfo.problemSolved },
          style: styleConfig,
          currentContent: generatedContent,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erro ao comunicar com o assistente");
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: err?.name === "AbortError" ? "⏰ O assistente demorou muito para responder. Tente novamente." : "❌ Erro ao comunicar com o assistente. Verifique sua conexão." }]);
    } finally { setChatLoading(false); }
  }, [chatInput, chatLoading, chatMessages, productInfo, styleConfig, generatedContent]);

  // ── Keyboard handler ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  // ── Open Gemini with countdown (uses refs for interval safety) ──
  const handleOpenGemini = useCallback(() => {
    navigator.clipboard.writeText(generatedContent.final_prompt);
    toast.success("Prompt copiado! Você será redirecionado em 30 segundos...");

    if (projectId) {
      (supabase.from as any)("video_projects")
        .update({ status: "opened_in_gemini", updated_at: new Date().toISOString() })
        .eq("id", projectId);
    }

    setRedirecting(true);
    setCountdown(30);
    countdownRef.current = 30;

    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      countdownRef.current--;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
      }
    }, 1000);
  }, [generatedContent.final_prompt, projectId]);

  // ── Open Gemini immediately ──
  const handleOpenGeminiNow = useCallback(() => {
    navigator.clipboard.writeText(generatedContent.final_prompt);

    if (projectId) {
      (supabase.from as any)("video_projects")
        .update({ status: "opened_in_gemini", updated_at: new Date().toISOString() })
        .eq("id", projectId);
    }

    // Clear interval if running
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    setRedirecting(true);
    setCountdown(null);
  }, [generatedContent.final_prompt, projectId]);

  // ── Redirecting state ──
  if (redirecting) {
    return (
      <div className="space-y-5">
        <div className="relative flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center overflow-hidden">
          {/* Particle burst */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => {
              const angles = [45, 90, 135, 180, 225, 270, 315, 30, 150, 300];
              const colors = ["#EE4D2D", "#10B981", "#F59E0B", "#EC4899", "#3B82F6", "#EE4D2D", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"];
              const a = angles[i] * Math.PI / 180;
              const r = 60 + Math.random() * 40;
              return (
                <span key={i} className="vi-particle absolute top-1/2 left-1/2 h-2 w-2 rounded-full"
                  style={{ '--tx': `${Math.cos(a) * r}px`, '--ty': `${Math.sin(a) * r}px`, backgroundColor: colors[i], animationDelay: `${i * 0.05}s` } as React.CSSProperties} />
              );
            })}
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30 vi-bounce-in">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-emerald-800">Prompt copiado e pronto!</h3>
          {countdown !== null && (
            <p className="mt-1 text-sm text-emerald-600">Redirecionando para o Gemini em <span className="font-bold text-emerald-800 text-xl">{countdown}s</span>...</p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground"><Sparkles className="h-4 w-4 text-[#EE4D2D]" /> Como gerar seu vídeo no Gemini</h4>
          <div className="mt-4 space-y-3">
            {[
              { step: 1, icon: Copy, text: "O prompt em inglês já foi copiado automaticamente", done: true },
              { step: 2, icon: Image, text: "No Gemini, envie a imagem do seu produto", done: false },
              { step: 3, icon: Wand2, text: "Cole o prompt copiado no chat do Gemini", done: false },
              { step: 4, icon: Subtitles, text: "Selecione 9:16 (formato vertical) no Gemini", done: false },
              { step: 5, icon: Play, text: "Gere o vídeo e baixe o resultado!", done: false },
            ].map(({ step, icon: Icon, text, done }) => (
              <div key={step} className={`flex items-start gap-3 transition-all duration-300 ${done ? "" : "border-l-2 border-l-gray-200 pl-3"}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : step}
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleOpenGeminiNow}
            className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-[#EE4D2D] to-[#FF6B3D] text-base font-semibold text-white shadow-lg shadow-[#EE4D2D]/25 hover:shadow-xl hover:shadow-[#EE4D2D]/35 active:scale-[0.98] relative overflow-hidden">
            <span className="absolute inset-0 rounded-2xl animate-ping bg-[#EE4D2D]/10" style={{ animationDuration: "3s" }} />
            <Star className="mr-2 h-5 w-5 relative z-10" /> <span className="relative z-10">Abrir Gemini agora</span>
          </Button>
          <Button onClick={handleBack} variant="ghost"
            className="h-12 rounded-xl text-sm font-medium text-gray-500 hover:text-[#EE4D2D]">
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar e editar
          </Button>
        </div>
      </div>
    );
  }

  // ── Normal chat state ──
  return (
    <div className="flex flex-col max-h-[calc(100dvh-200px)] min-h-[300px]">
      {/* Success header */}
      <div className="flex-shrink-0 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30 vi-bounce-in">
          <Check className="h-8 w-8 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-emerald-800">Roteiro criado com sucesso!</h3>
          <p className="text-sm text-emerald-600 truncate">{generatedContent.idea_title}</p>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-[#F8F8F8] p-4 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06] mb-3">
        <div className="space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`vi-step-enter flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${Math.min(i * 80, 400)}ms`, animationDuration: "0.25s" }}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-gradient-to-r from-[#EE4D2D] to-[#FF6B3D] text-white rounded-br-md shadow-sm shadow-[#EE4D2D]/15" : "bg-white text-gray-700 rounded-bl-md shadow-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#EE4D2D]" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#EE4D2D]" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#EE4D2D]" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 rounded-2xl shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06] mb-3 focus-within:shadow-md focus-within:shadow-[#EE4D2D]/10">
        <div className="flex items-end gap-2 p-3">
          <textarea ref={inputRef} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Peça ajustes no roteiro..." rows={2} disabled={chatLoading}
            className="flex-1 resize-none rounded-2xl border-0 bg-gray-50 px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#EE4D2D]/20 disabled:opacity-50" />
          <Button type="button" onClick={handleSendMessage} disabled={!chatInput.trim() || chatLoading}
            className="h-11 w-11 shrink-0 rounded-2xl bg-[#EE4D2D] p-0 text-white shadow-sm shadow-[#EE4D2D]/25 hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.97] disabled:opacity-40">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="pb-2 text-[10px] text-muted-foreground text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex flex-col gap-2 sm:flex-row mb-3 pb-6 sm:pb-0">
        <Button onClick={handleCopyFinalPrompt} variant="outline"
          className="h-12 flex-1 rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D] transition-all duration-300">
          <Copy className="mr-2 h-4 w-4" /> Copiar prompt
        </Button>
        <Button onClick={handleOpenGemini}
          className="h-12 flex-1 rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 hover:bg-[#EE4D2D]/90 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98] transition-all duration-300">
          <Star className="mr-2 h-4 w-4" /> Gerar vídeo no Gemini
        </Button>
      </div>

      {/* Instructions card — warm tone */}
      <div className="flex-shrink-0 rounded-2xl border border-[#EE4D2D]/10 bg-[#FFF8F5] p-4">
        <h4 className="flex items-center gap-2 text-xs font-bold text-[#EE4D2D]"><Sparkles className="h-3.5 w-3.5" /> Como gerar seu vídeo</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Clique em Gerar vídeo no Gemini", "Envie a imagem do produto", "Cole o prompt copiado", "Selecione 9:16 (vertical)", "Gere e baixe o vídeo!"].map((tip, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EE4D2D]/10 text-xs font-bold text-[#EE4D2D]">{i + 1}</span>
              <span className="text-[11px] leading-tight text-gray-600">{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Step7GeminiChat, arePropsEqual);
