import { products as catalogProducts } from "./products";

export type SaleRecord = {
  saleDate: number;
  netProfit: number;
  productId: string;
  productName: string;
  productImage: string;
};

function getTodayKey(): string {
  const now = new Date();
  return `upshopee_dashboard_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function generateHistoricalSales(): SaleRecord[] {
  const sales: SaleRecord[] = [];
  const now = Date.now();
  let accumulated = 0;
  const target30d = 250000;
  for (let day = 0; day < 30; day++) {
    const dayStart = now - day * 24 * 60 * 60 * 1000;
    const count = Math.floor(8 + Math.random() * 12 + (30 - day) * 0.3);
    for (let s = 0; s < count; s++) {
      const product = catalogProducts[Math.floor(Math.random() * catalogProducts.length)];
      const profit = Math.round((20 + Math.random() * 180) * 100) / 100;
      const hour = 6 + Math.floor(Math.random() * 18);
      const hourOffset = (hour * 60 + Math.floor(Math.random() * 60)) * 60 * 1000;
      sales.push({
        saleDate: dayStart - hourOffset,
        netProfit: profit,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
      });
      accumulated += profit;
      if (accumulated >= target30d) break;
    }
    if (accumulated >= target30d) break;
  }
  // Force today's sales — always include current day
  const todayCount = 3 + Math.floor(Math.random() * 6); // 3-8 sales today
  for (let s = 0; s < todayCount; s++) {
    const product = catalogProducts[Math.floor(Math.random() * catalogProducts.length)];
    const profit = Math.round((20 + Math.random() * 180) * 100) / 100;
    const minutesAgo = Math.floor(Math.random() * 12 * 60); // Last 12 hours
    sales.push({
      saleDate: now - minutesAgo * 60 * 1000,
      netProfit: profit,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
    });
  }
  return sales.sort((a: SaleRecord, b: SaleRecord) => b.saleDate - a.saleDate);
}

export function getOrCreateSalesHistory(): SaleRecord[] {
  try {
    const key = getTodayKey();
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  const data = generateHistoricalSales();
  try {
    const key = getTodayKey();
    // Clear old keys to avoid localStorage bloat
    Object.keys(localStorage)
      .filter((k) => k.startsWith("upshopee_dashboard_"))
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
  return data;
}
