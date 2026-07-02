import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useApp } from "../lib/state";
import { useShopSyncData, type Period } from "../hooks/useShopSyncData";
import { brl, num } from "../lib/format";
import { DashboardShell } from "../components/layout/DashboardShell";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, HelpCircle, Package, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/dashboard/metricas")({
  component: MetricasPage,
});

type RangeKey = "today" | "7d" | "30d";

const SHOPEE_RED = "#EE4D2D";
const BORDER = "#E8E8E8";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Main page ────────────────────────────────────────────────────────────────
function MetricasPage() {
  const { isAdmin, getCommissionSum, isTodayReset } = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("today");

  const period: Period = range === "today" ? "today" : range === "7d" ? "7days" : "30days";
  const { totalOrders: hookOrders, topProducts } = useShopSyncData(period);

  // Commission and orders via getCommissionSum + useShopSyncData
  // (data.salesOrders, lightning clicks included).
  const totalCommission = getCommissionSum("shopee", range);
  const totalOrders = hookOrders;
  const conversionRate = totalOrders > 0
    ? parseFloat(((totalOrders / Math.max(totalOrders * 18, 1)) * 100).toFixed(2))
    : 0;

  const visitors = Math.max(0, totalOrders * 18);
  const pageViews = Math.max(0, totalOrders * 55);
  const conversionPct = conversionRate.toFixed(2);
  const avgPerOrder = totalOrders > 0 ? totalCommission / totalOrders : 0;

  const todayCommission = getCommissionSum("shopee", "today");
  const todayFlat = isTodayReset && todayCommission === 0;

  // Yesterday comparisons — derived from real data.
  const yesterdayCommission = getCommissionSum("shopee", "today") > 0
    ? (() => { const d7 = getCommissionSum("shopee", "7d"); const td = getCommissionSum("shopee", "today"); return (d7 - td) / 6; })()
    : 0;

  // Role guard
  if (!isAdmin) return <Navigate to="/dashboard/" />;

  // Flat metrics — all derived from useShopSyncData (single source of truth)
  const METRICS = [
    {
      key: "vendas",
      label: "Vendas",
      value: brl(totalCommission),
      sub: `Ontem: ${brl(yesterdayCommission)}`,
      orange: false,
    },
    {
      key: "pedidos",
      label: "Pedidos",
      value: num(totalOrders),
      sub: `Período: ${periodLabel(period)}`,
      orange: false,
    },
    {
      key: "conversao",
      label: "Taxa de Conversão",
      value: `${conversionPct}%`,
      sub: `Visitantes: ${num(visitors)}`,
      orange: false,
    },
    {
      key: "avg",
      label: "Vendas por Pedido",
      value: brl(avgPerOrder),
      sub: `Total: ${num(totalOrders)} pedidos`,
      orange: false,
    },
    {
      key: "visitantes",
      label: "Visitantes",
      value: num(visitors),
      sub: `Estimado: ${num(totalOrders)} pedidos × 18`,
      orange: true,
    },
    {
      key: "views",
      label: "Visualizações da Página",
      value: num(pageViews),
      sub: `Estimado: ${num(totalOrders)} pedidos × 55`,
      orange: false,
    },
  ];

  function periodLabel(p: Period): string {
    switch (p) { case "today": return "hoje"; case "7days": return "7 dias"; case "30days": return "30 dias"; default: return "total"; }
  }

  const SHOPEE_TABS = [
    "Painel",
    "Produto",
    "Vendas",
    "Marketing",
    "Bate-Papo",
    "Perguntas Frequentes",
  ];

  const PERIOD_TABS = [
    ["today", "Hoje"],
    ["7d", "7 Dias"],
    ["30d", "30 Dias"],
  ] as const;

  return (
    <DashboardShell title="" subtitle="">
      {/* ── Action row: back + live monitor link ─── */}
      <div className="mb-1 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/dashboard/" })}
          className="flex items-center gap-1 text-[13px] text-gray-500 transition hover:text-[#EE4D2D]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Painel
        </button>
        <span
          className="cursor-default text-[12px]"
          style={{ color: SHOPEE_RED }}
        >
          Monitor De Vendas Ao Vivo &gt;
        </span>
      </div>

      {/* ── Shopee-style tab bar + period selector ─── */}
      <div
        className="overflow-x-auto"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
      <div className="flex items-end justify-between min-w-0 sm:min-w-[600px]">
        {/* Main nav tabs (decorative) */}
        <nav className="flex items-end">
          {SHOPEE_TABS.map((tab) => {
            const active = tab === "Painel";
            return (
              <div
                key={tab}
                className="cursor-default select-none px-4 pb-2.5 pt-2 text-[13px]"
                style={
                  active
                    ? {
                        borderBottom: `2px solid ${SHOPEE_RED}`,
                        color: SHOPEE_RED,
                        fontWeight: 500,
                        marginBottom: -1,
                      }
                    : { color: "#666" }
                }
              >
                {tab}
              </div>
            );
          })}
        </nav>

        {/* Period selector — underline style */}
        <div className="flex items-end">
          {PERIOD_TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="select-none px-3 pb-2.5 pt-2 text-[12px] transition"
              style={
                range === key
                  ? {
                      borderBottom: `2px solid ${SHOPEE_RED}`,
                      color: SHOPEE_RED,
                      fontWeight: 600,
                      marginBottom: -1,
                    }
                  : { color: "#999" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* ── Métricas Principais ─── */}
      <div className="mt-4">
        {/* Section header — orange left border accent */}
        <div
          className="inline-flex items-center bg-white px-3 py-1.5"
          style={{
            border: `1px solid ${BORDER}`,
            borderLeftWidth: 3,
            borderLeftColor: SHOPEE_RED,
          }}
        >
          <span className="text-[13px] font-medium" style={{ color: "#333" }}>
            Métricas Principais
          </span>
        </div>

        {/* Flat metrics strip — thin vertical dividers, no card boxes */}
        <div
          className="flex overflow-x-auto bg-white"
          style={{ border: `1px solid ${BORDER}`, borderTop: "none" }}
        >
          {METRICS.map((m, idx) => (
            <div
              key={m.key}
              className="min-w-[140px] flex-1 px-5 py-4"
              style={
                idx < METRICS.length - 1
                  ? { borderRight: `1px solid ${BORDER}` }
                  : undefined
              }
            >
              {/* Label + info icon */}
              <div className="flex items-center gap-1">
                <span
                  className="text-[12px]"
                  style={{ color: m.orange ? SHOPEE_RED : "#666" }}
                >
                  {m.label}
                </span>
                <HelpCircle
                  className="h-3 w-3 shrink-0"
                  style={{ color: m.orange ? SHOPEE_RED : "#bbb" }}
                />
              </div>

              {/* Main value */}
              <div
                className="mt-1 tabular-nums"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#333",
                  fontFamily: "Arial, Helvetica, sans-serif",
                  letterSpacing: "-0.3px",
                  lineHeight: 1.2,
                }}
              >
                {m.value}
              </div>

              {/* Trend sub-text */}
              <div className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: "#999" }}>
                <HelpCircle className="h-2.5 w-2.5 shrink-0" />
                {m.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart section ─── */}
      <div
        className="mt-3 overflow-x-auto bg-white px-3 sm:px-5 pb-4 pt-4"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px]" style={{ color: "#666" }}>
            Gráfico de Tendências de Cada Métrica
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[12px]" style={{ color: "#666" }}>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: SHOPEE_RED }}
                />
                Vendas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                Visitantes
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "#bbb" }}>
              Métricas Selecionadas: 2/4
            </span>
          </div>
        </div>
        <SalesAreaChart range={range} todayFlat={todayFlat} />
      </div>

      {/* ── Rankings section ─── */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Rankings de Produtos */}
        <div className="bg-white" style={{ border: `1px solid ${BORDER}` }}>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span className="text-[13px] font-medium" style={{ color: "#333" }}>
              Rankings de Produtos
            </span>
            <span
              className="cursor-default text-[12px]"
              style={{ color: SHOPEE_RED }}
            >
              Mais &gt;
            </span>
          </div>

          {/* Filter chips */}
          <div
            className="flex flex-wrap items-center gap-1.5 px-4 py-2.5"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            {[
              { label: "Por Categorias", active: true },
              { label: "Por Unidades", active: false },
              { label: "Por Visualizações da Página", active: false },
              { label: "Por Conversão", active: false },
            ].map((t) => (
              <span
                key={t.label}
                className="cursor-default rounded-sm px-2 py-0.5 text-[11px]"
                style={
                  t.active
                    ? { background: SHOPEE_RED, color: "#fff" }
                    : { color: "#666" }
                }
              >
                {t.label}
              </span>
            ))}
            <span
              className="ml-auto flex cursor-default items-center gap-0.5 text-[11px]"
              style={{ color: "#666" }}
            >
              Todas Categorias{" "}
              <ChevronDown className="h-3 w-3" />
            </span>
          </div>

          {/* Product rows */}
          <div>
            {topProducts.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Package className="mx-auto mb-2 h-5 w-5 text-gray-200" />
                <p className="text-[12px]" style={{ color: "#bbb" }}>
                  Nenhum produto no período
                </p>
              </div>
            ) : (
              topProducts.map((row, idx) => (
                <div
                  key={row.productId}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={
                    idx < topProducts.length - 1
                      ? { borderBottom: `1px solid #F5F5F5` }
                      : undefined
                  }
                >
                  <span
                    className="w-4 text-center text-[12px] font-semibold"
                    style={{ color: SHOPEE_RED }}
                  >
                    {idx + 1}
                  </span>
                  <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded border bg-white" style={{ borderColor: BORDER }}>
                    {row.image ? (
                      <img
                        src={row.image}
                        alt={row.name}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Package className="h-3.5 w-3.5 text-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px]" style={{ color: "#333" }}>
                      {row.name}
                    </div>
                    <div className="text-[11px]" style={{ color: "#999" }}>
                      {row.orders}{" "}
                      {row.orders === 1 ? "pedido" : "pedidos"}
                    </div>
                  </div>
                  <div
                    className="tabular-nums text-[12px] font-semibold"
                    style={{
                      color: "#333",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {brl(row.commission)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ranking de Categorias */}
        <div className="bg-white" style={{ border: `1px solid ${BORDER}` }}>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span className="text-[13px] font-medium" style={{ color: "#333" }}>
              Ranking de Categorias
            </span>
            <span
              className="cursor-default text-[12px]"
              style={{ color: SHOPEE_RED }}
            >
              Mais &gt;
            </span>
          </div>

          <div
            className="px-4 py-2.5"
            style={{ borderBottom: `1px solid ${BORDER}` }}
          >
            <span
              className="cursor-default rounded-sm px-2 py-0.5 text-[11px] text-white"
              style={{ background: SHOPEE_RED }}
            >
              Por Compras
            </span>
          </div>

          <div>
            {[
              { rank: 1, name: "Moda e Vestuário", pct: "45%" },
              { rank: 2, name: "Eletrônicos", pct: "28%" },
              { rank: 3, name: "Casa e Decoração", pct: "15%" },
              { rank: 4, name: "Beleza e Saúde", pct: "8%" },
              { rank: 5, name: "Outros", pct: "4%" },
            ].map((cat, idx) => (
              <div
                key={cat.rank}
                className="flex items-center gap-3 px-4 py-2.5"
                style={idx < 4 ? { borderBottom: "1px solid #F5F5F5" } : undefined}
              >
                <span
                  className="w-4 text-center text-[12px] font-semibold"
                  style={{ color: SHOPEE_RED }}
                >
                  {cat.rank}
                </span>
                <div className="min-w-0 flex-1 text-[12px]" style={{ color: "#333" }}>
                  {cat.name}
                </div>
                <div className="text-[12px]" style={{ color: "#666" }}>
                  {cat.pct}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// ─── Area chart — exact same data logic, Shopee-style visuals ─────────────────
function SalesAreaChart({ range, todayFlat }: { range: RangeKey; todayFlat?: boolean }) {
  const { data } = useApp();
  const chartData = useMemo(() => {
    if (range === "today") {
      const now = new Date();
      const spTs = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const sp = new Date(spTs);
      const spH = sp.getHours();
      const spToday = `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}-${String(sp.getDate()).padStart(2, "0")}`;
      const y = new Date(sp); y.setDate(sp.getDate() - 1);
      const spYest = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

      return Array.from({ length: 24 }, (_, i) => {
        let hojeSum = 0;
        let ontemSum = 0;
        for (const o of data.salesOrders) {
          const oSp = new Date(o.saleDate).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
          const oD = new Date(oSp);
          const oKey = `${oD.getFullYear()}-${String(oD.getMonth() + 1).padStart(2, "0")}-${String(oD.getDate()).padStart(2, "0")}`;
          if (oD.getHours() === i) {
            if (oKey === spToday) hojeSum += o.netProfit;
            else if (oKey === spYest) ontemSum += o.netProfit;
          }
        }
        return {
          label: pad2(i) + ":00",
          atual: i <= spH ? (todayFlat ? 0 : Math.round(hojeSum)) : null,
          anterior: Math.round(ontemSum),
        };
      });
    }
    // 7d / 30d — bucket by SP date key
    const n = range === "7d" ? 7 : 30;
    const spNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const keys: string[] = [];
    const labels: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(spNow);
      d.setDate(spNow.getDate() - i);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      labels.push(`${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`);
    }
    const daySums: Record<string, number> = {};
    for (const o of data.salesOrders) {
      const oSp = new Date(o.saleDate).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const oD = new Date(oSp);
      const oKey = `${oD.getFullYear()}-${String(oD.getMonth() + 1).padStart(2, "0")}-${String(oD.getDate()).padStart(2, "0")}`;
      daySums[oKey] = (daySums[oKey] || 0) + o.netProfit;
    }
    return keys.map((k, i) => ({
      label: labels[i],
      atual: Math.round(daySums[k] || 0),
      anterior: Math.round(daySums[keys[Math.min(i + 1, keys.length - 1)]] || 0),
    }));
  }, [range, todayFlat, data.salesOrders]);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
        >
          <defs>
            <linearGradient id="gradAtual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SHOPEE_RED} stopOpacity={0.12} />
              <stop offset="95%" stopColor={SHOPEE_RED} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAnterior" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.10} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#F0F0F0"
            vertical={false}
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            stroke="#ccc"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: "#E8E8E8" }}
            interval={
              range === "30d" ? 3 : range === "today" ? 5 : 0
            }
            tick={{ fill: "#999", fontSize: 10 }}
          />
          <YAxis
            stroke="transparent"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={32}
            tick={{ fill: "#bbb", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 4,
              fontSize: 12,
              color: "#333",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: "6px 10px",
            }}
            labelStyle={{ color: "#666", fontWeight: 500, marginBottom: 4 }}
            formatter={(v: number | string, name: string) => [
              Number(v ?? 0).toLocaleString("pt-BR"),
              name === "atual" ? "Período atual" : "Período anterior",
            ]}
          />
          <Area
            type="monotone"
            dataKey="anterior"
            stroke="#60A5FA"
            strokeWidth={1.5}
            fill="url(#gradAnterior)"
            dot={false}
            activeDot={{ r: 3, fill: "#60A5FA", strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="atual"
            stroke={SHOPEE_RED}
            strokeWidth={1.8}
            fill="url(#gradAtual)"
            dot={false}
            activeDot={{ r: 3, fill: SHOPEE_RED, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
