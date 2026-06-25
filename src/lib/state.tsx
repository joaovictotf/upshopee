import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setGlobalPrivacy } from "./format";
import { products as CATALOG } from "./mock/products";
import { supabase } from "../integrations/supabase/client";

export const ADMIN_EMAILS = ["victor@shopesync.com", "rikelme@shopsync.com"] as const;
export const ADMIN_EMAIL = ADMIN_EMAILS[0];
const ADMIN_PASSWORD = "12345678";
const ADMIN_NAME_BY_EMAIL: Record<string, string> = {
  "victor@shopesync.com": "Victor",
  "rikelme@shopsync.com": "Rikelme",
};
const ADMIN_NAME = "Victor";
export const isAdminEmail = (email?: string | null) =>
  !!email && (ADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
const USER_KEY = "shopesync.user";
const DATA_KEY = (email: string) => `shopesync.userdata.${email.toLowerCase()}`;
const SELECTED_MP_KEY = "shopesync.selectedMarketplace";
const PRIVACY_KEY = "shopesync.privacy";
const ADMIN_PRESENTATION_MODE_KEY = "shopesync_admin_presentation_mode";
const ADMIN_DEMO_CONN_KEY = "shopesync_admin_demo_connections";
const VENDAS_HOJE_KEY = (email: string) => `shopesync.vendashoje.${email.toLowerCase()}`;
const COMMISSION_HIST_KEY = (email: string) => `shopesync.commissionhist.${email.toLowerCase()}`;
const LAST_AUTO_SALE_KEY = (email: string) => `shopesync.lastautosale.${email.toLowerCase()}`;
const TODAY_RESET_KEY = (email: string) => `shopesync.todayreset.${email.toLowerCase()}`;

const READY_DELAY_MS = 5 * 60 * 60 * 1000; // 5h após pronto para 1ª venda automática
const AUTO_SALE_INTERVAL_MS = 5 * 60 * 60 * 1000; // ~5h entre vendas automáticas
const REGULAR_COMMISSION_POOL = [12.9, 15.4, 18.7, 22.3, 24.9, 27.5, 29.9];

// GDM / presentation dashboard targets. Today is computed from real orders
// (so it resets at midnight São Paulo time automatically), while the 7d / 30d
// windows are backed by deterministic presentation sales (see
// buildGdmPresentationOrders below). These constants are kept for reference
// only — the actual numbers come from the generated orders themselves.
const GDM_TARGET_7D = 58435.70;
const GDM_TARGET_30D = 233742.80;

export type Marketplace = "shopee";
export const MARKETPLACES: Marketplace[] = ["shopee"];
export const MARKETPLACE_LABEL: Record<Marketplace, string> = {
  shopee: "Shopee",
};

export type User = { name: string; email: string };

export type MarketplaceData = {
  sales: number; revenue: number; commission: number;
  productsActive: number; orders: number; conversion: number;
  series: { day: string; revenue: number; commission: number; sales: number }[];
  events: { id: string; title: string; amount?: number; time: string }[];
};

export type SavedProduct = {
  id: string;
  productId: string;
  name: string;
  image: string;
  category: string;
  marketplaces: Marketplace[];
  supplierName: string;
  supplierLocation: string;
  supplierCost: number;
  margin: number;
  marketplaceFee: number;
  operationalCost: number;
  recommendedPrice: number;
  estimatedCommission: number;
  estimatedNetProfit: number;
  generatedTitle: string;
  generatedDescription: string;
  generatedKeywords: string[];
  promotionText: string;
  status: string;
  currentStep: string;
  sentAt: number;
  estimatedReadyAt: number;
  productValidationStatus?: ProductValidationStatus;
  validatedAt?: number;
  remoteId?: string;
  needsSync?: boolean;
};

export type ProductValidationStatus = "pending_validation" | "approved" | "rejected";

export type AdminUserProduct = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  localId: string;
  productId?: string | null;
  name: string;
  image?: string | null;
  category?: string | null;
  marketplaces: Marketplace[];
  supplierName?: string | null;
  supplierLocation?: string | null;
  supplierCost?: number | null;
  recommendedPrice?: number | null;
  estimatedCommission?: number | null;
  status: string;
  currentStep: string;
  validationStatus: ProductValidationStatus;
  createdAt: number;
  validatedAt?: number;
};

export type SalesOrder = {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  marketplace: Marketplace;
  supplierName: string;
  supplierLocation: string;
  customerName: string;
  customerEmailMasked: string;
  customerPhoneMasked: string;
  customerLocation: string;
  salePrice: number;
  supplierCost: number;
  marketplaceFee: number;
  operationalCost: number;
  netProfit: number;
  saleDate: number;
  source?: string | null;
};

// ── Product image placeholder ────────────────────────────────────────────────
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E";

/**
 * Returns the best available image URL from a product or order object.
 * Tries multiple field names in priority order and falls back to a placeholder.
 */
export function getProductImage(obj: Record<string, unknown> | null | undefined): string {
  if (!obj) return PLACEHOLDER_IMG;
  const url =
    (obj.productImage as string | null | undefined) ||
    (obj.imageUrl as string | null | undefined) ||
    (obj.image_url as string | null | undefined) ||
    (obj.image as string | null | undefined) ||
    (obj.thumbnail as string | null | undefined) ||
    (obj.photo as string | null | undefined) ||
    (obj.product_image as string | null | undefined) ||
    "";
  return url.trim() || PLACEHOLDER_IMG;
}

// ── 8-step order pipeline ─────────────────────────────────────────────────────
export const ORDER_STATUS_LIST = [
  "Venda recebida",
  "Pagamento aprovado",
  "Fornecedor acionado",
  "Produto em separação",
  "Produto enviado",
  "Pedido em transporte",
  "Pedido entregue",
  "Comissão liberada",
] as const;
export type OrderStatus = typeof ORDER_STATUS_LIST[number];

export const ORDER_TIMELINE: string[] = [
  "Venda recebida",
  "Pagamento aprovado",
  "Fornecedor acionado",
  "Produto em separação",
  "Produto enviado",
  "Pedido em transporte",
  "Pedido entregue",
  "Comissão liberada",
];

/** Count business days (Mon–Fri) elapsed since saleDate up to now. */
export function calcBusinessDays(fromTs: number): number {
  const from = new Date(fromTs);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  let days = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) days++;
  }
  return days;
}

export function getOrderDayDiff(saleDate: number): number {
  const a = new Date(saleDate); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

/**
 * Returns the current status label for an order based on business days elapsed.
 * 8-step pipeline spread over 3 business days.
 */
export function getOrderStatus(saleDate: number): OrderStatus {
  const bd = calcBusinessDays(saleDate);
  // Minutes elapsed since sale (for same-day micro-progression)
  const minutesElapsed = Math.floor((Date.now() - saleDate) / 60000);
  if (bd === 0) {
    if (minutesElapsed < 15) return "Venda recebida";
    if (minutesElapsed < 60) return "Pagamento aprovado";
    return "Fornecedor acionado";
  }
  if (bd === 1) return "Produto em separação";
  if (bd === 2) return "Produto enviado";
  if (bd === 3) return "Pedido em transporte";
  if (bd >= 4 && bd < 5) return "Pedido entregue";
  return "Comissão liberada";
}

/** Returns 0-based index of the current step in ORDER_TIMELINE. */
export function getOrderTimelineIndex(saleDate: number): number {
  const status = getOrderStatus(saleDate);
  const idx = ORDER_TIMELINE.indexOf(status);
  return idx >= 0 ? idx : 0;
}

/** Returns rich status info for display in Vendas / Clientes. */
export function getSaleStatusInfo(saleDate: number): {
  label: string;
  step: number;   // 1-based
  total: number;
  pct: number;    // 0-100
} {
  const label = getOrderStatus(saleDate);
  const idx = ORDER_TIMELINE.indexOf(label);
  const step = idx >= 0 ? idx + 1 : 1;
  const total = ORDER_TIMELINE.length;
  return { label, step, total, pct: Math.round((step / total) * 100) };
}

type UserData = {
  marketplaces: Record<Marketplace, MarketplaceData>;
  meusProdutos: SavedProduct[];
  salesOrders: SalesOrder[];
};

const emptySeries = (days = 7): MarketplaceData["series"] =>
  ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Hoje"].slice(0, days).map((d) => ({ day: d, revenue: 0, commission: 0, sales: 0 }));

const zeroMP = (): MarketplaceData => ({
  sales: 0, revenue: 0, commission: 0, productsActive: 0, orders: 0, conversion: 0,
  series: emptySeries(), events: [],
});

const demoSeries = (base: number, comBase: number, salesBase: number): MarketplaceData["series"] =>
  ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Hoje"].map((d, i) => ({
    day: d,
    revenue: Math.round(base * (0.7 + Math.sin(i) * 0.15 + i * 0.04)),
    commission: Math.round(comBase * (0.7 + Math.sin(i) * 0.15 + i * 0.04)),
    sales: Math.round(salesBase * (0.7 + Math.sin(i) * 0.2 + i * 0.05)),
  }));

const adminPreloadedProducts = (): SavedProduct[] => {
  const last4 = CATALOG.slice(-4);
  const now = Date.now();
  const day = 86400000;
  return last4.map((p, i) => {
    const useRJ = i % 2 === 0;
    const supplierName = useRJ ? "RioStock Distribuidora" : "SP Prime Atacado";
    const supplierLocation = useRJ ? "Rio de Janeiro/RJ" : "São Paulo/SP";
    const supplierCost = useRJ ? p.supplierCostRJ : p.supplierCostSP;
    const recommendedPrice = p.suggestedPrice;
    const marketplaceFee = 12;
    const operationalCost = 3.5;
    const feeValue = Math.round(recommendedPrice * (marketplaceFee / 100) * 100) / 100;
    const estimatedCommission = p.estimatedCommission;
    const estimatedNetProfit =
      Math.round((recommendedPrice - supplierCost - feeValue - operationalCost) * 100) / 100;
    const margin = Math.round(((recommendedPrice - supplierCost) / recommendedPrice) * 100);
    return {
      id: `admin-preload-${p.id}`,
      productId: p.id,
      name: p.name,
      image: p.image,
      category: p.category,
      marketplaces: ["shopee"],
      supplierName,
      supplierLocation,
      supplierCost,
      margin,
      marketplaceFee,
      operationalCost,
      recommendedPrice,
      estimatedCommission,
      estimatedNetProfit,
      generatedTitle: `${p.name} | Envio rápido e garantia`,
      generatedDescription: `${p.description}\n\nProduto pronto para venda na sua loja, com fornecedor verificado e envio nacional.`,
      generatedKeywords: p.keywords,
      promotionText: `🔥 ${p.name} por apenas R$ ${recommendedPrice.toFixed(2).replace(".", ",")}. Envio rápido. Garanta o seu!`,
      status: "Pronto para venda",
      currentStep: "Produto disponível na loja",
      sentAt: now - 5 * day,
      estimatedReadyAt: now - 1 * day,
    };
  });
};

function mergeAdminPreload(existing: SavedProduct[]): SavedProduct[] {
  const preload = adminPreloadedProducts();
  const have = new Set(existing.map((x) => x.id));
  const missing = preload.filter((p) => !have.has(p.id));
  return missing.length ? [...missing, ...existing] : existing;
}

function isProductReady(p: SavedProduct): boolean {
  return p.status === "Pronto para venda" || p.status === "Disponível na loja";
}
function isProductValidatedForSale(p: SavedProduct): boolean {
  // Require EXPLICIT admin approval — undefined/pending/rejected all block sale.
  return isProductReady(p) && p.productValidationStatus === "approved";
}
function promoteReadyProducts(list: SavedProduct[]): SavedProduct[] {
  const now = Date.now();
  let changed = false;
  const next = list.map((p) => {
    // Only admin-approved products can auto-promote after estimatedReadyAt.
    // Anything without explicit "approved" (including undefined) stays blocked.
    if (p.productValidationStatus !== "approved") return p;
    if (!isProductReady(p) && p.estimatedReadyAt && p.estimatedReadyAt <= now) {
      changed = true;
      return { ...p, status: "Pronto para venda", currentStep: "Produto disponível na loja" };
    }
    return p;
  });
  return changed ? next : list;
}

const adminInitialData = (): UserData => ({
  meusProdutos: adminPreloadedProducts(),
  salesOrders: [],
  marketplaces: {
    shopee: {
      sales: 23, revenue: 5028.34, commission: 502.83,
      productsActive: 32, orders: 14, conversion: 7.8,
      series: demoSeries(700, 70, 4),
      events: [
        { id: "e1", title: "Venda confirmada na Shopee.", amount: 89.9, time: "há 12 min" },
        { id: "e2", title: "Pedido recebido e enviado para o fornecedor.", time: "há 28 min" },
        { id: "e3", title: "Nova comissão registrada na Shopee.", amount: 127.4, time: "há 1 h" },
      ],
    },
  },
});

// =====================================================================
// GDM presentation orders
// Deterministic seed orders for the GDM / presentation_admin context.
// They are NOT persisted to Supabase (kept purely client-side) and are
// distinguishable by id prefix `gdm-` + source `gdm_presentation_data`.
// The user-facing UI never reveals the "presentation" label.
//
// Targets (sum of netProfit per window, local timezone):
//   - last 7 days (days 1..6 ago, today excluded) ......  R$  58.435,70
//   - last 30 days (days 1..29 ago, today excluded) .....  R$ 233.742,80
//   - today (day 0) .............................. starts R$       0,00
//
// "Today" naturally resets at midnight America/Sao_Paulo because all GDM
// orders carry timestamps strictly before today 00:00 local.
// =====================================================================
const GDM_PRODUCTS: Array<{
  id: string;
  name: string;
  image: string;
  salePrice: number;
  supplierName: string;
  supplierLocation: string;
  supplierCost: number;
}> = [
  {
    id: "p1",
    name: "Álbum da Copa do Mundo 2026",
    image: "https://down-br.img.susercontent.com/file/br-11134207-820ln-mnqar7zwk26a25",
    salePrice: 79.9,
    supplierName: "SP Prime Atacado",
    supplierLocation: "São Paulo/SP",
    supplierCost: 14.9,
  },
  {
    id: "p3",
    name: "Camisa do Brasil da seleção brasileira",
    image: "https://static.netshoes.com.br/produtos/camiseta-nike-brasil-i-202223-supporter-masculina/30/2IC-9637-030/2IC-9637-030_zoom1.jpg?ims=544x&ts=1779133644",
    salePrice: 179.9,
    supplierName: "RioStock Distribuidora",
    supplierLocation: "Rio de Janeiro/RJ",
    supplierCost: 39.9,
  },
  {
    id: "dn1",
    name: "Kit Presente Masculino Relógio + Carteira + Cinto",
    image: "https://down-br.img.susercontent.com/file/br-11134207-7r98o-m1z8d2cyqu5w23",
    salePrice: 129.9,
    supplierName: "SP Prime Atacado",
    supplierLocation: "São Paulo/SP",
    supplierCost: 47.9,
  },
  {
    id: "dn5",
    name: "Fone Bluetooth TWS Premium",
    image: "https://down-br.img.susercontent.com/file/sg-11134201-7rdwm-mdlgl6i0xjq13c",
    salePrice: 79.9,
    supplierName: "RioStock Distribuidora",
    supplierLocation: "Rio de Janeiro/RJ",
    supplierCost: 27.9,
  },
  {
    id: "dn17",
    name: "Bolsa Feminina Transversal Pequena",
    image: "https://down-br.img.susercontent.com/file/br-11134207-7r98o-m1z8d2cyqu5w23",
    salePrice: 74.9,
    supplierName: "SP Prime Atacado",
    supplierLocation: "São Paulo/SP",
    supplierCost: 24.9,
  },
];

const GDM_CUSTOMERS = [
  { name: "Ana Silva", email: "a***@gmail.com", phone: "(11) *****-1234", loc: "São Paulo, SP" },
  { name: "Carlos Souza", email: "c***@hotmail.com", phone: "(21) *****-5678", loc: "Rio de Janeiro, RJ" },
  { name: "Mariana Oliveira", email: "m***@gmail.com", phone: "(31) *****-9012", loc: "Belo Horizonte, MG" },
  { name: "João Pereira", email: "j***@outlook.com", phone: "(41) *****-3456", loc: "Curitiba, PR" },
  { name: "Beatriz Santos", email: "b***@gmail.com", phone: "(51) *****-7890", loc: "Porto Alegre, RS" },
  { name: "Rafael Lima", email: "r***@gmail.com", phone: "(71) *****-2345", loc: "Salvador, BA" },
  { name: "Camila Costa", email: "c***@yahoo.com", phone: "(81) *****-6789", loc: "Recife, PE" },
  { name: "Diego Almeida", email: "d***@gmail.com", phone: "(85) *****-0123", loc: "Fortaleza, CE" },
];

function buildGdmPresentationOrders(): SalesOrder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  const orders: SalesOrder[] = [];
  let counter = 0;

  // Deterministic LCG so the same orders appear across reloads.
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const buildBlock = (
    startDay: number,
    endDay: number,
    ordersPerDay: number,
    totalTargetCents: number,
  ) => {
    const days = endDay - startDay + 1;
    const totalOrders = days * ordersPerDay;
    let remainingCents = totalTargetCents;
    const commissionsCents: number[] = [];
    for (let i = 0; i < totalOrders; i++) {
      if (i === totalOrders - 1) {
        commissionsCents.push(Math.max(100, remainingCents));
      } else {
        const remainingOrders = totalOrders - i;
        const avg = remainingCents / remainingOrders;
        const minC = Math.max(2800, Math.floor(avg * 0.7));
        const maxC = Math.min(80000, Math.floor(avg * 1.3));
        const c = Math.floor(minC + rand() * Math.max(1, maxC - minC));
        commissionsCents.push(c);
        remainingCents -= c;
      }
    }
    let idx = 0;
    for (let d = startDay; d <= endDay; d++) {
      const dayBase = today.getTime() - d * dayMs;
      for (let j = 0; j < ordersPerDay; j++) {
        const commCents = commissionsCents[idx++];
        const p = GDM_PRODUCTS[counter % GDM_PRODUCTS.length];
        const cust = GDM_CUSTOMERS[counter % GDM_CUSTOMERS.length];
        const hour = 9 + Math.floor(rand() * 13); // 9..21
        const minute = Math.floor(rand() * 60);
        const ts = dayBase + hour * 3_600_000 + minute * 60_000;
        orders.push({
          id: `gdm-${counter}`,
          productId: p.id,
          productName: p.name,
          productImage: p.image,
          marketplace: "shopee",
          supplierName: p.supplierName,
          supplierLocation: p.supplierLocation,
          customerName: cust.name,
          customerEmailMasked: cust.email,
          customerPhoneMasked: cust.phone,
          customerLocation: cust.loc,
          salePrice: p.salePrice,
          supplierCost: p.supplierCost,
          marketplaceFee: 0,
          operationalCost: 0,
          netProfit: commCents / 100,
          saleDate: ts,
          source: "gdm_presentation_data",
        });
        counter++;
      }
    }
  };

  // 7d window: 6 days (days 1..6 ago) totalling R$ 58.435,70
  buildBlock(1, 6, 25, Math.round(GDM_TARGET_7D * 100));
  // 23 older days (7..29 ago) totalling R$ 233.742,80 - R$ 58.435,70 = R$ 175.307,10
  buildBlock(7, 29, 20, Math.round((GDM_TARGET_30D - GDM_TARGET_7D) * 100));

  return orders.sort((a, b) => b.saleDate - a.saleDate);
}

function injectGdmOrders(existing: SalesOrder[]): SalesOrder[] {
  const fresh = buildGdmPresentationOrders();
  const others = existing.filter((o) => !o.id.startsWith("gdm-"));
  return [...fresh, ...others].sort((a, b) => b.saleDate - a.saleDate);
}

const newUserData = (): UserData => ({
  meusProdutos: [],
  salesOrders: [],
  marketplaces: { shopee: zeroMP() },
});

export type ApprovalStatus = "pending" | "approved" | "rejected" | "blocked_payment";
export type ConnectionStatus = "pending_validation" | "approved" | "rejected";
export type UserConnections = Partial<Record<Marketplace, ConnectionStatus>>;
export type AccountRecord = {
  userId?: string;
  name: string;
  phone?: string;
  status?: ApprovalStatus;
  createdAt?: number;
  approvedAt?: number;
  approvedBy?: string;
};
function loadUserData(email: string, isAdmin: boolean): UserData {
  try {
    const raw = localStorage.getItem(DATA_KEY(email));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserData>;
      const meus = parsed.meusProdutos ?? [];
      const merged = isAdmin ? mergeAdminPreload(meus) : meus;
      return {
        marketplaces: parsed.marketplaces ?? newUserData().marketplaces,
        meusProdutos: promoteReadyProducts(merged),
        salesOrders: parsed.salesOrders ?? [],
      };
    }
  } catch {}
  return isAdmin ? adminInitialData() : newUserData();
}
function persistUserData(email: string, d: UserData) {
  try { localStorage.setItem(DATA_KEY(email), JSON.stringify(d)); } catch {}
}

type Ctx = {
  user: User | null;
  isAdmin: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; pending?: boolean; blocked?: boolean; passwordReset?: boolean }>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ ok: boolean; error?: string; pending?: boolean }>;
  logout: () => void;
  selectedMarketplace: Marketplace;
  setSelectedMarketplace: (m: Marketplace) => void;
  data: UserData;
  triggerDemoSale: (mp?: Marketplace) => Promise<{
    amount: number;
    marketplace: Marketplace;
    product?: SavedProduct;
    orderId?: string;
    empty?: boolean;
    sheinSkipped?: boolean;
  }>;
  saveMeuProduto: (p: SavedProduct) => void;
  addSalesOrderForProduct: (productId: string) => Promise<{
    amount: number;
    marketplace: Marketplace;
    product?: SavedProduct;
    orderId?: string;
    empty?: boolean;
    sheinSkipped?: boolean;
  } | null>;
  vendasHoje: Record<Marketplace, number>;
  privacy: boolean;
  setPrivacy: (b: boolean) => void;
  adminPresentationMode: boolean;
  toggleAdminPresentationMode: () => boolean;
  getCommissionSum: (mp: Marketplace, range: "today" | "7d" | "30d") => number;
  listAccounts: () => Array<AccountRecord & { email: string }>;
  refreshAccounts: () => Promise<void>;
  approveAccount: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  rejectAccount: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  blockAccountPayment: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  unblockAccountPayment: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  accountStatus: ApprovalStatus | null;
  addManualCommissionToUser: (email: string, mp: Marketplace, amount: number, productId?: string) => Promise<{ ok: boolean; error?: string; orderId?: string }>;
  bulkAdminDemoCommissionShopee: (amount: number, note?: string) => Promise<{ ok: boolean; error?: string; success?: number; errors?: number; skipped?: number; eligible?: number }>;
  approveAllPendingAccounts: () => Promise<{ ok: boolean; error?: string; count?: number }>;
  adminCreateBoostCampaign: (userId: string, packId: "inicio" | "aceleracao" | "escala" | "maximo", startsAt: string, note: string | undefined, replace: boolean) => Promise<{ ok: boolean; error?: string; campaignId?: string; packName?: string; packValue?: number }>;
  adminCancelBoostCampaign: (campaignId: string) => Promise<{ ok: boolean; error?: string }>;
  getActiveBoostByUserId: (userId: string) => { id: string; packId: string; packName: string; packValue: number; startsAt: string; endsAt: string; eventsTotal: number; eventsReleased: number; commissionTotal: number } | null;
  myActiveBoost: { id: string; packId: string; packName: string; packValue: number; startsAt: string; endsAt: string; eventsTotal: number; eventsReleased: number; commissionTotal: number; progressPct: number; returnMultiplier: number; completed: boolean } | null;
  getUserConnectedMarketplaces: (email: string) => Marketplace[];
  getUserProducts: (email: string) => SavedProduct[];
  // Marketplace connection validation (per-user, cross-device via Supabase)
  myConnections: UserConnections;
  getApprovedMarketplaces: () => Marketplace[];
  requestMarketplaceConnection: (mp: Marketplace) => Promise<{ ok: boolean; error?: string }>;
  getUserConnectionsByEmail: (email: string) => UserConnections;
  getUserApprovedMarketplaces: (email: string) => Marketplace[];
  validateMarketplaceConnection: (userId: string, mp: Marketplace) => Promise<{ ok: boolean; error?: string }>;
  rejectMarketplaceConnection: (userId: string, mp: Marketplace) => Promise<{ ok: boolean; error?: string }>;
  // Product validation (admin) + central product tracking
  allUserProducts: AdminUserProduct[];
  refreshAllUserProducts: () => Promise<void>;
  getUserCommissionTotal: (userId: string) => number;
  validateUserProduct: (productRowId: string) => Promise<{ ok: boolean; error?: string }>;
  validateAllPendingProducts: () => Promise<{ ok: boolean; error?: string; count?: number }>;
  validateUserPendingProducts: (userId: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
  validateAllPendingConnections: () => Promise<{ ok: boolean; error?: string; count?: number }>;
  validateUserPendingConnections: (userId: string) => Promise<{ ok: boolean; error?: string; count?: number }>;
  bulkApproveAllProductsAndMakeReady: () => Promise<{ ok: boolean; error?: string; count?: number }>;
  // Presentation-admin (limited admin) + lightning button persistence
  isPresentationAdmin: boolean;
  hasLightningAccess: boolean;
  passwordResetRequired: boolean;
  clearPasswordResetRequired: () => Promise<void>;
  recordLightningClick: () => Promise<{ ok: boolean; error?: string; amount?: number }>;
  resetTodaySales: () => Promise<{ ok: boolean; error?: string }>;
  isTodayReset: boolean;
  listAllProfiles: () => Promise<Array<{ userId: string; email: string; fullName: string; phone?: string | null; createdAt?: number; approvalStatus: ApprovalStatus; isPresentationAdmin: boolean; isFullAdmin: boolean }>>;
  grantPresentationAdmin: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  revokePresentationAdmin: (userId: string) => Promise<{ ok: boolean; error?: string }>;
};

// Withdrawal + account-age helpers
export type WithdrawalRequest = {
  id: string;
  userId: string;
  requestedAmount: number;
  pixKey: string;
  pixKeyType: string;
  holderName: string;
  status: string;
  createdAt: number;
};
type CtxExtras = {
  accountCreatedAt: number | null;
  accountApprovedAt: number | null;
  // Demo flow (Phase 1): server-authoritative timer fields read from profiles.
  // isDemo marks a time-limited demo user; demoExpiresAt is when access should
  // auto-block (enforcement lands in Phase 2 — here we only surface the values).
  isDemo: boolean;
  demoExpiresAt: number | null;
  submitWithdrawalRequest: (amount: number, pixKey: string, pixKeyType: string, holderName: string) => Promise<{ ok: boolean; error?: string; id?: string }>;
  listMyWithdrawalRequests: () => WithdrawalRequest[];
};

const C = createContext<(Ctx & CtxExtras) | null>(null);

const VENDA_INC_POOL = [50, 75, 100, 120, 150, 175, 200];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type VendasHojeStore = { date: string; values: Record<Marketplace, number> };

type CommissionHistory = Record<Marketplace, Record<string, number>>;

const emptyHistory = (): CommissionHistory => ({ shopee: {} });

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function seedAdminHistory(): CommissionHistory {
  const h = emptyHistory();
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = dateKey(d);
    // shopee: ~300-700/dia
    h.shopee[k] = Math.round((300 + Math.random() * 400) * 100) / 100;
  }
  // ensure today matches the displayed admin commission baseline
  const tk = dateKey(today);
  h.shopee[tk] = 502.83;
  return h;
}

function loadCommissionHistory(email: string, isAdmin: boolean): CommissionHistory {
  try {
    const raw = localStorage.getItem(COMMISSION_HIST_KEY(email));
    if (raw) {
      const parsed = JSON.parse(raw) as CommissionHistory;
      if (parsed && parsed.shopee) return parsed;
    }
  } catch {}
  return isAdmin ? seedAdminHistory() : emptyHistory();
}
function persistCommissionHistory(email: string, h: CommissionHistory) {
  try { localStorage.setItem(COMMISSION_HIST_KEY(email), JSON.stringify(h)); } catch {}
}
function sumRange(map: Record<string, number>, days: number): number {
  const today = new Date();
  let total = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    total += map[dateKey(d)] || 0;
  }
  return total;
}

function loadVendasHoje(email: string, isAdmin: boolean): VendasHojeStore {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(VENDAS_HOJE_KEY(email));
    if (raw) {
      const parsed: VendasHojeStore = JSON.parse(raw);
      if (parsed.date === today) return parsed;
    }
  } catch {}
  return {
    date: today,
    values: isAdmin ? { shopee: 5028.34 } : { shopee: 0 },
  };
}
function persistVendasHoje(email: string, v: VendasHojeStore) {
  try { localStorage.setItem(VENDAS_HOJE_KEY(email), JSON.stringify(v)); } catch {}
}

const SALE_LABEL: Record<Marketplace, (a: number) => string> = {
  shopee: (a: number) => `Nova comissão registrada na Shopee: R$ ${a.toFixed(2).replace(".", ",")}`,
};

const FAKE_CUSTOMERS = [
  { name: "mariana Souza", email: "mariana.souza@gmail.com", phone: "11923812381", city: "São Paulo/SP" },
  { name: "Lucas Almeida", email: "lucas.almeida@hotmail.com", phone: "21987427420", city: "Rio de Janeiro/RJ" },
  { name: "fernanda Costa", email: "fernanda.costa@outlook.com", phone: "31991541054", city: "Belo Horizonte/MG" },
  { name: "Rafael martins", email: "rafael.martins@gmail.com", phone: "41999881234", city: "Curitiba/PR" },
  { name: "Camila Rocha", email: "camila.rocha@gmail.com", phone: "51988772345", city: "Porto Alegre/RS" },
  { name: "joão Pedro", email: "joao.pedro@gmail.com", phone: "61977663456", city: "Brasília/DF" },
  { name: "Ana clara", email: "ana.clara@yahoo.com", phone: "71966554567", city: "Salvador/BA" },
  { name: "Bruno Henrique", email: "bruno.henrique@gmail.com", phone: "81955443678", city: "Recife/PE" },
  { name: "juliana Lima", email: "juliana.lima@gmail.com", phone: "11944332211", city: "Campinas/SP" },
  { name: "Pedro silva", email: "pedro.silva@outlook.com", phone: "31933221100", city: "Uberlândia/MG" },
];

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  const visible = u.slice(0, Math.min(4, Math.max(2, u.length - 2)));
  return `${visible}***@${d}`;
}
function maskPhone(p: string) {
  const d = p.replace(/\D/g, "");
  return `(${d.slice(0, 2)}) 9****-${d.slice(-4)}`;
}
const MP_PREFIX: Record<Marketplace, string> = { shopee: "SH" };
function makeOrderId(mp: Marketplace) {
  return `${MP_PREFIX[mp]}-${Math.floor(10000 + Math.random() * 89999)}`;
}
function buildOrderFromProduct(product: SavedProduct, mp: Marketplace): SalesOrder {
  const c = FAKE_CUSTOMERS[Math.floor(Math.random() * FAKE_CUSTOMERS.length)];
  const mpFee = Math.round(product.recommendedPrice * (product.marketplaceFee / 100) * 100) / 100;
  return {
    id: makeOrderId(mp),
    productId: product.id,
    productName: product.name,
    productImage: product.image,
    marketplace: mp,
    supplierName: product.supplierName,
    supplierLocation: product.supplierLocation,
    customerName: c.name,
    customerEmailMasked: maskEmail(c.email),
    customerPhoneMasked: maskPhone(c.phone),
    customerLocation: c.city,
    salePrice: product.recommendedPrice,
    supplierCost: product.supplierCost,
    marketplaceFee: mpFee,
    operationalCost: product.operationalCost,
    netProfit: product.estimatedNetProfit,
    saleDate: Date.now(),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<UserData>(newUserData());
  const [selectedMarketplace, setSelectedMarketplaceState] = useState<Marketplace>("shopee");
  const [vendasHojeStore, setVendasHojeStore] = useState<VendasHojeStore>({
    date: todayKey(), values: { shopee: 0 },
  });
  const [privacy, setPrivacyState] = useState<boolean>(false);
  const [adminPresentationMode, setAdminPresentationMode] = useState<boolean>(false);
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistory>(emptyHistory());
  const [lastAutoSaleAt, setLastAutoSaleAt] = useState<number>(0);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Array<AccountRecord & { email: string }>>([]);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myConnections, setMyConnections] = useState<UserConnections>({});
  const [allConnections, setAllConnections] = useState<Record<string, UserConnections>>({});
  const [allUserProducts, setAllUserProducts] = useState<AdminUserProduct[]>([]);
  const [allUserCommissionTotals, setAllUserCommissionTotals] = useState<Map<string, number>>(new Map());
  const [adminDemoConns, setAdminDemoConns] = useState<Marketplace[]>([]);
  const [accountCreatedAt, setAccountCreatedAt] = useState<number | null>(null);
  const [accountApprovedAt, setAccountApprovedAt] = useState<number | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [demoExpiresAt, setDemoExpiresAt] = useState<number | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [accountStatus, setAccountStatus] = useState<ApprovalStatus | null>(null);
  const [isPresentationAdmin, setIsPresentationAdmin] = useState<boolean>(false);
  const [passwordResetRequired, setPasswordResetRequired] = useState<boolean>(false);
  // Timestamp of the last "reset today" (✕ button) — only meaningful while it
  // is still the same local day. Persisted per user in localStorage.
  const [todayResetAt, setTodayResetAt] = useState<number | null>(null);

  // Reset-window suppression: orders sold today before the last reset are
  // hidden (and deleted server-side where policies allow). Ref keeps the
  // realtime callbacks below from closing over a stale value.
  const todayResetAtRef = useRef<number | null>(null);
  useEffect(() => { todayResetAtRef.current = todayResetAt; }, [todayResetAt]);
  const isResetSuppressed = (saleDate: number) => {
    const ra = todayResetAtRef.current;
    if (!ra) return false;
    const resetDayStart = new Date(ra); resetDayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    if (resetDayStart.getTime() !== todayStart.getTime()) return false; // reset expires at midnight
    return saleDate >= resetDayStart.getTime() && saleDate <= ra;
  };

  const isAdmin = isAdminUser || isAdminEmail(user?.email);

  // Admin demo connections: session-only, reset on logout/login.
  const adminDemoMap: UserConnections = useMemo(() => {
    const m: UserConnections = {};
    for (const mp of adminDemoConns) m[mp] = "approved";
    return m;
  }, [adminDemoConns]);

  // Bootstrap: UI prefs from localStorage (allowed) + Supabase session listener.
  useEffect(() => {
    try {
      const mp = localStorage.getItem(SELECTED_MP_KEY) as Marketplace | null;
      if (mp && MARKETPLACES.includes(mp)) setSelectedMarketplaceState(mp);
      const p = localStorage.getItem(PRIVACY_KEY);
      if (p === "1") { setPrivacyState(true); setGlobalPrivacy(true); }
      setAdminPresentationMode(localStorage.getItem(ADMIN_PRESENTATION_MODE_KEY) === "1");
    } catch {}

    const hydrate = async (sessionUser: { id: string; email?: string | null } | null) => {
      if (!sessionUser || !sessionUser.email) {
        setUser(null);
        setIsAdminUser(false);
        setIsPresentationAdmin(false);
        setPasswordResetRequired(false);
        setTodayResetAt(null);
        setCurrentUserId(null);
        setMyConnections({});
        setAllConnections({});
        setAdminDemoConns([]);
        try { sessionStorage.removeItem(ADMIN_DEMO_CONN_KEY); } catch {}
        setData(newUserData());
        setVendasHojeStore({ date: todayKey(), values: { shopee: 0 } });
        setCommissionHistory(emptyHistory());
        setLastAutoSaleAt(0);
        try { localStorage.removeItem(USER_KEY); } catch {}
        setAuthReady(true);
        return;
      }
      const email = sessionUser.email.toLowerCase();
      // Fetch profile + role. CRITICAL: on network/transient errors we must NOT
      // sign the user out — keeping the session lets the listener retry. Only an
      // explicit pending/rejected profile result triggers a sign-out.
      // NOTE: is_demo / demo_expires_at are intentionally NOT selected here yet.
      // Those columns don't exist in the live DB until the Phase 1 migration
      // (20260617120000_demo_phase1_timer.sql) is applied. Selecting a missing
      // column makes PostgREST return HTTP 400, which would make every hydrate
      // fail. Re-add them to this select ONLY after the migration is live.
      const profileRes = await supabase
        .from("profiles")
        .select("full_name, approval_status, created_at, approved_at, is_demo, demo_expires_at, password_reset_required")
        .eq("user_id", sessionUser.id)
        .maybeSingle();
      const rolesRes = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessionUser.id);
      const profile = profileRes.data;
      const roles = rolesRes.data;
      const fetchFailed = !!(profileRes.error || rolesRes.error);
      const admin = (roles ?? []).some((r) => r.role === "admin") || isAdminEmail(email);
      const presAdmin = (roles ?? []).some((r) => r.role === "presentation_admin");
      const status = profile?.approval_status as ApprovalStatus | undefined;
      if (!admin && !fetchFailed && profile && status && status !== "approved" && status !== "blocked_payment") {
        // Explicit pending/rejected → sign out (existing behavior).
        await supabase.auth.signOut();
        setUser(null); setIsAdminUser(false);
        setAccountStatus(status);
        setAuthReady(true);
        return;
      }
      // blocked_payment: keep the session alive so polling/realtime can detect
      // an unblock without forcing logout. DashboardGate redirects to the
      // payment-block screen based on accountStatus.
      if (!admin && status === "blocked_payment") {
        try { sessionStorage.setItem("shopesync.blocked_payment", "1"); } catch {}
      } else {
        try { sessionStorage.removeItem("shopesync.blocked_payment"); } catch {}
      }
      setAccountStatus(status ?? (admin ? "approved" : null));
      // If the profile lookup errored (offline / flaky wifi), keep the user signed in
      // optimistically and let realtime/refresh catch up. Never destroy local data.
      const name = profile?.full_name || (admin ? (ADMIN_NAME_BY_EMAIL[email] ?? ADMIN_NAME) : email.split("@")[0]);
      const u: User = { name, email };
      setUser(u); setIsAdminUser(admin);
      setIsPresentationAdmin(presAdmin && !admin);
      setPasswordResetRequired(profile?.password_reset_required === true);
      setCurrentUserId(sessionUser.id);
      setAccountCreatedAt(profile?.created_at ? new Date(profile.created_at).getTime() : null);
      setAccountApprovedAt(profile?.approved_at ? new Date(profile.approved_at).getTime() : null);
      // Demo timer (Phase 1): surface server-side values. Admins are never demos.
      setIsDemo(!admin && profile?.is_demo === true);
      setDemoExpiresAt(
        !admin && profile?.demo_expires_at ? new Date(profile.demo_expires_at).getTime() : null,
      );
      // Admin: load demo connections from sessionStorage (survives page refresh
      // within the same browser tab/session, cleared on logout).
      if (admin) {
        try {
          const raw = sessionStorage.getItem(ADMIN_DEMO_CONN_KEY);
          const arr = raw ? (JSON.parse(raw) as Marketplace[]) : [];
          setAdminDemoConns(Array.isArray(arr) ? arr.filter((m) => MARKETPLACES.includes(m)) : []);
        } catch { setAdminDemoConns([]); }
      } else {
        setAdminDemoConns([]);
      }
      try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch {}
      {
        const loaded = loadUserData(email, admin);
        const isGdm = admin || (presAdmin && !admin);
        setData(isGdm ? { ...loaded, salesOrders: injectGdmOrders(loaded.salesOrders) } : loaded);
      }
      setVendasHojeStore(loadVendasHoje(email, admin));
      setCommissionHistory(loadCommissionHistory(email, admin));
      try {
        const las = localStorage.getItem(LAST_AUTO_SALE_KEY(email));
        setLastAutoSaleAt(las ? Number(las) || 0 : 0);
      } catch {}
      try {
        const tr = Number(localStorage.getItem(TODAY_RESET_KEY(email)) || 0);
        setTodayResetAt(tr > 0 && dateKey(new Date(tr)) === dateKey(new Date()) ? tr : null);
      } catch { setTodayResetAt(null); }
      setAuthReady(true);
    };

    // Listener FIRST, then getSession (Supabase recommendation)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase calls to avoid deadlocks inside the callback.
      setTimeout(() => { hydrate(session?.user ?? null); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => { hydrate(data.session?.user ?? null); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (user) persistUserData(user.email, data);
  }, [data, user]);

  // persist vendas hoje
  useEffect(() => {
    if (user) persistVendasHoje(user.email, vendasHojeStore);
  }, [vendasHojeStore, user]);

  useEffect(() => {
    if (user) persistCommissionHistory(user.email, commissionHistory);
  }, [commissionHistory, user]);

  useEffect(() => {
    if (user) {
      try { localStorage.setItem(LAST_AUTO_SALE_KEY(user.email), String(lastAutoSaleAt)); } catch {}
    }
  }, [lastAutoSaleAt, user]);

  // Near-live payment-block enforcement: poll the current user's
  // approval_status from Supabase so an admin's "Bloquear por falta de
  // pagamento" (or "Liberar acesso") takes effect without requiring the
  // user to log out / log in.
  useEffect(() => {
    if (!user || !currentUserId || isAdmin) return;
    let cancelled = false;
    const check = async () => {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (cancelled || error || !prof) return;
      const s = prof.approval_status as ApprovalStatus | undefined;
      if (!s) return;
      setAccountStatus((prev) => (prev === s ? prev : s));
      try {
        if (s === "blocked_payment") sessionStorage.setItem("shopesync.blocked_payment", "1");
        else sessionStorage.removeItem("shopesync.blocked_payment");
      } catch {}
    };
    check();
    const id = setInterval(check, 8000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [user, currentUserId, isAdmin]);

  // Live sync: when admin updates this user's data from another tab/page,
  // reload data + commission history so dashboard/Vendas update without re-login.
  useEffect(() => {
    if (!user) return;
    const e = user.email.toLowerCase();
    const syncKey = `shopesync.sync.${e}`;
    const reload = () => {
      const admin = isAdminEmail(e);
      setData(loadUserData(e, admin));
      setCommissionHistory(loadCommissionHistory(e, admin));
      setVendasHojeStore(loadVendasHoje(e, admin));
    };
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === syncKey || ev.key === DATA_KEY(e) || ev.key === COMMISSION_HIST_KEY(e)) {
        reload();
      }
    };
    window.addEventListener("storage", onStorage);
    // Also poll lightly for same-tab admin changes
    const id = setInterval(() => {
      try {
        const v = localStorage.getItem(syncKey);
        if (v && v !== (window as unknown as { __lastSync?: string }).__lastSync) {
          (window as unknown as { __lastSync?: string }).__lastSync = v;
          reload();
        }
      } catch {}
    }, 4000);
    return () => { window.removeEventListener("storage", onStorage); clearInterval(id); };
  }, [user]);

  // Cross-device sync for admin-created demo sales (sales_orders table).
  // Loads existing orders on login and subscribes to realtime INSERTs so the
  // user's Dashboard / Vendas — Clientes update without re-login.
  useEffect(() => {
    if (!user || !currentUserId) return;
    let cancelled = false;

    const applyOrders = (rows: Array<Record<string, unknown>>) => {
      if (cancelled) return;
      const orders: SalesOrder[] = rows.map((r) => ({
        id: String(r.id),
        productId: (r.product_local_id as string) ?? (r.product_remote_id as string) ?? "",
        productName: (r.product_name as string) ?? "",
        productImage: (r.product_image as string) ?? "",
        marketplace: ((r.marketplace as string) ?? "shopee") as Marketplace,
        supplierName: (r.supplier_name as string) ?? "",
        supplierLocation: (r.supplier_location as string) ?? "",
        customerName: (r.customer_name as string) ?? "",
        customerEmailMasked: (r.customer_email_masked as string) ?? "",
        customerPhoneMasked: (r.customer_phone_masked as string) ?? "",
        customerLocation: (r.customer_location as string) ?? "",
        salePrice: Number(r.sale_price ?? 0),
        supplierCost: Number(r.supplier_cost ?? 0),
        marketplaceFee: Number(r.marketplace_fee ?? 0),
        operationalCost: Number(r.operational_cost ?? 0),
        netProfit: Number(r.commission ?? 0),
        saleDate: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
        source: (r.source as string | null) ?? null,
      }));

      // Hide today's orders that were cleared by the reset (✕) button. The
      // server-side delete is best-effort; this keeps them out either way.
      const visibleOrders = orders.filter((o) => !isResetSuppressed(o.saleDate));

      // Replace any existing remote-backed orders (those whose id matches a
      // sales_orders.id) with the fresh list, keeping local-only ones.
      const remoteIds = new Set(orders.map((o) => o.id));
      setData((s) => {
        const localOnly = s.salesOrders.filter((o) => !remoteIds.has(o.id) && !/^[0-9a-f-]{36}$/i.test(o.id));
        const merged = [...visibleOrders, ...localOnly].sort((a, b) => b.saleDate - a.saleDate);

        // Rebuild per-marketplace aggregates from these orders.
        const mps: Record<Marketplace, MarketplaceData> = { shopee: { ...s.marketplaces.shopee } };
        for (const mp of MARKETPLACES) {
          const cur = s.marketplaces[mp];
          const mine = merged.filter((o) => o.marketplace === mp);
          mps[mp] = {
            ...cur,
            sales: mine.length,
            revenue: mine.reduce((a, o) => a + o.salePrice, 0),
            commission: Math.round(mine.reduce((a, o) => a + o.netProfit, 0) * 100) / 100,
          };
        }
        return { ...s, salesOrders: merged, marketplaces: mps };
      });

      // Rebuild commissionHistory from these orders so getCommissionSum
      // (today / 7d / 30d) reflects the new sales.
      const hist: CommissionHistory = emptyHistory();
      for (const o of visibleOrders) {
        const dk = dateKey(new Date(o.saleDate));
        const m = hist[o.marketplace] || {};
        m[dk] = Math.round(((m[dk] || 0) + o.netProfit) * 100) / 100;
        hist[o.marketplace] = m;
      }
      setCommissionHistory(hist);
    };

    const fetchAll = async () => {
      type RowResult = { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
      // Admin fetches ALL orders (no user_id filter) to aggregate data across all users.
      const { data: rows, error } = isAdmin
        ? await (supabase.from("sales_orders" as never).select("*").order("created_at", { ascending: false }) as unknown as Promise<RowResult>)
        : await (supabase.from("sales_orders" as never).select("*").eq("user_id", currentUserId).order("created_at", { ascending: false }) as unknown as Promise<RowResult>);
      if (error) { console.error("[sales_orders] fetch failed:", error); return; }
      applyOrders(rows ?? []);
    };
    void fetchAll();

    const channelName = isAdmin ? "sales-orders-admin-all" : `sales-orders-${currentUserId}`;
    const channelFilter = isAdmin
      ? { event: "INSERT" as const, schema: "public", table: "sales_orders" }
      : { event: "INSERT" as const, schema: "public", table: "sales_orders", filter: `user_id=eq.${currentUserId}` };
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelFilter, () => { void fetchAll(); })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, currentUserId, isAdmin]);

  // midnight reset + slow organic growth for shopee
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      setVendasHojeStore((s) => {
        const today = todayKey();
        if (s.date !== today) {
          return { date: today, values: { shopee: 0 } };
        }
        // only grow during business hours (8h-23h) to feel natural
        const h = new Date().getHours();
        if (h < 8) return s;
        const next = { ...s.values };
        // ~50% chance per tick to add to shopee
        (["shopee"] as Marketplace[]).forEach((mp) => {
          if (Math.random() < 0.5) {
            next[mp] = next[mp] + VENDA_INC_POOL[Math.floor(Math.random() * VENDA_INC_POOL.length)];
          }
        });
        return { date: today, values: next };
      });
    };
    const id = setInterval(tick, 25000);
    return () => clearInterval(id);
  }, [user]);

  // Promote "Em configuração" → "Pronto para venda" when estimatedReadyAt passes,
  // and generate automatic sales for regular users on ready products.
  useEffect(() => {
    if (!user) return;
    const runPromotion = () => {
      setData((s) => {
        const next = promoteReadyProducts(s.meusProdutos);
        return next === s.meusProdutos ? s : { ...s, meusProdutos: next };
      });
    };
    runPromotion();

    if (isAdmin) return; // admin não recebe vendas automáticas; usa o botão raio

    const tryAutoSale = () => {
      const now = Date.now();
      const eligibleProducts = data.meusProdutos.filter(
        (p) => isProductValidatedForSale(p) && p.estimatedReadyAt && (now - p.estimatedReadyAt) >= READY_DELAY_MS && p.marketplaces.length > 0,
      );
      if (eligibleProducts.length === 0) return;
      if (lastAutoSaleAt && (now - lastAutoSaleAt) < AUTO_SALE_INTERVAL_MS) return;

      const product = eligibleProducts[Math.floor(Math.random() * eligibleProducts.length)];
      const mps = product.marketplaces;
      const mp = mps[Math.floor(Math.random() * mps.length)];
      const order = buildOrderFromProduct(product, mp);
      // Cap regular user commission < R$ 30
      const capped = REGULAR_COMMISSION_POOL[Math.floor(Math.random() * REGULAR_COMMISSION_POOL.length)];
      order.netProfit = capped;
      commitOrder(order, product);
      setLastAutoSaleAt(now);
    };

    // Try shortly after mount, then on an interval.
    const t0 = setTimeout(tryAutoSale, 4000);
    const id = setInterval(tryAutoSale, 60000);
    return () => { clearTimeout(t0); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, data.meusProdutos.length, lastAutoSaleAt]);

  const setSelectedMarketplace = (m: Marketplace) => {
    setSelectedMarketplaceState(m);
    try { localStorage.setItem(SELECTED_MP_KEY, m); } catch {}
  };

  const setPrivacy = (b: boolean) => {
    setPrivacyState(b);
    setGlobalPrivacy(b);
    try { localStorage.setItem(PRIVACY_KEY, b ? "1" : "0"); } catch {}
  };

  const toggleAdminPresentationMode = () => {
    if (!isAdmin) return adminPresentationMode;
    const next = !adminPresentationMode;
    setAdminPresentationMode(next);
    try { localStorage.setItem(ADMIN_PRESENTATION_MODE_KEY, next ? "1" : "0"); } catch {}
    return next;
  };

  const login = async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    // Auto-provision admin account on first login attempt
    if (isAdminEmail(e)) {
      let res = await supabase.auth.signInWithPassword({ email: e, password });
      if (res.error) {
        // attempt signup if account doesn't exist yet
        const signUp = await supabase.auth.signUp({
          email: e,
          password: password || ADMIN_PASSWORD,
          options: { data: { full_name: ADMIN_NAME_BY_EMAIL[e] ?? ADMIN_NAME, phone: "" } },
        });
        if (signUp.error && !/registered|exists/i.test(signUp.error.message)) {
          return { ok: false, error: "Senha incorreta." };
        }
        res = await supabase.auth.signInWithPassword({ email: e, password });
        if (res.error) return { ok: false, error: "Senha incorreta." };
      }
      // Check if admin needs password reset after migration
      const { data: sessAdmin } = await supabase.auth.getUser();
      if (sessAdmin.user) {
        const { data: profAdmin } = await supabase
          .from("profiles")
          .select("password_reset_required")
          .eq("user_id", sessAdmin.user.id)
          .maybeSingle();
        if (profAdmin?.password_reset_required === true) {
          return { ok: true, passwordReset: true };
        }
      }
      return { ok: true };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error) {
      const msg = error.message || "";
      if (/Invalid login credentials/i.test(msg)) return { ok: false, error: "E-mail ou senha incorretos." };
      return { ok: false, error: msg };
    }
    // Verify approval status with the user we just signed in as
    const { data: sess } = await supabase.auth.getUser();
    if (sess.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, password_reset_required")
        .eq("user_id", sess.user.id)
        .maybeSingle();
      const status = (profile?.approval_status as ApprovalStatus | undefined) ?? "pending";
      if (status === "pending") {
        await supabase.auth.signOut();
        return { ok: false, pending: true, error: "Sua conta está em análise. Prazo máximo: até 30 minutos." };
      }
      if (status === "rejected") {
        await supabase.auth.signOut();
        return { ok: false, error: "Seu cadastro foi recusado. Entre em contato com o suporte." };
      }
      if (status === "blocked_payment") {
        try { sessionStorage.setItem("shopesync.blocked_payment", "1"); } catch {}
        await supabase.auth.signOut();
        return { ok: false, blocked: true, error: "Acesso bloqueado por falta de pagamento." };
      }
      if (profile?.password_reset_required === true) {
        return { ok: true, passwordReset: true };
      }
    }
    return { ok: true };
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    const e = email.trim().toLowerCase();
    if (!name.trim() || !e || !password || !phone.trim()) return { ok: false, error: "Preencha todos os campos." };
    if (isAdminEmail(e)) return { ok: false, error: "Este e-mail já está em uso." };
    const { error } = await supabase.auth.signUp({
      email: e,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        data: { full_name: name.trim(), phone: phone.trim() },
      },
    });
    if (error) {
      if (/registered|exists/i.test(error.message)) return { ok: false, error: "Já existe uma conta com este e-mail." };
      return { ok: false, error: error.message };
    }
    // Auto-confirm is enabled, so a session was created. Sign out so pending users can't access.
    await supabase.auth.signOut();
    persistUserData(e, newUserData());
    return { ok: true, pending: true };
  };

  const logout = () => {
    supabase.auth.signOut();
    // Reset admin demo connection state on logout (visual reset only).
    try { sessionStorage.removeItem(ADMIN_DEMO_CONN_KEY); } catch {}
    setAdminDemoConns([]);
    // Session listener will clear state.
  };

  const commitOrder = (order: SalesOrder, product: SavedProduct) => {
    const target = order.marketplace;
    setData((s) => {
      const cur = s.marketplaces[target];
      const series = [...cur.series];
      const last = { ...series[series.length - 1] };
      last.sales += 1; last.revenue += order.salePrice; last.commission += order.netProfit;
      series[series.length - 1] = last;
      const updated: MarketplaceData = {
        ...cur,
        sales: cur.sales + 1,
        revenue: cur.revenue + order.salePrice,
        commission: cur.commission + order.netProfit,
        series,
        events: [
          { id: String(Date.now()), title: SALE_LABEL[target](order.netProfit), amount: order.netProfit, time: "agora" },
          ...cur.events,
        ].slice(0, 8),
      };
      return {
        ...s,
        marketplaces: { ...s.marketplaces, [target]: updated },
        salesOrders: [order, ...s.salesOrders],
      };
    });
    setVendasHojeStore((s) => {
      const today = todayKey();
      const base = s.date === today ? s.values : { shopee: 0 };
      return { date: today, values: { ...base, [target]: base[target] + order.salePrice } };
    });
    setCommissionHistory((h) => {
      const tk = todayKey();
      const mpMap = { ...(h[target] || {}) };
      mpMap[tk] = (mpMap[tk] || 0) + order.netProfit;
      return { ...h, [target]: mpMap };
    });
    return { amount: order.netProfit, marketplace: target, product, orderId: order.id };
  };

  const triggerDemoSale = async (mp?: Marketplace) => {
    const products = data.meusProdutos.filter(isProductValidatedForSale);
    const requested = mp ?? selectedMarketplace;
    if (products.length === 0) {
      return { amount: 0, marketplace: requested, empty: true };
    }
    let eligible = products.filter((p) => p.marketplaces.includes(requested));
    let target: Marketplace = requested;
    if (eligible.length === 0) {
      eligible = products;
      target = eligible[0].marketplaces[0] ?? requested;
    }
    const product = eligible[Math.floor(Math.random() * eligible.length)];
    const actualMP: Marketplace = product.marketplaces.includes(target) ? target : product.marketplaces[0];

    if (!isAdmin && product.remoteId) {
      try {
        const commission = product.estimatedNetProfit || product.estimatedCommission || 15;
        const { data: newId, error } = await supabase.rpc("create_robo_sale_order" as never, {
          _product_row_id: product.remoteId,
          _commission: commission
        } as never);
        if (error) {
          console.warn("[triggerDemoSale] RPC error, falling back to local:", error.message);
        } else {
          return { amount: commission, marketplace: actualMP, product, orderId: newId as string };
        }
      } catch (err) {
        console.warn("[triggerDemoSale] failed, falling back to local:", err);
      }
    }

    const order = buildOrderFromProduct(product, actualMP);
    return commitOrder(order, product);
  };

  const addSalesOrderForProduct = async (productId: string) => {
    const product = data.meusProdutos.find((p) => p.id === productId);
    if (!product) return null;
    if (!isProductValidatedForSale(product)) return null;
    const mp = product.marketplaces[0];
    if (!mp) return null;

    if (!isAdmin && product.remoteId) {
      try {
        const commission = product.estimatedNetProfit || product.estimatedCommission || 15;
        const { data: newId, error } = await supabase.rpc("create_robo_sale_order" as never, {
          _product_row_id: product.remoteId,
          _commission: commission
        } as never);
        if (error) {
          console.warn("[addSalesOrderForProduct] RPC error, falling back to local:", error.message);
        } else {
          return { amount: commission, marketplace: mp, product, orderId: newId as string };
        }
      } catch (err) {
        console.warn("[addSalesOrderForProduct] failed, falling back to local:", err);
      }
    }

    const order = buildOrderFromProduct(product, mp);
    return commitOrder(order, product);
  };

  const saveMeuProduto = (p: SavedProduct) => {
    // New products go live instantly — no admin validation required. They are
    // created already approved and ready for sale. The product is still pushed
    // to the central user_products table (RPC below) so it stays visible in the
    // admin panel; admin approval is simply no longer a prerequisite for selling.
    const finalProduct: SavedProduct = {
      ...p,
      status: "Pronto para venda",
      currentStep: "Produto disponível na loja",
      productValidationStatus: "approved",
    };
    const isAdminUserNow = !!user && isAdminEmail(user.email);
    setData((s) => ({ ...s, meusProdutos: [finalProduct, ...s.meusProdutos] }));
    // Central tracking so admin can see/validate from any device.
    if (currentUserId && !isAdminUserNow) {
      void (async () => {
        const { error } = await supabase.rpc("upsert_my_product_for_validation" as never, {
          _local_id: finalProduct.id,
          _product_id: finalProduct.productId ?? null,
          _name: finalProduct.name,
          _image: finalProduct.image ?? null,
          _category: finalProduct.category ?? null,
          _marketplaces: finalProduct.marketplaces ?? [],
          _supplier_name: finalProduct.supplierName ?? null,
          _supplier_location: finalProduct.supplierLocation ?? null,
          _supplier_cost: finalProduct.supplierCost ?? null,
          _recommended_price: finalProduct.recommendedPrice ?? null,
          _estimated_commission: finalProduct.estimatedCommission ?? null,
        } as never);
        if (error) {
          console.error("[saveMeuProduto] upsert RPC failed:", error);
        }
      })();
    }
  };

  const getCommissionSum = (mp: Marketplace, range: "today" | "7d" | "30d") => {
    const now = new Date();
    const start = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    );
    start.setHours(0, 0, 0, 0);
    if (range === "7d") start.setDate(start.getDate() - 6);
    else if (range === "30d") start.setDate(start.getDate() - 29);
    const startTs = start.getTime();
    const endTs = range === "today" ? now.getTime() : Date.now();
    let total = 0;
    for (const o of data.salesOrders) {
      if (o.marketplace !== mp) continue;
      if (o.saleDate < startTs || o.saleDate > endTs) continue;
      total += o.netProfit;
    }
    return Math.round(total * 100) / 100;
  };

  const listAccounts = (): Array<AccountRecord & { email: string }> => accounts;

  const refreshAccounts = async () => {
    if (!isAdmin) return;
    const { data: rows } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, approval_status, created_at, approved_at, approved_by")
      .order("created_at", { ascending: false });
    if (!rows) return;
    setAccounts(
      rows.map((r) => ({
        userId: r.user_id,
        name: r.full_name,
        email: r.email,
        phone: r.phone ?? undefined,
        status: r.approval_status as ApprovalStatus,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : undefined,
        approvedAt: r.approved_at ? new Date(r.approved_at).getTime() : undefined,
        approvedBy: r.approved_by ?? undefined,
      })),
    );
  };

  // Load accounts when admin logs in + subscribe to realtime profile changes
  useEffect(() => {
    if (!isAdmin) { setAccounts([]); return; }
    refreshAccounts();
    const channel = supabase
      .channel("profiles-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        refreshAccounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const approveAccount = async (userId: string) => {
    const { error } = await supabase.rpc("approve_user", { _user_id: userId });
    if (error) return { ok: false, error: error.message };
    await refreshAccounts();
    return { ok: true };
  };
  const rejectAccount = async (userId: string) => {
    const { error } = await supabase.rpc("reject_user", { _user_id: userId });
    if (error) return { ok: false, error: error.message };
    await refreshAccounts();
    return { ok: true };
  };
  const blockAccountPayment = async (userId: string) => {
    const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("block_user_payment", { _user_id: userId });
    if (error) return { ok: false, error: error.message };
    await refreshAccounts();
    return { ok: true };
  };
  const unblockAccountPayment = async (userId: string) => {
    const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("unblock_user_payment", { _user_id: userId });
    if (error) return { ok: false, error: error.message };
    await refreshAccounts();
    return { ok: true };
  };

  // ============== Marketplace connections (DB-backed) ==============
  const parseConnRows = (rows: Array<{ user_id: string; marketplace: string; status: ConnectionStatus }>) => {
    const map: Record<string, UserConnections> = {};
    for (const r of rows) {
      if (!MARKETPLACES.includes(r.marketplace as Marketplace)) continue;
      const uid = r.user_id;
      if (!map[uid]) map[uid] = {};
      map[uid][r.marketplace as Marketplace] = r.status;
    }
    return map;
  };

  // Load + realtime subscribe to current user's connections
  useEffect(() => {
    if (!currentUserId || isAdmin) { setMyConnections({}); return; }
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from("user_marketplace_connections")
        .select("marketplace, status")
        .eq("user_id", currentUserId);
      if (cancelled || !rows) return;
      const m: UserConnections = {};
      for (const r of rows) {
        if (MARKETPLACES.includes(r.marketplace as Marketplace)) {
          m[r.marketplace as Marketplace] = r.status as ConnectionStatus;
        }
      }
      setMyConnections(m);
    };
    load();
    const channel = supabase
      .channel(`umc-user-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_marketplace_connections", filter: `user_id=eq.${currentUserId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [currentUserId, isAdmin]);

  // Admin: load all connections + realtime
  useEffect(() => {
    if (!isAdmin) { setAllConnections({}); return; }
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from("user_marketplace_connections")
        .select("user_id, marketplace, status");
      if (cancelled || !rows) return;
      setAllConnections(parseConnRows(rows as Array<{ user_id: string; marketplace: string; status: ConnectionStatus }>));
    };
    load();
    const channel = supabase
      .channel("umc-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_marketplace_connections" },
        () => { load(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [isAdmin]);

  const requestMarketplaceConnection = async (mp: Marketplace) => {
    if (!currentUserId) return { ok: false, error: "Sessão não encontrada." };
    // Admin: demo connection — auto-approve in session, do NOT touch DB.
    if (isAdmin) {
      setAdminDemoConns((prev) => {
        const next = prev.includes(mp) ? prev : [...prev, mp];
        try { sessionStorage.setItem(ADMIN_DEMO_CONN_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      return { ok: true };
    }
    // If a rejected or approved row exists, reset it to pending_validation via update; else insert.
    const existing = myConnections[mp];
    if (existing === "approved" || existing === "pending_validation") {
      // Already requested/validated — no-op success
      setMyConnections((s) => ({ ...s, [mp]: existing }));
      return { ok: true };
    }
    const { error } = await supabase
      .from("user_marketplace_connections")
      .upsert(
        {
          user_id: currentUserId,
          marketplace: mp,
          status: "pending_validation",
          requested_at: new Date().toISOString(),
          rejected_at: null,
          rejection_reason: null,
          validated_at: null,
          validated_by: null,
        },
        { onConflict: "user_id,marketplace" },
      );
    if (error) {
      console.error("[Shopee] requestMarketplaceConnection failed:", error);
      return { ok: false, error: "Não foi possível conectar a Shopee agora. Tente novamente." };
    }
    setMyConnections((s) => ({ ...s, [mp]: "pending_validation" }));
    return { ok: true };
  };

  const getApprovedMarketplaces = (): Marketplace[] => {
    if (isAdmin) return MARKETPLACES.filter((m) => adminDemoMap[m] === "approved");
    // Connection is automatic/instant: as soon as the user connects, it counts as
    // ready. A "pending_validation" row (what the DB stores on connect) is treated
    // as connected here — no admin validation of the connection is required.
    return MARKETPLACES.filter(
      (m) => myConnections[m] === "approved" || myConnections[m] === "pending_validation",
    );
  };

  const getUserConnectionsByEmail = (email: string): UserConnections => {
    const e = email.trim().toLowerCase();
    const acc = accounts.find((a) => a.email.toLowerCase() === e);
    if (!acc?.userId) return {};
    return allConnections[acc.userId] ?? {};
  };
  const getUserApprovedMarketplaces = (email: string): Marketplace[] => {
    const conns = getUserConnectionsByEmail(email);
    return MARKETPLACES.filter((m) => conns[m] === "approved");
  };

  const validateMarketplaceConnection = async (userId: string, mp: Marketplace) => {
    const { error } = await supabase.rpc("validate_marketplace_connection", { _user_id: userId, _marketplace: mp });
    if (error) return { ok: false, error: error.message };
    setAllConnections((s) => ({ ...s, [userId]: { ...(s[userId] ?? {}), [mp]: "approved" } }));
    return { ok: true };
  };
  const rejectMarketplaceConnection = async (userId: string, mp: Marketplace) => {
    const { error } = await supabase.rpc("reject_marketplace_connection", { _user_id: userId, _marketplace: mp });
    if (error) return { ok: false, error: error.message };
    setAllConnections((s) => ({ ...s, [userId]: { ...(s[userId] ?? {}), [mp]: "rejected" } }));
    return { ok: true };
  };

  const getUserConnectedMarketplaces = (email: string): Marketplace[] => {
    // Backwards-compat: now returns only VALIDATED marketplaces.
    return getUserApprovedMarketplaces(email);
  };

  const getUserProducts = (email: string): SavedProduct[] => {
    const e = email.trim().toLowerCase();
    if (isAdmin) {
      const acc = accounts.find((a) => a.email.toLowerCase() === e);
      const central = allUserProducts.filter((p) => acc?.userId ? p.userId === acc.userId : p.userEmail.toLowerCase() === e);
      if (central.length > 0) {
        return central.map<SavedProduct>((c) => ({
          id: c.localId,
          productId: c.productId ?? "",
          name: c.name,
          image: c.image ?? "",
          category: c.category ?? "",
          marketplaces: c.marketplaces,
          supplierName: c.supplierName ?? "",
          supplierLocation: c.supplierLocation ?? "",
          supplierCost: c.supplierCost ?? 0,
          margin: 0,
          marketplaceFee: 0,
          operationalCost: 0,
          recommendedPrice: c.recommendedPrice ?? 0,
          estimatedCommission: c.estimatedCommission ?? 0,
          estimatedNetProfit: c.estimatedCommission ?? 0,
          generatedTitle: "",
          generatedDescription: "",
          generatedKeywords: [],
          promotionText: "",
          status: c.status,
          currentStep: c.currentStep,
          sentAt: c.createdAt,
          estimatedReadyAt: c.createdAt,
          productValidationStatus: c.validationStatus,
          remoteId: c.id,
          validatedAt: c.validatedAt,
        }));
      }
      // Central DB empty — fall back to localStorage and flag products as unsynced.
      try {
        const raw = localStorage.getItem(DATA_KEY(e));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Partial<UserData>;
        return (parsed.meusProdutos ?? []).map((p) => ({ ...p, needsSync: true }));
      } catch { return []; }
    }
    try {
      const raw = localStorage.getItem(DATA_KEY(e));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Partial<UserData>;
      return parsed.meusProdutos ?? [];
    } catch { return []; }
  };

  const addManualCommissionToUser = async (email: string, mp: Marketplace, amount: number, productId?: string) => {
    const e = email.trim().toLowerCase();
    if (!e) return { ok: false, error: "E-mail inválido." };
    if (!(amount > 0) || amount >= 30) return { ok: false, error: "Valor deve ser positivo e inferior a R$ 30,00." };
    const acc = accounts.find((a) => a.email.toLowerCase() === e);
    if (!acc) return { ok: false, error: "Conta não encontrada. Atualize a página e tente novamente." };
    if (!acc.userId) return { ok: false, error: "ID do usuário ausente." };
    if (!productId) return { ok: false, error: "Selecione um produto." };
    // Map local product id → central user_products row UUID
    let central = allUserProducts.find((p) => p.userId === acc.userId && p.localId === productId);
    if (!central) {
      // allUserProducts might still be loading — refresh once and retry
      await refreshAllUserProducts();
      central = allUserProducts.find((p) => p.userId === acc.userId && p.localId === productId);
    }
    if (!central) return { ok: false, error: `Produto não encontrado para este usuário (id: ${productId}). Tente atualizar a página.` };
    // Accept approved products OR products marked as ready to sell (status variations)
    const isReady = central.validationStatus === "approved" ||
      central.status === "Pronto para venda" ||
      central.status === "Disponível na loja";
    if (!isReady) return { ok: false, error: `Produto ainda não validado (status: ${central.validationStatus ?? "—"}). Use "Liberar todos os produtos" primeiro.` };
    const c = FAKE_CUSTOMERS[Math.floor(Math.random() * FAKE_CUSTOMERS.length)];
    const { data: newId, error } = await supabase.rpc("admin_create_demo_sale_order" as never, {
      _user_id: acc.userId,
      _product_row_id: central.id,
      _marketplace: mp,
      _commission: Math.round(amount * 100) / 100,
      _customer_name: c.name,
      _customer_email_masked: maskEmail(c.email),
      _customer_phone_masked: maskPhone(c.phone),
      _customer_location: c.city,
    } as never);
    if (error) {
      console.error("[addManualCommissionToUser] RPC failed:", error);
      return { ok: false, error: error.message || "Não foi possível adicionar a comissão demo." };
    }
    return { ok: true, orderId: (newId as unknown as string) ?? undefined };
  };

  const bulkAdminDemoCommissionShopee = async (amount: number, note?: string) => {
    if (!(amount > 0)) return { ok: false as const, error: "Informe um valor válido de comissão." };
    const { data, error } = await supabase.rpc("admin_bulk_demo_commission_shopee" as never, {
      _commission: Math.round(amount * 100) / 100,
      _note: note ?? null,
    } as never);
    if (error) {
      console.error("[bulkAdminDemoCommissionShopee] RPC failed:", error);
      return { ok: false as const, error: error.message || "Falha ao executar ação em massa." };
    }
    const res = (data as unknown as { success?: number; errors?: number; skipped?: number; eligible?: number }) ?? {};
    return { ok: true as const, success: res.success ?? 0, errors: res.errors ?? 0, skipped: res.skipped ?? 0, eligible: res.eligible ?? 0 };
  };

  const approveAllPendingAccounts = async () => {
    const { data, error } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: number | null; error: { message: string } | null }>)("approve_all_pending_accounts");
    if (error) return { ok: false, error: error.message };
    await refreshAccounts();
    return { ok: true, count: (data as unknown as number) ?? 0 };
  };

  // ============== Boost campaigns (admin) ==============
  type BoostCampaignRow = {
    id: string; user_id: string; pack_id: string; pack_name: string; pack_value: number;
    status: string; starts_at: string; ends_at: string; created_at: string;
    approved_by: string | null; internal_note: string | null;
  };
  type BoostEventRow = {
    id: string; campaign_id: string; user_id: string;
    product_name: string; commission: number; status: string;
    scheduled_at: string; released_at: string | null;
  };
  const [boostCampaigns, setBoostCampaigns] = useState<BoostCampaignRow[]>([]);
  const [boostEvents, setBoostEvents] = useState<BoostEventRow[]>([]);

  // Admin loads all campaigns + their events for the badge/stats UI
  useEffect(() => {
    if (!isAdmin) { setBoostCampaigns([]); setBoostEvents([]); return; }
    let cancelled = false;
    const load = async () => {
      const [c, e] = await Promise.all([
        supabase.from("boost_campaigns" as never).select("*") as unknown as Promise<{ data: BoostCampaignRow[] | null }>,
        supabase.from("boost_simulated_events" as never).select("id,campaign_id,user_id,product_name,commission,status,scheduled_at,released_at") as unknown as Promise<{ data: BoostEventRow[] | null }>,
      ]);
      if (cancelled) return;
      setBoostCampaigns(c.data ?? []);
      setBoostEvents(e.data ?? []);
    };
    void load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAdmin]);

  const adminCreateBoostCampaign = async (
    userId: string, packId: "inicio" | "aceleracao" | "escala" | "maximo",
    startsAt: string, note: string | undefined, replace: boolean,
  ) => {
    const { data, error } = await supabase.rpc("admin_create_boost_campaign" as never, {
      _user_id: userId, _pack_id: packId, _starts_at: startsAt,
      _note: note ?? null, _replace: replace,
    } as never);
    if (error) {
      console.error("[adminCreateBoostCampaign] RPC failed:", error);
      return { ok: false as const, error: error.message || "Não foi possível ativar o impulsionamento agora." };
    }
    const res = (data as unknown as { ok: boolean; error?: string; campaign_id?: string; pack_name?: string; pack_value?: number }) ?? { ok: false };
    if (!res.ok) return { ok: false as const, error: res.error || "Não foi possível ativar o impulsionamento agora." };
    // refresh admin state
    const [c, e] = await Promise.all([
      supabase.from("boost_campaigns" as never).select("*") as unknown as Promise<{ data: BoostCampaignRow[] | null }>,
      supabase.from("boost_simulated_events" as never).select("id,campaign_id,user_id,product_name,commission,status,scheduled_at,released_at") as unknown as Promise<{ data: BoostEventRow[] | null }>,
    ]);
    setBoostCampaigns(c.data ?? []);
    setBoostEvents(e.data ?? []);
    return { ok: true as const, campaignId: res.campaign_id, packName: res.pack_name, packValue: res.pack_value };
  };

  const adminCancelBoostCampaign = async (campaignId: string) => {
    const { error } = await supabase.rpc("admin_cancel_boost_campaign" as never, { _campaign_id: campaignId } as never);
    if (error) {
      console.error("[adminCancelBoostCampaign] RPC failed:", error);
      return { ok: false as const, error: error.message || "Falha ao cancelar." };
    }
    setBoostCampaigns((s) => s.map((c) => (c.id === campaignId ? { ...c, status: "cancelled" } : c)));
    setBoostEvents((s) => s.filter((e) => !(e.campaign_id === campaignId && e.status === "scheduled")));
    return { ok: true as const };
  };

  const getActiveBoostByUserId = (userId: string) => {
    const camp = boostCampaigns.find((c) => c.user_id === userId && c.status === "active");
    if (!camp) return null;
    const evts = boostEvents.filter((e) => e.campaign_id === camp.id);
    const released = evts.filter((e) => e.status === "released");
    return {
      id: camp.id, packId: camp.pack_id, packName: camp.pack_name, packValue: camp.pack_value,
      startsAt: camp.starts_at, endsAt: camp.ends_at,
      eventsTotal: evts.length, eventsReleased: released.length,
      commissionTotal: Math.round(released.reduce((a, e) => a + Number(e.commission || 0), 0) * 100) / 100,
    };
  };

  // ============== User-side own active boost ==============
  const [myBoostCampaign, setMyBoostCampaign] = useState<BoostCampaignRow | null>(null);
  const [myBoostEvents, setMyBoostEvents] = useState<BoostEventRow[]>([]);

  useEffect(() => {
    if (!user || !currentUserId) { setMyBoostCampaign(null); setMyBoostEvents([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data: camps } = await (supabase.from("boost_campaigns" as never)
        .select("*")
        .eq("user_id", currentUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1) as unknown as Promise<{ data: BoostCampaignRow[] | null }>);
      if (cancelled) return;
      const camp = (camps && camps[0]) ?? null;
      setMyBoostCampaign(camp);
      if (!camp) { setMyBoostEvents([]); return; }
      const { data: evts } = await (supabase.from("boost_simulated_events" as never)
        .select("id,campaign_id,user_id,product_name,commission,status,scheduled_at,released_at")
        .eq("campaign_id", camp.id) as unknown as Promise<{ data: BoostEventRow[] | null }>);
      if (cancelled) return;
      setMyBoostEvents(evts ?? []);
    };
    void load();
    const id = setInterval(load, 30000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel(`my-boost-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "boost_simulated_events", filter: `user_id=eq.${currentUserId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "boost_campaigns", filter: `user_id=eq.${currentUserId}` }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); supabase.removeChannel(channel); };
  }, [user, currentUserId]);

  const myActiveBoost = useMemo(() => {
    const camp = myBoostCampaign;
    if (!camp) return null;
    const released = myBoostEvents.filter((e) => e.status === "released");
    const commissionTotal = Math.round(released.reduce((a, e) => a + Number(e.commission || 0), 0) * 100) / 100;
    const startsTs = new Date(camp.starts_at).getTime();
    const endsTs = new Date(camp.ends_at).getTime();
    const now = Date.now();
    const total = Math.max(1, endsTs - startsTs);
    const elapsed = Math.max(0, Math.min(total, now - startsTs));
    const progressPct = Math.round((elapsed / total) * 100);
    const returnMultiplier = camp.pack_value > 0 ? Math.round((commissionTotal / camp.pack_value) * 100) / 100 : 0;
    return {
      id: camp.id, packId: camp.pack_id, packName: camp.pack_name, packValue: camp.pack_value,
      startsAt: camp.starts_at, endsAt: camp.ends_at,
      eventsTotal: myBoostEvents.length, eventsReleased: released.length,
      commissionTotal, progressPct,
      returnMultiplier,
      completed: now >= endsTs,
    };
  }, [myBoostCampaign, myBoostEvents]);

  // User-side: release due boost events for self periodically. Realtime
  // INSERT subscription on sales_orders picks up the newly released rows
  // and updates Dashboard / Vendas — Clientes automatically.
  useEffect(() => {
    if (!user || !currentUserId || isAdmin) return;
    let cancelled = false;
    const tryRelease = async () => {
      const { error } = await supabase.rpc("release_due_boost_events" as never, {} as never);
      if (error && !cancelled) console.warn("[release_due_boost_events] failed:", error.message);
    };
    void tryRelease();
    const id = setInterval(tryRelease, 30000);
    const onFocus = () => { void tryRelease(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [user, currentUserId, isAdmin]);

  // ============== Central product validation (DB-backed) ==============
  type ProductRow = {
    id: string; user_id: string; local_id: string; product_id: string | null;
    name: string; image: string | null; category: string | null;
    marketplaces: string[]; supplier_name: string | null; supplier_location: string | null;
    supplier_cost: number | null; recommended_price: number | null; estimated_commission: number | null;
    status: string; current_step: string;
    validation_status: ProductValidationStatus;
    created_at: string; validated_at: string | null;
  };
  const sbAny = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => { eq: (k: string, v: string) => Promise<{ data: ProductRow[] | null; error: { message: string } | null }> } & Promise<{ data: ProductRow[] | null; error: { message: string } | null }>;
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };

  // Admin: load all user_products + realtime
  // NOTE: We load profiles inline (not from `accounts` state) to avoid a race condition
  // where user_products resolves before refreshAccounts(), leaving userEmail = "".
  useEffect(() => {
    if (!isAdmin) { setAllUserProducts([]); setAllUserCommissionTotals(new Map()); return; }
    let cancelled = false;
    const load = async () => {
      // Load user_products AND profiles in parallel — avoids dependency on `accounts` state
      const [prodRes, profilesRes, salesRes] = await Promise.all([
        supabase.from("user_products" as never).select("*") as unknown as Promise<{ data: ProductRow[] | null }>,
        (supabase.from("profiles" as never).select("user_id, email, full_name") as unknown as Promise<{ data: Array<{ user_id: string; email: string; full_name: string }> | null }>),
        (supabase.from("sales_orders" as never).select("user_id, commission") as unknown as Promise<{ data: Array<{ user_id: string; commission: number }> | null }>),
      ]);
      if (cancelled) return;
      // Build profile lookup by user_id
      const profByUid = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
      setAllUserProducts((prodRes.data ?? []).map((r) => {
        const prof = r.user_id ? profByUid.get(r.user_id) : undefined;
        return {
          id: r.id,
          userId: r.user_id,
          userEmail: prof?.email ?? "",
          userName: prof?.full_name ?? "",
          localId: r.local_id,
          productId: r.product_id,
          name: r.name,
          image: r.image,
          category: r.category,
          marketplaces: (r.marketplaces ?? []).filter((m) => MARKETPLACES.includes(m as Marketplace)) as Marketplace[],
          supplierName: r.supplier_name,
          supplierLocation: r.supplier_location,
          supplierCost: r.supplier_cost ?? undefined,
          recommendedPrice: r.recommended_price ?? undefined,
          estimatedCommission: r.estimated_commission ?? undefined,
          status: r.status,
          currentStep: r.current_step,
          validationStatus: r.validation_status,
          createdAt: new Date(r.created_at).getTime(),
          validatedAt: r.validated_at ? new Date(r.validated_at).getTime() : undefined,
        };
      }));
      // Load commission totals per user from sales_orders
      if (salesRes.data) {
        const totals = new Map<string, number>();
        for (const row of salesRes.data) {
          if (!row.user_id) continue;
          totals.set(row.user_id, Math.round(((totals.get(row.user_id) ?? 0) + Number(row.commission ?? 0)) * 100) / 100);
        }
        setAllUserCommissionTotals(totals);
      }
    };
    load();
    const channel = supabase
      .channel("user-products-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_products" }, () => { load(); })
      .subscribe();
    const interval = window.setInterval(load, 10000);
    return () => { cancelled = true; window.clearInterval(interval); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Regular user: subscribe to own user_products changes → reflect validation in local data
  useEffect(() => {
    if (!currentUserId || isAdmin || !user) return;
    const email = user.email.toLowerCase();
    let cancelled = false;
    const sync = async () => {
      const res = await (supabase
        .from("user_products" as never)
        .select("id, local_id, status, current_step, validation_status, validated_at")
        .eq("user_id", currentUserId) as unknown as Promise<{ data: Array<{ id: string; local_id: string; status: string; current_step: string; validation_status: ProductValidationStatus; validated_at: string | null }> | null }>);
      const rows = res.data ?? [];
      if (cancelled || rows.length === 0) return;
      const byLocal = new Map(rows.map((r) => [r.local_id, r]));
      setData((s) => {
        let changed = false;
        const next = s.meusProdutos.map((p) => {
          const remote = byLocal.get(p.id);
          if (!remote) return p;
          const remoteStatus = remote.validation_status;
          const adminActed = remoteStatus === "approved" || remoteStatus === "rejected";
          if (!adminActed) return p;
          if (
            p.productValidationStatus !== remoteStatus ||
            p.status !== remote.status ||
            p.currentStep !== remote.current_step ||
            p.remoteId !== remote.id
          ) {
            changed = true;
            return {
              ...p,
              productValidationStatus: remoteStatus,
              status: remote.status,
              currentStep: remote.current_step,
              validatedAt: remote.validated_at ? new Date(remote.validated_at).getTime() : p.validatedAt,
              remoteId: remote.id,
            };
          }
          return p;
        });
        if (!changed) return s;
        const updated = { ...s, meusProdutos: next };
        persistUserData(email, updated);
        return updated;
      });
    };
    sync();
    const channel = supabase
      .channel(`user-products-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_products", filter: `user_id=eq.${currentUserId}` },
        () => { sync(); },
      )
      .subscribe();
    const interval = window.setInterval(sync, 5000);
    return () => { cancelled = true; window.clearInterval(interval); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, isAdmin, user?.email]);

  // Regular user: back-sync any local products to the central DB so the admin
  // can see them in "Validar Cadastros". This covers products saved before
  // this sync existed, or where the original RPC call failed silently.
  useEffect(() => {
    if (!currentUserId || isAdmin || !user) return;
    if (isAdminEmail(user.email)) return;
    const pending = data.meusProdutos;
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      const res = await (supabase
        .from("user_products" as never)
        .select("local_id")
        .eq("user_id", currentUserId) as unknown as Promise<{ data: Array<{ local_id: string }> | null }>);
      if (cancelled) return;
      const known = new Set((res.data ?? []).map((r) => r.local_id));
      const missing = pending.filter((p) => !known.has(p.id));
      for (const p of missing) {
        const payload = {
          _local_id: p.id,
          _product_id: p.productId ?? null,
          _name: p.name,
          _image: p.image ?? null,
          _category: p.category ?? null,
          _marketplaces: p.marketplaces ?? [],
          _supplier_name: p.supplierName ?? null,
          _supplier_location: p.supplierLocation ?? null,
          _supplier_cost: p.supplierCost ?? null,
          _recommended_price: p.recommendedPrice ?? null,
          _estimated_commission: p.estimatedCommission ?? null,
        };
        const { error } = await supabase.rpc("upsert_my_product_for_validation" as never, payload as never);
        if (error) {
          console.warn("[back-sync] upsert failed for", p.id, "— retrying in 2s");
          await new Promise((res) => setTimeout(res, 2000));
          if (cancelled) return;
          const { error: retryError } = await supabase.rpc("upsert_my_product_for_validation" as never, payload as never);
          if (retryError) console.error("[back-sync] retry failed for", p.id, retryError);
          else console.log("[back-sync] retry succeeded for", p.id);
        } else {
          console.log("[back-sync] upsert succeeded for", p.id);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, isAdmin, user?.email, data.meusProdutos.length]);

  const refreshAllUserProducts = async () => {
    if (!isAdmin) return;
    // Load profiles inline to avoid stale `accounts` reference
    const [prodRes, profilesRes] = await Promise.all([
      supabase.from("user_products" as never).select("*") as unknown as Promise<{ data: ProductRow[] | null }>,
      (supabase.from("profiles" as never).select("user_id, email, full_name") as unknown as Promise<{ data: Array<{ user_id: string; email: string; full_name: string }> | null }>),
    ]);
    const profByUid = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
    setAllUserProducts((prodRes.data ?? []).map((r) => {
      const prof = r.user_id ? profByUid.get(r.user_id) : undefined;
      return {
        id: r.id, userId: r.user_id, userEmail: prof?.email ?? "", userName: prof?.full_name ?? "",
        localId: r.local_id, productId: r.product_id, name: r.name, image: r.image, category: r.category,
        marketplaces: (r.marketplaces ?? []).filter((m) => MARKETPLACES.includes(m as Marketplace)) as Marketplace[],
        supplierName: r.supplier_name, supplierLocation: r.supplier_location,
        supplierCost: r.supplier_cost ?? undefined, recommendedPrice: r.recommended_price ?? undefined,
        estimatedCommission: r.estimated_commission ?? undefined,
        status: r.status, currentStep: r.current_step, validationStatus: r.validation_status,
        createdAt: new Date(r.created_at).getTime(),
        validatedAt: r.validated_at ? new Date(r.validated_at).getTime() : undefined,
      };
    }));
  };

  const validateUserProduct = async (productRowId: string) => {
    const { error } = await supabase.rpc("validate_user_product" as never, { _product_id: productRowId } as never);
    if (error) return { ok: false, error: error.message };
    await refreshAllUserProducts();
    return { ok: true };
  };
  const validateAllPendingProducts = async () => {
    const { data, error } = await supabase.rpc("validate_all_pending_products" as never);
    if (error) return { ok: false, error: error.message };
    await refreshAllUserProducts();
    return { ok: true, count: (data as unknown as number) ?? 0 };
  };
  const validateUserPendingProducts = async (userId: string) => {
    const { data, error } = await supabase.rpc("validate_user_pending_products" as never, { _user_id: userId } as never);
    if (error) return { ok: false, error: error.message };
    await refreshAllUserProducts();
    return { ok: true, count: (data as unknown as number) ?? 0 };
  };
  const validateAllPendingConnections = async () => {
    const { data, error } = await supabase.rpc("validate_all_pending_connections" as never);
    if (error) return { ok: false, error: error.message };
    const { data: rows } = await supabase
      .from("user_marketplace_connections")
      .select("user_id, marketplace, status");
    if (rows) setAllConnections(parseConnRows(rows as Array<{ user_id: string; marketplace: string; status: ConnectionStatus }>));
    return { ok: true, count: (data as unknown as number) ?? 0 };
  };
  const validateUserPendingConnections = async (userId: string) => {
    const { data, error } = await supabase.rpc("validate_user_pending_connections" as never, { _user_id: userId } as never);
    if (error) return { ok: false, error: error.message };
    setAllConnections((s) => {
      const next = { ...(s[userId] ?? {}) };
      MARKETPLACES.forEach((m) => { if (next[m] === "pending_validation") next[m] = "approved"; });
      return { ...s, [userId]: next };
    });
    return { ok: true, count: (data as unknown as number) ?? 0 };
  };

  const getUserCommissionTotal = (userId: string): number => {
    return allUserCommissionTotals.get(userId) ?? 0;
  };

  // Approve ALL products in Supabase and set them to "Pronto para venda".
  // Used as a one-time admin migration for products that were added while the
  // auto-approval bug was active and are now stuck in pending_validation.
  const bulkApproveAllProductsAndMakeReady = async () => {
    if (!isAdmin) return { ok: false, error: "Não autorizado." };
    const { error, count } = await (supabase
      .from("user_products" as never)
      .update({
        validation_status: "approved",
        status: "Pronto para venda",
        current_step: "Produto disponível na loja",
        validated_at: new Date().toISOString(),
      } as never)
      .not("user_id", "is", null) as unknown as Promise<{ error: Error | null; count: number | null }>);
    if (error) return { ok: false, error: (error as Error).message };
    await refreshAllUserProducts();
    return { ok: true, count: count ?? 0 };
  };
  // sbAny is referenced indirectly; silence unused warning by exporting via void
  void sbAny;

  // ============== Withdrawals + Automatic demo sales ==============
  // Load own withdrawal requests + realtime
  useEffect(() => {
    if (!currentUserId || isAdmin) { setMyWithdrawals([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await (supabase
        .from("withdrawal_requests" as never)
        .select("*")
        .eq("user_id", currentUserId) as unknown as Promise<{ data: Array<Record<string, unknown>> | null }>);
      if (cancelled || !rows) return;
      setMyWithdrawals(rows.map((r) => ({
        id: String(r.id),
        userId: String(r.user_id),
        requestedAmount: Number(r.requested_amount ?? 0),
        pixKey: String(r.pix_key ?? ""),
        pixKeyType: String(r.pix_key_type ?? ""),
        holderName: String(r.holder_name ?? ""),
        status: String(r.status ?? "pending_review"),
        createdAt: r.created_at ? new Date(r.created_at as string).getTime() : Date.now(),
      })));
    };
    void load();
    const channel = supabase
      .channel(`withdrawals-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${currentUserId}` }, () => { void load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [currentUserId, isAdmin]);

  const submitWithdrawalRequest = async (amount: number, pixKey: string, pixKeyType: string, holderName: string) => {
    if (!currentUserId) return { ok: false, error: "Sessão não encontrada." };
    if (!(amount > 0)) return { ok: false, error: "Informe um valor válido." };
    const { data, error } = await supabase.rpc("create_withdrawal_request" as never, {
      _amount: Math.round(amount * 100) / 100,
      _pix_key: pixKey,
      _pix_key_type: pixKeyType,
      _holder_name: holderName,
    } as never);
    if (error) {
      const msg = error.message || "Não foi possível enviar a solicitação.";
      if (/30 dias/i.test(msg)) return { ok: false, error: "O saque só ficará disponível após 30 dias de conta ativa." };
      return { ok: false, error: msg };
    }
    return { ok: true, id: (data as unknown as string) ?? undefined };
  };

  const listMyWithdrawalRequests = () => myWithdrawals;

  // ============== Lightning button persistence ==============
  // Lightning clicks are stored in dashboard_lightning_events (Supabase) and
  // materialized into data.salesOrders as regular orders, so Dashboard,
  // Métricas and Vendas / Clientes all read the same source of truth.
  const hasLightningAccess = isAdmin || isPresentationAdmin;

  const buildLightningOrder = (eventId: string, amount: number, ts: number): SalesOrder => {
    let h = 0;
    for (let i = 0; i < eventId.length; i++) h = (h * 31 + eventId.charCodeAt(i)) >>> 0;
    const p = GDM_PRODUCTS[h % GDM_PRODUCTS.length];
    const cust = GDM_CUSTOMERS[h % GDM_CUSTOMERS.length];
    return {
      id: `lightning-${eventId}`,
      productId: p.id,
      productName: p.name,
      productImage: p.image,
      marketplace: "shopee",
      supplierName: p.supplierName,
      supplierLocation: p.supplierLocation,
      customerName: cust.name,
      customerEmailMasked: cust.email,
      customerPhoneMasked: cust.phone,
      customerLocation: cust.loc,
      salePrice: p.salePrice,
      supplierCost: p.supplierCost,
      marketplaceFee: 0,
      operationalCost: 0,
      netProfit: amount,
      saleDate: ts,
      source: "lightning_click",
    };
  };

  const mergeLightningOrders = (fresh: SalesOrder[]) => {
    setData((s) => {
      const others = s.salesOrders.filter((o) => !o.id.startsWith("lightning-"));
      return { ...s, salesOrders: [...fresh, ...others].sort((a, b) => b.saleDate - a.saleDate) };
    });
  };

  const refreshLightningOrders = async (uid: string | null) => {
    if (!uid) { mergeLightningOrders([]); return; }
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const { data: rows, error } = await supabase
      .from("dashboard_lightning_events")
      .select("id, amount, created_at")
      .eq("user_id", uid)
      .gte("created_at", since30.toISOString());
    if (error || !rows) return;
    const fresh = rows
      .map((r) => buildLightningOrder(String(r.id), Number(r.amount) || 0, new Date(r.created_at as string).getTime()))
      .filter((o) => !isResetSuppressed(o.saleDate));
    mergeLightningOrders(fresh);
  };

  useEffect(() => {
    if (!currentUserId) return;
    void refreshLightningOrders(currentUserId);
    const ch = supabase
      .channel(`lightning-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dashboard_lightning_events", filter: `user_id=eq.${currentUserId}` },
        () => { void refreshLightningOrders(currentUserId); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const recordLightningClick = async () => {
    if (!hasLightningAccess) return { ok: false, error: "Acesso restrito" };
    // Random increment R$ 40 – R$ 350 (server clamps if missing/invalid).
    const amount = Math.round((40 + Math.random() * 310) * 100) / 100;
    const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: number | null; error: { message: string } | null }>)("record_lightning_click", { _amount: amount });
    if (error) return { ok: false, error: error.message };
    const final = Number(data) || amount;
    // Optimistic order — replaced by the authoritative list on the refresh below.
    setData((s) => ({
      ...s,
      salesOrders: [buildLightningOrder(`temp-${Date.now()}`, final, Date.now()), ...s.salesOrders],
    }));
    if (currentUserId) void refreshLightningOrders(currentUserId);
    return { ok: true, amount: final };
  };

  // ============== Reset today (✕ button) ==============
  // Clears today's sales AT THE SOURCE so every page zeroes together.
  // History (7d / 30d minus today) is untouched.
  const resetTodaySales = async () => {
    if (!hasLightningAccess) return { ok: false, error: "Acesso restrito" };
    if (!user || !currentUserId) return { ok: false, error: "Sessão expirada" };
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const startTs = dayStart.getTime();
    const now = Date.now();
    // 1. Delete today's lightning events (owner-scoped RLS DELETE policy).
    const { error: delErr } = await supabase
      .from("dashboard_lightning_events")
      .delete()
      .eq("user_id", currentUserId)
      .gte("created_at", dayStart.toISOString());
    // 2. Best-effort: delete today's sales_orders rows via security-definer RPC
    //    (the table has no client DELETE policy). If the function isn't
    //    deployed yet, the reset-window suppression keeps them hidden anyway.
    try {
      const { error } = await supabase.rpc("reset_today_sales" as never, {} as never);
      if (error) console.warn("[resetTodaySales] reset_today_sales RPC:", error.message);
    } catch (err) {
      console.warn("[resetTodaySales] reset_today_sales RPC failed:", err);
    }
    // 3. Clear today in local state. GDM presentation orders are all dated
    //    before today, so the 7d / 30d windows stay intact.
    setData((s) => ({
      ...s,
      salesOrders: s.salesOrders.filter((o) => o.saleDate < startTs || o.saleDate > now),
    }));
    setVendasHojeStore({ date: todayKey(), values: { shopee: 0 } });
    setCommissionHistory((h) => ({ ...h, shopee: { ...h.shopee, [todayKey()]: 0 } }));
    setTodayResetAt(now);
    try { localStorage.setItem(TODAY_RESET_KEY(user.email), String(now)); } catch {}
    if (delErr) return { ok: false, error: delErr.message };
    return { ok: true };
  };

  const isTodayReset = !!todayResetAt && dateKey(new Date(todayResetAt)) === dateKey(new Date());

  // ============== Presentation-admin management (full admin only) ==============
  const listAllProfiles = async () => {
    if (!isAdmin) return [];
    const [profilesRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, approval_status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rows = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const roleMap = new Map<string, Set<string>>();
    for (const r of roles) {
      const set = roleMap.get(r.user_id) ?? new Set<string>();
      set.add(r.role);
      roleMap.set(r.user_id, set);
    }
    return rows.map((r) => {
      const set = roleMap.get(r.user_id) ?? new Set<string>();
      return {
        userId: r.user_id,
        email: r.email,
        fullName: r.full_name,
        phone: r.phone ?? null,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : undefined,
        approvalStatus: r.approval_status as ApprovalStatus,
        isPresentationAdmin: set.has("presentation_admin"),
        isFullAdmin: set.has("admin"),
      };
    });
  };

  const grantPresentationAdmin = async (userId: string) => {
    const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("grant_presentation_admin", { _user_id: userId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const revokePresentationAdmin = async (userId: string) => {
    const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("revoke_presentation_admin", { _user_id: userId });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  // User-side: periodically release automatic demo sales (after approval+3d).
  // The realtime INSERT subscription on sales_orders updates Dashboard / Vendas.
  useEffect(() => {
    if (!user || !currentUserId || isAdmin) return;
    let cancelled = false;
    const tryRelease = async () => {
      const { error } = await supabase.rpc("release_automatic_demo_sales" as never, {} as never);
      if (error && !cancelled) console.warn("[release_automatic_demo_sales] failed:", error.message);
    };
    void tryRelease();
    const id = setInterval(tryRelease, 120000);
    const onFocus = () => { void tryRelease(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [user, currentUserId, isAdmin]);

  const clearPasswordResetRequired = async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ password_reset_required: false })
      .eq("user_id", currentUserId);
    if (error) {
      console.error("[clearPasswordResetRequired] update failed:", error.message);
      return;
    }
    setPasswordResetRequired(false);
  };

  return (
    <C.Provider value={{ user, isAdmin, authReady, login, register, logout, selectedMarketplace, setSelectedMarketplace, data, triggerDemoSale, saveMeuProduto, addSalesOrderForProduct, vendasHoje: vendasHojeStore.values, privacy, setPrivacy, adminPresentationMode, toggleAdminPresentationMode, getCommissionSum, listAccounts, refreshAccounts, approveAccount, rejectAccount, blockAccountPayment, unblockAccountPayment, addManualCommissionToUser, bulkAdminDemoCommissionShopee, approveAllPendingAccounts, adminCreateBoostCampaign, adminCancelBoostCampaign, getActiveBoostByUserId, myActiveBoost, getUserConnectedMarketplaces, getUserProducts, myConnections: isAdmin ? adminDemoMap : myConnections, getApprovedMarketplaces, requestMarketplaceConnection, getUserConnectionsByEmail, getUserApprovedMarketplaces, validateMarketplaceConnection, rejectMarketplaceConnection, allUserProducts, refreshAllUserProducts, getUserCommissionTotal, validateUserProduct, validateAllPendingProducts, validateUserPendingProducts, validateAllPendingConnections, validateUserPendingConnections, bulkApproveAllProductsAndMakeReady, accountCreatedAt, accountApprovedAt, isDemo, demoExpiresAt, submitWithdrawalRequest, listMyWithdrawalRequests, accountStatus, isPresentationAdmin, hasLightningAccess, recordLightningClick, resetTodaySales, isTodayReset, listAllProfiles, grantPresentationAdmin, revokePresentationAdmin, passwordResetRequired, clearPasswordResetRequired }}>
      {children}
    </C.Provider>
  );
}

export function useApp() {
  const c = useContext(C);
  if (!c) throw new Error("useApp fora do AppProvider");
  return c;
}