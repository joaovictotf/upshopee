import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Slider } from "../ui/slider";
import { brl } from "../../lib/format";
import { suppliers } from "../../lib/mock/suppliers";
import type { Product } from "../../lib/mock/products";
import { Check, Copy, Loader2, Send, ArrowRight, Plug } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useApp, MARKETPLACE_LABEL, type Marketplace, type SavedProduct } from "../../lib/state";

type Step = "gerando" | "anuncio" | "fornecedor" | "marketplaces" | "preco" | "enviando" | "sucesso";

const AI_PHASES = [
  { text: "Analisando produto...", until: 15 },
  { text: "Pesquisando mercado...", until: 30 },
  { text: "Criando título otimizado...", until: 50 },
  { text: "Gerando descrição persuasiva...", until: 70 },
  { text: "Calculando preço ideal...", until: 85 },
  { text: "Finalizando anúncio...", until: 100 },
];

const AI_DURATION_MS = 10_000;

const LOGO: Record<Marketplace, string> = {
  shopee: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
};
const FALLBACK: Record<Marketplace, string> = {
  shopee: "/brands/shopee-logo.svg",
};

const STEP_DOTS = ["anuncio", "fornecedor", "marketplaces", "preco"] as const;

export function GenerateListingFlow({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const { saveMeuProduto, getApprovedMarketplaces } = useApp();
  const [step, setStep] = useState<Step>("gerando");
  const [supplierId, setSupplierId] = useState<string>("s1");
  const [margin, setMargin] = useState(30);
  const [sendProgress, setSendProgress] = useState(0);
  const [selectedMPs, setSelectedMPs] = useState<Marketplace[]>([]);
  const [connected, setConnected] = useState<Marketplace[]>([]);

  // ── AI generation progress (10 seconds) ──
  const [aiProgress, setAiProgress] = useState(0);
  const aiRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    setStep("gerando"); setSupplierId("s1"); setMargin(30); setSendProgress(0); setAiProgress(0);
    const conn = getApprovedMarketplaces();
    setConnected(conn);
    setSelectedMPs(conn.length === 1 ? [conn[0]] : []);

    // Smooth RAF-based 10-second progress
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / AI_DURATION_MS) * 100);
      setAiProgress(pct);
      if (pct < 100) {
        aiRef.current = requestAnimationFrame(tick);
      } else {
        setStep("anuncio");
      }
    };
    aiRef.current = requestAnimationFrame(tick);

    return () => { if (aiRef.current) cancelAnimationFrame(aiRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  // Determine current AI phase text
  const aiPhaseText = useCallback((pct: number) => {
    for (const phase of AI_PHASES) {
      if (pct <= phase.until) return phase.text;
    }
    return AI_PHASES[AI_PHASES.length - 1].text;
  }, []);

  const supplier = suppliers.find((s) => s.id === supplierId)!;
  const supplierCost = useMemo(() => supplierId === "s1" ? product?.supplierCostRJ ?? 0 : product?.supplierCostSP ?? 0, [supplierId, product]);
  const calc = useMemo(() => {
    if (!product) return null;
    const operational = 4.5;
    const fee = 0.18;
    const recommended = (supplierCost + supplierCost * (margin / 100) + operational) / (1 - fee);
    const netProfit = recommended - supplierCost - operational - recommended * fee;
    return { operational, fee, recommended, netProfit };
  }, [supplierCost, margin, product]);

  const listingText = useMemo(() => {
    if (!product) return "";
    return `🔥 ${product.name}\n\n${product.description}\n\nBenefícios:\n• Envio rápido\n• Produto pronto para revenda\n• Fornecedor verificado (${supplier?.location ?? "BR"})\n\nGarantia da loja. Estoque limitado.\n\n🔗 Compre aqui: ${product.sourceUrl}\n\nCategoria: ${product.category}\nPalavras-chave: ${product.keywords.join(", ")}`;
  }, [product, supplier]);

  if (!product) return null;

  const toggleMP = (mp: Marketplace) => setSelectedMPs((prev) => prev.includes(mp) ? prev.filter((m) => m !== mp) : [...prev, mp]);

  const sendButtonLabel = () => {
    if (selectedMPs.length === 0) return "Enviar";
    if (selectedMPs.length === 1) return `Enviar para ${selectedMPs[0] === "shopee" ? "minha loja Shopee" : MARKETPLACE_LABEL[selectedMPs[0]]}`;
    return "Enviar para marketplaces selecionados";
  };

  const runSend = () => {
    if (selectedMPs.length === 0) { toast.error("Selecione pelo menos um marketplace para continuar."); return; }
    setStep("enviando"); setSendProgress(0);
    const id = setInterval(() => {
      setSendProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          if (calc) {
            const now = Date.now();
            const saved: SavedProduct = {
              id: String(now), productId: product.id, name: product.name, image: product.image,
              category: product.category, marketplaces: selectedMPs,
              supplierName: supplier.name, supplierLocation: supplier.location, supplierCost,
              margin, marketplaceFee: calc.fee, operationalCost: calc.operational,
              recommendedPrice: calc.recommended, estimatedCommission: calc.netProfit,
              estimatedNetProfit: calc.netProfit,
              generatedTitle: `${product.name} — Original, Envio Rápido, Pronta Entrega`,
              generatedDescription: product.description, generatedKeywords: product.keywords,
              promotionText: listingText, status: "Em configuração",
              currentStep: "Produto em configuração", sentAt: now,
              estimatedReadyAt: now + 1 * 24 * 60 * 60 * 1000,
            };
            saveMeuProduto(saved);
          }
          setStep("sucesso");
          return 100;
        }
        return p + 5;
      });
    }, 140);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border-[var(--border)] bg-[var(--surface)] p-6">
        {/* ── Step indicator dots ── */}
        {step !== "gerando" && step !== "enviando" && step !== "sucesso" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEP_DOTS.map((s, i) => {
              const currentIdx = STEP_DOTS.indexOf(step as typeof STEP_DOTS[number]);
              const isActive = i === currentIdx;
              const isDone = i >= 0 && i < currentIdx;
              return (
                <div key={s} className={`rounded-full transition-all duration-300 ${
                  isActive ? "h-2.5 w-2.5 bg-[var(--accent)]"
                  : isDone ? "h-2 w-2 bg-emerald-400"
                  : "h-2 w-2 bg-[var(--border)]"
                }`} />
              );
            })}
          </div>
        )}

        {/* ═══ STEP: gerando (10s AI animation) ═══ */}
        {step === "gerando" && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            {/* Product image with glowing ring */}
            <div className="relative mb-8">
              {/* Glowing ring */}
              <div
                className="absolute -inset-3 rounded-3xl opacity-40"
                style={{
                  background: `conic-gradient(from 0deg, var(--accent, #F4541E), transparent 60%, transparent 100%)`,
                  animation: "spin 2.5s linear infinite",
                  filter: "blur(1px)",
                }}
              />
              <img
                src={product.image}
                alt={product.name}
                className="relative h-28 w-28 rounded-2xl object-cover bg-[var(--muted-bg)]"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  if (t.dataset.fb === "1") return;
                  t.dataset.fb = "1";
                  t.src = "https://placehold.co/600x600/fce7f3/be185d?text=Produto";
                }}
              />
            </div>

            {/* Status text */}
            <p className="text-sm font-medium text-[var(--text)] mb-1.5">{aiPhaseText(aiProgress)}</p>
            <p className="text-xs text-[var(--muted)] mb-6">Gerando com inteligência artificial</p>

            {/* Progress bar */}
            <div className="w-full max-w-xs h-1.5 rounded-full bg-[var(--muted-bg)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-linear"
                style={{ width: `${aiProgress}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[var(--muted)]">{Math.round(aiProgress)}%</p>
          </div>
        )}

        {/* ═══ STEP: anuncio ═══ */}
        {step === "anuncio" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Pré-visualização do anúncio</h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">Revise o conteúdo gerado pela IA antes de publicar</p>
            </div>

            {/* Product card */}
            <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover bg-[var(--muted-bg)]" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2">{product.name} — Original, Envio Rápido</h3>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {product.keywords.slice(0, 3).map((k) => (
                    <span key={k} className="rounded-md bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Listing text */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Texto do anúncio</h4>
                <button onClick={() => { navigator.clipboard.writeText(listingText); toast.success("Anúncio copiado!"); }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors">
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              </div>
              <p className="text-sm text-[var(--text)] whitespace-pre-line leading-relaxed">{listingText}</p>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setStep("fornecedor")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]">
                Continuar <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP: fornecedor ═══ */}
        {step === "fornecedor" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Escolha seu fornecedor</h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">Selecione o centro de distribuição com melhor custo-benefício</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {suppliers.map((s) => {
                const cost = s.id === "s1" ? product.supplierCostRJ : product.supplierCostSP;
                const selected = supplierId === s.id;
                return (
                  <button key={s.id} onClick={() => setSupplierId(s.id)}
                    className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/30"
                    }`}>
                    {selected && (
                      <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-[var(--text)]">{s.name}</div>
                      <div className="text-xs text-[var(--muted)]">{s.location}</div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">Preço</span>
                        <span className="font-semibold text-[var(--text)]">{brl(cost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">Prazo</span>
                        <span className="font-semibold text-[var(--text)]">{s.dispatchTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">Estoque</span>
                        <span className="font-semibold text-[var(--text)]">{s.baseStock} un.</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep("marketplaces")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]">
                Selecionar fornecedor <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP: marketplaces ═══ */}
        {step === "marketplaces" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Escolha onde enviar</h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">Selecione uma ou mais contas conectadas para publicar o anúncio</p>
            </div>
            {connected.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-center">
                <Plug className="mx-auto h-8 w-8 text-[var(--muted)]" />
                <h4 className="mt-4 text-base font-semibold text-[var(--text)]">Nenhuma conexão validada</h4>
                <p className="mt-1 text-sm text-[var(--muted)] max-w-xs mx-auto">Para enviar produtos para sua loja, conecte sua conta Shopee primeiro.</p>
                <Link to="/dashboard/conectar-contas">
                  <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]">
                    Conectar conta
                  </button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {connected.map((mp) => {
                    const sel = selectedMPs.includes(mp);
                    return (
                      <button key={mp} onClick={() => toggleMP(mp)}
                        className={`flex items-center gap-4 rounded-2xl border-2 p-4 transition-all duration-200 w-full ${
                          sel ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/30"
                        }`}>
                        <div className="grid h-10 w-16 shrink-0 place-items-center rounded-lg bg-[var(--muted-bg)] p-1.5">
                          <img src={LOGO[mp]} alt={MARKETPLACE_LABEL[mp]} className="max-h-7 max-w-full object-contain"
                            onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = FALLBACK[mp]; }} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-[var(--text)]">{MARKETPLACE_LABEL[mp]}</div>
                          <span className="inline-block mt-0.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Conectado</span>
                        </div>
                        {sel && <Check className="h-5 w-5 text-[var(--accent)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Link to="/dashboard/conectar-contas">
                    <button className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors">
                      Conectar mais contas
                    </button>
                  </Link>
                  <button onClick={() => { if (selectedMPs.length === 0) { toast.error("Selecione pelo menos um marketplace para continuar."); return; } setStep("preco"); }}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]">
                    Continuar para precificação <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP: preco ═══ */}
        {step === "preco" && calc && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Defina seu lucro</h3>
              <p className="text-sm text-[var(--muted)] mt-0.5">Ajuste a margem para encontrar o preço ideal</p>
            </div>

            {/* Margin display */}
            <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-5 text-center">
              <div className="text-[11px] font-medium text-[var(--accent)]/70 uppercase mb-1">Margem de lucro</div>
              <div className="text-4xl font-bold text-[var(--accent)] tabular-nums">{margin}%</div>
            </div>

            {/* Slider */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <Slider min={10} max={100} step={1} value={[margin]} onValueChange={(v) => setMargin(v[0])}
                className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[var(--accent)] [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-[var(--accent)]" />
              <div className="flex justify-between mt-2 text-[10px] text-[var(--muted)]"><span>10%</span><span>100%</span></div>
            </div>

            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Preço sugerido" value={brl(calc.recommended)} accent />
              <StatCard label="Lucro por venda" value={brl(calc.netProfit)} />
              <StatCard label="Custo operacional" value={brl(calc.operational)} />
            </div>

            <div className="flex justify-end">
              <button onClick={runSend}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]">
                <Send className="h-3.5 w-3.5" /> {sendButtonLabel()}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP: enviando ═══ */}
        {step === "enviando" && (
          <div className="flex flex-col items-center py-12">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center">
                <Send className="h-7 w-7 text-[var(--accent)]" />
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--text)] mb-4">Enviando para os marketplaces selecionados...</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-[var(--muted-bg)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${sendProgress}%` }} />
            </div>
            <ul className="mt-5 space-y-2 w-full max-w-xs">
              <StepLine done={sendProgress > 20} label="Gerando anúncio" />
              <StepLine done={sendProgress > 45} label="Vinculando fornecedor" />
              <StepLine done={sendProgress > 70} label="Preparando configuração" />
              <StepLine done={sendProgress >= 100} label="Enviando para marketplaces" />
            </ul>
          </div>
        )}

        {/* ═══ STEP: sucesso ═══ */}
        {step === "sucesso" && (
          <div className="flex flex-col items-center py-10">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-10 w-10 text-emerald-400" />
              </div>
            </div>
            <h3 className="mt-5 text-lg font-bold text-[var(--text)]">Anúncio enviado!</h3>
            <p className="mt-1 text-sm text-[var(--muted)] text-center max-w-xs">
              Seu produto está em configuração e estará disponível em até 3 dias úteis.
            </p>
            <div className="mt-6 flex justify-center">
              <Link to="/dashboard/grupos">
                <button className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]">
                  Divulgar nos Grupos <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? "bg-[var(--accent-soft)] border border-[var(--accent)]/20" : "border border-[var(--border)] bg-[var(--surface)]"}`}>
      <div className="text-[10px] text-[var(--muted)] mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>{value}</div>
    </div>
  );
}

function StepLine({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done
        ? <Check className="h-3.5 w-3.5 text-emerald-400" />
        : <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--muted)]" />}
      <span className={done ? "text-[var(--text)]" : "text-[var(--muted)]"}>{label}</span>
    </li>
  );
}
