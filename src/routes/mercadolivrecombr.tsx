/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /mercadolivrecombr  (admin-only ML live panel demo)
  ═══════════════════════════════════════════════════════════════
  Pixel-faithful clone of Mercado Livre "Vendas ao vivo" with
  demo boost toggle. Self-contained; no DashboardShell, no dock.
*/
import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../lib/state";
import {
  AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";

// ── Config ─────────────────────────────────────────────────────────────────
const ML_BOOST_KEY = "upshopee-ml-boost";
const BOOST_SALE_INTERVAL = 45000; // ~45s between sales when boosted
const BOOST_SALE_AMOUNT_MIN = 18;
const BOOST_SALE_AMOUNT_MAX = 85;

// ── Fake ML products ───────────────────────────────────────────────────────
const ML_PRODUCTS = [
  { id: "mlp-1", name: "Fone de Ouvido Bluetooth JBL Tune 510BT",        initials: "FO", color: "#4A90D9" },
  { id: "mlp-2", name: "Smartwatch Xiaomi Redmi Watch 3 Active",          initials: "SW", color: "#E8618C" },
  { id: "mlp-3", name: "Kit de Ferramentas 129 Peças com Maleta",         initials: "KF", color: "#F5A623" },
  { id: "mlp-4", name: "Cadeira Gamer ThunderX3 TGC12 Preta e Vermelha",  initials: "CG", color: "#D0021B" },
  { id: "mlp-5", name: "Air Fryer Mondial Family IV AF-30 3,5L",          initials: "AF", color: "#7ED321" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0"); }
function spNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })); }
function formatDateML(d: Date) {
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${d.getDate()} de ${months[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function brl(n: number) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function num(n: number) { return n.toLocaleString("pt-BR"); }

// ── Scoped CSS (exact ML visual fidelity) ─────────────────────────────────
const CSS = `
:root {
  --ml-yellow: #fff159;
  --ml-blue: #3483fa;
  --ml-blue-hover: #2968c8;
  --ml-dark: #333;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Proxima Nova",-apple-system,"Roboto",Arial,sans-serif;background:#ededed;color:#333;-webkit-font-smoothing:antialiased}

/* ── ML Yellow Header ── */
.ml-header{background:var(--ml-yellow);height:56px;display:flex;align-items:center;padding:0 16px;position:sticky;top:0;z-index:100;box-shadow:0 1px 0 0 rgba(0,0,0,.1)}
.ml-header-inner{width:100%;max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.ml-logo{height:34px;width:134px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 134 34'%3E%3Cpath d='M17.5 6.5h-2.7L10.4 18h2.8l.9-2.3h4.5l.9 2.3h2.8L17.5 6.5zm-1.1 7l1.5-4 1.5 4h-3zm9.8-7h2.7v11.5h-2.7V6.5zm5.8 0h3.1l3.8 6.5V6.5H42V18h-3.1l-3.8-6.5V18h-3.1V6.5zm13.4 0h9v2.3h-6.3v2.5h5.8v2.3h-5.8v2.6h6.4V18h-9.1V6.5zm11.4 0h2.7l3.4 8.4 3.4-8.4H73L68.3 18h-2.5L61.1 6.5zm14.3 0h9.3v2.3h-6.6v2.3h5.9v2.3h-5.9v4.6h-2.7V6.5zm10.4 0h8.5c2.4 0 4.3 1.5 4.3 3.8 0 2.3-1.9 3.9-4.3 3.9h-5.8V18h-2.7V6.5zm5.8 5.6c1.4 0 2.1-.6 2.1-1.8 0-1.1-.7-1.8-2.1-1.8h-3.1v3.6h3.1zm15.7-5.6l-2.8 11.5H117l-1.1-4.8c-.3-1.3-.6-2.7-.8-3.7h-.1c-.2 1-.4 2.4-.7 3.7l-1.1 4.8h-2.6l-2.5-11.5h2.7l1 4.6c.2 1 .4 2.2.6 3.3h.1c.2-1.1.5-2.4.8-3.5l1.2-4.4h2.6l1.3 4.4c.3 1.1.6 2.3.8 3.4h.1c.2-1.1.3-2.2.5-3.3l1-4.5h2.7z' fill='%23333'/%3E%3C/svg%3E") no-repeat center/contain;flex-shrink:0}
.ml-user{display:flex;align-items:center;gap:10px}
.ml-user-avatar{width:32px;height:32px;border-radius:50%;background:#3483fa;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.ml-user-name{font-size:14px;color:#333;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ── Main content ── */
.ml-main{max-width:1200px;margin:0 auto;padding:24px 16px 60px}
.ml-sales-summary{background:#fff;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.1);padding:32px 24px 24px;margin-bottom:24px;position:relative}
.ml-sales-title{font-size:26px;font-weight:600;color:#333;margin-bottom:8px}
.ml-sales-datetime{display:flex;align-items:center;gap:8px;color:#666;font-size:14px;margin-bottom:20px}
.ml-sales-datetime svg{color:#3483fa}
.ml-sales-amount{font-size:64px;font-weight:300;color:#333;line-height:1;letter-spacing:-2px;font-family:"Proxima Nova",-apple-system,sans-serif;margin-bottom:4px;display:flex;align-items:baseline;gap:4px}
.ml-sales-amount .currency{font-weight:600;font-size:48px}

/* ── Grid ── */
.ml-grid{display:grid;grid-template-columns:1fr 2fr 1fr;gap:24px}
@media(max-width:1024px){.ml-grid{grid-template-columns:1fr 1fr}.ml-grid .ml-products-card{grid-column:span 2}}
@media(max-width:640px){.ml-grid{grid-template-columns:1fr;gap:16px}.ml-grid .ml-products-card{grid-column:span 1}.ml-sales-amount{font-size:40px}.ml-sales-amount .currency{font-size:30px}.ml-header-user-name{display:none}}

/* ── Metrics card ── */
.ml-card{background:#fff;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.1);padding:24px}
.ml-card h2,.ml-card h3{font-size:18px;font-weight:600;color:#333;margin-bottom:16px}
.ml-metrics-grid{display:grid;grid-template-columns:1fr;gap:0}
.ml-metric{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0}
.ml-metric:last-child{border-bottom:none}
.ml-metric-icon{width:40px;height:40px;border-radius:50%;background:#e8f0fe;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ml-metric-icon svg{color:#3483fa;width:20px;height:20px}
.ml-metric-label{font-size:13px;color:#666;line-height:1.2}
.ml-metric-value{font-size:20px;font-weight:600;color:#333;margin-left:auto;white-space:nowrap}

/* ── Chart card ── */
.ml-chart-card{background:#fff;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.1);padding:24px;display:flex;flex-direction:column}
.ml-chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.ml-chart-legend{display:flex;align-items:center;gap:16px}
.ml-chart-legend-item{display:flex;align-items:center;gap:6px;font-size:13px;color:#666}

/* ── Products card ── */
.ml-products-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;color:#999;gap:12px}
.ml-products-empty svg{color:#ccc;width:48px;height:48px}
.ml-product-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0}
.ml-product-item:last-child{border-bottom:none}
.ml-product-avatar{width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:700;flex-shrink:0}
.ml-product-name{font-size:13px;color:#333;flex:1;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ml-product-stats{text-align:right;flex-shrink:0}
.ml-product-units{font-size:11px;color:#999}
.ml-product-revenue{font-size:14px;font-weight:600;color:#333}

/* ── Blue sparkle button (our boost toggle — visual clone of ML assistant) ── */
.ml-boost-btn-wrap{position:fixed;bottom:24px;right:24px;z-index:200}
.ml-boost-btn{width:48px;height:48px;border-radius:100px;background:#3483fa;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px 0 rgba(0,0,0,.25);transition:all .25s ease;color:#fff;position:relative}
.ml-boost-btn.active{box-shadow:0 6px 20px rgba(52,131,250,.55),0 0 0 4px rgba(52,131,250,.2)}
.ml-boost-btn:hover{background:#2968c8;transform:scale(1.05)}
.ml-boost-btn.active:hover{transform:scale(1.05)}
.ml-boost-btn svg{width:24px;height:24px;fill:#fff}
@keyframes ml-sparkle-pulse{0%,100%{box-shadow:0 6px 20px rgba(52,131,250,.55),0 0 0 4px rgba(52,131,250,.2)}50%{box-shadow:0 6px 28px rgba(52,131,250,.7),0 0 0 8px rgba(52,131,250,.1)}}
.ml-boost-btn.active{animation:ml-sparkle-pulse 2s ease-in-out infinite}

/* ── Footer ── */
.ml-footer{border-top:1px solid #e0e0e0;background:#fff;padding:24px 16px;text-align:center;font-size:12px;color:#999}
.ml-footer-links{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-bottom:12px}
.ml-footer-links a{color:#3483fa;text-decoration:none;font-size:12px}
.ml-footer-links a:hover{text-decoration:underline}
.ml-footer-cnpj{font-size:11px;color:#bbb}

/* ── 404 gate ── */
.ml-not-found{display:flex;align-items:center;justify-content:center;height:100dvh;background:#fff;font-family:"Inter",sans-serif}
.ml-not-found h1{font-size:clamp(1.5rem,4vw,2.5rem);color:#333}
`;

// ── SVG icons (inlined for portability) ────────────────────────────────────
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const IconEye = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
);
const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
);
const IconPercent = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
);
const IconBox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
const IconDollar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
);
const IconPackage = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
);
const IconSparkle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z"/>
    <circle cx="19" cy="5" r="1.5" opacity=".7"/>
    <circle cx="5" cy="3" r="1" opacity=".5"/>
    <circle cx="21" cy="15" r="1" opacity=".5"/>
  </svg>
);

// ── Self-contained clock ───────────────────────────────────────────────────
const LiveClock = memo(function LiveClock() {
  const [stamp, setStamp] = useState(() => formatDateML(spNow()));
  useEffect(() => {
    const id = setInterval(() => setStamp(formatDateML(spNow())), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{stamp}</>;
});

// ── Odometer-style counter (animates digits like the ML mechanical counter) ──
function useAnimatedValue(target: number, duration = 700) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const valRef = useRef(target);
  valRef.current = val;
  useEffect(() => {
    fromRef.current = valRef.current;
    startRef.current = null;
    let cancelled = false;
    const step = (ts: number) => {
      if (cancelled) return;
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current!) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { cancelled = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return val;
}

// ── Sales simulation engine ─────────────────────────────────────────────────
interface SimSale {
  productId: string;
  revenue: number;
  units: number;
  ts: number;
  hour: number;
}

function useMlSim(boosted: boolean) {
  const [sales, setSales] = useState<SimSale[]>(() => {
    try { const raw = localStorage.getItem("upshopee-ml-sales"); if (raw) return JSON.parse(raw); } catch {}
    return [];
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist
  useEffect(() => {
    try { localStorage.setItem("upshopee-ml-sales", JSON.stringify(sales)); } catch {}
  }, [sales]);

  // Generate sales on interval when boosted
  useEffect(() => {
    if (!boosted) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    const tick = () => {
      // Pick random product and generate a sale at current hour
      const p = ML_PRODUCTS[Math.floor(Math.random() * ML_PRODUCTS.length)];
      const revenue = BOOST_SALE_AMOUNT_MIN + Math.random() * (BOOST_SALE_AMOUNT_MAX - BOOST_SALE_AMOUNT_MIN);
      const units = Math.random() < 0.3 ? 2 : 1;
      const now = Date.now();
      const h = spNow().getHours();
      setSales(prev => [...prev, { productId: p.id, revenue: Math.round(revenue * 100) / 100, units, ts: now, hour: h }]);
    };
    // First sale after 2s, then on interval
    const t0 = setTimeout(tick, 2000);
    intervalRef.current = setInterval(tick, BOOST_SALE_INTERVAL);
    // Pause when tab hidden
    const onVis = () => {
      if (document.hidden) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      } else {
        if (!intervalRef.current) intervalRef.current = setInterval(tick, BOOST_SALE_INTERVAL);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(t0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [boosted]);

  const clearSales = useCallback(() => setSales([]), []);

  return { sales, clearSales };
}

// ── Derived metrics (memoized, same pattern as useMetrics) ─────────────────
function useMlMetrics(boosted: boolean, sales: SimSale[]) {
  return useMemo(() => {
    const sp = spNow();
    const todayStart = new Date(sp.getFullYear(), sp.getMonth(), sp.getDate()).getTime();
    const todaySales = sales.filter(s => s.ts >= todayStart);

    const totalRevenue = todaySales.reduce((sum, s) => sum + s.revenue, 0);
    const vendas = todaySales.length;
    const unidades = todaySales.reduce((sum, s) => sum + s.units, 0);
    // Plausible visitors: baseline 40-80 plus ~8-18 per sale
    const visitorsBase = boosted ? 40 + Math.floor(Math.random() * 40) : 0;
    const visitas = Math.max(vendas, visitorsBase + vendas * (8 + Math.floor(Math.random() * 10)));
    const compradores = Math.max(1, Math.floor(vendas * 0.55));
    const conversao = visitas > 0 ? (vendas / visitas) * 100 : 0;
    const precoMedio = unidades > 0 ? totalRevenue / unidades : 0;

    // Top 5 products
    const prodMap = new Map<string, { name: string; initials: string; color: string; units: number; revenue: number }>();
    for (const s of todaySales) {
      const p = ML_PRODUCTS.find(pp => pp.id === s.productId);
      if (!p) continue;
      const e = prodMap.get(s.productId);
      if (e) { e.units += s.units; e.revenue += s.revenue; }
      else prodMap.set(s.productId, { name: p.name, initials: p.initials, color: p.color, units: s.units, revenue: s.revenue });
    }
    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Chart data: buckets for hours 00-22
    const hojeByHour = new Array<number>(23).fill(0);
    const yesterday = new Date(sp);
    yesterday.setDate(sp.getDate() - 1);
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;
    const ontemByHour = new Array<number>(23).fill(0);

    for (const s of sales) {
      const h = new Date(s.ts).getHours();
      if (h < 0 || h > 22) continue;
      if (s.ts >= todayStart) hojeByHour[h] += s.revenue;
    }
    // Generate yesterday baseline if boosted
    if (boosted) {
      for (let h = 0; h <= 22; h++) {
        ontemByHour[h] = Math.round((80 + Math.random() * 180 + Math.sin(h * 0.3) * 60) * 100) / 100;
      }
    }

    const spH = sp.getHours();
    const chartData = Array.from({ length: 23 }, (_, h) => ({
      label: pad2(h),
      hoje: h <= spH ? Math.round(hojeByHour[h] * 100) / 100 : null,
      ontem: Math.round(ontemByHour[h] * 100) / 100,
    }));

    return { totalRevenue, vendas, unidades, visitas, compradores, conversao, precoMedio, topProducts, chartData };
  }, [sales, boosted]);
}

// ── Route component ────────────────────────────────────────────────────────
function MercadoLivrePage() {
  const { isAdmin } = useApp();
  const [boosted, setBoosted] = useState(() => {
    try { return localStorage.getItem(ML_BOOST_KEY) === "true"; } catch { return false; }
  });
  const boostedRef = useRef(boosted);
  boostedRef.current = boosted;

  const toggleBoost = useCallback(() => {
    setBoosted(prev => {
      const next = !prev;
      try { localStorage.setItem(ML_BOOST_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Clear sales when boost is turned OFF
  useEffect(() => {
    if (!boosted) {
      try { localStorage.removeItem("upshopee-ml-sales"); } catch {}
    }
  }, [boosted]);

  const { sales, clearSales } = useMlSim(boosted);
  const m = useMlMetrics(boosted, sales);

  // Toggle: when deactivating, clear everything
  const handleToggle = useCallback(() => {
    if (boosted) {
      clearSales();
      try { localStorage.removeItem("upshopee-ml-sales"); } catch {}
    }
    toggleBoost();
  }, [boosted, clearSales, toggleBoost]);

  // ── 404 gate ──
  if (!isAdmin) {
    return (
      <div className="ml-not-found">
        <h1>Página não encontrada</h1>
      </div>
    );
  }

  const animRevenue = useAnimatedValue(m.totalRevenue);

  return (
    <div>
      <style>{CSS}</style>
      {/* ═══════════ ML Header ═══════════ */}
      <header className="ml-header">
        <div className="ml-header-inner">
          <div className="ml-logo" title="Mercado Livre"></div>
          <div className="ml-user">
            <div className="ml-user-avatar">JT</div>
            <span className="ml-user-name ml-header-user-name">Joao victor</span>
          </div>
        </div>
      </header>

      <main className="ml-main">
        {/* ═══════════ Sales Summary ═══════════ */}
        <div className="ml-sales-summary">
          <h1 className="ml-sales-title">Vendas de hoje ao vivo</h1>
          <div className="ml-sales-datetime">
            <IconClock />
            <LiveClock />
          </div>
          <div className="ml-sales-amount">
            <span className="currency">R$</span>
            <span>{brl(animRevenue)}</span>
          </div>
        </div>

        {/* ═══════════ Grid ═══════════ */}
        <div className="ml-grid">
          {/* Metrics card */}
          <div className="ml-card">
            <h2>Métricas-chave</h2>
            <div className="ml-metrics-grid">
              <div className="ml-metric">
                <div className="ml-metric-icon"><IconEye /></div>
                <span className="ml-metric-label">Visitas únicas</span>
                <span className="ml-metric-value">{num(m.visitas)}</span>
              </div>
              <div className="ml-metric">
                <div className="ml-metric-icon"><IconUsers /></div>
                <span className="ml-metric-label">Total de compradores</span>
                <span className="ml-metric-value">{num(m.compradores)}</span>
              </div>
              <div className="ml-metric">
                <div className="ml-metric-icon"><IconCart /></div>
                <span className="ml-metric-label">Quantidade de vendas</span>
                <span className="ml-metric-value">{num(m.vendas)}</span>
              </div>
              <div className="ml-metric">
                <div className="ml-metric-icon"><IconPercent /></div>
                <span className="ml-metric-label">Conversão</span>
                <span className="ml-metric-value">{m.conversao.toFixed(1)}%</span>
              </div>
              <div className="ml-metric">
                <div className="ml-metric-icon"><IconBox /></div>
                <span className="ml-metric-label">Unidades vendidas</span>
                <span className="ml-metric-value">{num(m.unidades)} u.</span>
              </div>
              <div className="ml-metric">
                <div className="ml-metric-icon"><IconDollar /></div>
                <span className="ml-metric-label">Preço médio</span>
                <span className="ml-metric-value">R$ {brl(m.precoMedio)}</span>
              </div>
            </div>
          </div>

          {/* Chart card */}
          <div className="ml-chart-card">
            <div className="ml-chart-header">
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Tendências em vendas brutas</h3>
              <div className="ml-chart-legend">
                <div className="ml-chart-legend-item">
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#3483fa" }} />
                  Hoje
                </div>
                <div className="ml-chart-legend-item">
                  <span style={{ display: "inline-block", width: 8, height: 8, background: "#d9539e" }} />
                  Ontem
                </div>
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={m.chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="mlFillHoje" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3483fa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3483fa" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#999" fontSize={11} tickLine={false} axisLine={{ stroke: "#e0e0e0" }} interval={3} />
                  <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} width={40}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 12, color: "#333" }}
                    labelStyle={{ color: "#999" }}
                    formatter={(v: number | string, name: string) => [
                      `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                      name === "hoje" ? "Hoje" : "Ontem",
                    ]}
                  />
                  <Area type="monotone" dataKey="ontem" stroke="#d9539e" strokeWidth={1.5} fill="none" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Area type="monotone" dataKey="hoje" stroke="#3483fa" strokeWidth={2.2} fill="url(#mlFillHoje)" dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Products card */}
          <div className="ml-card ml-products-card">
            <h2>Produtos mais vendidos</h2>
            {m.topProducts.length === 0 ? (
              <div className="ml-products-empty">
                <IconPackage />
                <p>Você não vendeu nenhum produto hoje</p>
              </div>
            ) : (
              <div>
                {m.topProducts.map((p, i) => (
                  <div className="ml-product-item" key={i}>
                    <div className="ml-product-avatar" style={{ background: p.color }}>{p.initials}</div>
                    <span className="ml-product-name">{p.name}</span>
                    <div className="ml-product-stats">
                      <div className="ml-product-units">{p.units} {p.units === 1 ? "unidade" : "unidades"}</div>
                      <div className="ml-product-revenue">R$ {brl(p.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ═══════════ ML Footer ═══════════ */}
      <footer className="ml-footer">
        <div className="ml-footer-links">
          <a href="#">Trabalhe conosco</a>
          <a href="#">Termos e condições</a>
          <a href="#">Promoções</a>
          <a href="#">Como cuidamos da sua privacidade</a>
          <a href="#">Acessibilidade</a>
          <a href="#">Contato</a>
          <a href="#">Informações sobre seguros</a>
          <a href="#">Programa de Afiliados</a>
        </div>
        <p>Copyright © 1999-2026 Ebazar.com.br LTDA.</p>
        <p className="ml-footer-cnpj">CNPJ n.º 03.007.331/0001-41 / Av. das Nações Unidas, nº 3.003, Bonfim, Osasco/SP - CEP 06233-903 - empresa do grupo Mercado Livre.</p>
      </footer>

      {/* ═══════════ Blue sparkle boost toggle ═══════════ */}
      {isAdmin && (
        <div className="ml-boost-btn-wrap">
          <button
            className={`ml-boost-btn${boosted ? " active" : ""}`}
            onClick={handleToggle}
            title={boosted ? "Desativar simulação" : "Ativar simulação"}
            aria-label={boosted ? "Simulação ativa — clique para desativar" : "Ativar simulação de vendas"}
          >
            <IconSparkle />
          </button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/mercadolivrecombr")({
  component: MercadoLivrePage,
});
