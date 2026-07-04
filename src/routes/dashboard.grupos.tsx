import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { groups } from "../lib/mock/groups";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { ExternalLink, Copy, Clock, Tag, ShieldCheck, Sparkles, Loader2, RefreshCw, ArrowDown, RefreshCcw, CheckCircle2, MessageCircle, Users, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { brl } from "../lib/format";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/dashboard/grupos")({ component: Grupos });

const tones = [
  "Direto", "Oferta urgente", "Simples", "Profissional", "Chamativo",
  "Grupo de WhatsApp", "Grupo do Facebook",
] as const;
type Tone = (typeof tones)[number];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Text generator (unchanged logic) ────────────────────────────────────────

function generatePromoText(opts: { name: string; price?: number; category?: string; tone: Tone }): string {
  const { name, price, tone } = opts;
  const priceStr = price && price > 0 ? brl(price) : null;
  const priceLine = priceStr ? `por apenas ${priceStr}` : "com condições especiais";
  const cta = pick(["Clique no link e confira agora.", "Garanta o seu antes que acabe.",
    "Toque no link e aproveite.", "Não perca essa oportunidade.",
    "Aproveite enquanto está disponível.", "Corre que ainda dá tempo!"]);

  switch (tone) {
    case "Oferta urgente": {
      const fire = pick(["🔥", "🚨", "⚡", "⏰"]);
      const hook = pick(["Oferta por tempo limitado!", "Últimas unidades disponíveis!",
        "Promoção relâmpago!", "Desconto especial só hoje!"]);
      const benefit = pick(["Ideal para quem quer aproveitar antes que acabe.",
        "Estoque limitado, não fique de fora.", "Os primeiros levam, depois acaba.", "Quem ver primeiro, garanta."]);
      return `${fire} ${hook}\n${name} ${priceLine}.\n${benefit}\n${cta}`;
    }
    case "Profissional": {
      const intro = pick([`Confira ${name}, uma opção prática para quem busca qualidade e bom custo-benefício.`,
        `Apresentamos ${name}, uma escolha equilibrada entre qualidade e preço.`,
        `Conheça ${name}, um produto bem avaliado e com excelente acabamento.`]);
      return `${intro}\n${priceStr ? `Disponível ${priceLine}, com envio rápido.` : "Disponível para compra com condições especiais."}\n${cta}`;
    }
    case "Grupo de WhatsApp": {
      const emoji = pick(["🛍️", "✨", "💥", "🛒"]);
      return `${emoji} ${name} ${priceLine}!\n${pick(["Olha que achadinho!", "Olha esse preço!", "Corre lá!", "Não perde!"])}\n${cta}`;
    }
    case "Grupo do Facebook": {
      const emoji = pick(["🛒", "✨", "🔥", "💖"]);
      const intro = pick([`${emoji} Pessoal, achei ${name} ${priceLine} e precisava compartilhar com vocês.`,
        `${emoji} Olha o que encontrei: ${name} ${priceLine}. Vale muito a pena dar uma olhada.`,
        `${emoji} Achadinho do dia: ${name} ${priceLine}. Aproveitei e to deixando o link aqui.`]);
      return `${intro}\n${pick(["Envio rápido e produto bem avaliado.", "Excelente custo-benefício para o dia a dia.", "Quem já comprou aprovou nos comentários."])}\n${cta}`;
    }
    case "Chamativo": {
      const open = pick(["✨ ACHADINHO TOP ✨", "💥 OLHA ESSE PREÇO 💥", "🤩 IMPERDÍVEL 🤩", "🔥 TÁ VOANDO 🔥"]);
      return `${open}\n${name} ${priceLine}.\n${pick(["Bonito, prático e com bom preço.", "Qualidade que surpreende.", "Tudo o que você precisava em um só produto."])}\n${cta}`;
    }
    case "Simples": return `${name} ${priceLine}.\n${cta}`;
    case "Direto":
    default: {
      return `${name} ${priceLine}. ${pick(["Envio rápido, aproveite.", "Disponível agora.", "Confira no link.", "Toque para ver mais."])}\n${cta}`;
    }
  }
}

function parseActiveNow(bestTime: string): boolean {
  const m = bestTime.match(/(\d+)h\s*às\s*(\d+)h/);
  if (!m) return false;
  const h = new Date().getHours();
  return h >= parseInt(m[1]) && h <= parseInt(m[2]);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════

function Grupos() {
  const { data, isAdmin } = useApp();
  const meus = data.meusProdutos ?? [];
  const [productId, setProductId] = useState<string>(meus[0]?.id ?? "");
  const [tone, setTone] = useState<Tone>("Oferta urgente");
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"Todos" | "Facebook" | "WhatsApp" | "Achadinhos" | "Promoções" | "Shopee">("Todos");
  const [search, setSearch] = useState("");
  const groupsRef = useRef<HTMLDivElement | null>(null);
  const [highlightGroups, setHighlightGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [generatorCollapsed, setGeneratorCollapsed] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => meus.find((p) => p.id === productId) ?? meus[0],
    [meus, productId],
  );

  const handleGenerate = () => {
    if (!selectedProduct) return;
    setLoading(true);
    const delay = 2000 + Math.floor(Math.random() * 1500);
    setTimeout(() => {
      setText(generatePromoText({ name: selectedProduct.name, price: selectedProduct.recommendedPrice, category: selectedProduct.category, tone }));
      setLoading(false);
    }, delay);
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado com sucesso.");
  };

  const handleUseInGroups = () => {
    handleCopy();
    groupsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightGroups(true);
    setTimeout(() => setHighlightGroups(false), 1800);
  };

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (!g.url) return false;
      if (filter === "Facebook" || filter === "WhatsApp") { if (g.platform !== filter) return false; }
      else if (filter !== "Todos") {
        const hay = `${g.name} ${g.category} ${g.description}`.toLowerCase();
        if (!hay.includes(filter.toLowerCase())) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${g.name} ${g.platform} ${g.category} ${g.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, search]);

  const filters: Array<typeof filter> = ["Todos", "Facebook", "WhatsApp", "Achadinhos", "Promoções", "Shopee"];
  const filterIcons: Record<typeof filter, string> = {
    "Todos": "🌐", "Facebook": "👤", "WhatsApp": "💬",
    "Achadinhos": "🏷️", "Promoções": "🔥", "Shopee": "🛍️",
  };

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of filters) {
      if (f === "Todos") { counts[f] = groups.filter((g) => !!g.url).length; }
      else if (f === "Facebook" || f === "WhatsApp") { counts[f] = groups.filter((g) => g.platform === f && !!g.url).length; }
      else {
        counts[f] = groups.filter((g) => {
          if (!g.url) return false;
          const hay = `${g.name} ${g.category} ${g.description}`.toLowerCase();
          return hay.includes(f.toLowerCase());
        }).length;
      }
    }
    return counts;
  }, []);

  const step = !text && !loading ? 1 : text && !selectedGroupId ? 2 : 3;

  return (
    <DashboardShell title="Grupos de Divulgação">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 3-STEP STRIP — COMPACT                                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes grp-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,84,30,0.4); }
          50%      { box-shadow: 0 0 0 10px rgba(244,84,30,0); }
        }
        @keyframes grp-line-grow {
          from { opacity: 0; transform: scaleX(0); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes grp-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes grp-copied-pop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .grp-step-pill {
          animation: grp-fade-up 0.4s ease both;
        }
        .grp-step-pill:nth-child(1) { animation-delay: 0.05s; }
        .grp-step-pill:nth-child(2) { animation-delay: 0.15s; }
        .grp-step-pill:nth-child(3) { animation-delay: 0.25s; }
        .grp-active-ring { animation: grp-pulse-ring 2.2s ease-in-out infinite; }
        .grp-line-grow { animation: grp-line-grow 0.6s ease both; transform-origin: left; }
        .grp-card-hover:hover { transform: translateY(-4px); border-color: var(--border-warm); box-shadow: var(--shadow-glow), var(--shadow-elevated); }
        .grp-copied { animation: grp-copied-pop 0.35s ease; }
        .mask-t-from-60\% {
          mask-image: linear-gradient(to right, black 60%, transparent);
          -webkit-mask-image: linear-gradient(to right, black 60%, transparent);
        }
      `}</style>

      {/* Desktop: 3-step numbered strip */}
      <div className="mb-6 hidden sm:block">
        <div className="flex items-center justify-center gap-0">
          {([
            { n: 1, label: "Gere o texto" },
            { n: 2, label: "Escolha o grupo" },
            { n: 3, label: "Copie e publique" },
          ] as const).map(({ n, label }, i) => {
            const isActive = step === n;
            const isDone = step > n;
            return (
              <div key={n} className="grp-step-pill flex items-center">
                {/* Pill */}
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
                    isActive
                      ? "grp-active-ring bg-[var(--accent)] text-white scale-110"
                      : isDone
                      ? "bg-[var(--accent)] text-white"
                      : "border-2 border-[var(--border)] text-[var(--muted)]"
                  }`}
                  style={(isActive || isDone) ? { backgroundImage: "var(--accent-gradient)" } : undefined}
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : n}
                </div>
                {/* Label */}
                <span
                  className={`ml-3 text-sm font-semibold transition-colors duration-500 ${
                    isActive ? "text-[var(--accent)]" : isDone ? "text-[var(--text)]" : "text-[var(--muted)]"
                  }`}
                >
                  {label}
                </span>
                {/* Connector line — only between pills */}
                {i < 2 && (
                  <div className="mx-4 h-0.5 w-12 rounded-full bg-[var(--muted-bg)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        step > i + 1 ? "bg-[var(--accent)]" : step === i + 1 ? "bg-[var(--accent-soft)]" : ""
                      }`}
                      style={
                        step > i + 1
                          ? { width: "100%", backgroundImage: "var(--accent-gradient)" }
                          : step === i + 1
                          ? { width: "40%", backgroundColor: "var(--accent-soft)" }
                          : { width: "0%" }
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: "Como funciona" expandable pill */}
      <div className="mb-6 sm:hidden">
        <button
          onClick={() => setStepsExpanded(!stepsExpanded)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            stepsExpanded
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Como funciona
          <ChevronDown className={`h-4 w-4 transition-transform ${stepsExpanded ? "rotate-180" : ""}`} />
        </button>
        {stepsExpanded && (
          <div className="mt-4 space-y-3">
            {([
              { n: 1, label: "Gere o texto", desc: "A IA analisa seu produto, preço e tom ideal para criar uma copy pronta para publicar nos grupos." },
              { n: 2, label: "Escolha o grupo", desc: "Filtre por plataforma, categoria ou pesquise. Encontre os grupos com maior engajamento." },
              { n: 3, label: "Copie e publique", desc: "Com um clique o texto vai para a área de transferência. Cole no grupo e aguarde os resultados." },
            ] as const).map(({ n, label, desc }) => {
              const isActive = step === n;
              const isDone = step > n;
              return (
                <div key={n} className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "grp-active-ring bg-[var(--accent)] text-white"
                        : isDone
                        ? "bg-[var(--accent)] text-white"
                        : "border-2 border-[var(--border)] text-[var(--muted)]"
                    }`}
                    style={(isActive || isDone) ? { backgroundImage: "var(--accent-gradient)" } : undefined}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : n}
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${isActive ? "text-[var(--accent)]" : isDone ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
                      {label}
                    </span>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN LAYOUT: Generator (left) + Groups (right)                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ═══ LEFT: AI GENERATOR — elevated hero card ═══ */}
        <div className="lg:sticky lg:top-24 self-start">
          {/* Mobile collapse toggle after first use */}
          {text && (
            <button
              onClick={() => setGeneratorCollapsed(!generatorCollapsed)}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)] lg:hidden"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generatorCollapsed ? "Mostrar gerador" : "Ocultar gerador"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${generatorCollapsed ? "" : "rotate-180"}`} />
            </button>
          )}

          {!generatorCollapsed && (
            <div
              className="relative overflow-hidden rounded-[20px] bg-[var(--surface)] p-5 sm:p-6"
              style={{ boxShadow: "var(--shadow-glow), var(--shadow-card)" }}
            >
              {/* Decorative glow blobs */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/[0.03] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 left-1/3 h-24 w-24 rounded-full bg-[var(--accent-2)]/[0.04] blur-2xl" />

              {/* Header */}
              <div className="relative flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                  <Sparkles className="h-4.5 w-4.5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text)]">Gerador de texto com IA</h3>
                  <p className="text-xs text-[var(--muted)]">
                    Escolha um produto e o tom da oferta
                  </p>
                </div>
              </div>

              {meus.length === 0 ? (
                <div className="relative mt-4 rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                    <Sparkles className="h-7 w-7 text-[var(--accent)]/50" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-[var(--muted)]">Você ainda não possui produtos para divulgar.</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Cadastre produtos na Shopee para começar.</p>
                  <a href="https://affiliate.shopee.com.br/dashboard" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
                    <Button size="sm" variant="outline" className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)]" style={{ boxShadow: "var(--shadow-card)" }}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Cadastrar na Shopee Afiliados
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="relative space-y-4">
                  {/* Product selector */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      Escolha o produto
                    </label>
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] text-sm focus-visible:ring-[var(--accent)]/30" style={{ boxShadow: "var(--shadow-card)" }}>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {meus.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              {p.image && <img src={p.image} alt="" className="h-5 w-5 rounded object-cover" />}
                              <span className="truncate max-w-[180px]">{p.name}</span>
                              {p.recommendedPrice > 0 && (
                                <span className="ml-auto shrink-0 text-[10px] font-medium text-[var(--muted)]">{brl(p.recommendedPrice)}</span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tone picker — horizontal chip group */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      Escolha o tom
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {tones.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t as Tone)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            tone === t
                              ? "bg-[var(--accent)] text-white"
                              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
                          }`}
                          style={tone === t ? { backgroundImage: "var(--accent-gradient)" } : { boxShadow: "var(--shadow-card)" }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate CTA */}
                  <Button
                    className="h-11 w-full rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                    onClick={handleGenerate}
                    disabled={loading || !selectedProduct}
                    style={{
                      backgroundImage: "var(--accent-gradient)",
                      boxShadow: "var(--accent-glow)",
                    }}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Gerar texto com IA</>
                    )}
                  </Button>

                  {/* Loading state */}
                  {loading && (
                    <div className="rounded-xl bg-[var(--accent-soft)] p-4 text-center" style={{ boxShadow: "none" }}>
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--accent)]" />
                      <p className="mt-2 text-xs font-medium text-[var(--text)]">
                        Inteligência artificial gerando o melhor texto para você divulgar nos grupos...
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        Analisando produto, preço, tom da oferta e público ideal...
                      </p>
                    </div>
                  )}

                  {/* Generated text output */}
                  {!loading && text && (
                    <div className="space-y-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Texto pronto!
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--text)] whitespace-pre-line">
                        {text}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Button
                          size="sm"
                          onClick={handleCopy}
                          className="rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98]"
                          style={{ backgroundImage: "var(--accent-gradient)", boxShadow: "var(--accent-glow)" }}
                        >
                          <Copy className="mr-1 h-3 w-3" /> Copiar texto
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerate}
                          className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
                          style={{ boxShadow: "var(--shadow-card)" }}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" /> Gerar outro
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUseInGroups}
                          className="rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98]"
                          style={{ backgroundImage: "var(--accent-gradient)", boxShadow: "var(--accent-glow)" }}
                        >
                          <ArrowDown className="mr-1 h-3 w-3" /> Usar nos grupos
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: GROUPS PANEL ═══ */}
        <div
          ref={groupsRef}
          className={`min-w-0 rounded-[16px] transition-all duration-500 ${
            highlightGroups ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : ""
          }`}
        >
          {/* Filters + Search row */}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Segmented filter pills — horizontal scroll on mobile */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 snap-x sm:flex-wrap sm:overflow-visible">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === f
                      ? "text-white"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
                  }`}
                  style={
                    filter === f
                      ? { backgroundImage: "var(--accent-gradient)", boxShadow: "var(--accent-glow)" }
                      : { boxShadow: "var(--shadow-card)" }
                  }
                >
                  <span className="text-[11px]">{filterIcons[f]}</span>
                  <span>{f}</span>
                  <span className={`ml-0.5 text-[10px] ${filter === f ? "opacity-80" : "opacity-50"}`}>
                    {filterCounts[f] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Search field */}
            <div className="relative w-full sm:w-[220px] shrink-0">
              <svg
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar grupo..."
                className="h-9 rounded-xl border-[var(--border)] bg-[var(--surface)] pl-9 text-sm focus-visible:ring-[var(--accent)]/30"
                style={{ boxShadow: "var(--shadow-card)" }}
              />
            </div>
          </div>

          {/* Text ready banner above groups */}
          {text && !loading && (
            <div className="mb-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Texto pronto para publicar
                </div>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className="rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ backgroundImage: "var(--accent-gradient)" }}
                >
                  <Copy className="mr-1 h-3 w-3" /> Copiar texto
                </Button>
              </div>
              <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-xs text-[var(--text)]">{text}</p>
            </div>
          )}

          {/* Admin updating banner */}
          {!isAdmin && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3">
              <RefreshCcw className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" style={{ animationDuration: "2s" }} />
              <div>
                <div className="text-sm font-semibold text-[var(--accent)]">Grupos atualizando</div>
                <div className="text-xs text-[var(--muted)]">Nossa equipe está verificando e adicionando novos grupos de divulgação. Em breve estarão disponíveis.</div>
              </div>
            </div>
          )}

          {/* Dismissible info strip */}
          {!infoDismissed && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
              <ShieldCheck className="h-3 w-3 shrink-0 text-[var(--accent)]/60" />
              <span>Os links são públicos. Alguns grupos podem exigir aprovação do administrador.</span>
              <button
                onClick={() => setInfoDismissed(true)}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--text)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Groups grid — responsive 3/2/1 columns */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((g) => {
              const PlatformIcon = g.platform === "WhatsApp" ? MessageCircle : Users;
              return (
                <div
                  key={g.id}
                  className="grp-card-hover flex flex-col rounded-[16px] bg-[var(--surface)] p-4 transition-all duration-300"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {/* Header row: platform badge + name + category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Platform icon badge */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                          <PlatformIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
                        </div>
                        {/* Group name */}
                        <h4 className="text-sm font-bold text-[var(--text)] line-clamp-2 leading-tight">{g.name}</h4>
                      </div>
                      {/* Platform label */}
                      <div className="mt-1 ml-9 text-[10px] text-[var(--muted)]">{g.platform}</div>
                    </div>
                    {/* Category chip */}
                    <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      {g.category}
                    </span>
                  </div>

                  {/* Meta row: status + best time */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <div className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[var(--muted)]">
                      <ShieldCheck className="h-3 w-3 text-[var(--muted)]" />
                      <span>{g.status}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5">
                      <Clock className="h-3 w-3 text-[var(--muted)]" />
                      <span className="text-[var(--muted)]">Melhor: <span className="font-medium text-[var(--text)]">{g.bestTime}</span></span>
                    </div>
                    {parseActiveNow(g.bestTime) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        Ativo agora
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {g.description && (
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)] line-clamp-2">{g.description}</p>
                  )}

                  {/* Verification note */}
                  {g.verificationNote && (
                    <div className="mt-1.5 flex items-start gap-1 text-[10px] text-[var(--muted)]">
                      <Tag className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{g.verificationNote}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-auto flex gap-2 pt-3">
                    {isAdmin ? (
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                        onClick={() => setSelectedGroupId(g.id)}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
                          style={{ boxShadow: "var(--shadow-card)" }}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" /> Abrir grupo
                        </Button>
                      </a>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--muted)]"
                        style={{ boxShadow: "var(--shadow-card)" }}
                        disabled
                      >
                        <RefreshCcw className="mr-1 h-3 w-3 animate-spin" style={{ animationDuration: "2s" }} /> Atualizando...
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className={`flex-1 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
                        copiedGroupId === g.id ? "grp-copied" : ""
                      }`}
                      style={
                        copiedGroupId === g.id
                          ? { backgroundImage: "var(--accent-gradient)" }
                          : { backgroundImage: "var(--accent-gradient)", boxShadow: "var(--accent-glow)" }
                      }
                      onClick={() => {
                        handleCopy();
                        setSelectedGroupId(g.id);
                        setCopiedGroupId(g.id);
                        setTimeout(() => setCopiedGroupId(null), 1800);
                      }}
                      disabled={!text}
                    >
                      {copiedGroupId === g.id ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" /> Copiado!</>
                      ) : (
                        <><Copy className="mr-1 h-3 w-3" /> Copiar texto</>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                  <ExternalLink className="h-7 w-7 text-[var(--accent)]/50" />
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--muted)]">Nenhum grupo encontrado</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Tente ajustar os filtros ou a busca.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom spacing for mobile dock clearance */}
      <div className="pb-[110px] sm:pb-8" />
    </DashboardShell>
  );
}
