import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import {
  Bot, MessageCircle, Users, Play, Square,
  Wifi, Check, Link2, Radio, Send, Loader2,
  Package, Megaphone, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { generateDivulgationText, type DivulgationTone } from "../lib/mock/divulgation-templates";

export const Route = createFileRoute("/dashboard/robo-divulgador")({ component: RoboDivulgador });

// ─── Constants ────────────────────────────────────────────────────────────────
const CREDITS_KEY = (email: string) => `shopesync.ia-divulgadora.credits.${email}`;
const LASTRESET_KEY = (email: string) => `shopesync.ia-divulgadora.credits.lastreset.${email}`;
const INITIAL_CREDITS = 10000;
const POST_CREDIT_COST_MIN = 1;
const POST_CREDIT_COST_MAX = 3;
const MSG_INTERVAL_MIN = 4000;
const MSG_INTERVAL_MAX = 9000;

type Channel = "whatsapp" | "contacts" | "facebook" | "instagram" | "telegram";

const CHANNEL_CONFIG: Array<{
  id: Channel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  messages: string[];
}> = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-600",
    messages: [
      "Divulgando no Grupo Ofertas SP 🔥",
      "Postando em 12 grupos de WhatsApp...",
      "Compartilhando link no Grupo Shopee Brasil",
      "Enviando para Grupo Achadinhos do Dia",
      "Alcançando 320 membros no grupo Promoções",
      "Divulgando em 8 grupos ativos...",
      "Link enviado para Grupo Compras Online BR",
    ],
  },
  {
    id: "contacts",
    label: "Contatos",
    icon: Users,
    color: "text-blue-600",
    messages: [
      "Enviando link para lista de contatos...",
      "Link enviado para 47 contatos ✓",
      "Alcançando contatos próximos...",
      "Divulgando para 120 contatos ativos",
      "Enviando oferta para contatos favoritos",
      "Notificando contatos sobre novo produto",
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Wifi,
    color: "text-indigo-600",
    messages: [
      "Postando em grupos do Facebook...",
      "Compartilhando em 8 grupos ativos",
      "Divulgando no Grupo Compras e Ofertas",
      "Postando em Marketplace Facebook",
      "Alcançando 2.400 membros no grupo",
      "Divulgando para 5 grupos de promoções",
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Send,
    color: "text-pink-600",
    messages: [
      "Enviando link via Instagram Direct...",
      "Compartilhando nos Stories Close Friends",
      "Enviando para seguidores engajados",
      "Link enviado para 85 contatos do Instagram",
      "Divulgando no Direct de seguidores ativos",
    ],
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: Send,
    color: "text-sky-600",
    messages: [
      "Postando em canais do Telegram...",
      "Link enviado para 6 canais ativos",
      "Divulgando no Canal Ofertas BR",
      "Alcançando 1.800 membros nos canais",
      "Compartilhando em 4 grupos Telegram",
      "Postando no Canal Achadinhos Diários",
    ],
  },
];

type LogEntry = { id: string; ts: number; type: "activity"; msg: string; channel: Channel };

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function saoPauloToday(): string {
  const sp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, "0");
  const d = String(sp.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function relativeTime(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 10) return "agora";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

const TONE_OPTIONS: { value: DivulgationTone; label: string }[] = [
  { value: "curioso", label: "🤔 Curioso" },
  { value: "entusiasmado", label: "🎉 Entusiasmado" },
  { value: "profissional", label: "💼 Profissional" },
  { value: "urgente", label: "⏰ Urgente" },
  { value: "emocional", label: "💝 Emocional" },
  { value: "simples", label: "💬 Simples" },
  { value: "exclusivo", label: "👑 Exclusivo" },
  { value: "desejo", label: "💫 Desejo" },
];

type ViewProps = {
  active: boolean;
  affiliateLink: string;
  setAffiliateLink: (v: string) => void;
  channels: Channel[];
  currentMsg: { text: string; channel: Channel } | null;
  currentConf: (typeof CHANNEL_CONFIG)[number] | null | undefined;
  log: LogEntry[];
  postsToday: number;
  creditsSpent: number;
  credits: number;
  creditPct: number;
  groupsReached: number;
  productName: string;
  setProductName: (v: string) => void;
  divulgationTone: DivulgationTone;
  setDivulgationTone: (v: DivulgationTone) => void;
  generatedText: string;
  setGeneratedText: (v: string) => void;
  isGenerating: boolean;
  genStep: number;
  handleGenerateText: () => void;
  handleStart: () => void;
  handleStop: () => void;
  toggleChannel: (ch: Channel) => void;
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

function RoboDivulgador() {
  const { user } = useApp();
  const email = user?.email ?? "";

  // ── Credits ──
  const [credits, setCredits] = useState<number>(() => {
    if (!email) return INITIAL_CREDITS;
    try { const raw = localStorage.getItem(CREDITS_KEY(email)); if (raw !== null) return Math.max(0, Number(raw) || 0); } catch {}
    return INITIAL_CREDITS;
  });
  useEffect(() => { if (!email) return; try { localStorage.setItem(CREDITS_KEY(email), String(credits)); } catch {} }, [credits, email]);

  const creditsRef = useRef(credits);
  useEffect(() => { creditsRef.current = credits; }, [credits]);

  // Daily credit reset
  useEffect(() => {
    if (!email) return;
    let last: string | null = null;
    try { last = localStorage.getItem(LASTRESET_KEY(email)); } catch {}
    const today = saoPauloToday();
    if (last !== today) { setCredits(INITIAL_CREDITS); try { localStorage.setItem(LASTRESET_KEY(email), today); } catch {} }
  }, [email]);

  // ── Link + product + tone + generation ──
  const [affiliateLink, setAffiliateLink] = useState("");
  const [productName, setProductName] = useState("");
  const [divulgationTone, setDivulgationTone] = useState<DivulgationTone>("curioso");
  const [generatedText, setGeneratedText] = useState("");
  const generatedTextRef = useRef("");
  useEffect(() => { generatedTextRef.current = generatedText; }, [generatedText]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  const handleGenerateText = useCallback(() => {
    if (!productName.trim()) {
      toast.error("Digite o nome do produto para gerar o texto.");
      return;
    }
    setIsGenerating(true);
    setGenStep(0);
    const stepInterval = setInterval(() => setGenStep((s) => Math.min(s + 1, 1)), 1000);
    setTimeout(() => {
      clearInterval(stepInterval);
      setGenStep(2);
      const text = generateDivulgationText(productName.trim(), divulgationTone);
      setGeneratedText(text);
      setIsGenerating(false);
      toast.success("Texto de divulgação gerado!");
    }, 2000);
  }, [productName, divulgationTone]);

  // ── Channels + activity ──
  const [active, setActive] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(["whatsapp", "contacts", "facebook", "instagram", "telegram"]);
  const [currentMsg, setCurrentMsg] = useState<{ text: string; channel: Channel } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [postsToday, setPostsToday] = useState(0);
  const [creditsSpent, setCreditsSpent] = useState(0);
  const [groupsReached, setGroupsReached] = useState(0);

  const addLog = (entry: Omit<LogEntry, "id" | "ts">) => {
    setLog((prev) => [{ ...entry, id: String(Date.now() + Math.random()), ts: Date.now() }, ...prev].slice(0, 50));
  };

  // ── Activity posting loop ──
  const msgIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!active || channels.length === 0 || creditsRef.current <= 0) { setCurrentMsg(null); return; }
    const scheduleNext = () => {
      const delay = rand(MSG_INTERVAL_MIN, MSG_INTERVAL_MAX);
      msgIntervalRef.current = setTimeout(() => {
        if (creditsRef.current <= 0) { setActive(false); toast.error("IA Divulgadora parada — créditos esgotados."); return; }
        const ch = pick(channels);
        const conf = CHANNEL_CONFIG.find((c) => c.id === ch)!;
        // Rotate between personalized text and generic channel messages
        const usePersonalized = generatedTextRef.current && Math.random() > 0.3;
        const msg = usePersonalized
          ? generatedTextRef.current.slice(0, 100) + (generatedTextRef.current.length > 100 ? "..." : "") + " 🔗"
          : pick(conf.messages);
        const cost = rand(POST_CREDIT_COST_MIN, POST_CREDIT_COST_MAX);
        setCurrentMsg({ text: msg, channel: ch });
        addLog({ type: "activity", msg, channel: ch });
        setCredits((prev) => Math.max(0, prev - cost));
        setCreditsSpent((prev) => prev + cost);
        setPostsToday((prev) => prev + 1);
        setGroupsReached((prev) => prev + rand(1, ch === "whatsapp" ? 12 : ch === "telegram" ? 6 : ch === "instagram" ? 3 : 5));
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => { if (msgIntervalRef.current) clearTimeout(msgIntervalRef.current); };
  }, [active, channels]);

  // Auto-stop if credits run out or no channels
  useEffect(() => { if (active && (channels.length === 0 || credits <= 0)) setActive(false); }, [active, channels, credits]);

  const toggleChannel = (ch: Channel) => { setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]); };

  const handleStart = () => {
    if (channels.length === 0) { toast.error("Selecione pelo menos um canal."); return; }
    if (!affiliateLink.trim()) { toast.error("Cole o link de afiliado da Shopee para continuar."); return; }
    if (!affiliateLink.includes("shopee.com.br")) { toast.error("Insira um link válido da Shopee."); return; }
    if (credits <= 0) { toast.error("Créditos esgotados. Eles renovam automaticamente à meia-noite."); return; }
    setActive(true);
    toast.success("IA Divulgadora iniciada!", {
      description: generatedText ? "Divulgando com texto personalizado." : "Divulgando link de afiliado.",
    });
  };

  const handleStop = () => { setActive(false); toast("IA Divulgadora pausada."); };

  const creditPct = Math.round((credits / INITIAL_CREDITS) * 100);
  const currentConf = currentMsg ? CHANNEL_CONFIG.find((c) => c.id === currentMsg.channel) : null;

  const viewProps: ViewProps = {
    active, affiliateLink, setAffiliateLink, channels, currentMsg, currentConf,
    log, postsToday, creditsSpent, credits, creditPct, groupsReached,
    productName, setProductName, divulgationTone, setDivulgationTone,
    generatedText, setGeneratedText, isGenerating, genStep,
    handleGenerateText, handleStart, handleStop, toggleChannel,
  };

  return <IAView {...viewProps} />;
}

// ═══════════════════════════════════════════════════════════════════════
// IA DIVULGADORA VIEW
// ═══════════════════════════════════════════════════════════════════════

function IAView({
  active, affiliateLink, setAffiliateLink, channels, currentMsg, currentConf,
  log, postsToday, credits, creditPct, groupsReached,
  productName, setProductName, divulgationTone, setDivulgationTone,
  generatedText, setGeneratedText, isGenerating, genStep,
  handleGenerateText, handleStart, handleStop, toggleChannel,
}: ViewProps) {
  const linkValid = affiliateLink.trim().length > 0 && affiliateLink.includes("shopee.com.br");
  const canStart = linkValid && channels.length > 0 && credits > 0;

  return (
    <>
      <style>{`
        @keyframes ia-pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(238,77,45,0.3); }
          50%      { box-shadow: 0 0 0 12px rgba(238,77,45,0); }
        }
        .ia-active-start {
          animation: ia-pulse-border 2s ease-out;
        }
        @keyframes ia-dot-breathe {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        .ia-dot-live {
          animation: ia-dot-breathe 1.2s ease-in-out infinite;
        }
      `}</style>

      <DashboardShell title="IA Divulgadora" subtitle="Divulgue seus links de afiliado Shopee automaticamente em grupos e canais">
        <div className="page-enter" className={`mx-auto max-w-xl space-y-4 ${active ? "ia-active-start rounded-3xl" : ""}`}>

          {/* ═══ LINK INPUT ═══ */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-[var(--muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text)]">Link de Afiliado</h3>
            </div>
            <input
              type="url"
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="Cole o link do Shopee Afiliados..."
              disabled={active}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all focus:border-[var(--accent)]/50 focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)]/10 disabled:opacity-60"
            />
            {affiliateLink.trim().length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                {linkValid ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600">Link válido ✓</span>
                  </>
                ) : (
                  <span className="text-xs text-amber-600">Insira um link da Shopee (shopee.com.br)</span>
                )}
              </div>
            )}
          </div>

          {/* ═══ PRODUCT NAME ═══ */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-[var(--muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text)]">Nome do Produto</h3>
            </div>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Camisa Feminina Seleção Brasileira 2026"
              disabled={active}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all focus:border-[var(--accent)]/50 focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)]/10 disabled:opacity-60"
            />
          </div>

          {/* ═══ TONE SELECTOR ═══ */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-4 w-4 text-[var(--muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text)]">Tom da Divulgação</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONE_OPTIONS.map((tone) => {
                const active_tone = divulgationTone === tone.value;
                return (
                  <button
                    key={tone.value}
                    onClick={() => setDivulgationTone(tone.value)}
                    disabled={active || isGenerating}
                    className={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-medium border-2 transition-all duration-200 disabled:opacity-60 ${
                      active_tone
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border)]"
                    }`}
                  >
                    {tone.label}
                    {active_tone && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ GENERATE BUTTON / GENERATING / RESULT ═══ */}
          {isGenerating ? (
            <div className="rounded-[16px] border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-6">
              <div className="flex flex-col items-center">
                <div className="flex gap-1.5 mb-3">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-sm font-medium text-[var(--text)] mb-4">
                  {genStep === 0 ? "Gerando texto de divulgação..." : "Gerando imagem para divulgação..."}
                </p>
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center gap-2.5 text-xs">
                    {genStep >= 1
                      ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)] shrink-0" />}
                    <span className={genStep >= 1 ? "text-emerald-700" : "text-[var(--text)]"}>
                      {genStep >= 1 ? "Texto gerado" : "Gerando texto..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    {genStep >= 2
                      ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300 shrink-0" />}
                    <span className={genStep >= 2 ? "text-emerald-700" : "text-[var(--muted)]"}>
                      {genStep >= 2 ? "Imagem gerada" : "Gerando imagem..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : generatedText ? (
            <div className="rounded-[16px] border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-emerald-800">Texto de divulgação pronto</h3>
              </div>
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={3}
                disabled={active}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text)] leading-relaxed resize-none outline-none transition-all focus:border-[var(--accent)]/30 focus:ring-2 focus:ring-[var(--accent)]/5 disabled:opacity-60"
              />
              <button
                onClick={() => {
                  setGeneratedText("");
                  handleGenerateText();
                }}
                disabled={active || isGenerating}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:text-[#d93e22] disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" /> Gerar outro
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateText}
              disabled={!productName.trim() || isGenerating}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--accent)]/40 bg-[var(--surface)] text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" /> Gerar texto de divulgação
            </button>
          )}

          {/* ═══ CHANNEL PILLS ═══ */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="h-4 w-4 text-[var(--muted)]" />
              <h3 className="text-sm font-semibold text-[var(--text)]">Canais de Divulgação</h3>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">Selecione onde a IA vai divulgar seu link de afiliado</p>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_CONFIG.map((ch) => {
                const selected = channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    disabled={active}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium border-2 transition-all duration-200 disabled:opacity-60 ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border)]"
                    }`}
                  >
                    <ch.icon className={`h-3.5 w-3.5 ${selected ? ch.color : ""}`} />
                    {ch.label}
                    {selected && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ STATS ═══ */}
          <div className="grid grid-cols-2 gap-3">
            {/* Credits card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] mb-1">⚡ Créditos</div>
              <div className="text-2xl font-bold text-[var(--text)] tabular-nums">
                {credits.toLocaleString("pt-BR")}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--muted-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-[var(--muted)]">{creditPct}% disponível</div>
            </div>
            {/* Posts card */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)] mb-1">📊 Postagens hoje</div>
              <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{postsToday}</div>
              <div className="mt-2 text-xs text-[var(--muted)]">👥 {groupsReached} grupos alcançados</div>
            </div>
          </div>

          {/* ═══ ACTION BUTTON ═══ */}
          <div>
            {/* Current status bar — visible when active */}
            {active && currentMsg && currentConf && (
              <div className="mb-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 px-4 py-2.5 flex items-center gap-3">
                <span className="ia-dot-live flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-sm text-[var(--text)] flex-1 min-w-0 truncate">{currentMsg.text}</span>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium ${currentConf.color}`}>
                  <currentConf.icon className="h-3 w-3" />
                  {currentConf.label}
                </span>
              </div>
            )}
            {active ? (
              <button
                onClick={handleStop}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-red-500 text-base font-semibold text-white transition-all hover:bg-red-600 active:scale-[0.98]"
              >
                <Square className="h-5 w-5 fill-current" /> Parar Divulgação
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-[var(--accent)] text-base font-semibold text-white shadow-sm shadow-[var(--accent)]/25 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--accent)]/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
              >
                <Play className="h-5 w-5 fill-current" /> Iniciar Divulgação
              </button>
            )}
          </div>

          {/* ═══ ACTIVITY LOG ═══ */}
          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Atividade em tempo real</h3>
            {log.length === 0 ? (
              <div className="py-8 text-center">
                <Bot className="mx-auto h-8 w-8 text-gray-200" />
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Nenhuma atividade ainda. Inicie a divulgação para ver o histórico.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {log.map((entry) => {
                  const conf = CHANNEL_CONFIG.find((c) => c.id === entry.channel);
                  const Icon = conf?.icon ?? MessageCircle;
                  return (
                    <div key={entry.id} className="flex items-center gap-3 rounded-lg bg-[var(--muted-bg)] px-3 py-2">
                      <Icon className={`h-4 w-4 shrink-0 ${conf?.color ?? "text-[var(--muted)]"}`} />
                      <span className="text-xs text-[var(--text)] flex-1 truncate">{entry.msg}</span>
                      <span className="text-[10px] text-[var(--muted)] shrink-0 tabular-nums">{relativeTime(entry.ts)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </DashboardShell>
    </>
  );
}
