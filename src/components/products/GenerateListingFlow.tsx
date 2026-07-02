import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { brl } from "../../lib/format";
import { suppliers } from "../../lib/mock/suppliers";
import type { Product } from "../../lib/mock/products";
import { Check, Copy, Loader2, Send, ArrowRight, Plug } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useApp, MARKETPLACE_LABEL, type Marketplace, type SavedProduct } from "../../lib/state";

type Step = "gerando" | "anuncio" | "fornecedor" | "marketplaces" | "preco" | "enviando" | "sucesso";

const LOGO: Record<Marketplace, string> = {
  shopee: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
};
const FALLBACK: Record<Marketplace, string> = {
  shopee: "/brands/shopee-logo.svg",
};

function MPLogo({ mp, className }: { mp: Marketplace; className?: string }) {
  return <img src={LOGO[mp]} alt={MARKETPLACE_LABEL[mp]} className={className} onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = FALLBACK[mp]; }} />;
}

const STEP_DOTS = ["anuncio", "fornecedor", "marketplaces", "preco"] as const;

export function GenerateListingFlow({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const { saveMeuProduto, getApprovedMarketplaces } = useApp();
  const [step, setStep] = useState<Step>("gerando");
  const [supplierId, setSupplierId] = useState<string>("s1");
  const [margin, setMargin] = useState(30);
  const [sendProgress, setSendProgress] = useState(0);
  const [selectedMPs, setSelectedMPs] = useState<Marketplace[]>([]);
  const [connected, setConnected] = useState<Marketplace[]>([]);

  useEffect(() => {
    if (!open || !product) return;
    setStep("gerando"); setSupplierId("s1"); setMargin(30); setSendProgress(0);
    const conn = getApprovedMarketplaces();
    setConnected(conn);
    setSelectedMPs(conn.length === 1 ? [conn[0]] : []);
    const t = setTimeout(() => setStep("anuncio"), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

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
          // Save to "Meus Produtos"
          if (calc) {
            const now = Date.now();
            const saved: SavedProduct = {
              id: String(now),
              productId: product.id,
              name: product.name,
              image: product.image,
              category: product.category,
              marketplaces: selectedMPs,
              supplierName: supplier.name,
              supplierLocation: supplier.location,
              supplierCost,
              margin,
              marketplaceFee: calc.fee,
              operationalCost: calc.operational,
              recommendedPrice: calc.recommended,
              estimatedCommission: calc.netProfit,
              estimatedNetProfit: calc.netProfit,
              generatedTitle: `${product.name} — Original, Envio Rápido, Pronta Entrega`,
              generatedDescription: product.description,
              generatedKeywords: product.keywords,
              promotionText: listingText,
              status: "Em configuração",
              currentStep: "Produto em configuração",
              sentAt: now,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* ── Step indicator dots ── */}
        {step !== "gerando" && step !== "enviando" && step !== "sucesso" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEP_DOTS.map((s, i) => {
              const currentIdx = STEP_DOTS.indexOf(step as typeof STEP_DOTS[number]);
              const isActive = i === currentIdx;
              const isDone = i >= 0 && i < currentIdx;
              return (
                <div key={s} className={`rounded-full transition-all duration-300 ${
                  isActive ? "h-2.5 w-2.5 bg-[#EE4D2D]"
                  : isDone ? "h-2 w-2 bg-emerald-400"
                  : "h-2 w-2 bg-gray-200"
                }`} />
              );
            })}
          </div>
        )}

        {/* ═══ STEP: gerando ═══ */}
        {step === "gerando" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <img src={product.image} alt={product.name} className="h-28 w-28 rounded-2xl object-contain bg-gray-50 p-2 animate-pulse" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#EE4D2D] animate-bounce" style={{animationDelay:"0ms"}} />
                <span className="h-2 w-2 rounded-full bg-[#EE4D2D] animate-bounce" style={{animationDelay:"150ms"}} />
                <span className="h-2 w-2 rounded-full bg-[#EE4D2D] animate-bounce" style={{animationDelay:"300ms"}} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700">Preparando seu anúncio...</p>
            <AnimatedStatusText texts={["Analisando produto...","Otimizando título...","Calculando preços...","Pronto!"]} />
          </div>
        )}

        {/* ═══ STEP: anuncio ═══ */}
        {step === "anuncio" && (
          <div className="space-y-4">
            {/* Product preview card */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4">
              <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-contain bg-gray-50 p-1" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{product.name} — Original, Envio Rápido</h3>
                <div className="mt-1 flex flex-wrap gap-1">{product.keywords.slice(0,3).map(k => <span key={k} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{k}</span>)}</div>
              </div>
            </div>
            {/* Generated listing */}
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-[#FAFAFA] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pré-visualização do anúncio</h4>
                <button onClick={() => { navigator.clipboard.writeText(listingText); toast.success("Anúncio copiado!"); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D] transition-colors">
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{listingText}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep("fornecedor")} className="rounded-xl bg-[#EE4D2D] text-white hover:bg-[#d93e22]">
                Continuar <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: fornecedor ═══ */}
        {step === "fornecedor" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Escolha seu fornecedor</h3>
              <p className="text-sm text-gray-500">Selecione o centro de distribuição com melhor custo-benefício</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {suppliers.map((s) => {
                const cost = s.id === "s1" ? product.supplierCostRJ : product.supplierCostSP;
                const selected = supplierId === s.id;
                const otherId = s.id === "s1" ? "s2" : "s1";
                const otherCost = otherId === "s1" ? product.supplierCostRJ : product.supplierCostSP;
                const savings = otherCost - cost;
                return (
                  <button key={s.id} onClick={() => setSupplierId(s.id)}
                    className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                      selected ? "border-[#EE4D2D] bg-[#FFF8F5]" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}>
                    {selected && <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#EE4D2D] flex items-center justify-center"><Check className="h-3.5 w-3.5 text-white" /></div>}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{s.location.split(" ")[0].slice(0,2)}</div>
                      <div>
                        <div className="font-semibold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.location}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-gray-50 rounded-lg p-2"><div className="text-gray-400">Preço</div><div className="font-semibold text-gray-900">{brl(cost)}</div></div>
                      <div className="bg-gray-50 rounded-lg p-2"><div className="text-gray-400">Prazo</div><div className="font-semibold text-gray-900">{s.dispatchTime}</div></div>
                      <div className="bg-gray-50 rounded-lg p-2"><div className="text-gray-400">Estoque</div><div className="font-semibold text-gray-900">{s.baseStock} un.</div></div>
                      <div className="bg-gray-50 rounded-lg p-2"><div className="text-gray-400">Nota</div><div className="font-semibold text-amber-500">{s.reputation.toFixed(1)} ★</div></div>
                    </div>
                    {savings > 0 && !selected && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Economize {brl(savings)}</div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep("marketplaces")} className="rounded-xl bg-[#EE4D2D] text-white hover:bg-[#d93e22]">
                Selecionar fornecedor <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: marketplaces ═══ */}
        {step === "marketplaces" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Escolha onde enviar</h3>
              <p className="text-sm text-gray-500">Selecione uma ou mais contas conectadas para publicar o anúncio</p>
            </div>
            {connected.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
                <Plug className="mx-auto h-8 w-8 text-gray-300" />
                <h4 className="mt-4 text-base font-semibold text-gray-700">Nenhuma conexão validada</h4>
                <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">Para enviar produtos para sua loja, conecte sua conta Shopee primeiro.</p>
                <Link to="/dashboard/conectar-contas"><Button className="mt-4 rounded-xl">Conectar conta</Button></Link>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  {connected.map((mp) => {
                    const sel = selectedMPs.includes(mp);
                    return (
                      <button key={mp} onClick={() => toggleMP(mp)} className={`text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
                        sel ? "border-[#EE4D2D] bg-[#FFF8F5]" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="grid h-10 w-16 place-items-center rounded-lg bg-gray-50 p-1.5">
                            <MPLogo mp={mp} className="max-h-7 max-w-full object-contain" />
                          </div>
                          {sel && <Check className="h-4 w-4 text-[#EE4D2D]" />}
                        </div>
                        <div className="mt-3 font-semibold text-gray-900">{MARKETPLACE_LABEL[mp]}</div>
                        <div className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Conexão validada</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <Link to="/dashboard/conectar-contas"><Button variant="outline" className="rounded-xl">Conectar mais contas</Button></Link>
                  <Button onClick={() => { if (selectedMPs.length === 0) { toast.error("Selecione pelo menos um marketplace para continuar."); return; } setStep("preco"); }} className="rounded-xl bg-[#EE4D2D] text-white hover:bg-[#d93e22]">
                    Continuar para precificação <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP: preco ═══ */}
        {step === "preco" && calc && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Defina seu lucro</h3>
              <p className="text-sm text-gray-500">Ajuste a margem para encontrar o preço ideal</p>
            </div>
            {/* Margin display */}
            <div className="rounded-2xl border border-[#EE4D2D]/20 bg-[#FFF8F5] p-5 text-center">
              <div className="text-[11px] font-medium text-[#EE4D2D]/70 uppercase mb-1">Margem de lucro</div>
              <div className="text-4xl font-bold text-[#EE4D2D] tabular-nums">{margin}%</div>
            </div>
            {/* Slider */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <Slider min={10} max={100} step={1} value={[margin]} onValueChange={(v) => setMargin(v[0])}
                className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#EE4D2D] [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-md [&_.bg-primary]:bg-[#EE4D2D]" />
              <div className="flex justify-between mt-2 text-[10px] text-gray-400"><span>10%</span><span>100%</span></div>
            </div>
            {/* Stats */}
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Preço sugerido" value={brl(calc.recommended)} accent />
              <StatCard label="Lucro por venda" value={brl(calc.netProfit)} />
              <StatCard label="Custo operacional" value={brl(calc.operational)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={runSend} className="rounded-xl bg-[#EE4D2D] text-white hover:bg-[#d93e22] shadow-sm shadow-[#EE4D2D]/25">
                <Send className="mr-1.5 h-3.5 w-3.5" /> {sendButtonLabel()}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: enviando ═══ */}
        {step === "enviando" && (
          <div className="flex flex-col items-center py-12">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-2xl bg-[#FFF8F5] flex items-center justify-center">
                <Send className="h-7 w-7 text-[#EE4D2D]" />
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-[#EE4D2D]/20 animate-ping" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-4">Enviando para os marketplaces selecionados...</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#EE4D2D] to-orange-400 transition-all duration-300" style={{width:`${sendProgress}%`}} />
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
            <style>{`
              @keyframes bounce-in{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
              @keyframes particle-out{0%{opacity:1;transform:rotate(var(--r,0deg)) translateY(0)}100%{opacity:0;transform:rotate(var(--r,0deg)) translateY(-60px)}}
            `}</style>
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center" style={{animation:"bounce-in 0.5s ease-out both"}}>
                <Check className="h-10 w-10 text-emerald-500" />
              </div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full"
                  style={{
                    background: ["#EE4D2D","#10B981","#8B5CF6","#3B82F6","#F59E0B","#EC4899","#14B8A6","#F97316"][i],
                    animation: `particle-out 0.7s ease-out forwards`,
                    animationDelay: `${i*0.04}s`,
                    transform: `rotate(${i*45}deg) translateY(-40px)`,
                    ["--r" as any]: `${i*45}deg`,
                  }} />
              ))}
            </div>
            <h3 className="mt-5 text-lg font-bold text-gray-900">Anúncio enviado!</h3>
            <p className="mt-1 text-sm text-gray-500 text-center max-w-xs">Seu produto está em configuração e estará disponível em até 3 dias úteis.</p>
            <div className="mt-6 flex justify-center">
              <Link to="/dashboard/grupos"><Button className="rounded-xl bg-[#EE4D2D] text-white hover:bg-[#d93e22]">Divulgar nos Grupos <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
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

function AnimatedStatusText({ texts }: { texts: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= texts.length - 1) return;
    const t = setTimeout(() => setI(i + 1), 450);
    return () => clearTimeout(t);
  }, [i, texts.length]);
  return <p className="mt-2 text-xs text-gray-400 transition-opacity duration-300">{texts[i]}</p>;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? "bg-[#FFF8F5] border border-[#EE4D2D]/20" : "bg-gray-50 border border-gray-100"}`}>
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-[#EE4D2D]" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

function StepLine({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done
        ? <Check className="h-3.5 w-3.5 text-emerald-400" />
        : <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300" />}
      <span className={done ? "text-gray-700" : "text-gray-400"}>{label}</span>
    </li>
  );
}
