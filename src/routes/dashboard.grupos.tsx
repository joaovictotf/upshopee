import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useRef, useState } from "react";
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
  "Direto",
  "Oferta urgente",
  "Simples",
  "Profissional",
  "Chamativo",
  "Grupo de WhatsApp",
  "Grupo do Facebook",
] as const;
type Tone = (typeof tones)[number];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePromoText(opts: { name: string; price?: number; category?: string; tone: Tone }): string {
  const { name, price, tone } = opts;
  const priceStr = price && price > 0 ? brl(price) : null;
  const priceLine = priceStr ? `por apenas ${priceStr}` : "com condições especiais";
  const cta = pick([
    "Clique no link e confira agora.",
    "Garanta o seu antes que acabe.",
    "Toque no link e aproveite.",
    "Não perca essa oportunidade.",
    "Aproveite enquanto está disponível.",
    "Corre que ainda dá tempo!",
  ]);

  switch (tone) {
    case "Oferta urgente": {
      const fire = pick(["🔥", "🚨", "⚡", "⏰"]);
      const hook = pick([
        "Oferta por tempo limitado!",
        "Últimas unidades disponíveis!",
        "Promoção relâmpago!",
        "Desconto especial só hoje!",
      ]);
      const benefit = pick([
        "Ideal para quem quer aproveitar antes que acabe.",
        "Estoque limitado, não fique de fora.",
        "Os primeiros levam, depois acaba.",
        "Quem ver primeiro, garante.",
      ]);
      return `${fire} ${hook}\n${name} ${priceLine}.\n${benefit}\n${cta}`;
    }
    case "Profissional": {
      const intro = pick([
        `Confira ${name}, uma opção prática para quem busca qualidade e bom custo-benefício.`,
        `Apresentamos ${name}, uma escolha equilibrada entre qualidade e preço.`,
        `Conheça ${name}, um produto bem avaliado e com excelente acabamento.`,
      ]);
      const detail = priceStr
        ? `Disponível ${priceLine}, com envio rápido.`
        : `Disponível para compra com condições especiais.`;
      return `${intro}\n${detail}\n${cta}`;
    }
    case "Grupo de WhatsApp": {
      const emoji = pick(["🛍️", "✨", "💥", "🛒"]);
      return `${emoji} ${name} ${priceLine}!\n${pick(["Olha que achadinho!", "Olha esse preço!", "Corre lá!", "Não perde!"])}\n${cta}`;
    }
    case "Grupo do Facebook": {
      const emoji = pick(["🛒", "✨", "🔥", "💖"]);
      const intro = pick([
        `${emoji} Pessoal, achei ${name} ${priceLine} e precisava compartilhar com vocês.`,
        `${emoji} Olha o que encontrei: ${name} ${priceLine}. Vale muito a pena dar uma olhada.`,
        `${emoji} Achadinho do dia: ${name} ${priceLine}. Aproveitei e to deixando o link aqui.`,
      ]);
      const benefit = pick([
        "Envio rápido e produto bem avaliado.",
        "Excelente custo-benefício para o dia a dia.",
        "Quem já comprou aprovou nos comentários.",
      ]);
      return `${intro}\n${benefit}\n${cta}`;
    }
    case "Chamativo": {
      const open = pick(["✨ ACHADINHO TOP ✨", "💥 OLHA ESSE PREÇO 💥", "🤩 IMPERDÍVEL 🤩", "🔥 TÁ VOANDO 🔥"]);
      return `${open}\n${name} ${priceLine}.\n${pick(["Bonito, prático e com bom preço.", "Qualidade que surpreende.", "Tudo o que você precisava em um só produto."])}\n${cta}`;
    }
    case "Simples": {
      return `${name} ${priceLine}.\n${cta}`;
    }
    case "Direto":
    default: {
      const close = pick([
        "Envio rápido, aproveite.",
        "Disponível agora.",
        "Confira no link.",
        "Toque para ver mais.",
      ]);
      return `${name} ${priceLine}. ${close}\n${cta}`;
    }
  }
}

function parseActiveNow(bestTime: string): boolean {
  const m = bestTime.match(/(\d+)h\s*às\s*(\d+)h/);
  if (!m) return false;
  const h = new Date().getHours();
  return h >= parseInt(m[1]) && h <= parseInt(m[2]);
}

function OldView() {
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

  const selectedProduct = useMemo(
    () => meus.find((p) => p.id === productId) ?? meus[0],
    [meus, productId],
  );

  const handleGenerate = () => {
    if (!selectedProduct) return;
    setLoading(true);
    const delay = 2000 + Math.floor(Math.random() * 1500);
    setTimeout(() => {
      const next = generatePromoText({
        name: selectedProduct.name,
        price: selectedProduct.recommendedPrice,
        category: selectedProduct.category,
        tone,
      });
      setText(next);
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

  const filters: Array<typeof filter> = ["Todos", "Facebook", "WhatsApp", "Achadinhos", "Promoções", "Shopee"];

  return (
    <DashboardShell title="Grupos de Divulgação" subtitle="Gere um texto com IA e divulgue nos grupos recomendados.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Gerador de texto com IA</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha um dos seus produtos e o tom da oferta. A IA cria um texto pronto para divulgar.
          </p>

          {meus.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Você ainda não possui produtos para divulgar.
              </p>
              <Link to="/dashboard/meus-produtos" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Ver meus produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Escolha o produto</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent>
                    {meus.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.image && (
                            <img src={p.image} alt="" className="h-5 w-5 rounded object-cover" />
                          )}
                          <span className="truncate">{p.name}</span>
                          {p.recommendedPrice > 0 && (
                            <span className="ml-1 text-[10px] text-muted-foreground">{brl(p.recommendedPrice)}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Escolha o tom</label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={loading || !selectedProduct}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar texto com IA</>
                )}
              </Button>

              {loading && (
                <div className="rounded-lg border border-border bg-background/40 p-3 text-center animate-in fade-in">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                  <p className="mt-2 text-xs font-medium text-foreground">
                    Inteligência artificial gerando o melhor texto para você divulgar nos grupos...
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Analisando produto, preço, tom da oferta e público ideal...
                  </p>
                </div>
              )}

              {!loading && text && (
                <div className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Texto gerado
                  </div>
                  <div className="mt-2 whitespace-pre-line text-sm">{text}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                      <Copy className="mr-1 h-3 w-3" /> Copiar texto
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGenerate}>
                      <RefreshCw className="mr-1 h-3 w-3" /> Gerar outro
                    </Button>
                    <Button size="sm" onClick={handleUseInGroups}>
                      <ArrowDown className="mr-1 h-3 w-3" /> Usar nos grupos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={groupsRef} className={`space-y-3 lg:col-span-2 rounded-xl transition-shadow ${highlightGroups ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            Os links abaixo são páginas públicas de grupos e comunidades. Alguns grupos podem exigir login, aprovação do administrador ou estar sujeitos à lotação.
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <RefreshCcw className="h-4 w-4 shrink-0 text-primary animate-spin" style={{ animationDuration: "2s" }} />
              <div>
                <div className="text-sm font-semibold text-primary">Grupos atualizando</div>
                <div className="text-xs text-muted-foreground">Nossa equipe está verificando e adicionando novos grupos de divulgação. Em breve estarão disponíveis.</div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    filter === f
                      ? "border-primary bg-primary text-primary-foreground"
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
                    <div className="text-sm font-semibold leading-tight">{g.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{g.platform}</div>
                  </div>
                  <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium">
                    {g.category}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{g.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Melhor horário: <span className="text-foreground">{g.bestTime}</span></span>
                  </div>
                  {g.verificationNote && (
                    <div className="flex items-start gap-1.5">
                      <Tag className="mt-0.5 h-3 w-3" />
                      <span>{g.verificationNote}</span>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-foreground/80">{g.description}</p>

                <div className="mt-auto flex gap-2 pt-3">
                  {isAdmin ? (
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="mr-1 h-3 w-3" /> Abrir grupo
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      <RefreshCcw className="mr-1 h-3 w-3 animate-spin" style={{ animationDuration: "2s" }} /> Atualizando...
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1"
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
    </DashboardShell>
  );
}

function NewView() {
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
      const next = generatePromoText({
        name: selectedProduct.name,
        price: selectedProduct.recommendedPrice,
        category: selectedProduct.category,
        tone,
      });
      setText(next);
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

  const filters: Array<typeof filter> = ["Todos", "Facebook", "WhatsApp", "Achadinhos", "Promoções", "Shopee"];

  const filterIcons: Record<typeof filter, string> = {
    "Todos": "🌐",
    "Facebook": "👤",
    "WhatsApp": "💬",
    "Achadinhos": "🏷️",
    "Promoções": "🔥",
    "Shopee": "🛍️",
  };

  const step = !text && !loading ? 1 : text && !selectedGroupId ? 2 : 3;

  return (
    <DashboardShell title="Grupos de Divulgação" subtitle="Gere um texto com IA e divulgue nos grupos recomendados.">
      {/* Guided stepper */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        {([
          { n: 1, label: "Gere seu texto" },
          { n: 2, label: "Escolha o grupo" },
          { n: 3, label: "Copie e publique" },
        ] as const).map(({ n, label }, i) => (
          <Fragment key={n}>
            {i > 0 && <div className="h-px flex-1 bg-border" />}
            <div
              className={`flex items-center gap-1.5 font-medium transition-colors ${
                step === n
                  ? "text-[#EA580C]"
                  : step > n
                  ? "text-gray-400 line-through"
                  : "text-gray-400"
              }`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  step === n
                    ? "bg-[#EA580C] text-white"
                    : step > n
                    ? "bg-gray-200 text-gray-500"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </Fragment>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT: generator panel */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#EA580C]" />
            <h3 className="text-sm font-semibold">Gerador de texto com IA</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha um dos seus produtos e o tom da oferta. A IA cria um texto pronto para divulgar.
          </p>

          {meus.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Você ainda não possui produtos para divulgar.
              </p>
              <Link to="/dashboard/meus-produtos" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Ver meus produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Escolha o produto</label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent>
                    {meus.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.image && (
                            <img src={p.image} alt="" className="h-5 w-5 rounded object-cover" />
                          )}
                          <span className="truncate">{p.name}</span>
                          {p.recommendedPrice > 0 && (
                            <span className="ml-1 text-[10px] text-muted-foreground">{brl(p.recommendedPrice)}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Escolha o tom</label>
                <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{tones.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-[#EA580C] text-white hover:bg-[#C2410C]" onClick={handleGenerate} disabled={loading || !selectedProduct}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar texto com IA</>
                )}
              </Button>

              {loading && (
                <div className="rounded-lg border border-border bg-background/40 p-3 text-center animate-in fade-in">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#EA580C]" />
                  <p className="mt-2 text-xs font-medium text-foreground">
                    Inteligência artificial gerando o melhor texto para você divulgar nos grupos...
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Analisando produto, preço, tom da oferta e público ideal...
                  </p>
                </div>
              )}

              {!loading && text && (
                <div className="rounded-xl border-2 border-[#EA580C]/40 bg-orange-50/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#EA580C]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Texto pronto! Escolha um grupo abaixo.
                  </div>
                  <div className="whitespace-pre-line text-sm text-gray-800">{text}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button size="sm" onClick={handleCopy} className="bg-[#EA580C] text-white hover:bg-[#C2410C]">
                      <Copy className="mr-1 h-3 w-3" /> Copiar texto
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGenerate}>
                      <RefreshCw className="mr-1 h-3 w-3" /> Gerar outro
                    </Button>
                    <Button size="sm" onClick={handleUseInGroups}>
                      <ArrowDown className="mr-1 h-3 w-3" /> Usar nos grupos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: groups panel */}
        <div ref={groupsRef} className={`space-y-3 lg:col-span-2 rounded-xl transition-shadow ${highlightGroups ? "ring-2 ring-[#EA580C] ring-offset-2 ring-offset-background" : ""}`}>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            Os links abaixo são páginas públicas de grupos e comunidades. Alguns grupos podem exigir login, aprovação do administrador ou estar sujeitos à lotação.
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <RefreshCcw className="h-4 w-4 shrink-0 text-primary animate-spin" style={{ animationDuration: "2s" }} />
              <div>
                <div className="text-sm font-semibold text-primary">Grupos atualizando</div>
                <div className="text-xs text-muted-foreground">Nossa equipe está verificando e adicionando novos grupos de divulgação. Em breve estarão disponíveis.</div>
              </div>
            </div>
          )}

          {text && !loading && (
            <div className="mb-3 rounded-xl border border-[#EA580C]/30 bg-orange-50/50 p-4">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[#EA580C]">
                📋 Texto pronto para publicar
              </div>
              <p className="line-clamp-3 whitespace-pre-line text-sm text-gray-700">{text}</p>
              <Button size="sm" onClick={handleCopy} className="mt-3 bg-[#EA580C] text-white hover:bg-[#C2410C]">
                <Copy className="mr-1 h-3 w-3" /> Copiar texto
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    filter === f
                      ? "border-[#EA580C] bg-[#EA580C] text-white"
                      : "border-border bg-card text-foreground hover:bg-accent"
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
              className="sm:max-w-[220px]"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((g) => (
              <div key={g.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
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
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{g.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Melhor horário: <span className="text-foreground">{g.bestTime}</span></span>
                  </div>
                  {g.verificationNote && (
                    <div className="flex items-start gap-1.5">
                      <Tag className="mt-0.5 h-3 w-3" />
                      <span>{g.verificationNote}</span>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-foreground/80">{g.description}</p>

                <div className="mt-auto flex gap-2 pt-3">
                  {isAdmin ? (
                    <a
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                      onClick={() => setSelectedGroupId(g.id)}
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="mr-1 h-3 w-3" /> Abrir grupo
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      <RefreshCcw className="mr-1 h-3 w-3 animate-spin" style={{ animationDuration: "2s" }} /> Atualizando...
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 bg-[#EA580C] text-white hover:bg-[#C2410C]"
                    onClick={() => { handleCopy(); setSelectedGroupId(g.id); }}
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
    </DashboardShell>
  );
}

function Grupos() {
  return <NewView />;
}
