/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /mercadolivrecombr  (admin-only ML live panel demo)
  ═══════════════════════════════════════════════════════════════
  Literal transplant from painel-ml-referencia.html — real ML
  markup and CSS ported 1:1 into JSX. Dynamic islands bound
  surgically into the static skeleton.
*/
import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../lib/state";
import {
  AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const ML_BOOST_KEY = "upshopee-ml-boost";
const SALES_KEY = "upshopee-ml-sales";
const SALE_INTERVAL = 45000;

const ML_PRODUCTS = [
  { id: "mlp-1", name: "Fone de Ouvido Bluetooth JBL Tune 510BT",        initials: "FO", color: "#4A90D9" },
  { id: "mlp-2", name: "Smartwatch Xiaomi Redmi Watch 3 Active",          initials: "SW", color: "#E8618C" },
  { id: "mlp-3", name: "Kit de Ferramentas 129 Peças com Maleta",         initials: "KF", color: "#F5A623" },
  { id: "mlp-4", name: "Cadeira Gamer ThunderX3 TGC12 Preta e Vermelha",  initials: "CG", color: "#D0021B" },
  { id: "mlp-5", name: "Air Fryer Mondial Family IV AF-30 3,5L",          initials: "AF", color: "#7ED321" },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function pad2(n: number) { return String(n).padStart(2, "0"); }
function spNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })); }
function brl(n: number) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function nfmt(n: number) { return n.toLocaleString("pt-BR"); }

function formatDateML(d: Date) {
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${d.getDate()} de ${months[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

// ═══════════════════════════════════════════════════════════════
// CSS — transplanted verbatim from the reference, scoped to body
// ═══════════════════════════════════════════════════════════════
const CSS = `
/* ── ML global resets ── */
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Proxima Nova,-apple-system,Roboto,Arial,sans-serif;background:#ededed;color:#333;-webkit-font-smoothing:antialiased}

/* ── SF hidden ── */
.sf-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);border:0}

/* ── ML Yellow Header (nav-header-lite-supply) ── */
.nav-header-lite-supply{background:#ffe600;box-shadow:0 1px 0 0 rgba(0,0,0,.1)}
.nav-header-lite-supply .nav-bounds{align-items:center;display:flex;height:56px;justify-content:space-between;margin:0 auto;max-width:1200px;padding:0 16px}
.nav-header-lite-supply .nav-header-logo{display:flex;align-items:center}
.nav-header-lite-supply .nav-logo{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 134 34'%3E%3Cpath d='M17.5 6.5h-2.7L10.4 18h2.8l.9-2.3h4.5l.9 2.3h2.8L17.5 6.5zm-1.1 7l1.5-4 1.5 4h-3zm9.8-7h2.7v11.5h-2.7V6.5zm5.8 0h3.1l3.8 6.5V6.5H42V18h-3.1l-3.8-6.5V18h-3.1V6.5zm13.4 0h9v2.3h-6.3v2.5h5.8v2.3h-5.8v2.6h6.4V18h-9.1V6.5zm11.4 0h2.7l3.4 8.4 3.4-8.4H73L68.3 18h-2.5L61.1 6.5zm14.3 0h9.3v2.3h-6.6v2.3h5.9v2.3h-5.9v4.6h-2.7V6.5zm10.4 0h8.5c2.4 0 4.3 1.5 4.3 3.8 0 2.3-1.9 3.9-4.3 3.9h-5.8V18h-2.7V6.5zm5.8 5.6c1.4 0 2.1-.6 2.1-1.8 0-1.1-.7-1.8-2.1-1.8h-3.1v3.6h3.1zm15.7-5.6l-2.8 11.5H117l-1.1-4.8c-.3-1.3-.6-2.7-.8-3.7h-.1c-.2 1-.4 2.4-.7 3.7l-1.1 4.8h-2.6l-2.5-11.5h2.7l1 4.6c.2 1 .4 2.2.6 3.3h.1c.2-1.1.5-2.4.8-3.5l1.2-4.4h2.6l1.3 4.4c.3 1.1.6 2.3.8 3.4h.1c.2-1.1.3-2.2.5-3.3l1-4.5h2.7z' fill='%23333'/%3E%3C/svg%3E") no-repeat center/contain;display:block;font-size:0;height:34px;overflow:hidden;text-indent:-999px;width:134px}
.nav-header-lite-supply .nav-header-menu-wrapper{display:flex;align-items:center;gap:16px}
.nav-header-lite-supply .nav-header-menu-list,.nav-header-lite-supply .nav-header-user{list-style:none}
.nav-header-lite-supply .nav-header-user{display:flex;align-items:center}
.nav-header-lite-supply .nav-header-user-myml{align-items:center;color:#333;display:flex;gap:10px;text-decoration:none}
.nav-header-lite-supply .nav-header-avatar-user{align-items:center;background:#3483fa;border-radius:50%;color:#fff;display:flex;font-size:13px;font-weight:700;height:32px;justify-content:center;width:32px}
.nav-header-lite-supply .nav-header-username{font-size:14px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#333}
.nav-header-lite-supply .nav-header-username-chevron{border-bottom:2px solid #666;border-right:2px solid #666;display:inline-block;height:6px;margin-left:4px;transform:rotate(45deg);width:6px}
.nav-header-lite-supply .nav-header-menu-list__item{display:flex;align-items:center;gap:12px}
.nav-header-lite-supply .option-syi,.nav-header-lite-supply .option-help{color:#333;font-size:14px;text-decoration:none}
.nav-header-lite-supply .option-syi:hover,.nav-header-lite-supply .option-help:hover{color:#3483fa}
.nav-icon-notifications{align-items:center;color:#333;display:flex}
.nav-skip-to-main-content,.nav-a11y-feedback-link,.nav-header-user-switch,.nav-header-user-layer,.ml-count,.ml-broadcast,.nav-header-notifications-badge,.nav-icon-notifications{display:none!important}
@media(max-width:768px){
  .nav-header-lite-supply .nav-header-username{display:none}
  .nav-header-lite-supply .option-syi,.nav-header-lite-supply .option-help{display:none}
  .nav-header-lite-supply .nav-logo{width:100px;height:26px}
}

/* ── Monitor live ── */
.monitor-live.lite-supply{padding:16px 0}
.metrics{max-width:1200px;margin:0 auto;padding:1rem 16px 60px}
@media(min-width:1366px) and (max-width:1899px){.metrics{max-width:1366px}}
@media(min-width:1900px){.metrics{max-width:1800px}}

/* ── Live datetime ── */
.live-datetime{align-items:center;background:#ededed;border-radius:50px;color:#000;display:inline-flex;font-family:Proxima Nova,-apple-system,Roboto,Arial,sans-serif;font-size:14px;font-variant-numeric:tabular-nums;font-weight:400;gap:4px;height:25px;justify-content:center;margin-bottom:-14px;max-width:218px;min-width:218px;padding:4px 12px 3px;text-align:center;width:218px;z-index:1}
.live-datetime svg{display:block;height:14px;width:14px}

/* ── Mechanical counter ── */
.mechanical-counter{align-items:center;display:inline-flex;font-family:Proxima Nova;font-size:56px;font-weight:700;justify-content:center;user-select:none}
.mechanical-counter__display{align-items:center;display:flex;gap:0}
.mechanical-counter__digit{align-items:flex-start;display:inline-flex;font-family:Proxima Nova;font-weight:700;justify-content:center;overflow:hidden;position:relative;vertical-align:middle}
.mechanical-counter__digit-value{align-items:center;display:flex;height:1.2em;justify-content:center;line-height:1.2em;min-width:.6ch}
@media(max-width:768px){.mechanical-counter{font-size:1.75rem}}
@media(max-width:480px){.mechanical-counter{font-size:1.5rem}}

/* ── Sales summary ── */
.sales-summary{color:#333;display:flex;flex-direction:column;margin:0 auto 24px;max-width:1200px;overflow:hidden;padding:0 0 8px;position:relative;text-align:center}
.sales-summary__title{color:#333;font-size:36px;font-weight:700;margin:0 0 20px}
.sales-summary__amount{background:#fff;border-radius:18px;box-shadow:0 2px 8px rgba(0,0,0,.1);color:#333;display:block;font-size:2.5rem;font-variant-numeric:tabular-nums;font-weight:700;line-height:1.2;margin:0 auto;max-width:484px;min-width:484px;padding:24px 56px;white-space:nowrap}
@media(max-width:1024px){.sales-summary__amount{font-size:2rem;max-width:90%;min-width:auto;width:auto}}
@media(max-width:768px){.sales-summary__amount{font-size:1.75rem;max-width:95%;min-width:30%;padding:16px 32px;width:auto}.sales-summary__title{font-size:1.5rem}}
@media(max-width:480px){.sales-summary__amount{font-size:1.5rem;max-width:98%;min-width:30%;padding:12px 24px;white-space:normal;width:auto}.sales-summary__title{font-size:1.25rem}}

/* ── Grid ── */
.grid-container{margin:0 auto;max-width:100%;padding:0;width:100%}
@media(min-width:1900px){.grid-container{gap:2.5rem!important;justify-content:center;max-width:1800px;padding:0 2rem}}

/* ── Metrics card ── */
.metrics-card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:16px 24px 20px}
.metrics-card__title{font-size:18px;font-weight:600;margin-bottom:16px;color:#333}
.metrics-card__grid{display:flex;flex-direction:column}
.metrics-card__item{align-items:center;border-bottom:1px solid #f0f0f0;display:flex;gap:12px;padding:12px 0}
.metrics-card__item:last-child{border-bottom:none}
.metrics-card__item-icon{align-items:center;background:#e8f0fe;border-radius:50%;display:flex;flex-shrink:0;height:40px;justify-content:center;width:40px}
.metrics-card__item-icon svg{color:#3483fa;height:20px;width:20px}
.metrics-card__icon{background:none;margin:0;padding:0}
.metrics-card__icon:hover{background:none}
.metrics-card__item-content{display:flex;flex:1;justify-content:space-between;align-items:center}
.metrics-card__label{color:#666;font-size:11.375px;line-height:1.2}
.metrics-card__value{color:#333;font-size:19.5px;font-weight:700;white-space:nowrap}

/* ── Chart card ── */
.chart-card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);display:flex;flex-direction:column;padding:24px}
.chart-card__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.chart-card__title{font-size:18px;font-weight:600;color:#333}
.chart-card__content{position:relative}
.chart-card__chart-container{position:relative}
.chart-card__y-axis-label{bottom:0;color:#999;font-size:11px;left:0;position:absolute;transform:rotate(-90deg);transform-origin:left bottom;white-space:nowrap}
.chart-card__legend{display:flex;align-items:center;gap:16px}
.chart-card__legend-items{display:flex;align-items:center;gap:12px}
.chart-card__legend-item{align-items:center;color:#666;display:flex;font-size:13px;gap:6px}
.chart-card__calendar-container{align-items:center;display:flex}
.chart-card__calendar-button{align-items:center;background:none;border:none;border-radius:4px;cursor:pointer;display:flex;height:32px;justify-content:center;transition:background .2s;width:32px}
.chart-card__calendar-button:hover{background:rgba(0,0,0,.04)}
.chart-card__calendar-button svg{color:#3483fa;height:20px;width:20px}

/* ── Products card ── */
.products-card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:16px 24px 20px}
.products-card__title{font-size:18px;font-weight:600;margin-bottom:16px;color:#333}
.products-card--empty .products-card__empty-state{align-items:center;display:flex;flex-direction:column;gap:12px;justify-content:center;padding:40px 20px;text-align:center}
.products-card__empty-icon{align-items:center;color:#ccc;display:flex;justify-content:center}
.products-card__empty-icon svg{height:48px;width:48px}
.products-card__empty-message{color:#000;font-size:18px}
.products-card__item{align-items:center;border-bottom:1px solid #f0f0f0;display:flex;gap:12px;padding:10px 0}
.products-card__item:last-child{border-bottom:none}
.products-card__item-initials{align-items:center;border-radius:6px;color:#fff;display:flex;flex-shrink:0;font-size:14px;font-weight:700;height:40px;justify-content:center;width:40px}
.products-card__item-name{color:#333;flex:1;font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.products-card__item-stats{flex-shrink:0;text-align:right}
.products-card__item-units{color:#999;font-size:11px}
.products-card__item-revenue{color:#333;font-size:14px;font-weight:600}

/* ── Metric icon generic ── */
.metric-icon{align-items:center;background:#e8f0fe;border-radius:50%;display:flex;height:40px;justify-content:center;width:40px}

/* ── ML Footer ── */
.nav-footer{border-top:1px solid #e0e0e0;background:#fff;padding:24px 16px}
.nav-footer .nav-footer-user-info{max-width:1200px;margin:0 auto}
.nav-footer-primaryinfo{display:flex;flex-direction:column;gap:12px}
.nav-footer-copyright{color:rgba(0,0,0,.55);font-size:12px}
.nav-footer-navigation__menu{display:flex;flex-wrap:wrap;gap:12px;list-style:none}
.nav-footer-navigation__link{color:rgba(0,0,0,.9);font-size:12px;text-decoration:none}
.nav-footer-navigation__link:hover{text-decoration:underline}
.nav-footer-secondaryinfo{color:#bbb;font-size:11px;margin-top:12px;max-width:640px;line-height:1.5}
.nav-footer-hp{display:block;font-size:0;height:0;overflow:hidden}

/* ── Blue sparkle button (transplanted from ML assistant) ── */
.floating-action-button-container-mlb{position:fixed;bottom:24px;right:24px;z-index:200;height:48px;background:#3483fa;display:flex;align-items:center;justify-content:center;border-radius:100px;box-shadow:0 6px 16px 0 rgba(0,0,0,.25);transition:all .25s ease;cursor:pointer;border:none}
.floating-action-button-container-mlb:not(.active):not(.hidden){width:48px}
.floating-action-button-container-mlb:hover{width:auto;min-width:48px;padding:0 16px;background:#2968c8}
.floating-action-button-container-mlb .action-button{font-family:"Proxima Nova",-apple-system,"Roboto",Arial,sans-serif;background:rgba(0,0,0,0);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-grow:1;height:100%;color:#fff}
.floating-action-button-container-mlb .action-button .verdi-icon{width:24px;height:24px;color:#fff;fill:#fff}
.floating-action-button-container-mlb .action-button .button-label{font-weight:600;font-size:16px;line-height:20px;color:#fff;white-space:nowrap;opacity:0;max-width:0;overflow:hidden;transition:opacity 200ms ease,max-width 200ms ease}
.floating-action-button-container-mlb:hover .action-button .verdi-icon{margin-right:8px}
.floating-action-button-container-mlb:hover .action-button .button-label{opacity:1;max-width:100px}
.floating-action-button-container-mlb.boost-active{box-shadow:0 6px 20px rgba(52,131,250,.55),0 0 0 4px rgba(52,131,250,.2)}
@keyframes ml-sparkle-pulse{0%,100%{box-shadow:0 6px 20px rgba(52,131,250,.55),0 0 0 4px rgba(52,131,250,.2)}50%{box-shadow:0 6px 28px rgba(52,131,250,.7),0 0 0 8px rgba(52,131,250,.1)}}
.floating-action-button-container-mlb.boost-active{animation:ml-sparkle-pulse 2s ease-in-out infinite}
@media(max-width:768px){
  .floating-action-button-container-mlb{bottom:16px;right:16px}
}

/* ── 404 gate ── */
.ml-404{display:flex;align-items:center;justify-content:center;height:100dvh;background:#fff;font-family:"Inter",sans-serif}
.ml-404 h1{font-size:clamp(1.5rem,4vw,2.5rem);color:#333}

/* ── Responsive grid ── */
@media(max-width:1024px){
  .grid-container{grid-template-columns:1fr 1fr!important}
  .grid-container .products-card{grid-column:span 2}
}
@media(max-width:640px){
  .grid-container{grid-template-columns:1fr!important;gap:16px!important}
  .grid-container .products-card{grid-column:span 1}
  .sales-summary__amount{font-size:1.5rem}
}

/* ── Recharts overrides — match ML axis style ── */
.recharts-cartesian-grid-horizontal line{stroke:#e5e5e5;stroke-dasharray:2 2}
.recharts-cartesian-axis-tick-value{fill:#999;font-size:11px}
.recharts-cartesian-axis-line{stroke:#e0e0e0}
.recharts-default-tooltip{background:#fff!important;border:1px solid #e0e0e0!important;border-radius:6px!important;color:#333!important;font-size:12px!important;font-family:Proxima Nova,-apple-system,Roboto,Arial,sans-serif!important}
`;

// ═══════════════════════════════════════════════════════════════
// SVG ICONS — verbatim from the reference
// ═══════════════════════════════════════════════════════════════
const IconClock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconLiveDot = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="4" fill="#00a650"/>
  </svg>
);
const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconCart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
  </svg>
);
const IconPercent = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
  </svg>
);
const IconBox = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
  </svg>
);
const IconDollar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);
const IconPackage = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
    <path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
  </svg>
);
const IconSparkle = () => (
  <svg className="verdi-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z"/>
    <circle cx="19" cy="5" r="1.5" opacity=".7"/>
    <circle cx="5" cy="3" r="1" opacity=".5"/>
    <circle cx="21" cy="15" r="1" opacity=".5"/>
  </svg>
);
const IconCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// LIVECLOCK — isolated 1s ticker
// ═══════════════════════════════════════════════════════════════
const LiveClock = memo(function LiveClock() {
  const [stamp, setStamp] = useState(() => formatDateML(spNow()));
  useEffect(() => {
    const id = setInterval(() => setStamp(formatDateML(spNow())), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{stamp}</>;
});

// ═══════════════════════════════════════════════════════════════
// ANIMATED VALUE — cubic-eased counter for the big R$ display
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// SALES SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════
interface SimSale { productId: string; revenue: number; units: number; ts: number; }

function useMlSim(boosted: boolean) {
  const [sales, setSales] = useState<SimSale[]>(() => {
    try { const raw = localStorage.getItem(SALES_KEY); if (raw) return JSON.parse(raw); } catch {}
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem(SALES_KEY, JSON.stringify(sales)); } catch {}
  }, [sales]);

  useEffect(() => {
    if (!boosted) {
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const p = ML_PRODUCTS[Math.floor(Math.random() * ML_PRODUCTS.length)];
      const revenue = 18 + Math.random() * 67;
      const units = Math.random() < 0.3 ? 2 : 1;
      setSales(prev => [...prev, { productId: p.id, revenue: Math.round(revenue * 100) / 100, units, ts: Date.now() }]);
    };
    const t0 = setTimeout(tick, 2000);
    let intervalId: ReturnType<typeof setInterval> | null = setInterval(tick, SALE_INTERVAL);

    const onVis = () => {
      if (document.hidden) {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      } else {
        if (!intervalId) intervalId = setInterval(tick, SALE_INTERVAL);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearTimeout(t0);
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [boosted]);

  return sales;
}

// ═══════════════════════════════════════════════════════════════
// DERIVED METRICS (memoized, single source of truth)
// ═══════════════════════════════════════════════════════════════
function useMlMetrics(boosted: boolean, sales: SimSale[]) {
  return useMemo(() => {
    // ── If NOT boosted, EVERYTHING is exactly zero ──
    if (!boosted) {
      const emptyChart = Array.from({ length: 23 }, (_, h) => ({
        label: pad2(h), hoje: null as number | null, ontem: 0,
      }));
      return { revenue: 0, vendas: 0, unidades: 0, visitas: 0, compradores: 0, conversao: 0, precoMedio: 0, topProducts: [], chartData: emptyChart };
    }

    const sp = spNow();
    const todayStart = new Date(sp.getFullYear(), sp.getMonth(), sp.getDate()).getTime();
    const todaySales = sales.filter(s => s.ts >= todayStart);

    const revenue = todaySales.reduce((sum, s) => sum + s.revenue, 0);
    const vendas = todaySales.length;
    const unidades = todaySales.reduce((sum, s) => sum + s.units, 0);

    // Coherent synthetic visitors
    const visitorsBase = 35 + Math.floor(Math.random() * 35);
    const visitas = Math.max(vendas, visitorsBase + vendas * (8 + Math.floor(Math.random() * 10)));
    // compradores must be ≤ vendas, and > 0 only if vendas > 0
    const compradores = vendas > 0 ? Math.max(1, Math.floor(vendas * 0.55)) : 0;
    const conversao = visitas > 0 ? (vendas / visitas) * 100 : 0;
    const precoMedio = unidades > 0 ? revenue / unidades : 0;

    // Top products
    const prodMap = new Map<string, { name: string; initials: string; color: string; units: number; revenue: number }>();
    for (const s of todaySales) {
      const p = ML_PRODUCTS.find(pp => pp.id === s.productId);
      if (!p) continue;
      const e = prodMap.get(s.productId);
      if (e) { e.units += s.units; e.revenue += s.revenue; }
      else prodMap.set(s.productId, { name: p.name, initials: p.initials, color: p.color, units: s.units, revenue: s.revenue });
    }
    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Chart: hoje by hour, ontem synthetic baseline
    const hojeByHour = new Array<number>(23).fill(0);
    for (const s of todaySales) {
      const h = new Date(s.ts).getHours();
      if (h >= 0 && h <= 22) hojeByHour[h] += s.revenue;
    }
    const spH = sp.getHours();
    const chartData = Array.from({ length: 23 }, (_, h) => ({
      label: pad2(h),
      hoje: h <= spH ? Math.round(hojeByHour[h] * 100) / 100 : null,
      ontem: Math.round((80 + Math.random() * 180 + Math.sin(h * 0.3) * 60) * 100) / 100,
    }));

    return { revenue, vendas, unidades, visitas, compradores, conversao, precoMedio, topProducts, chartData };
  }, [sales, boosted]);
}

// ═══════════════════════════════════════════════════════════════
// ROUTE COMPONENT
// ═══════════════════════════════════════════════════════════════
function MercadoLivrePage() {
  const { isAdmin } = useApp();
  const [boosted, setBoosted] = useState(() => {
    try { return localStorage.getItem(ML_BOOST_KEY) === "true"; } catch { return false; }
  });

  const sales = useMlSim(boosted);
  const m = useMlMetrics(boosted, sales);

  const toggleBoost = useCallback(() => {
    setBoosted(prev => {
      const next = !prev;
      try { localStorage.setItem(ML_BOOST_KEY, String(next)); } catch {}
      // Clear sales on deactivation
      if (!next) {
        try { localStorage.removeItem(SALES_KEY); } catch {}
      }
      return next;
    });
  }, []);

  const animRevenue = useAnimatedValue(m.revenue);

  // ── 404 gate ──
  if (!isAdmin) {
    return (
      <div className="ml-404">
        <h1>Página não encontrada</h1>
      </div>
    );
  }

  return (
    <div>
      <style>{CSS}</style>

      {/* ═══════════ ML Header ═══════════ */}
      <header className="nav-header nav-header-lite-supply ui-navigation-v2" role="banner" data-siteid="MLB">
        <div className="nav-bounds">
          <div className="nav-header-logo">
            <a className="nav-logo" href="https://www.mercadolivre.com.br/">Mercado Livre Brasil - Onde comprar e vender de Tudo</a>
          </div>
          <div className="nav-header-menu-wrapper">
            <ul className="nav-header-menu-list">
              <li className="nav-header-menu-list__item">
                <a className="option-syi" href="https://www.mercadolivre.com.br/syi/core/list#nav-header">Vender</a>
                <a className="option-help" href="https://www.mercadolivre.com.br/ajuda#nav-header">Contato</a>
              </li>
            </ul>
            <div className="nav-header-user">
              <span className="nav-header-usermenu-wrapper">
                <span className="nav-header-avatar-user">
                  <div className="nav-header-profile-evolution__container">
                    <div className="nav-header-profile-evolution__user-initials">JT</div>
                  </div>
                </span>
                <span className="nav-header-username">Joao victor</span>
                <span className="nav-header-username-chevron"></span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ Main Content ═══════════ */}
      <main role="main" id="root-app" data-navigation="true">
        <div className="metrics">
          <div className="monitor-live lite-supply" data-seller-assistant="true">

            {/* ── Sales Summary ── */}
            <div className="sales-summary" id="summary_sales">
              <div className="live-datetime">
                <IconClock />
                <LiveClock />
              </div>
              <h1 className="sales-summary__title">Vendas de hoje ao vivo</h1>
              <div className="sales-summary__amount">
                <div className="mechanical-counter" role="status" aria-live="polite">
                  <div className="mechanical-counter__display">
                    <span className="mechanical-counter__digit">
                      <span className="mechanical-counter__digit-value">R$</span>
                    </span>
                    <span className="mechanical-counter__digit">
                      <span className="mechanical-counter__digit-value">&nbsp;</span>
                    </span>
                    <span className="mechanical-counter__digit">
                      <span className="mechanical-counter__digit-value">{brl(animRevenue)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Grid ── */}
            <div className="grid-container" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>

              {/* ── Métricas-chave ── */}
              <div className="metrics-card" id="key_indicators">
                <h2 className="metrics-card__title">Métricas-chave</h2>
                <div className="metrics-card__grid">
                  <div className="metrics-card__item">
                    <div className="metrics-card__item-icon"><IconEye /></div>
                    <div className="metrics-card__item-content">
                      <span className="metrics-card__label">Visitas únicas</span>
                      <span className="metrics-card__value">{nfmt(m.visitas)}</span>
                    </div>
                  </div>
                  <div className="metrics-card__item">
                    <div className="metrics-card__item-icon"><IconUsers /></div>
                    <div className="metrics-card__item-content">
                      <span className="metrics-card__label">Total de compradores</span>
                      <span className="metrics-card__value">{nfmt(m.compradores)}</span>
                    </div>
                  </div>
                  <div className="metrics-card__item">
                    <div className="metrics-card__item-icon"><IconCart /></div>
                    <div className="metrics-card__item-content">
                      <span className="metrics-card__label">Quantidade de vendas</span>
                      <span className="metrics-card__value">{nfmt(m.vendas)}</span>
                    </div>
                  </div>
                  <div className="metrics-card__item">
                    <div className="metrics-card__item-icon"><IconPercent /></div>
                    <div className="metrics-card__item-content">
                      <span className="metrics-card__label">Conversão</span>
                      <span className="metrics-card__value">{m.conversao.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="metrics-card__item">
                    <div className="metrics-card__item-icon"><IconBox /></div>
                    <div className="metrics-card__item-content">
                      <span className="metrics-card__label">Unidades vendidas</span>
                      <span className="metrics-card__value">{nfmt(m.unidades)} u.</span>
                    </div>
                  </div>
                  <div className="metrics-card__item">
                    <div className="metrics-card__item-icon"><IconDollar /></div>
                    <div className="metrics-card__item-content">
                      <span className="metrics-card__label">Preço médio</span>
                      <span className="metrics-card__value">R$ {brl(m.precoMedio)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Chart ── */}
              <div className="chart-card" id="sales_trends">
                <div className="chart-card__header">
                  <h3 className="chart-card__title">Tendências em vendas brutas</h3>
                  <div className="chart-card__legend">
                    <div className="chart-card__legend-items">
                      <div className="chart-card__legend-item">
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#386bf5" }} />
                        <span>Hoje</span>
                      </div>
                      <div className="chart-card__legend-item">
                        <span style={{ display: "inline-block", width: 8, height: 8, background: "#d9539e" }} />
                        <span>Ontem</span>
                      </div>
                    </div>
                    <div className="chart-card__calendar-container">
                      <button className="chart-card__calendar-button" type="button" aria-label="Selecionar data">
                        <IconCalendar />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="chart-card__content">
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <AreaChart data={m.chartData} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
                        <defs>
                          <linearGradient id="mlFillHoje" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#386bf5" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#386bf5" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" stroke="#999" fontSize={11} tickLine={false} axisLine={{ stroke: "#e0e0e0" }} interval={3} />
                        <YAxis stroke="#999" fontSize={11} tickLine={false} axisLine={false} width={40}
                          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <Tooltip
                          contentStyle={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, fontSize: 12, color: "#333", fontFamily: "Proxima Nova,-apple-system,Roboto,Arial,sans-serif" }}
                          labelStyle={{ color: "#999" }}
                          formatter={(v: number | string, name: string) => [
                            `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                            name === "hoje" ? "Hoje" : "Ontem",
                          ]}
                        />
                        <Area type="monotone" dataKey="ontem" stroke="#d9539e" strokeWidth={1.5} fill="none" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                        <Area type="monotone" dataKey="hoje" stroke="#386bf5" strokeWidth={2.2} fill="url(#mlFillHoje)" dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── Produtos mais vendidos ── */}
              <div className={`products-card${m.topProducts.length === 0 ? " products-card--empty" : ""}`} id="bestsellers_list">
                <h2 className="products-card__title">Produtos mais vendidos</h2>
                {m.topProducts.length === 0 ? (
                  <div className="products-card__empty-state">
                    <div className="products-card__empty-icon"><IconPackage /></div>
                    <p className="products-card__empty-message">Você não vendeu nenhum produto hoje</p>
                  </div>
                ) : (
                  <div>
                    {m.topProducts.map((p, i) => (
                      <div className="products-card__item" key={i}>
                        <div className="products-card__item-initials" style={{ background: p.color }}>{p.initials}</div>
                        <span className="products-card__item-name">{p.name}</span>
                        <div className="products-card__item-stats">
                          <div className="products-card__item-units">{p.units} {p.units === 1 ? "unidade" : "unidades"}</div>
                          <div className="products-card__item-revenue">R$ {brl(p.revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ═══════════ ML Footer ─═��════════ */}
      <footer className="nav-footer" role="contentinfo">
        <div className="nav-footer-user-info">
          <div className="nav-footer-primaryinfo">
            <small className="nav-footer-copyright">Copyright ©&nbsp;1999-2026 Ebazar.com.br LTDA.</small>
            <nav className="nav-footer-navigation">
              <ul className="nav-footer-navigation__menu">
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://careers-meli.mercadolibre.com/pt">Trabalhe conosco</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/ajuda/991">Termos e condições</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/l/promocoes">Promoções</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/privacidade">Como cuidamos da sua privacidade</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/acessibilidade">Acessibilidade</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/ajuda">Contato</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/ajuda/23303">Informações sobre seguros</a></li>
                <li className="nav-footer-navigation__item"><a className="nav-footer-navigation__link" href="https://www.mercadolivre.com.br/l/afiliados-home">Programa de Afiliados</a></li>
              </ul>
            </nav>
          </div>
          <p className="nav-footer-secondaryinfo">CNPJ n.º 03.007.331/0001-41 / Av. das Nações Unidas, nº 3.003, Bonfim, Osasco/SP - CEP 06233-903 - empresa do grupo Mercado Livre.</p>
        </div>
        <a className="nav-footer-hp" href="https://hp.mercadolibre.com/?p=ML&amp;s=MLB&amp;d=desktop">Mercado Livre</a>
      </footer>

      {/* ═══════════ Blue sparkle boost toggle ═══════════ */}
      {isAdmin && (
        <button
          className={`floating-action-button-container-mlb${boosted ? " boost-active" : ""}`}
          onClick={toggleBoost}
          title={boosted ? "Desativar simulação" : "Ativar simulação"}
          aria-label={boosted ? "Simulação ativa — clique para desativar" : "Ativar simulação de vendas"}
        >
          <span className="action-button">
            <IconSparkle />
            <span className="button-label">Assistente</span>
          </span>
        </button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/mercadolivrecombr")({
  component: MercadoLivrePage,
});
