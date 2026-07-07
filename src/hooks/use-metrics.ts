import { useMemo, useRef } from "react";
import { useApp } from "../lib/state";
import type { SalesOrder } from "../lib/state";

export type RangeKey = "today" | "7d" | "30d";

// ── SP timezone helpers ────────────────────────────────────────────────────────
function spNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ── Shared metrics hook — SINGLE SOURCE OF TRUTH for all metric surfaces ──────
//    All metric computations read from the global data.salesOrders (AppProvider).
//    Seed baseline orders are injected by state.tsx on admin login, so the
//    dashboard never starts empty.
export function useMetrics(range: RangeKey) {
  const { data } = useApp();

  // Stable per-mount random offsets (minor per-page variation acceptable for synthetic metrics)
  const offsets = useRef({
    visitorsExtra: Math.floor(Math.random() * 100),
    viewsExtra: Math.floor(Math.random() * 200),
    unitsFactor: Math.random(),
  }).current;

  return useMemo(() => {
    const sp = spNow();
    const todayStart = new Date(sp.getFullYear(), sp.getMonth(), sp.getDate()).getTime();
    const rangeStart =
      range === "today"
        ? todayStart
        : range === "7d"
          ? todayStart - 7 * 24 * 60 * 60 * 1000
          : todayStart - 30 * 24 * 60 * 60 * 1000;

    const nowTs = spNow().getTime();

    const inRange = data.salesOrders.filter(
      (o) => o.saleDate >= rangeStart && o.saleDate <= nowTs,
    );

    const totalCommission =
      Math.round(inRange.reduce((sum, o) => sum + o.netProfit, 0) * 100) / 100;
    const orders = inRange.length;
    const visitors = Math.max(orders, orders * 18 + offsets.visitorsExtra);
    const pageViews = Math.max(visitors, visitors * 3 + offsets.viewsExtra);
    const conversionPct =
      orders === 0 || visitors === 0
        ? "0.00"
        : ((orders / visitors) * 100).toFixed(2);
    const avgPerOrder = orders > 0 ? totalCommission / orders : 0;
    const units =
      orders +
      Math.floor(offsets.unitsFactor * Math.max(1, Math.floor(orders * 0.3)));
    const buyers = Math.max(1, Math.floor(orders * 0.6));

    // Yesterday commission
    const yesterday = new Date(spNow());
    yesterday.setDate(spNow().getDate() - 1);
    const yesterdayStart = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
    ).getTime();
    const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;
    const yesterdayCommission = data.salesOrders
      .filter((o) => o.saleDate >= yesterdayStart && o.saleDate < yesterdayEnd)
      .reduce((sum, o) => sum + o.netProfit, 0);

    // Top 5 products
    const productMap = new Map<
      string,
      { name: string; image: string; orders: number; revenue: number }
    >();
    for (const o of inRange) {
      const e = productMap.get(o.productId);
      if (e) {
        e.orders++;
        e.revenue += o.netProfit;
      } else {
        productMap.set(o.productId, {
          name: o.productName,
          image: o.productImage,
          orders: 1,
          revenue: o.netProfit,
        });
      }
    }
    const topProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 5)
      .map(([productId, d]) => ({ productId, ...d }));

    // Chart data
    const chartData = buildChartData(range, data.salesOrders);

    return {
      totalCommission,
      orders,
      visitors,
      pageViews,
      conversionPct,
      avgPerOrder,
      yesterdayCommission,
      units,
      buyers,
      inRange,
      topProducts,
      chartData,
    };
  }, [data.salesOrders, range, offsets]);
}

// ── Chart data builder (same logic as NewSalesChart in dashboard.index.tsx) ────
export interface ChartPoint {
  label: string;
  hoje: number | null;
  ontem: number;
}

export function buildChartData(range: RangeKey, salesOrders: SalesOrder[]): ChartPoint[] {
  const sp = spNow();

  if (range === "today") {
    const spH = sp.getHours();
    const spToday = `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}-${String(sp.getDate()).padStart(2, "0")}`;
    const y = new Date(sp);
    y.setDate(sp.getDate() - 1);
    const spYest = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

    // Single-pass O(N) — bucket by hour for today + yesterday instead of 24×N loops
    const hojeByHour = new Array<number>(24).fill(0);
    const ontemByHour = new Array<number>(24).fill(0);
    for (const o of salesOrders) {
      const oD = new Date(o.saleDate);
      const h = oD.getHours();
      if (h < 0 || h > 23) continue;
      const oKey = `${oD.getFullYear()}-${String(oD.getMonth() + 1).padStart(2, "0")}-${String(oD.getDate()).padStart(2, "0")}`;
      if (oKey === spToday) {
        hojeByHour[h] += o.netProfit;
      } else if (oKey === spYest) {
        ontemByHour[h] += o.netProfit;
      }
    }

    const arr: ChartPoint[] = [];
    for (let i = 0; i < 24; i++) {
      const hoje = i <= spH ? Math.round(hojeByHour[i]) : null;
      arr.push({ label: pad2(i), hoje, ontem: Math.round(ontemByHour[i]) });
    }
    return arr;
  }

  // 7d / 30d — bucket by SP date key (single pass, already O(N))
  const n = range === "7d" ? 7 : 30;
  const keys: string[] = [];
  const labels: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(sp);
    d.setDate(sp.getDate() - i);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
    labels.push(`${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`);
  }

  const daySums: Record<string, number> = {};
  for (const o of salesOrders) {
    const oD = new Date(o.saleDate);
    const oKey = `${oD.getFullYear()}-${String(oD.getMonth() + 1).padStart(2, "0")}-${String(oD.getDate()).padStart(2, "0")}`;
    daySums[oKey] = (daySums[oKey] || 0) + o.netProfit;
  }

  return keys.map((k, i) => ({
    label: labels[i],
    hoje: Math.round(daySums[k] || 0),
    ontem: Math.round(daySums[keys[Math.min(i + 1, keys.length - 1)]] || 0),
  }));
}
