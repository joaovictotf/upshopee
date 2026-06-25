import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { brl } from "../../lib/format";
import { suppliers } from "../../lib/mock/suppliers";
import type { Product } from "../../lib/mock/products";
import { Check, Copy, Loader2, Send, ArrowRight, Truck, Star, Boxes, Plug, ExternalLink } from "lucide-react";
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
        <DialogHeader>
          <DialogTitle className="text-base">{stepTitle(step)}</DialogTitle>
        </DialogHeader>

        {step === "gerando" && (
          <div className="grid place-items-center py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">Gerando anúncio do produto...</p>
          </div>
        )}

        {step === "anuncio" && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <img src={product.image} alt={product.name} className="h-24 w-24 rounded-lg bg-white object-contain p-2" />
              <div className="flex-1">
                <h3 className="font-semibold">Título do anúncio</h3>
                <p className="mt-1 text-sm">{product.name} — Original, Envio Rápido, Pronta Entrega</p>
              </div>
            </div>
            <Section title="Descrição"><p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p></Section>
            <Section title="Categoria"><p className="text-sm">{product.category}</p></Section>
            <Section title="Palavras-chave"><div className="flex flex-wrap gap-1.5">{product.keywords.map((k) => <span key={k} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{k}</span>)}</div></Section>
            <Section title="🔗 Link do produto (incluído no texto)">
              <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline break-all">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {product.sourceUrl}
              </a>
            </Section>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(listingText); toast.success("Anúncio copiado com sucesso."); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar anúncio</Button>
              <Button onClick={() => setStep("fornecedor")}>Continuar <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {step === "fornecedor" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Selecione o fornecedor para vincular após a ativação do produto.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {suppliers.map((s) => {
                const cost = s.id === "s1" ? product.supplierCostRJ : product.supplierCostSP;
                const selected = supplierId === s.id;
                return (
                  <button key={s.id} onClick={() => setSupplierId(s.id)} className={`text-left rounded-xl border p-4 transition ${selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.location}</div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Info label="Preço no fornecedor" value={brl(cost)} />
                      <Info label="Estoque" value={`${s.baseStock} un.`} />
                      <Info label="Prazo" value={s.dispatchTime} />
                      <Info label="Reputação" value={`${s.reputation.toFixed(1)}/5`} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {s.shipping}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> Verificado</span>
                      <span className="flex items-center gap-1"><Boxes className="h-3 w-3" /> Estoque alto</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end"><Button onClick={() => setStep("marketplaces")}>Selecionar fornecedor <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></div>
          </div>
        )}

        {step === "marketplaces" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Escolha onde deseja subir este produto</h3>
              <p className="text-xs text-muted-foreground">Selecione uma ou mais contas conectadas para preparar o envio do anúncio. Você pode selecionar mais de um marketplace.</p>
            </div>
            {connected.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                <Plug className="mx-auto h-7 w-7 text-muted-foreground" />
                <h4 className="mt-3 text-base font-semibold">Nenhuma conexão validada</h4>
                <p className="mt-1 text-sm text-muted-foreground">Para enviar produtos para sua loja, aguarde a validação da sua conexão pela equipe UpShopee.</p>
                <Link to="/dashboard/conectar-contas"><Button className="mt-4">Ver conexões <ExternalLink className="ml-1 h-3.5 w-3.5" /></Button></Link>
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  {connected.map((mp) => {
                    const sel = selectedMPs.includes(mp);
                    return (
                      <button key={mp} onClick={() => toggleMP(mp)} className={`text-left rounded-xl border p-4 transition ${sel ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border bg-card hover:border-primary/40"}`}>
                        <div className="flex items-center justify-between">
                          <div className="grid h-9 w-16 place-items-center rounded-md bg-white p-1.5">
                            <MPLogo mp={mp} className="max-h-6 max-w-full object-contain" />
                          </div>
                          {sel && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="mt-3 font-semibold">{MARKETPLACE_LABEL[mp]}</div>
                        <div className="mt-1 inline-block rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">Conexão validada</div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between gap-2">
                  <Link to="/dashboard/conectar-contas"><Button variant="outline">Conectar mais contas</Button></Link>
                  <Button onClick={() => { if (selectedMPs.length === 0) { toast.error("Selecione pelo menos um marketplace para continuar."); return; } setStep("preco"); }}>Continuar para precificação <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "preco" && calc && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Marketplaces selecionados</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedMPs.map((mp) => (
                  <span key={mp} className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 text-xs">
                    <span className="grid h-5 w-9 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={mp} className="max-h-3.5 max-w-full object-contain" /></span>
                    {MARKETPLACE_LABEL[mp]}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">As taxas podem variar de acordo com o marketplace selecionado.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Produto" value={product.name} />
              <Info label="Fornecedor" value={supplier.name} />
              <Info label="Valor no fornecedor" value={brl(supplierCost)} />
              <Info label="Taxa estimada" value={`${(calc.fee * 100).toFixed(0)}%`} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <Label>Quanto você quer ter de lucro?</Label>
                <span className="text-sm font-bold text-primary">{margin}%</span>
              </div>
              <Slider min={10} max={100} step={1} value={[margin]} onValueChange={(v) => setMargin(v[0])} className="mt-3" />
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <BigStat label="Preço recomendado" value={brl(calc.recommended)} accent />
                <BigStat label="Lucro líquido" value={brl(calc.netProfit)} />
                <BigStat label="Custo operacional" value={brl(calc.operational)} />
              </div>
            </div>
            <div className="flex justify-end"><Button onClick={runSend}><Send className="mr-1 h-3.5 w-3.5" /> {sendButtonLabel()}</Button></div>
          </div>
        )}

        {step === "enviando" && (
          <div className="py-10">
            <div className="mx-auto max-w-md">
              <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-primary" /><p className="text-sm font-medium">Enviando produto para os marketplaces selecionados...</p></div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedMPs.map((mp) => (
                  <span key={mp} className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs"><span className="grid h-4 w-7 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={mp} className="max-h-3 max-w-full object-contain" /></span>{MARKETPLACE_LABEL[mp]}</span>
                ))}
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${sendProgress}%` }} /></div>
              <ul className="mt-5 space-y-2 text-xs">
                <StepLine done={sendProgress > 20} label="Gerando anúncio" />
                <StepLine done={sendProgress > 45} label="Vinculando fornecedor" />
                <StepLine done={sendProgress > 70} label="Preparando configuração" />
                <StepLine done={sendProgress >= 100} label="Enviando para marketplaces selecionados" />
              </ul>
            </div>
          </div>
        )}

        {step === "sucesso" && (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><Check className="h-6 w-6" /></div>
            <h3 className="mt-4 text-lg font-bold">Produto enviado com sucesso para configuração{selectedMPs.length > 1 ? " nos marketplaces selecionados" : ""}.</h3>
            <p className="mt-1 text-sm text-muted-foreground">Prazo médio de até 3 dias úteis para estar disponível {selectedMPs.length > 1 ? "nas contas conectadas" : "no marketplace selecionado"}.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">O fornecedor selecionado será vinculado ao{selectedMPs.length > 1 ? "s pedidos" : " pedido"} após ativação.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {selectedMPs.map((mp) => (
                <span key={mp} className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-1 text-xs"><span className="grid h-4 w-7 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={mp} className="max-h-3 max-w-full object-contain" /></span>{MARKETPLACE_LABEL[mp]}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Acompanhe o andamento deste produto na aba Meus Produtos.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/dashboard/meus-produtos"><Button variant="outline">Ver em Meus Produtos</Button></Link>
              <Link to="/dashboard/grupos"><Button>Escolher grupos de divulgação <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-3"><h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4><div className="mt-2">{children}</div></div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-background/40 p-2"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-0.5 text-sm font-medium">{value}</div></div>;
}
function BigStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-lg p-3 ${accent ? "bg-primary/10 border border-primary/30" : "bg-background/40 border border-border"}`}><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className={`mt-1 text-base font-bold ${accent ? "text-primary" : ""}`}>{value}</div></div>;
}
function StepLine({ done, label }: { done: boolean; label: string }) {
  return <li className="flex items-center gap-2">{done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}<span className={done ? "" : "text-muted-foreground"}>{label}</span></li>;
}
function stepTitle(s: Step) { return { gerando: "Gerando seu anúncio", anuncio: "Anúncio gerado", fornecedor: "Selecione o fornecedor", marketplaces: "Escolher marketplaces", preco: "Defina sua margem de lucro", enviando: "Enviando produto", sucesso: "Pronto!" }[s]; }