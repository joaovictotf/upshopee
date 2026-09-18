import type { CatalogProduct } from "./demo-store";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" ? (value as UnknownRecord) : null;

const firstValue = (record: UnknownRecord, names: string[]) => {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== null) return record[name];
  }
  return undefined;
};

const stringValue = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

function decimalValue(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/R\$|%|\s/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function discoverArray(source: unknown): unknown[] {
  if (Array.isArray(source)) return source;
  const record = asRecord(source);
  if (!record) return [];

  const preferred = [
    "affiliateProducts",
    "products",
    "mockAffiliateProducts",
    "catalog",
    "default",
  ];
  for (const key of preferred) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    const nested = asRecord(value);
    if (nested) {
      const nestedArray = discoverArray(nested);
      if (nestedArray.length) return nestedArray;
    }
  }
  return Object.values(record).find(Array.isArray) ?? [];
}

export function normalizeCatalog(source: unknown): CatalogProduct[] {
  const unique = new Map<string, CatalogProduct>();
  discoverArray(source).forEach((item, index) => {
    const product = asRecord(item);
    if (!product) return;

    const name = stringValue(
      firstValue(product, ["name", "title", "productName", "product_name", "label"]),
    ).trim();
    const id = stringValue(
      firstValue(product, ["id", "productId", "product_id", "itemId", "item_id", "sku"]),
    ).trim();
    const image = stringValue(
      firstValue(product, [
        "image",
        "imageUrl",
        "image_url",
        "thumbnail",
        "thumbnailUrl",
        "photo",
        "src",
      ]),
    ).trim();
    const price = decimalValue(
      firstValue(product, [
        "price",
        "salePrice",
        "sale_price",
        "currentPrice",
        "current_price",
        "amount",
      ]),
    );
    const commission = decimalValue(
      firstValue(product, [
        "commissionPct",
        "commission_pct",
        "commissionRate",
        "commission_rate",
        "commissionPercentage",
        "commission_percentage",
        "commission",
      ]),
    );

    if (!name || price <= 0) return;
    const stableId = id || `${name.toLocaleLowerCase("pt-BR")}-${Math.round(price * 100)}-${index}`;
    if (unique.has(stableId)) return;
    unique.set(stableId, {
      id: stableId,
      name,
      image,
      priceCents: Math.round(price * 100),
      commissionPct: commission > 0 ? commission : 30,
    });
  });
  return [...unique.values()];
}

