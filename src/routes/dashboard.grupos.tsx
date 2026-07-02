import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { groups } from "../lib/mock/groups";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { ExternalLink, Copy, Clock, Tag, ShieldCheck, Sparkles, Loader2, RefreshCw, ArrowDown, RefreshCcw, CheckCircle2 } from "lucide-react";
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

  const step = !text && !loading ? 1 : text && !selectedGroupId ? 2 : 3;

  return (
    <DashboardShell title="Grupos de Divulgação">
      {/* ═══ ANIMATED STEPPER ═══ */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#EE4D2D]/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-stretch gap-0">
          {([
            { n: 1, icon: Sparkles, label: "Gere o texto", desc: "IA cria copy para divulgação" },
            { n: 2, icon: ExternalLink, label: "Escolha o grupo", desc: "Encontre onde publicar" },
            { n: 3, icon: Copy, label: "Copie e publique", desc: "Divulgue nos grupos agora" },
          ] as const).map(({ n, icon: Icon, label, desc }, i) => {
            const isActive = step === n;
            const isDone = step > n;
            const isLast = i === 2;
            return (
              <div key={n} className="flex items-center flex-1">
                <div className={`relative flex flex-1 flex-col items-center rounded-xl p-3 text-center transition-all duration-500 ${
                  isActive ? "bg-[#FFF8F5] ring-2 ring-[#EE4D2D]/20 scale-105 z-10" :
                  isDone ? "bg-emerald-50/50" :
                  "bg-gray-50/50"
                }`}>
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-500 ${
                    isActive ? "bg-[#EE4D2D] shadow-lg shadow-[#EE4D2D]/30" :
                    isDone ? "bg-emerald-500 shadow-md shadow-emerald-500/20" :
                    "bg-gray-100"
                  }`}>
                    {isActive && (
                      <div className="absolute inset-0 rounded-xl animate-ping bg-[#EE4D2D]/20" style={{ animationDuration: "2s" }} />
                    )}
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-white" /> : <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400"}`} />}
                  </div>
                  <div className="mt-2">
                    <span className={`text-xs font-semibold transition-colors duration-500 block ${
                      isActive ? "text-[#EE4D2D]" : isDone ? "text-emerald-700" : "text-gray-400"
                    }`}>{label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:block">{desc}</span>
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-[#EE4D2D] animate-bounce" />
                  )}
                </div>
                {!isLast && (
                  <div className="flex-shrink-0 w-4 sm:w-8 mx-1">
                    <div className={`h-0.5 rounded-full transition-all duration-500 ${
                      isDone ? "bg-emerald-400" : "bg-gray-200"
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ═══ LEFT: GENERATOR PANEL ═══ */}
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06] lg:col-span-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF8F5]">
              <Sparkles className="h-4 w-4 text-[#EE4D2D]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Gerador de texto com IA</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Escolha um dos seus produtos e o tom da oferta. A IA cria um texto pronto para divulgar.
          </p>

          {meus.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-[#FFF8F5]">
                <Sparkles className="h-6 w-6 text-[#EE4D2D]/60" />
              </div>
              <p className="mt-3 text-sm text-gray-500">Você ainda não possui produtos para divulgar.</p>
              <Link to="/dashboard/grupos" className="mt-3 inline-block">
                <Button size="sm" variant="outline" className="rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
                  Ver meus produtos
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {/* Product selector */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Escolha o produto</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="mt-1 h-10 rounded-xl border-gray-200 bg-white text-sm shadow-sm shadow-black/[0.02] focus-visible:ring-[#EE4D2D]/30">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {meus.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.image && <img src={p.image} alt="" className="h-5 w-5 rounded object-cover" />}
                          <span className="truncate">{p.name}</span>
                          {p.recommendedPrice > 0 && <span className="ml-1 text-[10px] text-gray-400">{brl(p.recommendedPrice)}</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tone selector */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Escolha o tom</label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger className="mt-1 h-10 rounded-xl border-gray-200 bg-white text-sm shadow-sm shadow-black/[0.02] focus-visible:ring-[#EE4D2D]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate button */}
              <Button
                className="h-10 w-full rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98] disabled:opacity-50"
                onClick={handleGenerate}
                disabled={loading || !selectedProduct}
              >
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="mr-2 h-4 w-4" /> Gerar texto com IA</>}
              </Button>

              {/* Loading state */}
              {loading && (
                <div className="rounded-xl bg-[#FFF8F5] p-4 text-center animate-in fade-in">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#EE4D2D]" />
                  <p className="mt-2 text-xs font-medium text-gray-700">
                    Inteligência artificial gerando o melhor texto para você divulgar nos grupos...
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Analisando produto, preço, tom da oferta e público ideal...
                  </p>
                </div>
              )}

              {/* Generated text output */}
              {!loading && text && (
                <div className="rounded-xl bg-[#FFF8F5] p-4 ring-1 ring-[#EE4D2D]/20">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EE4D2D]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Texto pronto! Escolha um grupo abaixo.
                  </div>
                  <div className="whitespace-pre-line text-sm text-gray-800">{text}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button size="sm" onClick={handleCopy} className="rounded-xl bg-[#EE4D2D] text-xs font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 active:scale-[0.98]">
                      <Copy className="mr-1 h-3 w-3" /> Copiar texto
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGenerate} className="rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
                      <RefreshCw className="mr-1 h-3 w-3" /> Gerar outro
                    </Button>
                    <Button size="sm" onClick={handleUseInGroups} className="rounded-xl bg-[#EE4D2D] text-xs font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 active:scale-[0.98]">
                      <ArrowDown className="mr-1 h-3 w-3" /> Usar nos grupos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: GROUPS PANEL ═══ */}
        <div ref={groupsRef} className={`space-y-3 lg:col-span-2 rounded-2xl transition-shadow ${highlightGroups ? "ring-2 ring-[#EE4D2D] ring-offset-2" : ""}`}>
          {/* Disclaimer */}
          <div className="rounded-xl bg-[#FFF8F5] px-4 py-3 text-[11px] text-gray-600">
            Os links abaixo são páginas públicas de grupos e comunidades. Alguns grupos podem exigir login, aprovação do administrador ou estar sujeitos à lotação.
          </div>

          {/* Non-admin updating banner */}
          {!isAdmin && (
            <div className="flex items-center gap-3 rounded-xl bg-[#FFF8F5] px-4 py-3 ring-1 ring-[#EE4D2D]/20">
              <RefreshCcw className="h-4 w-4 shrink-0 animate-spin text-[#EE4D2D]" style={{ animationDuration: "2s" }} />
              <div>
                <div className="text-sm font-semibold text-[#EE4D2D]">Grupos atualizando</div>
                <div className="text-xs text-gray-500">Nossa equipe está verificando e adicionando novos grupos de divulgação. Em breve estarão disponíveis.</div>
              </div>
            </div>
          )}

          {/* Text ready banner above groups */}
          {text && !loading && (
            <div className="rounded-xl bg-[#FFF8F5] p-4 ring-1 ring-[#EE4D2D]/20">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#EE4D2D]">
                📋 Texto pronto para publicar
              </div>
              <p className="line-clamp-3 whitespace-pre-line text-sm text-gray-700">{text}</p>
              <Button size="sm" onClick={handleCopy} className="mt-3 rounded-xl bg-[#EE4D2D] text-xs font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 active:scale-[0.98]">
                <Copy className="mr-1 h-3 w-3" /> Copiar texto
              </Button>
            </div>
          )}

          {/* Filters + Search */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === f
                      ? "border-[#EE4D2D] bg-[#EE4D2D] text-white shadow-sm shadow-[#EE4D2D]/25"
                      : "border-gray-200 bg-white text-gray-500 hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
                  }`}
                >
                  <span>{filterIcons[f]}</span>
                  <span>{f}</span>
                </button>
              ))}
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar grupo..."
              className="h-9 rounded-xl border-gray-200 bg-white text-sm shadow-sm shadow-black/[0.02] focus-visible:ring-[#EE4D2D]/30 sm:max-w-[220px]"
            />
          </div>

          {/* Groups grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((g) => (
              <div key={g.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06] transition-all hover:shadow-md hover:shadow-[#EE4D2D]/5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold leading-tight text-gray-900">{g.name}</div>
                      {parseActiveNow(g.bestTime) && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          🟢 Ativo agora
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-400">{g.platform}</div>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#FFF8F5] px-2 py-0.5 text-[10px] font-medium text-[#EE4D2D]/80">
                    {g.category}
                  </span>
                </div>

                {/* Info */}
                <div className="mt-3 space-y-1.5 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-gray-400" />
                    <span>{g.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>Melhor horário: <span className="font-medium text-gray-700">{g.bestTime}</span></span>
                  </div>
                  {g.verificationNote && (
                    <div className="flex items-start gap-1.5">
                      <Tag className="mt-0.5 h-3 w-3 text-gray-400" />
                      <span>{g.verificationNote}</span>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-600">{g.description}</p>

                {/* Buttons */}
                <div className="mt-auto flex gap-2 pt-3">
                  {isAdmin ? (
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex-1" onClick={() => setSelectedGroupId(g.id)}>
                      <Button variant="outline" size="sm" className="w-full rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-600 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
                        <ExternalLink className="mr-1 h-3 w-3" /> Abrir grupo
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl border-gray-200 bg-white text-xs font-medium text-gray-400" disabled>
                      <RefreshCcw className="mr-1 h-3 w-3 animate-spin" style={{ animationDuration: "2s" }} /> Atualizando...
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl bg-[#EE4D2D] text-xs font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 active:scale-[0.98] disabled:opacity-50"
                    onClick={() => { handleCopy(); setSelectedGroupId(g.id); }}
                    disabled={!text}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copiar texto
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF8F5]">
                  <ExternalLink className="h-6 w-6 text-[#EE4D2D]/60" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-500">Nenhum grupo encontrado</p>
                <p className="mt-1 text-xs text-gray-400">para os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
