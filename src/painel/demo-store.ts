export const PANEL_STORAGE_KEY = "upshopee_painel2_demo_v1";

export type MetricKey =
  | "clicks"
  | "orders"
  | "commissionCents"
  | "itemsSold"
  | "orderValueCents"
  | "newBuyers";

export type CatalogProduct = {
  id: string;
  name: string;
  image: string;
  priceCents: number;
  commissionPct: number;
};

export type ProductDailyStat = {
  productId: string;
  itemsSold: number;
  commissionCents: number;
};

export type DailyRecord = {
  clicks: number;
  socialClicks: number;
  orders: number;
  commissionCents: number;
  itemsSold: number;
  orderValueCents: number;
  newBuyers: number;
  products: ProductDailyStat[];
};

export type DemoStore = {
  version: 1;
  days: Record<string, DailyRecord>;
};

export type AppliedSale = {
  product: CatalogProduct;
  clicksAdded: number;
  socialClicksAdded: number;
  commissionCents: number;
};

export type PercentageChange = {
  text: string;
  tone: "positive" | "negative" | "zero";
};

export const EMPTY_DAILY_RECORD: DailyRecord = Object.freeze({
  clicks: 0,
  socialClicks: 0,
  orders: 0,
  commissionCents: 0,
  itemsSold: 0,
  orderValueCents: 0,
  newBuyers: 0,
  products: [],
});

const EMPTY_STORE: DemoStore = { version: 1, days: {} };
let volatileStore: DemoStore = EMPTY_STORE;

const integer = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
};

const validDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function sanitizeProductStat(value: unknown): ProductDailyStat | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ProductDailyStat>;
  if (typeof candidate.productId !== "string" || !candidate.productId) return null;
  return {
    productId: candidate.productId,
    itemsSold: integer(candidate.itemsSold),
    commissionCents: integer(candidate.commissionCents),
  };
}

function sanitizeDailyRecord(value: unknown): DailyRecord {
  if (!value || typeof value !== "object") return { ...EMPTY_DAILY_RECORD, products: [] };
  const candidate = value as Partial<DailyRecord>;
  const uniqueProducts = new Map<string, ProductDailyStat>();
  if (Array.isArray(candidate.products)) {
    candidate.products.forEach((item) => {
      const parsed = sanitizeProductStat(item);
      if (!parsed || uniqueProducts.has(parsed.productId)) return;
      uniqueProducts.set(parsed.productId, parsed);
    });
  }
  return {
    clicks: integer(candidate.clicks),
    socialClicks: integer(candidate.socialClicks),
    orders: integer(candidate.orders),
    commissionCents: integer(candidate.commissionCents),
    itemsSold: integer(candidate.itemsSold),
    orderValueCents: integer(candidate.orderValueCents),
    newBuyers: integer(candidate.newBuyers),
    products: [...uniqueProducts.values()].slice(0, 5),
  };
}

export function sanitizeStore(value: unknown): DemoStore {
  if (!value || typeof value !== "object") return { version: 1, days: {} };
  const candidate = value as { days?: unknown };
  if (!candidate.days || typeof candidate.days !== "object") {
    return { version: 1, days: {} };
  }
  const days: Record<string, DailyRecord> = {};
  Object.entries(candidate.days as Record<string, unknown>).forEach(([date, record]) => {
    if (validDateKey(date)) days[date] = sanitizeDailyRecord(record);
  });
  return { version: 1, days };
}

export function loadDemoStore(): DemoStore {
  if (typeof window === "undefined") return volatileStore;
  try {
    const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
    volatileStore = raw ? sanitizeStore(JSON.parse(raw)) : { version: 1, days: {} };
  } catch {
    // Safari private mode and privacy extensions can block localStorage.
  }
  return volatileStore;
}

export function saveDemoStore(store: DemoStore): void {
  volatileStore = store;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // The in-memory copy keeps the current page fully functional.
  }
}

export function recordFor(store: DemoStore, dateKey: string): DailyRecord {
  return store.days[dateKey] ?? EMPTY_DAILY_RECORD;
}

export function localDateKey(date = new Date()): string {
  // The affiliate panel is Brazilian. Using the explicit UTC-03 offset also
  // keeps server-rendered and client-rendered dates identical during hydration.
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function addDays(dateKey: string, amount: number): string {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

export function datesInRange(startDate: string, endDate: string): string[] {
  const ascending = startDate <= endDate;
  const first = ascending ? startDate : endDate;
  const last = ascending ? endDate : startDate;
  const result: string[] = [];
  let cursor = first;
  let guard = 0;
  while (cursor <= last && guard < 3660) {
    result.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return result;
}

export function metricValue(record: DailyRecord, metric: MetricKey): number {
  return record[metric];
}

const randomInt = (minimum: number, maximum: number, random: () => number) =>
  Math.floor(random() * (maximum - minimum + 1)) + minimum;

function selectProduct(
  record: DailyRecord,
  catalog: CatalogProduct[],
  random: () => number,
): CatalogProduct | null {
  if (!catalog.length) return null;
  const occupiedIds = new Set(record.products.map((item) => item.productId));

  if (record.products.length < 5) {
    const unseen = catalog.filter((product) => !occupiedIds.has(product.id));
    if (unseen.length) return unseen[randomInt(0, unseen.length - 1, random)];
  }

  const occupied = catalog.filter((product) => occupiedIds.has(product.id));
  const candidates = occupied.length ? occupied : catalog;
  return candidates[randomInt(0, candidates.length - 1, random)] ?? null;
}

export function applyDemoSale(
  store: DemoStore,
  dateKey: string,
  catalog: CatalogProduct[],
  random: () => number = Math.random,
): { store: DemoStore; sale: AppliedSale } | null {
  const current = recordFor(store, dateKey);
  const product = selectProduct(current, catalog, random);
  if (!product) return null;

  const clicksAdded = randomInt(4, 14, random);
  const socialClicksAdded = randomInt(Math.ceil(clicksAdded / 2), clicksAdded, random);
  const commissionCents = Math.round(
    product.priceCents * ((product.commissionPct || 30) / 100),
  );

  const products = current.products.map((item) => ({ ...item }));
  const productIndex = products.findIndex((item) => item.productId === product.id);
  if (productIndex >= 0) {
    products[productIndex] = {
      ...products[productIndex],
      itemsSold: products[productIndex].itemsSold + 1,
      commissionCents: products[productIndex].commissionCents + commissionCents,
    };
  } else if (products.length < 5) {
    products.push({ productId: product.id, itemsSold: 1, commissionCents });
  }

  const nextRecord: DailyRecord = {
    clicks: current.clicks + clicksAdded,
    socialClicks: current.socialClicks + socialClicksAdded,
    orders: current.orders + 1,
    commissionCents: current.commissionCents + commissionCents,
    itemsSold: current.itemsSold + 1,
    orderValueCents: current.orderValueCents + product.priceCents,
    newBuyers: current.newBuyers + 1,
    products,
  };

  const nextStore: DemoStore = {
    version: 1,
    days: { ...store.days, [dateKey]: nextRecord },
  };
  return {
    store: nextStore,
    sale: { product, clicksAdded, socialClicksAdded, commissionCents },
  };
}

const percentageNumber = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function percentageChange(current: number, previous: number): PercentageChange {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;
  if (safePrevious === 0) {
    if (safeCurrent === 0) return { text: "0%", tone: "zero" };
    return { text: "+100,00%", tone: "positive" };
  }

  const value = ((safeCurrent - safePrevious) / safePrevious) * 100;
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
    return { text: "0%", tone: "zero" };
  }
  return {
    text: `${value > 0 ? "+" : ""}${percentageNumber.format(value)}%`,
    tone: value > 0 ? "positive" : "negative",
  };
}

export function sortedTopProducts(record: DailyRecord): ProductDailyStat[] {
  return [...record.products]
    .sort(
      (left, right) =>
        right.itemsSold - left.itemsSold || right.commissionCents - left.commissionCents,
    )
    .slice(0, 5);
}
