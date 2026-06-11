import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { DemoShell } from "../components/layout/DemoShell";
import { groups } from "../lib/mock/groups";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  ExternalLink, Copy, Clock, Tag, ShieldCheck, Sparkles,
  Loader2, RefreshCw, ArrowDown, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/demo/grupos")({ component: DemoGrupos });

const TONES = ["Direto", "Oferta urgente", "Simples", "Chamativo", "Grupo de WhatsApp", "Grupo do Facebook"] as const;
type Tone = (typeof TONES)[number];

const MOCK_PRODUCT = { name: "Álbum da Copa do Mundo 2026", price: 79.9 };

function brl(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function buildText(tone: Tone): string {
  const { name, price } = MOCK_PRODUCT;
  const priceLine = `por apenas ${brl(price)}`;
  const cta = pick(["Clique no link e confira agora.", "Garanta o seu antes que acabe.", "Não perca essa oportunidade."]);
  if (tone === "Oferta urgente") {
    return `🔥 Oferta por tempo limitado!\n${name} ${priceLine}.\nEstoque limitado, não fique de fora.\n${cta}`;
  }
  if (tone === "Chamativo") {
    return `✨ ACHADINHO TOP ✨\n${name} ${priceLine}.\nQualidade que surpreende.\n${cta}`;
  }
  if (tone === "Grupo de WhatsApp") {
    return `🛍️ ${name} ${priceLine}!\nOlha que achadinho!\n${cta}`;
  }
  if (tone === "Grupo do Facebook") {
    return `🛒 Pessoal, achei ${name} ${priceLine} e precisava compartilhar com vocês.\nExcelente custo-benefício para o dia a dia.\n${cta}`;
  }
  if (tone === "Simples") {
    return `${name} ${priceLine}.\n${cta}`;
  }
  return `${name} ${priceLine}. Envio rápido, aproveite.\n${cta}`;
}

const FILTERS = ["Todos", "Facebook", "WhatsApp", "Achadinhos", "Promoções", "Shopee"] as const;
type Filter = (typeof FILTERS)[number];

function parseActiveNow(bestTime: string): boolean {
  const m = bestTime.match(/(\d+)h\s*às\s*(\d+)h/);
  if (!m) return false;
  const h = new Date().getHours();
  return h >= parseInt(m[1]) && h <= parseInt(m[2]);
}

function DemoGrupos() {
  const [privacy, setPrivacy] = useState(false);
  const [tone, setTone] = useState<Tone>("Oferta urgente");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("Todos");
  const [search, setSearch] = useState("");
  const groupsRef = useRef<HTMLDivElement | null>(null);
  const [highlightGroups, setHighlightGroups] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => { setText(buildText(tone)); setLoading(false); }, 1800 + Math.random() * 900);
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
      if (filter === "Facebook" || filter === "WhatsApp") {
        if (g.platform !== filter) return false;
      } else if (filter !== "Todos") {
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

  return (
    <DemoShell
      title="Grupos de Divulgação"
      subtitle="Gere um texto com IA e divulgue nos grupos recomendados."
      privacy={privacy}
      onTogglePrivacy={() => setPrivacy((p) => !p)}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Generator panel */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#EA580C]" />
            <h3 className="text-sm font-semibold">Gerador de texto com IA</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Produto selecionado: <strong>Álbum da Copa do Mundo 2026</strong>
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Tom da oferta</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      tone === t
                        ? "border-[#EA580C] bg-[#EA580C] text-white"
                        : "border-border bg-card text-foreground hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-[#EA580C] text-white hover:bg-[#C2410C]"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Gerar texto com IA</>
              )}
            </Button>

            {loading && (
              <div className="rounded-lg border border-border bg-background/40 p-3 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#EA580C]" />
                <p className="mt-2 text-xs font-medium">Inteligência artificial gerando o melhor texto...</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Analisando produto, preço e tom da oferta...</p>
              </div>
            )}

            {!loading && text && (
              <div className="rounded-xl border-2 border-[#EA580C]/40 bg-orange-50/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Texto pronto! Escolha um grupo abaixo.
                </div>
                <div className="whitespace-pre-line text-sm text-gray-800">{text}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={handleCopy} className="bg-[#EA580C] text-white hover:bg-[#C2410C]">
                    <Copy className="mr-1 h-3 w-3" /> Copiar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleGenerate}>
                    <RefreshCw className="mr-1 h-3 w-3" /> Gerar outro
                  </Button>
                  <Button size="sm" className="col-span-2" onClick={handleUseInGroups}>
                    <ArrowDown className="mr-1 h-3 w-3" /> Usar nos grupos
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Groups panel */}
        <div
          ref={groupsRef}
          className={`space-y-3 lg:col-span-2 rounded-xl transition-shadow ${highlightGroups ? "ring-2 ring-[#EA580C] ring-offset-2 ring-offset-background" : ""}`}
        >
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            Os links abaixo são páginas públicas de grupos e comunidades. Alguns grupos podem exigir login ou aprovação.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    filter === f
                      ? "border-[#EA580C] bg-[#EA580C] text-white"
                      : "border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar grupo..."
              className="sm:max-w-[220px]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((g) => (
              <div key={g.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold leading-tight">{g.name}</div>
                      {parseActiveNow(g.bestTime) && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          🟢 Ativo agora
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{g.platform}</div>
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium">
                    {g.category}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /><span>{g.status}</span></div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Melhor horário: <span className="text-foreground">{g.bestTime}</span></span>
                  </div>
                  {g.verificationNote && (
                    <div className="flex items-start gap-1.5"><Tag className="mt-0.5 h-3 w-3" /><span>{g.verificationNote}</span></div>
                  )}
                </div>

                <p className="mt-3 text-xs text-foreground/80">{g.description}</p>

                <div className="mt-auto flex gap-2 pt-3">
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="mr-1 h-3 w-3" /> Abrir grupo
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    className="flex-1 bg-[#EA580C] text-white hover:bg-[#C2410C]"
                    onClick={handleCopy}
                    disabled={!text}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copiar texto
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhum grupo encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
