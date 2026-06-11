import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp, MARKETPLACE_LABEL, type Marketplace, type SavedProduct, getProductImage } from "../lib/state";
import { brl } from "../lib/format";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Copy, ExternalLink, Megaphone, Package, Sparkles, Clock, Store, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/meus-produtos")({ component: MeusProdutos });

const LOGO: Record<Marketplace, string> = {
  shopee: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
};
const FALLBACK: Record<Marketplace, string> = {
  shopee: "/brands/shopee-logo.svg",
};

function MPLogo({ mp, className }: { mp: Marketplace; className?: string }) {
  return <img src={LOGO[mp]} alt={MARKETPLACE_LABEL[mp]} className={className} onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = FALLBACK[mp]; }} />;
}

function MeusProdutos() {
  const { data } = useApp();
  const [detail, setDetail] = useState<SavedProduct | null>(null);
  const [gen, setGen] = useState<SavedProduct | null>(null);

  return (
    <DashboardShell title="Meus Produtos" subtitle="Acompanhe os produtos enviados para configuração nas suas lojas.">
      {data.meusProdutos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-bold">Nenhum produto enviado ainda</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Escolha um produto na aba Produtos, gere o anúncio e envie para sua loja para acompanhar tudo por aqui.</p>
          <Link to="/dashboard/produtos"><Button className="mt-5">Escolher produtos</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.meusProdutos.map((p) => (
            <ProductCard key={p.id} p={p} onDetail={() => setDetail(p)} onGen={() => setGen(p)} />
          ))}
        </div>
      )}

      <DetailDialog product={detail} onClose={() => setDetail(null)} onGen={(p) => { setDetail(null); setGen(p); }} />
      <GeneratorDialog product={gen} onClose={() => setGen(null)} />
    </DashboardShell>
  );
}

function ProductCard({ p, onDetail, onGen }: { p: SavedProduct; onDetail: () => void; onGen: () => void }) {
  const isReady = p.status === "Pronto para venda" || p.status === "Disponível na loja";
  const isPending = p.productValidationStatus === "pending_validation";
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white p-2 overflow-hidden">
          <img
            src={getProductImage(p as unknown as Record<string, unknown>)}
            alt={p.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              t.onerror = null;
              t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
          <div className="mt-1 text-[10px] text-muted-foreground">{p.category}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {p.marketplaces.map((mp) => (
              <span key={mp} className="inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-1.5 py-0.5 text-[10px]">
                <span className="grid h-3 w-6 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={mp} className="max-h-2.5 max-w-full object-contain" /></span>
                {MARKETPLACE_LABEL[mp]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Mini label="Fornecedor" value={p.supplierName} />
        <Mini label="Preço fornecedor" value={brl(p.supplierCost)} />
        <Mini label="Preço recomendado" value={brl(p.recommendedPrice)} />
        <Mini label="Lucro líquido" value={brl(p.estimatedNetProfit)} accent />
      </div>

      <div className="mt-3 rounded-lg border border-border bg-background/40 p-2">
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${isReady ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
            {isReady ? <CheckCircle2 className="h-3 w-3" /> : null}
            {p.status}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> {isReady ? "Produto disponível na loja" : isPending ? "Aguardando validação da equipe ShopeSync" : "Prazo estimado: até 1 dia útil"}
          </span>
        </div>
        <Progress ready={isReady} />
        {isPending && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Seu produto está em análise e será liberado assim que a configuração for validada.
          </p>
        )}
        {isReady && !isPending && (
          <p className="mt-2 text-[10px] text-emerald-400/80">
            Produto liberado para venda e acompanhamento pelo painel.
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onDetail}>Ver detalhes</Button>
        <Button size="sm" className="flex-1" onClick={onGen}><Megaphone className="mr-1 h-3.5 w-3.5" /> Gerar texto</Button>
      </div>
    </div>
  );
}

function Progress({ ready }: { ready?: boolean }) {
  const steps = ["Enviado", "Anúncio", "Fornecedor", "Aguardando", "Pronto"];
  const current = ready ? steps.length - 1 : 2;
  return (
    <div className="mt-2 flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-1 rounded-full ${i <= current ? "bg-primary" : "bg-border"}`} />
          <div className={`mt-1 text-[9px] ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xs font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function DetailDialog({ product, onClose, onGen }: { product: SavedProduct | null; onClose: () => void; onGen: (p: SavedProduct) => void }) {
  if (!product) return null;
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="grid h-32 w-32 place-items-center rounded-lg bg-white p-3 overflow-hidden">
              <img
                src={getProductImage(product as unknown as Record<string, unknown>)}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.onerror = null;
                  t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground"><Store className="h-3.5 w-3.5" /> {product.supplierName}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {product.supplierLocation}</div>
              <div className="flex flex-wrap gap-1">
                {product.marketplaces.map((mp) => {
                  const ready = product.status === "Pronto para venda" || product.status === "Disponível na loja";
                  return (
                    <span key={mp} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5">
                      <span className="grid h-3 w-6 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={mp} className="max-h-2.5 max-w-full object-contain" /></span>
                      {MARKETPLACE_LABEL[mp]}: <span className={ready ? "text-emerald-400" : "text-amber-400"}>{product.status}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Mini label="Preço fornecedor" value={brl(product.supplierCost)} />
            <Mini label="Margem" value={`${product.margin}%`} />
            <Mini label="Preço recomendado" value={brl(product.recommendedPrice)} accent />
            <Mini label="Lucro líquido" value={brl(product.estimatedNetProfit)} accent />
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Anúncio gerado</div>
            <div className="mt-1 text-sm font-medium">{product.generatedTitle}</div>
            <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{product.generatedDescription}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] uppercase text-muted-foreground">Texto de divulgação</div>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{product.promotionText}</pre>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(product.generatedDescription); toast.success("Anúncio copiado."); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar anúncio</Button>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(product.promotionText); toast.success("Texto copiado."); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar divulgação</Button>
            <Button onClick={() => onGen(product)}><Megaphone className="mr-1 h-3.5 w-3.5" /> Gerar novo texto</Button>
            <Link to="/dashboard/grupos"><Button variant="outline">Abrir grupos <ExternalLink className="ml-1 h-3.5 w-3.5" /></Button></Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Tom = "Direto" | "Oferta" | "Urgente" | "Simples" | "Profissional";

function generate(p: SavedProduct, tom: Tom) {
  const preco = brl(p.recommendedPrice);
  switch (tom) {
    case "Direto":
      return `${p.name}\n\n${p.generatedDescription}\n\nPor ${preco}. Envio rápido. Garanta o seu!`;
    case "Oferta":
      return `🔥 OFERTA! ${p.name} por apenas ${preco}.\n\n${p.generatedDescription}\n\nAproveite antes que acabe.`;
    case "Urgente":
      return `⏰ ÚLTIMAS UNIDADES! ${p.name}\n\n${p.generatedDescription}\n\nPor ${preco}. Não fique de fora!`;
    case "Simples":
      return `${p.name} disponível em configuração para venda.\n\n${p.generatedDescription}\n\nValor estimado: ${preco}.`;
    case "Profissional":
      return `Produto disponível: ${p.name}.\n\n${p.generatedDescription}\n\nValor de venda recomendado: ${preco}. Categoria: ${p.category}. Fornecedor verificado.`;
  }
}

function GeneratorDialog({ product, onClose }: { product: SavedProduct | null; onClose: () => void }) {
  const [tom, setTom] = useState<Tom>("Oferta");
  const [text, setText] = useState("");
  if (!product) return null;
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Gerar texto de divulgação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Produto</Label>
            <div className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm">{product.name}</div>
          </div>
          <div>
            <Label className="text-xs">Tom da mensagem</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(["Direto", "Oferta", "Urgente", "Simples", "Profissional"] as Tom[]).map((t) => (
                <button key={t} onClick={() => setTom(t)} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${tom === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={() => setText(generate(product, tom) || "")}>Gerar texto</Button>
          {text && (
            <>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="text-xs" />
              <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(text); toast.success("Texto copiado com sucesso."); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar texto</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}