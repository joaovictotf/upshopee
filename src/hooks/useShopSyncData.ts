import { useMemo } from "react";
import { useApp, getProductImage } from "../lib/state";
import type { SalesOrder } from "../lib/state";

export type Period = "today" | "7days" | "30days" | "all";

export interface TopProduct {
  productId: string;
  name: string;
  image: string;
  orders: number;
  revenue: number;
  commission: number;
}

export interface ShopSyncData {
  totalCommission: number;
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  totalBuyers: number;
  conversionRate: number;
  topProducts: TopProduct[];
  recentOrders: SalesOrder[];
  isLoading: boolean;
  error: string | null;
}

function getPeriodStartTs(period: Period): number {
  if (period === "all") return 0;
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  d.setHours(0, 0, 0, 0);
  if (period === "7days") d.setDate(d.getDate() - 6);
  else if (period === "30days") d.setDate(d.getDate() - 29);
  return d.getTime();
}

export function useShopSyncData(period: Period = "30days"): ShopSyncData {
  const { data } = useApp();
  const startTs = useMemo(() => getPeriodStartTs(period), [period]);

  const filtered = useMemo(
    () =>
      startTs === 0
        ? data.salesOrders
        : data.salesOrders.filter((o) => o.saleDate >= startTs),
    [data.salesOrders, startTs]
  );

  return useMemo(() => {
    let totalCommission = 0;
    let totalRevenue = 0;
    const buyerSet = new Set<string>();
    const productMap = new Map<string, TopProduct>();

    for (const o of filtered) {
      totalCommission += o.netProfit;
      totalRevenue += o.salePrice;
      buyerSet.add(o.customerEmailMasked || o.customerName || o.id);

      const key = o.productId || o.productName || o.id;
      const prev = productMap.get(key);
      if (prev) {
        prev.commission += o.netProfit;
        prev.revenue += o.salePrice;
        prev.orders += 1;
      } else {
        productMap.set(key, {
          productId: key,
          name: o.productName,
          image: getProductImage(o as unknown as Record<string, unknown>),
          commission: o.netProfit,
          revenue: o.salePrice,
          orders: 1,
        });
      }
    }

    const totalOrders = filtered.length;
    const totalUnits = filtered.length;
    const totalBuyers = buyerSet.size;
    const estimatedVisitors = Math.max(totalOrders * 18, 1);
    const conversionRate =
      totalOrders > 0
        ? parseFloat(((totalOrders / estimatedVisitors) * 100).toFixed(2))
        : 0;

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 5);

    return {
      totalCommission: Math.round(totalCommission * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalUnits,
      totalBuyers,
      conversionRate,
      topProducts,
      recentOrders: filtered.slice(0, 10),
      isLoading: false,
      error: null,
    };
  }, [filtered]);
}
