import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp, getProductImage } from "../lib/state";
import { useShopSyncData, type Period } from "../hooks/useShopSyncData";
import { brl, num } from "../lib/format";
import {
  CartesianGrid,
  Line,
  LineChart,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Eye,
  EyeOff,
  Users,
  MousePointerClick,
  ShoppingBag,
  Boxes,
  Package,
  Flame,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { WithdrawalButton } from "../components/withdrawal/WithdrawalDialog";
import { BoostPromoModal } from "../components/boost/BoostPromoModal";

export const Route = createFileRoute("/dashboard/")({ component: DashboardHome });

const SHOPEE_LOGO = "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg";
const SHOPEE_FALLBACK = "/brands/shopee-logo.svg";

function ShopeeWordmark({ className }: { className?: string }) {
  return (
    <img
      src={SHOPEE_LOGO}
      alt="Shopee"
      className={className}
      onError={(e) => {
        const t = e.currentTarget;
        t.onerror = null;
        t.src = SHOPEE_FALLBACK;
      }}
    />
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatStamp(d = new Date()) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} (GMT-03)`;
}

function useAnimatedValue(target: number, duration = 600) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    fromRef.current = val;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

type RangeKey = "today" | "7d" | "30d";

const CHART_TITLE: Record<RangeKey, string> = {
  today: "Visão Geral de Vendas (Hoje)",
  "7d": "Visão Geral de Vendas (Últimos 7 dias)",
  "30d": "Visão Geral de Vendas (Últimos 30 dias)",
};

function DashboardHome() {
  return <NewDashboard />;
}

// ---------------------------------------------------------------------------
// NEW DASHBOARD (admin-only)
// ---------------------------------------------------------------------------

function NewDashboard() {
  const { privacy, isAdmin, getCommissionSum, isTodayReset } = useApp();
  const [range, setRange] = useState<RangeKey>("today");
  const [stamp, setStamp] = useState(() => formatStamp());

  useEffect(() => {
    const id = setInterval(() => setStamp(formatStamp()), 1000);
    return () => clearInterval(id);
  }, []);

  const period: Period = range === "today" ? "today" : range === "7d" ? "7days" : "30days";
  const {
    totalOrders: hookOrders,
    totalUnits: hookUnits,
    totalBuyers: hookBuyers,
    topProducts,
  } = useShopSyncData(period);

  // Single source of truth: data.salesOrders (lightning clicks included).
  const totalCommission = getCommissionSum("shopee", range);

  // Admin "today" presentation baseline keeps the panel looking live at the
  // start of the day; real orders (lightning included) stack on top of it.
  // After a reset (✕) the baseline is suppressed so every metric reads 0.
  const showBaseline = isAdmin && range === "today" && !isTodayReset;
  const displayCommission = totalCommission;
  const displayOrders = (showBaseline ? 252 : 0) + hookOrders;
  const displayUnits = (showBaseline ? 294 : 0) + hookUnits;
  const displayBuyers = (showBaseline ? 187 : 0) + hookBuyers;
  const displayVisitors = Math.max(0, displayOrders * 18);
  const displayViews = Math.max(0, displayOrders * 55);
  const displayConversionRate =
    displayOrders === 0 || displayVisitors === 0
      ? "0.00"
      : ((displayOrders / displayVisitors) * 100).toFixed(2);

  const todayCommission = getCommissionSum("shopee", "today");
  const todayFlat = isTodayReset && todayCommission === 0;

  const top5 = topProducts.map((p) => ({
    productId: p.productId,
    name: p.name,
    image: p.image,
    sales: p.orders,
    revenue: p.revenue,
  }));

  return (
    <DashboardShell title="Dashboard" subtitle="Painel ShopSync para Shopee">
      <BoostActiveMiniCard />
      <BoostPromoModal />
      <NewShopeeHeroPanel
        valor={displayCommission}
        privacy={privacy}
        stamp={stamp}
      />
      <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <NewMetricsBlock
            visitors={displayVisitors}
            views={displayViews}
            orders={displayOrders}
            units={displayUnits}
            buyers={displayBuyers}
            conversionRate={displayConversionRate}
            privacy={privacy}
          />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <NewSalesChart range={range} onRangeChange={setRange} todayFlat={todayFlat} />
        </div>
        <div className="lg:col-span-3 flex flex-col">
          <Top5Block items={top5} />
        </div>
      </div>
    </DashboardShell>
  );
}

// ---------------------------------------------------------------------------
// NewShopeeHeroPanel
// ---------------------------------------------------------------------------

function NewShopeeHeroPanel({
  valor,
  privacy,
  stamp,
}: {
  valor: number;
  privacy: boolean;
  stamp: string;
}) {
  const { isAdmin } = useApp();
  const animated = useAnimatedValue(valor);
  const animated_formatted = animated.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="relative bg-[#EE4D2D] rounded-2xl overflow-hidden px-4 pt-8 pb-8 text-center">
      {/* Shopee S logo top-left */}
      <img
        src="/brands/shopee-logo.svg"
        alt="Shopee"
        className="absolute top-4 left-4 h-20 w-20 object-contain brightness-0 invert opacity-90"
      />

      <h1 className="text-2xl sm:text-3xl font-bold text-white">Vendas Hoje</h1>
      {/* Date/time pill */}
      <div className="mt-2 inline-flex items-center bg-[#C84120] rounded-full px-3 py-1 text-white text-xs sm:text-sm font-medium">
        {stamp}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button className="rounded-md border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
          Painel de Mineração
        </button>
        <Link to="/dashboard/metricas" className="rounded-md border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
          Ver Métricas Detalhadas &gt;
        </Link>
      </div>

      {/* White card fully inside the banner — no overlap */}
      <div className="mt-6 mx-auto max-w-3xl">
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] px-3 sm:px-8 py-4 sm:py-6 text-center">
          <div className="flex items-baseline justify-center gap-3">
            {!privacy && (
              <span
                className="text-2xl sm:text-4xl font-bold text-[#EE4D2D]"
                style={{ fontFamily: "Arial,Helvetica,sans-serif", lineHeight: 1 }}
              >
                R$
              </span>
            )}
            <span
              className="text-5xl sm:text-8xl font-black text-[#EE4D2D] tabular-nums"
              style={{
                fontFamily: "Arial,Helvetica,sans-serif",
                letterSpacing: "-3px",
                lineHeight: 1.05,
              }}
            >
              {privacy ? "•••••" : animated_formatted}
            </span>
          </div>
          {!isAdmin && (
            <div className="mt-3">
              <WithdrawalButton />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewMetricsBlock — 3 rows × 2 columns, no icons
// ---------------------------------------------------------------------------

function NewMetricsBlock({
  visitors,
  views,
  orders,
  units,
  buyers,
  conversionRate,
  privacy,
}: {
  visitors: number;
  views: number;
  orders: number;
  units: number;
  buyers: number;
  conversionRate: string;
  privacy: boolean;
}) {
  const mask = "•••";

  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold text-foreground">Métricas Principais</h3>
      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
        <NewMetricCell label="Visitantes" value={privacy ? mask : num(visitors)} />
        <NewMetricCell label="Visualizações da Página" value={privacy ? mask : num(views)} />
        <NewMetricCell label="Pedidos" value={privacy ? mask : num(orders)} />
        <NewMetricCell label="Unidades" value={privacy ? mask : num(units)} />
        <NewMetricCell label="Total de Compradores" value={privacy ? mask : num(buyers)} />
        <NewMetricCell label="Taxa de Conversão" value={privacy ? mask : `${conversionRate}%`} />
      </div>
    </div>
  );
}

function NewMetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4 text-center">
      <div className="text-[11px] font-medium text-[#EE4D2D] leading-tight">{label}</div>
      <div
        className="mt-1.5 text-2xl font-bold text-foreground tabular-nums"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          letterSpacing: "-0.5px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewSalesChart — AreaChart, orange + teal
// ---------------------------------------------------------------------------

function NewSalesChart({
  range,
  onRangeChange,
  todayFlat,
}: {
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  todayFlat?: boolean;
}) {
  const chartData = useMemo(() => {
    if (range === "today") {
      const arr: { label: string; hoje: number | null; ontem: number }[] = [];
      const h = new Date().getHours();
      const peakAt = (i: number, c: number, w: number, amp: number) =>
        Math.max(0, amp * Math.exp(-Math.pow((i - c) / w, 2)));
      for (let i = 0; i < 24; i++) {
        const hojeRaw = Math.round(
          peakAt(i, 10, 1.6, 870) + peakAt(i, 18, 2.1, 660) + peakAt(i, 14, 2.3, 180)
        );
        const ontemRaw = Math.round(
          peakAt(i, 10, 2.2, 220) + peakAt(i, 17, 2.6, 260) + peakAt(i, 14, 2.5, 110)
        );
        // After a reset with no new sales, today's line stays flat at zero.
        const hoje = i <= h ? (todayFlat ? 0 : hojeRaw) : null;
        arr.push({ label: pad2(i), hoje, ontem: ontemRaw });
      }
      return arr;
    }
    const n = range === "7d" ? 7 : 30;
    const today = new Date();
    return Array.from({ length: n }, (_, idx) => {
      const i = n - 1 - idx;
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const seed = i * 1.3;
      const ontem = Math.max(0, Math.round(420 + Math.sin(seed) * 180 + Math.cos(seed * 0.7) * 90));
      const hoje = Math.max(0, Math.round(360 + Math.sin(seed + 1) * 200));
      return {
        label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
        hoje,
        ontem,
      };
    });
  }, [range, todayFlat]);

  // Yesterday's date label for legend
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayLabel = `${pad2(yesterday.getDate())}/${pad2(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`;

  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      {/* Header: range tabs + legend */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground break-words">{CHART_TITLE[range]}</h3>
          {/* Legend */}
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[#EE4D2D]" />
              Hoje
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded bg-[#14B8A6]"
                style={{ borderTop: "2px dashed #14B8A6", height: 0 }}
              />
              {yesterdayLabel}
            </span>
          </div>
        </div>

        {/* Range tabs */}
        <div className="inline-flex items-center rounded-full bg-background/40 p-0.5 text-[11px]">
          {(
            [
              ["today", "Hoje"],
              ["7d", "7 Dias"],
              ["30d", "30 Dias"],
            ] as const
          ).map(([key, label]) => {
            const active = range === key;
            return (
              <button
                key={key}
                onClick={() => onRangeChange(key)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  active
                    ? "bg-[#EE4D2D] text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Y-axis label + chart */}
      <div className="relative mt-3 h-60">
        {/* Rotated Y-axis label */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 origin-center text-[9px] text-muted-foreground pointer-events-none select-none"
          style={{ transform: "translateX(-4px) translateY(-50%) rotate(-90deg)", transformOrigin: "center center", whiteSpace: "nowrap" }}
          aria-hidden="true"
        >
          Vendas(R$)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
            <defs>
              <linearGradient id="fillHoje" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EE4D2D" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EE4D2D" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="fillOntem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(17,24,39,0.07)" />
            <XAxis
              dataKey="label"
              stroke="rgba(17,24,39,0.55)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "rgba(17,24,39,0.12)" }}
              interval={range === "30d" ? 3 : range === "today" ? 1 : 0}
            />
            <YAxis
              stroke="rgba(17,24,39,0.55)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(17,24,39,0.1)",
                borderRadius: 8,
                color: "#111827",
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(17,24,39,0.65)" }}
              formatter={(v: number | string, name: string) => [
                Number(v ?? 0).toLocaleString("pt-BR"),
                name === "hoje" ? "Hoje" : "Ontem",
              ]}
            />
            {/* Ontem — teal dashed, minimal fill */}
            <Area
              type="monotone"
              dataKey="ontem"
              stroke="#14B8A6"
              strokeWidth={2}
              strokeDasharray="5 3"
              fill="url(#fillOntem)"
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            {/* Hoje — orange solid, light orange fill */}
            <Area
              type="monotone"
              dataKey="hoje"
              stroke="#EE4D2D"
              strokeWidth={2.2}
              fill="url(#fillHoje)"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom note — no "Crie anúncios" link */}
      <div className="mt-3 text-center text-[11px] text-muted-foreground">
        Os vendedores que usam os Anúncios da Shopee estão recebendo 65% mais pedidos em média.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OLD DASHBOARD (non-admin users, unchanged)
// ---------------------------------------------------------------------------

function OldDashboard() {
  const { data, isAdmin, privacy, setPrivacy, getCommissionSum } = useApp();
  const [range, setRange] = useState<RangeKey>("today");
  const commissionValue = getCommissionSum("shopee", range);
  const [stamp, setStamp] = useState(() => formatStamp());

  useEffect(() => {
    const id = setInterval(() => setStamp(formatStamp()), 1000);
    return () => clearInterval(id);
  }, []);

  const rangeStartTs = useMemo(() => {
    if (range === "today") {
      const nowSP = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );
      nowSP.setHours(0, 0, 0, 0);
      return nowSP.getTime();
    }
    const days = range === "7d" ? 7 : 30;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d.getTime();
  }, [range]);

  const top5 = useMemo(() => {
    type Row = {
      productId: string;
      name: string;
      image: string;
      totalUnits: number;
      totalRevenue: number;
    };
    const grouped = new Map<string, Row>();
    for (const o of data.salesOrders) {
      if (o.saleDate < rangeStartTs) continue;
      const key = o.productId || o.productName || o.id;
      const prev = grouped.get(key);
      if (prev) {
        prev.totalUnits += 1;
        prev.totalRevenue += o.salePrice;
        if (!prev.image) prev.image = getProductImage(o as unknown as Record<string, unknown>);
      } else {
        grouped.set(key, {
          productId: key,
          name: o.productName,
          image: getProductImage(o as unknown as Record<string, unknown>),
          totalUnits: 1,
          totalRevenue: o.salePrice,
        });
      }
    }
    const ranked = Array.from(grouped.values()).sort(
      (a, b) => b.totalUnits - a.totalUnits || b.totalRevenue - a.totalRevenue,
    );
    const byLocalId = new Map(data.meusProdutos.map((p) => [p.id, p]));
    return ranked.slice(0, 5).map((r) => {
      const p = byLocalId.get(r.productId);
      return {
        productId: r.productId,
        name: r.name || p?.name || "Produto",
        image: r.image || getProductImage(p as unknown as Record<string, unknown>),
        sales: r.totalUnits,
        revenue: r.totalRevenue,
      };
    });
  }, [data.salesOrders, data.meusProdutos, rangeStartTs]);

  const dayOrders = isAdmin ? 252 : data.salesOrders.length;
  const dayUnits = isAdmin ? 294 : data.salesOrders.length;
  const dayVisitors = isAdmin ? 3948 : Math.max(0, dayOrders * 18);
  const dayViews = isAdmin ? 12088 : Math.max(0, dayOrders * 55);

  return (
    <DashboardShell title="Dashboard" subtitle="Painel ShopeSync para Shopee">
      <BoostActiveMiniCard />
      <BoostPromoModal />
      <div className="relative pb-4">
        <ShopeeHeroPanel
          valor={commissionValue}
          privacy={privacy}
          onTogglePrivacy={() => setPrivacy(!privacy)}
          stamp={stamp}
        />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12">
        <div className="lg:col-span-3">
          <MetricsBlock visitors={dayVisitors} views={dayViews} orders={dayOrders} units={dayUnits} privacy={privacy} />
        </div>
        <div className="lg:col-span-6">
          <SalesOverviewChart range={range} onRangeChange={setRange} />
        </div>
        <div className="lg:col-span-3">
          <Top5Block items={top5} />
        </div>
      </div>
    </DashboardShell>
  );
}

function ShopeeHeroPanel({
  valor,
  privacy,
  onTogglePrivacy,
  stamp,
}: {
  valor: number;
  privacy: boolean;
  onTogglePrivacy: () => void;
  stamp: string;
}) {
  const animated = useAnimatedValue(valor);
  const formatted = animated.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl bg-[#EE4D2D] shadow-xl pb-28 sm:pb-32">
        <button
          onClick={onTogglePrivacy}
          title={privacy ? "Mostrar valores" : "Ocultar valores"}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md bg-black/15 text-white backdrop-blur transition hover:bg-black/25"
        >
          {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>

        <img
          src="/brands/shopee-bag.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-1/2 h-[320px] w-[320px] -translate-y-1/2 select-none object-contain opacity-[0.15] brightness-0 invert"
        />

        <div className="relative px-5 pt-7 sm:px-8 sm:pt-9">
          <div className="flex flex-col items-center text-center text-white">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ fontFamily: 'Inter, Arial, Helvetica, sans-serif' }}>
              Shopee
            </h1>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl" style={{ fontFamily: 'Inter, Arial, Helvetica, sans-serif' }}>
              Vendas Hoje
            </h2>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-[11px] font-medium text-white/95">
              {stamp}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button className="rounded-md border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
                Painel de Mineração
              </button>
              <Link to="/dashboard/metricas" className="rounded-md border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
                Ver Métricas Detalhadas &gt;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating amount card overlapping */}
      <div className="relative -mt-20 px-4 sm:-mt-24 sm:px-10">
        <div className="mx-auto max-w-3xl rounded-xl bg-white px-6 py-8 shadow-2xl sm:py-10">
          <div
            className="flex items-baseline justify-center gap-2 sm:gap-3"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {!privacy && (
              <span
                className="text-3xl sm:text-4xl text-[#EE4D2D]"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '-1px',
                  lineHeight: 1,
                }}
              >
                R$
              </span>
            )}
            <span
              className="text-5xl sm:text-6xl lg:text-7xl text-[#EE4D2D]"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontWeight: 800,
                letterSpacing: '-1px',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
              }}
            >
              {privacy ? "•••••" : formatted}
            </span>
          </div>
          <div className="mt-5 flex justify-center">
            <WithdrawalButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsBlock({
  visitors,
  views,
  orders,
  units,
  privacy,
}: {
  visitors: number;
  views: number;
  orders: number;
  units: number;
  privacy: boolean;
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold text-foreground">Métricas Principais</h3>
      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
        <MetricTile icon={Users} label="Visitantes" value={privacy ? "•••" : num(visitors)} />
        <MetricTile icon={MousePointerClick} label="Visualizações da Página" value={privacy ? "•••" : num(views)} />
        <MetricTile icon={ShoppingBag} label="Pedidos" value={privacy ? "•••" : num(orders)} />
        <MetricTile icon={Boxes} label="Unidades" value={privacy ? "•••" : num(units)} />
      </div>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="bg-card p-5 text-center">
      <div className="mx-auto grid h-7 w-7 place-items-center text-[#EE4D2D]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-2 text-[11px] font-medium text-[#EE4D2D] leading-tight">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground tabular-nums" style={{ fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function SalesOverviewChart({ range, onRangeChange }: { range: RangeKey; onRangeChange: (r: RangeKey) => void }) {
  const data = useMemo(() => {
    if (range === "today") {
      const arr: { label: string; hoje: number | null; ontem: number }[] = [];
      const h = new Date().getHours();
      const peakAt = (i: number, c: number, w: number, amp: number) =>
        Math.max(0, amp * Math.exp(-Math.pow((i - c) / w, 2)));
      for (let i = 0; i < 24; i++) {
        const hojeRaw = Math.round(peakAt(i, 10, 1.6, 870) + peakAt(i, 18, 2.1, 660) + peakAt(i, 14, 2.3, 180));
        const ontemRaw = Math.round(peakAt(i, 10, 2.2, 220) + peakAt(i, 17, 2.6, 260) + peakAt(i, 14, 2.5, 110));
        const hoje = i <= h ? hojeRaw : null;
        arr.push({ label: pad2(i), hoje, ontem: ontemRaw });
      }
      return arr;
    }
    const n = range === "7d" ? 7 : 30;
    const today = new Date();
    return Array.from({ length: n }, (_, idx) => {
      const i = n - 1 - idx;
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const seed = i * 1.3;
      const ontem = Math.max(0, Math.round(420 + Math.sin(seed) * 180 + Math.cos(seed * 0.7) * 90));
      const hoje = Math.max(0, Math.round(360 + Math.sin(seed + 1) * 200));
      return { label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`, hoje, ontem };
    });
  }, [range]);

  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{CHART_TITLE[range]}</h3>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[#EE4D2D]" />
              Hoje
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[#3B82F6]" />
              Ontem
            </span>
          </div>
        </div>
        <div className="inline-flex items-center rounded-full bg-background/40 p-0.5 text-[11px]">
          {(
            [
              ["today", "Hoje"],
              ["7d", "7 Dias"],
              ["30d", "30 Dias"],
            ] as const
          ).map(([key, label]) => {
            const active = range === key;
            return (
              <button
                key={key}
                onClick={() => onRangeChange(key)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  active ? "bg-[#EE4D2D] text-white shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(17,24,39,0.07)" />
            <XAxis
              dataKey="label"
              stroke="rgba(17,24,39,0.55)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "rgba(17,24,39,0.12)" }}
              interval={range === "30d" ? 3 : range === "today" ? 1 : 0}
            />
            <YAxis stroke="rgba(17,24,39,0.55)" fontSize={10} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(17,24,39,0.1)",
                borderRadius: 8,
                color: "#111827",
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(17,24,39,0.65)" }}
              formatter={(v: number | string, name: string) => [Number(v ?? 0).toLocaleString("pt-BR"), name === "hoje" ? "Hoje" : "Ontem"]}
            />
            <Line type="linear" dataKey="ontem" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line type="linear" dataKey="hoje" stroke="#EE4D2D" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-center text-[11px] text-muted-foreground">
        Os vendedores que usam os Anúncios da Shopee estão recebendo 65% mais pedidos em média.
        <div className="mt-1">
          <a href="#" className="text-[#EE4D2D] underline hover:opacity-80">Crie anúncios aqui !</a>
        </div>
      </div>
    </div>
  );
}

function Top5Block({
  items,
}: {
  items: Array<{
    productId: string;
    name: string;
    image: string;
    sales: number;
    revenue: number;
  }>;
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold text-foreground">Top 5 produtos mais vendidos</h3>
      {items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-background/30 px-3 py-8 text-center text-xs text-muted-foreground">
          <Package className="mx-auto mb-2 h-6 w-6" />
          Nenhum produto vendido neste período.
          <div className="mt-3">
            <Link to="/dashboard/produtos" className="inline-block rounded-md border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:border-primary/40">
              Escolher produtos
            </Link>
          </div>
        </div>
      ) : (
        <ol className="mt-3 divide-y divide-border/60">
          {items.map((it, idx) => (
            <li key={it.productId} className="flex items-center gap-3 py-2.5">
              <span className="w-4 shrink-0 text-center text-sm font-bold text-[#EE4D2D]">{idx + 1}</span>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white p-1 ring-1 ring-border/60 overflow-hidden">
                {it.image ? (
                  <img
                    src={it.image}
                    alt={it.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const t = e.currentTarget;
                      t.onerror = null;
                      t.style.display = "none";
                      const parent = t.parentElement;
                      if (parent && !parent.querySelector(".img-fallback")) {
                        const fb = document.createElement("span");
                        fb.className = "img-fallback text-[18px]";
                        fb.textContent = "📦";
                        parent.appendChild(fb);
                      }
                    }}
                  />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[11px] font-medium text-foreground leading-tight">{it.name}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{it.sales} {it.sales === 1 ? "unidade vendida" : "unidades vendidas"}</div>
              </div>
              <div className="text-right text-xs font-bold text-[#EE4D2D] tabular-nums" style={{ fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '-0.3px' }}>{brl(it.revenue)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function BoostActiveMiniCard() {
  const { myActiveBoost } = useApp();
  if (!myActiveBoost || myActiveBoost.completed) return null;
  const pct = Math.min(100, Math.max(0, myActiveBoost.progressPct));
  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <Flame className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">Impulsionamento ativo</div>
          <div className="text-sm font-bold text-amber-900">{myActiveBoost.packName}</div>
          <div className="text-xs text-amber-900/80">
            {myActiveBoost.eventsReleased} {myActiveBoost.eventsReleased === 1 ? "venda gerada" : "vendas geradas"} • {brl(myActiveBoost.commissionTotal)} em comissões • {pct}% concluído
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
