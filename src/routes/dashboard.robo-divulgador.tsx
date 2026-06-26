import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { brl } from "../lib/format";
import {
  Bot, Zap, MessageCircle, Users, Play, Square, TrendingUp,
  Package, Sparkles, Wifi, ChevronRight, Check,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/robo-divulgador")({ component: RoboDivulgador });

// ─── Constants ────────────────────────────────────────────────────────────────
const CREDITS_KEY = (email: string) => `shopesync.robo.credits.v3.${email}`;
const LASTRESET_KEY = (email: string) => `shopesync.robo.credits.lastreset.${email}`;
const INITIAL_CREDITS = 10000;
const CREDITS_MIN = 30;
const CREDITS_MAX = 50;
const SALE_INTERVAL_MIN = 8 * 60 * 1000;
const SALE_INTERVAL_MAX = 14 * 60 * 1000;
const MSG_INTERVAL_MIN = 4000;
const MSG_INTERVAL_MAX = 9000;

type Channel = "whatsapp" | "contacts" | "facebook";

const CHANNEL_CONFIG: Array<{
  id: Channel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  messages: string[];
}> = [
  {
    id: "whatsapp",
    label: "Grupos de WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-600",
    messages: [
      "Divulgando no Grupo Ofertas SP 🔥",
      "Postando em 12 grupos de WhatsApp...",
      "Compartilhando no Grupo Shopee Brasil",
      "Enviando para Grupo Achadinhos do Dia",
      "Alcançando 320 membros no grupo Promoções",
      "Postando no Grupo Compras Online BR",
      "Divulgando para 8 grupos ativos...",
    ],
  },
  {
    id: "contacts",
    label: "Lista de Contatos",
    icon: Users,
    color: "text-blue-600",
    messages: [
      "Enviando para lista de contatos...",
      "Mensagem enviada para 47 contatos ✓",
      "Alcançando contatos próximos...",
      "Divulgando para 120 contatos ativos",
      "Enviando oferta para contatos favoritos",
      "Contatos notificados sobre promoção",
    ],
  },
  {
    id: "facebook",
    label: "Grupos do Facebook",
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
];

type LogEntry = { id: string; ts: number; type: "sale" | "activity"; msg: string; amount?: number; channel?: Channel };

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function saoPauloToday(): string {
  const sp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, "0");
  const d = String(sp.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildAdminHistory(): { log: LogEntry[]; salesCount: number; creditsSpent: number; revenue: number } {
  const now = Date.now();
  const entries: LogEntry[] = [
    { id: "h1", ts: now - 14 * 60 * 1000, type: "sale", msg: "Venda via Grupos de WhatsApp • +" + brl(22.3), amount: 22.3, channel: "whatsapp" },
    { id: "h2", ts: now - 20 * 60 * 1000, type: "activity", msg: "Postando em 12 grupos de WhatsApp...", channel: "whatsapp" },
    { id: "h3", ts: now - 27 * 60 * 1000, type: "activity", msg: "Enviando para lista de contatos...", channel: "contacts" },
    { id: "h4", ts: now - 35 * 60 * 1000, type: "sale", msg: "Venda via Lista de Contatos • +" + brl(18.7), amount: 18.7, channel: "contacts" },
    { id: "h5", ts: now - 48 * 60 * 1000, type: "activity", msg: "Compartilhando em 8 grupos ativos", channel: "facebook" },
    { id: "h6", ts: now - 56 * 60 * 1000, type: "sale", msg: "Venda via Grupos do Facebook • +" + brl(27.5), amount: 27.5, channel: "facebook" },
    { id: "h7", ts: now - 70 * 60 * 1000, type: "activity", msg: "Alcançando 320 membros no grupo Promoções", channel: "whatsapp" },
    { id: "h8", ts: now - 80 * 60 * 1000, type: "sale", msg: "Venda via Grupos de WhatsApp • +" + brl(15.4), amount: 15.4, channel: "whatsapp" },
    { id: "h9", ts: now - 95 * 60 * 1000, type: "activity", msg: "Enviando oferta para contatos favoritos", channel: "contacts" },
    { id: "h10", ts: now - 104 * 60 * 1000, type: "sale", msg: "Venda via Lista de Contatos • +" + brl(24.9), amount: 24.9, channel: "contacts" },
    { id: "h11", ts: now - 120 * 60 * 1000, type: "activity", msg: "Postando em Marketplace Facebook", channel: "facebook" },
    { id: "h12", ts: now - 130 * 60 * 1000, type: "sale", msg: "Venda via Grupos do Facebook • +" + brl(29.9), amount: 29.9, channel: "facebook" },
    { id: "h13", ts: now - 145 * 60 * 1000, type: "activity", msg: "Compartilhando no Grupo Shopee Brasil", channel: "whatsapp" },
    { id: "h14", ts: now - 155 * 60 * 1000, type: "sale", msg: "Venda via Grupos de WhatsApp • +" + brl(22.3), amount: 22.3, channel: "whatsapp" },
    { id: "h15", ts: now - 175 * 60 * 1000, type: "sale", msg: "Venda via Grupos de WhatsApp • +" + brl(12.9), amount: 12.9, channel: "whatsapp" },
  ];
  const sales = entries.filter((e) => e.type === "sale");
  const totalRevenue = sales.reduce((s, e) => s + (e.amount ?? 0), 0);
  return { log: entries, salesCount: sales.length, creditsSpent: sales.length * rand(CREDITS_MIN, CREDITS_MAX), revenue: Math.round(totalRevenue * 100) / 100 };
}

type ProductItem = { id: string; name: string; image: string; status: string };
type ViewProps = {
  active: boolean; channels: Channel[]; selectedProdIds: string[];
  currentMsg: { text: string; channel: Channel } | null;
  currentConf: (typeof CHANNEL_CONFIG)[number] | null | undefined;
  log: LogEntry[]; salesCount: number; creditsSpent: number; revenue: number;
  credits: number; creditPct: number; products: ProductItem[];
  handleStart: () => void; handleStop: () => void;
  toggleChannel: (ch: Channel) => void; toggleProduct: (id: string) => void;
  setSelectedProdIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLog: React.Dispatch<React.SetStateAction<LogEntry[]>>;
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

function RoboDivulgador() {
  const { user, data, isAdmin, triggerDemoSale, addSalesOrderForProduct } = useApp();
  const email = user?.email ?? "";
  const products = data.meusProdutos ?? [];

  const [credits, setCredits] = useState<number>(() => {
    if (!email) return INITIAL_CREDITS;
    try { const raw = localStorage.getItem(CREDITS_KEY(email)); if (raw !== null) return Math.max(0, Number(raw) || 0); } catch {}
    return INITIAL_CREDITS;
  });

  useEffect(() => { if (!email) return; try { localStorage.setItem(CREDITS_KEY(email), String(credits)); } catch {} }, [credits, email]);

  const creditsRef = useRef(credits);
  useEffect(() => { creditsRef.current = credits; }, [credits]);

  useEffect(() => {
    if (!email) return;
    let last: string | null = null;
    try { last = localStorage.getItem(LASTRESET_KEY(email)); } catch {}
    const today = saoPauloToday();
    if (last !== today) { setCredits(INITIAL_CREDITS); try { localStorage.setItem(LASTRESET_KEY(email), today); } catch {} }
  }, [email]);

  const [active, setActive] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(["whatsapp", "contacts", "facebook"]);
  const [selectedProdIds, setSelectedProdIds] = useState<string[]>([]);
  const [currentMsg, setCurrentMsg] = useState<{ text: string; channel: Channel } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [creditsSpent, setCreditsSpent] = useState(0);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const history = buildAdminHistory();
    setLog(history.log); setSalesCount(history.salesCount);
    setCreditsSpent(history.creditsSpent); setRevenue(history.revenue);
    setCredits((prev) => Math.max(0, prev - history.creditsSpent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const msgIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = (entry: Omit<LogEntry, "id" | "ts">) => {
    setLog((prev) => [{ ...entry, id: String(Date.now() + Math.random()), ts: Date.now() }, ...prev].slice(0, 40));
  };

  useEffect(() => {
    if (!active || channels.length === 0) { setCurrentMsg(null); return; }
    const scheduleNext = () => {
      const delay = rand(MSG_INTERVAL_MIN, MSG_INTERVAL_MAX);
      msgIntervalRef.current = setTimeout(() => {
        const ch = pick(channels);
        const conf = CHANNEL_CONFIG.find((c) => c.id === ch)!;
        const msg = pick(conf.messages);
        setCurrentMsg({ text: msg, channel: ch });
        addLog({ type: "activity", msg, channel: ch });
        scheduleNext();
      }, delay);
    };
    const ch = pick(channels);
    const conf = CHANNEL_CONFIG.find((c) => c.id === ch)!;
    setCurrentMsg({ text: pick(conf.messages), channel: ch });
    scheduleNext();
    return () => { if (msgIntervalRef.current) clearTimeout(msgIntervalRef.current); };
  }, [active, channels]);

  useEffect(() => {
    if (!active) return;
    const scheduleSale = () => {
      const delay = rand(SALE_INTERVAL_MIN, SALE_INTERVAL_MAX);
      saleTimeoutRef.current = setTimeout(async () => {
        if (creditsRef.current <= 0) { setActive(false); return; }
        const cost = rand(CREDITS_MIN, CREDITS_MAX);
        let result: { amount: number; marketplace: string } | null = null;
        const eligible = selectedProdIds.filter((id) => products.some((p) => p.id === id));
        if (eligible.length > 0) {
          const pid = pick(eligible);
          const r = await addSalesOrderForProduct(pid);
          if (r && r.amount > 0) result = { amount: r.amount, marketplace: r.marketplace };
        }
        if (!result) {
          const r = await triggerDemoSale();
          if (r && r.amount > 0) result = { amount: r.amount, marketplace: r.marketplace };
        }
        if (!result) { scheduleSale(); return; }
        const ch = pick(channels.length > 0 ? channels : (["whatsapp"] as Channel[]));
        const conf = CHANNEL_CONFIG.find((c) => c.id === ch)!;
        const saleMsg = `Venda via ${conf.label} • +${brl(result.amount)}`;
        setCredits((prev) => Math.max(0, prev - cost));
        setCreditsSpent((prev) => prev + cost);
        setSalesCount((prev) => prev + 1);
        setRevenue((prev) => prev + result!.amount);
        addLog({ type: "sale", msg: saleMsg, amount: result.amount, channel: ch });
        toast.success("🤖 Venda do Robô", { description: saleMsg });
        if (creditsRef.current - cost <= 0) {
          setActive(false);
          toast.error("Robô parado — créditos esgotados.");
        } else { scheduleSale(); }
      }, delay);
    };
    scheduleSale();
    return () => { if (saleTimeoutRef.current) clearTimeout(saleTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => { if (active && (channels.length === 0 || credits <= 0)) setActive(false); }, [active, channels, credits]);

  const toggleChannel = (ch: Channel) => { setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]); };
  const toggleProduct = (id: string) => { setSelectedProdIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]); };
  const handleStart = () => {
    if (channels.length === 0) { toast.error("Selecione pelo menos um canal."); return; }
    if (credits <= 0) { toast.error("Créditos esgotados. Contate o suporte."); return; }
    setActive(true);
    toast.success("🤖 Robô Divulgador iniciado!", { description: "O robô está divulgando seus produtos automaticamente." });
  };
  const handleStop = () => { setActive(false); toast("🤖 Robô Divulgador pausado."); };

  const creditPct = Math.round((credits / INITIAL_CREDITS) * 100);
  const currentConf = currentMsg ? CHANNEL_CONFIG.find((c) => c.id === currentMsg.channel) : null;

  const viewProps: ViewProps = {
    active, channels, selectedProdIds, currentMsg, currentConf,
    log, salesCount, creditsSpent, revenue, credits, creditPct,
    products: products as ProductItem[],
    handleStart, handleStop, toggleChannel, toggleProduct,
    setSelectedProdIds, setLog,
  };

  return <ShopeeView {...viewProps} />;
}

// ═══════════════════════════════════════════════════════════════════════
// SHOPEE VIEW
// ═══════════════════════════════════════════════════════════════════════

function ShopeeView({
  active, channels, selectedProdIds, currentMsg, currentConf,
  log, salesCount, creditsSpent, revenue, credits, creditPct,
  products, handleStart, handleStop, toggleChannel, toggleProduct,
  setSelectedProdIds, setLog,
}: ViewProps) {
  return (
    <DashboardShell title="Robô Divulgador" subtitle="Divulgação automática dos seus produtos em grupos e contatos.">
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* ── Status card ── */}
          <div className={`relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06] transition-all duration-500 ${
            active ? "ring-[#EE4D2D]/30" : ""
          }`}>
            {active && <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[#EE4D2D]/[0.03]" />}
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Bot icon */}
                <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl transition-all duration-500 ${
                  active ? "bg-[#EE4D2D] shadow-lg shadow-[#EE4D2D]/30" : "bg-gray-100"
                }`}>
                  <Bot className={`h-10 w-10 ${active ? "text-white" : "text-gray-400"}`} />
                  {active && (
                    <>
                      <span className="absolute -inset-1 animate-ping rounded-2xl bg-[#EE4D2D]/20" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white shadow-md shadow-emerald-500/50">
                        <span className="h-2 w-2 animate-ping rounded-full bg-emerald-300" />
                      </span>
                    </>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold text-gray-900">Robô Divulgador</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                      active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {active && currentMsg && currentConf ? (
                    <p className={`mt-1.5 animate-in fade-in text-sm font-medium ${currentConf.color}`}>
                      🤖 {currentMsg.text}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm text-gray-400">Pronto para divulgar seus produtos</p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {active ? (
                  <Button onClick={handleStop} variant="outline" className="rounded-xl border-red-200 bg-white text-sm font-semibold text-red-500 shadow-sm shadow-black/[0.02] transition-all hover:border-red-400 hover:bg-red-50 active:scale-[0.98]">
                    <Square className="mr-2 h-4 w-4" /> Parar robô
                  </Button>
                ) : (
                  <Button onClick={handleStart} disabled={channels.length === 0 || credits <= 0} className="h-10 rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98] disabled:opacity-50">
                    <Play className="mr-2 h-4 w-4" /> Iniciar divulgação
                  </Button>
                )}
              </div>
            </div>

            {/* Credits meter */}
            <div className="mt-5 rounded-xl bg-[#FFF8F5] p-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className={`text-4xl font-black tabular-nums ${
                    credits < 1000 ? "text-red-500" : credits < 5000 ? "text-amber-500" : "text-gray-900"
                  }`}>
                    {creditPct}<span className="text-2xl text-gray-300">%</span>
                  </span>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Créditos disponíveis</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-400">
                  {credits.toLocaleString("pt-BR")} <span className="text-gray-200">/</span> {INITIAL_CREDITS.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${credits < 1000 ? "bg-red-500" : credits < 5000 ? "bg-amber-500" : "bg-[#EE4D2D]"}`}
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                Cada venda consome {CREDITS_MIN}–{CREDITS_MAX} créditos · Até {Math.floor(INITIAL_CREDITS / CREDITS_MIN)} vendas automáticas
              </p>
            </div>
          </div>

          {/* ═══ CHANNEL PILLS ═══ */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06]">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Canais de divulgação</h3>
            <p className="mt-1 text-sm text-gray-500">Selecione onde o robô vai divulgar seus produtos.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {CHANNEL_CONFIG.map((ch) => {
                const selected = channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={`flex items-center gap-2.5 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      selected
                        ? "border-[#EE4D2D] bg-[#EE4D2D] text-white shadow-sm shadow-[#EE4D2D]/25"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
                    }`}
                  >
                    <ch.icon className="h-4 w-4 shrink-0" />
                    {ch.label}
                    {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ PRODUCT GRID ═══ */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Produtos para divulgar</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedProdIds.length === 0
                    ? "Nenhum selecionado — o robô usará todos os seus produtos."
                    : `${selectedProdIds.length} produto${selectedProdIds.length > 1 ? "s" : ""} selecionado${selectedProdIds.length > 1 ? "s" : ""}.`}
                </p>
              </div>
              {selectedProdIds.length > 0 && (
                <button onClick={() => setSelectedProdIds([])} className="shrink-0 text-xs font-medium text-gray-400 transition-colors hover:text-[#EE4D2D]">
                  Limpar seleção
                </button>
              )}
            </div>
            {products.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8F5]">
                  <Package className="h-7 w-7 text-[#EE4D2D]/60" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-700">Você ainda não possui produtos</p>
                <p className="mt-1 text-xs text-gray-400">Adicione produtos em Meus Produtos para usar o robô.</p>
                <Link to="/dashboard/produtos">
                  <Button size="sm" variant="outline" className="mt-4 rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Ver catálogo
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {products.map((p) => {
                  const sel = selectedProdIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`flex items-center gap-3 overflow-hidden rounded-xl border-2 p-3 text-left transition-all duration-200 ${
                        sel ? "border-[#EE4D2D] bg-[#FFF8F5]" : "border-gray-100 bg-white hover:border-[#EE4D2D]/20 hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        {p.image ? (
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        {sel && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#EE4D2D]/85">
                            <Check className="h-6 w-6 text-white drop-shadow-sm" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900">{p.name}</div>
                        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          p.status === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div className="space-y-4 xl:w-80">
          {/* Metrics panel */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06]">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Sessão atual</h3>
            <div className="mt-4 space-y-3">
              <SidebarStat icon={<TrendingUp className="h-4 w-4 text-[#EE4D2D]" />} label="Vendas geradas" value={String(salesCount)} accent />
              <SidebarStat icon={<Zap className="h-4 w-4 text-violet-500" />} label="Créditos gastos" value={String(creditsSpent)} />
              <SidebarStat icon={<Sparkles className="h-4 w-4 text-emerald-500" />} label="Receita gerada" value={brl(revenue)} />
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06]">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Atividade recente</h3>
              {log.length > 0 && (
                <button onClick={() => setLog([])} className="text-[11px] text-gray-400 transition-colors hover:text-[#EE4D2D]">
                  Limpar
                </button>
              )}
            </div>
            <div className="mt-4 max-h-[420px] overflow-y-auto">
              {log.length === 0 ? (
                <div className="py-8 text-center">
                  <Bot className="mx-auto h-8 w-8 text-gray-200" />
                  <p className="mt-2 text-xs text-gray-400">Inicie o robô para ver a atividade aqui.</p>
                </div>
              ) : (
                <div className="space-y-px">
                  {log.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 border-l-2 py-2.5 pl-3 animate-in slide-in-from-right-4 fade-in duration-300 ${
                        entry.type === "sale" ? "border-emerald-500" : "border-blue-500"
                      }`}
                    >
                      <p className={`min-w-0 flex-1 truncate text-xs leading-snug ${
                        entry.type === "sale" ? "font-semibold text-emerald-600" : "text-gray-600"
                      }`}>
                        {entry.msg}
                      </p>
                      <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                        {new Date(entry.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info tips */}
          <div className="space-y-2.5 rounded-2xl bg-white p-4 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06]">
            <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EE4D2D]" /><span className="text-xs text-gray-500">O robô divulga automaticamente durante todo o dia enquanto ativo.</span></div>
            <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EE4D2D]" /><span className="text-xs text-gray-500">Cada venda consome {CREDITS_MIN}–{CREDITS_MAX} créditos de divulgação.</span></div>
            <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EE4D2D]" /><span className="text-xs text-gray-500">Com 10.000 créditos você pode gerar até {Math.floor(INITIAL_CREDITS / CREDITS_MIN)} vendas automáticas.</span></div>
            <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EE4D2D]" /><span className="text-xs text-gray-500">Quanto mais canais selecionados, maior o alcance da divulgação.</span></div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function SidebarStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? "bg-[#FFF8F5] ring-1 ring-[#EE4D2D]/20" : "bg-gray-50"}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-black tabular-nums ${accent ? "text-[#EE4D2D]" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}
