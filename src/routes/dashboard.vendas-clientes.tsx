import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useShopSyncData, type Period } from "../hooks/useShopSyncData";
import {
  useApp,
  MARKETPLACE_LABEL,
  type Marketplace,
  type SalesOrder,
  ORDER_STATUS_LIST,
  ORDER_TIMELINE,
  getOrderStatus,
  getOrderTimelineIndex,
  getOrderDayDiff,
  getSaleStatusInfo,
  getProductImage,
} from "../lib/state";
import { brl } from "../lib/format";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Receipt, ShoppingBag, Wallet, TrendingUp, Truck, Package, CheckCircle2, Copy, X, Mail, Phone, MapPin, Store, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/vendas-clientes")({ component: VendasClientes });

const LOGO: Record<Marketplace, string> = {
  shopee: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
};
const FALLBACK: Record<Marketplace, string> = {
  shopee: "/brands/shopee-logo.svg",
};
function MPLogo({ mp, className }: { mp: Marketplace; className?: string }) {
  return <img src={LOGO[mp]} alt={MARKETPLACE_LABEL[mp]} className={className} onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = FALLBACK[mp]; }} />;
}

const STATUS_TONE: Record<string, string> = {
  "Venda recebida": "bg-slate-500/15 text-slate-300 border-slate-500/30",
  "Pagamento aprovado": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  "Fornecedor acionado": "bg-violet-500/15 text-violet-300 border-violet-500/30",
  "Produto em separação": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "Produto enviado": "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "Pedido em transporte": "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "Pedido entregue": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "Comissão liberada": "bg-primary/15 text-primary border-primary/30",
};

function formatDateBR(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateLong(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

type RangeKey = "all" | "today" | "7d" | "30d";

function inRange(saleDate: number, range: RangeKey) {
  if (range === "all") return true;
  const d = getOrderDayDiff(saleDate);
  if (range === "today") return d === 0;
  if (range === "7d") return d <= 6;
  return d <= 29;
}

function VendasClientes() {
  const { data } = useApp();
  const orders = data.salesOrders;

  const [mp, setMp] = useState<"all" | Marketplace>("all");
  const [status, setStatus] = useState<"all" | (typeof ORDER_STATUS_LIST)[number]>("all");
  const [range, setRange] = useState<RangeKey>("all");
  const [productId, setProductId] = useState<string>("all");
  const [detail, setDetail] = useState<SalesOrder | null>(null);

  const period: Period =
    range === "today" ? "today" : range === "7d" ? "7days" : range === "30d" ? "30days" : "all";
  const { totalCommission, totalRevenue, totalOrders } = useShopSyncData(period);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (mp !== "all" && o.marketplace !== mp) return false;
      if (status !== "all" && getOrderStatus(o.saleDate) !== status) return false;
      if (!inRange(o.saleDate, range)) return false;
      if (productId !== "all" && o.productId !== productId) return false;
      return true;
    });
  }, [orders, mp, status, range, productId]);

  const metrics = useMemo(() => {
    let supplier = 0, prep = 0, sent = 0;
    for (const o of filtered) {
      supplier += o.supplierCost;
      const s = getOrderStatus(o.saleDate);
      if (s === "Venda recebida" || s === "Pagamento aprovado" || s === "Fornecedor acionado" || s === "Produto em separação") prep += 1;
      if (s === "Produto enviado" || s === "Pedido em transporte" || s === "Pedido entregue") sent += 1;
    }
    return { supplier, prep, sent };
  }, [filtered]);

  return (
    <DashboardShell title="Vendas / Clientes" subtitle="Acompanhe pedidos, clientes, fornecedores e comissões geradas pelos seus produtos.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={<Receipt className="h-4 w-4" />} label="Vendas registradas" value={String(totalOrders)} />
        <MetricCard icon={<Wallet className="h-4 w-4" />} label="Faturamento em pedidos" value={brl(totalRevenue)} />
        <MetricCard icon={<Truck className="h-4 w-4" />} label="Repassado a fornecedores" value={brl(metrics.supplier)} />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Comissão líquida" value={brl(totalCommission)} accent />
        <MetricCard icon={<Package className="h-4 w-4" />} label="Pedidos em preparação" value={String(metrics.prep)} />
        <MetricCard icon={<ShoppingBag className="h-4 w-4" />} label="Pedidos enviados" value={String(metrics.sent)} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterGroup label="Período">
            <Chip active={range === "all"} onClick={() => setRange("all")}>Tudo</Chip>
            <Chip active={range === "today"} onClick={() => setRange("today")}>Hoje</Chip>
            <Chip active={range === "7d"} onClick={() => setRange("7d")}>Últimos 7 dias</Chip>
            <Chip active={range === "30d"} onClick={() => setRange("30d")}>Últimos 30 dias</Chip>
          </FilterGroup>
          <FilterGroup label="Status">
            <Chip active={status === "all"} onClick={() => setStatus("all")}>Todos</Chip>
            {ORDER_STATUS_LIST.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Produto">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-border bg-background/50 px-3 py-1.5 text-xs"
            >
              <option value="all">Todos os produtos</option>
              {data.meusProdutos.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FilterGroup>
        </div>
      </div>

      <div className="mt-6">
        {orders.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum pedido corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} onOpen={() => setDetail(o)} />
            ))}
          </div>
        )}
      </div>

      <OrderDetailDialog order={detail} onClose={() => setDetail(null)} />
    </DashboardShell>
  );
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${accent ? "bg-primary/15 text-primary" : "bg-background/60 text-foreground/70"}`}>{icon}</span>
        {label}
      </div>
      <div className={`mt-2 text-xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/40 text-muted-foreground hover:text-foreground"}`}>{children}</button>
  );
}

function OrderCard({ order, onOpen }: { order: SalesOrder; onOpen: () => void }) {
  const { label, step, total, pct } = getSaleStatusInfo(order.saleDate);
  const tone = STATUS_TONE[label] ?? "bg-muted/30 text-muted-foreground border-border";
  const imgSrc = getProductImage(order as unknown as Record<string, unknown>);
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-white p-2 overflow-hidden">
          <img
            src={imgSrc}
            alt={order.productName}
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
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pedido #{order.id}</div>
            <div className="grid h-4 w-8 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={order.marketplace} className="max-h-3 max-w-full object-contain" /></div>
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold">{order.productName}</h3>
          <div className="mt-1 text-xs text-muted-foreground">Cliente: <span className="text-foreground">{order.customerName}</span></div>
          {order.source === "boost_simulation" && (
            <span className="mt-1 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Impulsionamento
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Mini label="Valor pago" value={brl(order.salePrice)} />
        <Mini label="Comissão" value={brl(order.netProfit)} accent />
        <Mini label="Fornecedor" value={order.supplierName} />
        <Mini label="Marketplace" value={MARKETPLACE_LABEL[order.marketplace]} />
      </div>

      {/* Status pipeline */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Etapa {step} de {total}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-right text-[10px] text-muted-foreground">{formatDateBR(order.saleDate)}</div>
      </div>

      <Button size="sm" variant="outline" className="mt-3" onClick={onOpen}>Ver detalhes</Button>
    </div>
  );
}
function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-0.5 truncate text-xs font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-bold">Nenhuma venda registrada ainda</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Quando seus produtos começarem a receber pedidos, eles aparecerão aqui com dados do cliente, fornecedor, status e comissão.</p>
      <Link to="/dashboard/meus-produtos"><Button className="mt-5">Ver meus produtos</Button></Link>
    </div>
  );
}

function OrderDetailDialog({ order, onClose }: { order: SalesOrder | null; onClose: () => void }) {
  if (!order) return null;
  const status = getOrderStatus(order.saleDate);
  const tlIdx = getOrderTimelineIndex(order.saleDate);
  const dayDiff = getOrderDayDiff(order.saleDate);
  const estDelivery = order.saleDate + 4 * 86400000;

  const summary = [
    `Pedido #${order.id}`,
    `Produto: ${order.productName}`,
    `Cliente: ${order.customerName}`,
    `Marketplace: ${MARKETPLACE_LABEL[order.marketplace]}`,
    `Valor pago pelo cliente: ${brl(order.salePrice)}`,
    `Repassado ao fornecedor: -${brl(order.supplierCost)}`,
    `Taxa estimada do marketplace: -${brl(order.marketplaceFee)}`,
    `Custo operacional: -${brl(order.operationalCost)}`,
    `Lucro líquido estimado: ${brl(order.netProfit)}`,
    `Status atual: ${status}`,
  ].join("\n");

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedido #{order.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cliente</div>
            <div className="mt-2 grid gap-1.5 text-xs">
              <div className="text-sm font-semibold">{order.customerName}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{order.customerEmailMasked}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{order.customerPhoneMasked}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{order.customerLocation}</div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Produto</div>
            <div className="mt-2 flex gap-3">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-white p-2 overflow-hidden">
                <img
                  src={getProductImage(order as unknown as Record<string, unknown>)}
                  alt={order.productName}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.onerror = null;
                    t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="flex-1 space-y-1.5 text-xs">
                <div className="text-sm font-semibold">{order.productName}</div>
                <div className="flex items-center gap-2"><span className="grid h-4 w-8 place-items-center rounded-sm bg-white p-0.5"><MPLogo mp={order.marketplace} className="max-h-3 max-w-full object-contain" /></span>{MARKETPLACE_LABEL[order.marketplace]}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Store className="h-3.5 w-3.5" />{order.supplierName}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{order.supplierLocation}</div>
                <div className="text-xs">Preço de venda: <span className="font-semibold">{brl(order.salePrice)}</span></div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Resumo financeiro do pedido</div>
            <div className="mt-2 space-y-1.5 text-xs">
              <Row label="Valor pago pelo cliente" value={brl(order.salePrice)} />
              <Row label="Repassado ao fornecedor" value={`-${brl(order.supplierCost)}`} muted />
              <Row label="Taxa estimada do marketplace" value={`-${brl(order.marketplaceFee)}`} muted />
              <Row label="Custo operacional" value={`-${brl(order.operationalCost)}`} muted />
              <div className="my-1 h-px bg-border" />
              <Row label="Lucro líquido estimado" value={brl(order.netProfit)} accent />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Status do pedido</div>
                <div className="mt-1 text-sm font-semibold">{status}</div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div className="flex items-center justify-end gap-1"><Calendar className="h-3 w-3" /> Venda: {formatDateLong(order.saleDate)}</div>
                <div className="mt-1">Entrega estimada: {formatDateLong(estDelivery)}</div>
                <div className="mt-1">Comissão: <span className={dayDiff >= 0 ? "text-primary" : "text-muted-foreground"}>{dayDiff >= 7 ? "Liberada" : "Adicionada ao painel"}</span></div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {ORDER_TIMELINE.map((step, i) => {
                const done = i < tlIdx;
                const current = i === tlIdx;
                return (
                  <div key={step} className="flex items-center gap-3 text-xs">
                    <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      done
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : current
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background/40 text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle2 className="h-3 w-3" /> : <span className="text-[9px] font-bold">{i + 1}</span>}
                    </div>
                    <div className={`flex-1 ${current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground"}`}>{step}</div>
                    {current && (
                      <span className="text-[10px] text-primary font-medium">Etapa {i + 1} de {ORDER_TIMELINE.length}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(summary); toast.success("Resumo copiado."); }}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar resumo</Button>
            <Link to="/dashboard/meus-produtos"><Button variant="outline">Ver produto</Button></Link>
            <Button onClick={onClose}><X className="mr-1 h-3.5 w-3.5" /> Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`font-semibold ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}