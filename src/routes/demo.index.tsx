import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DemoShell } from "../components/layout/DemoShell";
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Package } from "lucide-react";

export const Route = createFileRoute("/demo/")({ component: DemoIndex });

// ─── Mock constants ───────────────────────────────────────────────────────────

const COMMISSION = 1247.8;

const METRICS = [
  { label: "Visitantes",                value: "1.832" },
  { label: "Visualizações da Página",   value: "5.441" },
  { label: "Pedidos",                   value: "87" },
  { label: "Unidades",                  value: "103" },
  { label: "Total de Compradores",      value: "87" },
  { label: "Taxa de Conversão",         value: "4,75%" },
];

const TOP5 = [
  { id: "t1", name: "Álbum da Copa do Mundo 2026",         image: "https://down-br.img.susercontent.com/file/br-11134207-820ln-mnqar7zwk26a25",            sales: 23, revenue: 886.7  },
  { id: "t2", name: "Camisa do Brasil da seleção brasileira", image: "https://static.netshoes.com.br/produtos/camiseta-nike-brasil-i-202223-supporter-masculina/30/2IC-9637-030/2IC-9637-030_zoom1.jpg?ims=544x&ts=1779133644", sales: 18, revenue: 3238.2 },
  { id: "t3", name: "Fone Bluetooth TWS i12 sem fio",      image: "https://down-br.img.susercontent.com/file/sg-11134201-7rdwm-mdlgl6i0xjq13c",            sales: 14, revenue: 1118.6 },
  { id: "t4", name: "Mini projetor portátil HD 1080P",     image: "https://down-br.img.susercontent.com/file/sg-11134201-7rbm0-lp6med0901yr25",            sales: 11, revenue: 5058.9 },
  { id: "t5", name: "Escova secadora alisadora 3 em 1",    image: "https://down-br.img.susercontent.com/file/br-11134207-81z1k-meio8275bls1f0",            sales: 7,  revenue: 1329.3 },
];

const ORDERS = [
  { id: "#91822", name: "Camisa do Brasil da seleção brasileira", price: 179.9, commission: 78.4,  image: "https://static.netshoes.com.br/produtos/camiseta-nike-brasil-i-202223-supporter-masculina/30/2IC-9637-030/2IC-9637-030_zoom1.jpg?ims=544x&ts=1779133644", ago: "há 23 min" },
  { id: "#91799", name: "Mini projetor portátil HD 1080P",        price: 459.9, commission: 168.9, image: "https://down-br.img.susercontent.com/file/sg-11134201-7rbm0-lp6med0901yr25",            ago: "há 41 min"    },
  { id: "#91755", name: "Álbum da Copa do Mundo 2026",            price: 79.9,  commission: 38.5,  image: "https://down-br.img.susercontent.com/file/br-11134207-820ln-mnqar7zwk26a25",            ago: "há 1h 12min"  },
  { id: "#91710", name: "Fone Bluetooth TWS i12 sem fio",         price: 79.9,  commission: 32.4,  image: "https://down-br.img.susercontent.com/file/sg-11134201-7rdwm-mdlgl6i0xjq13c",            ago: "há 2h 05min"  },
];

// Hourly chart data — computed once at module load
function pad2(n: number) { return String(n).padStart(2, "0"); }
const CHART_DATA = (() => {
  const h = new Date().getHours();
  const peak = (i: number, c: number, w: number, amp: number) =>
    Math.max(0, amp * Math.exp(-Math.pow((i - c) / w, 2)));
  return Array.from({ length: 24 }, (_, i) => ({
    label: pad2(i),
    hoje: i <= h
      ? Math.round(peak(i, 9, 1.8, 280) + peak(i, 12, 2.2, 420) + peak(i, 18, 2.8, 580) + peak(i, 21, 1.6, 310))
      : null,
    ontem: Math.round(peak(i, 9, 2.0, 220) + peak(i, 12, 2.5, 360) + peak(i, 18, 3.0, 470) + peak(i, 21, 1.8, 250)),
  }));
})();

// ─── Animated counter ────────────────────────────────────────────────────────
function useAnimated(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const t = Math.min(1, (ts - start.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(eased * target);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return val;
}

// ─── Stamp ───────────────────────────────────────────────────────────────────
function useStamp() {
  const fmt = () => {
    const d = new Date();
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} (GMT-03)`;
  };
  const [stamp, setStamp] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setStamp(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return stamp;
}

// ─── BRL helper (no global privacy side-effect) ───────────────────────────────
function brl(v: number, priv = false) {
  const s = v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return priv ? "R$ •••••" : s;
}
function num(v: number, priv = false) {
  return priv ? "•••" : v.toLocaleString("pt-BR");
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function DemoIndex() {
  const [privacy, setPrivacy] = useState(false);

  return (
    <DemoShell
      title="Dashboard"
      subtitle="Painel UpShopee para Shopee"
      privacy={privacy}
      onTogglePrivacy={() => setPrivacy((p) => !p)}
    >
      <HeroPanel privacy={privacy} />

      <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <MetricsBlock privacy={privacy} />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <SalesChart />
        </div>
        <div className="lg:col-span-3 flex flex-col">
          <Top5Block privacy={privacy} />
        </div>
      </div>

      <div className="mt-4">
        <RecentOrders privacy={privacy} />
      </div>
    </DemoShell>
  );
}

// ─── Hero panel ───────────────────────────────────────────────────────────────
function HeroPanel({ privacy }: { privacy: boolean }) {
  const animated = useAnimated(COMMISSION);
  const stamp = useStamp();
  const formatted = animated.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#EE4D2D] px-4 pt-8 pb-8 text-center">
      <img
        src="/brands/shopee-logo.svg"
        alt=""
        aria-hidden
        className="absolute top-4 left-4 h-20 w-20 object-contain brightness-0 invert opacity-90"
      />

      <h1 className="text-2xl sm:text-3xl font-bold text-white">Vendas Hoje</h1>
      <div className="mt-2 inline-flex items-center rounded-full bg-[#C84120] px-3 py-1 text-white text-xs sm:text-sm font-medium">
        {stamp}
      </div>

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
              style={{ fontFamily: "Arial,Helvetica,sans-serif", letterSpacing: "-3px", lineHeight: 1.05 }}
            >
              {privacy ? "•••••" : formatted}
            </span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Comissões acumuladas hoje · dados ilustrativos
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Metrics block ────────────────────────────────────────────────────────────
function MetricsBlock({ privacy }: { privacy: boolean }) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold text-foreground">Métricas Principais</h3>
      <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-border/60 border border-border/60 rounded-lg overflow-hidden">
        {METRICS.map(({ label, value }) => (
          <div key={label} className="bg-card p-4 text-center">
            <div className="text-[11px] font-medium text-[#EE4D2D] leading-tight">{label}</div>
            <div
              className="mt-1.5 text-2xl font-bold text-foreground tabular-nums"
              style={{ fontFamily: "Arial,Helvetica,sans-serif", letterSpacing: "-0.5px" }}
            >
              {privacy ? "•••" : value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sales chart ──────────────────────────────────────────────────────────────
function SalesChart() {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Visão Geral de Vendas (Hoje)</h3>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[#EE4D2D]" /> Hoje
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[#14B8A6]" /> Ontem
            </span>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#EE4D2D] px-3 py-1 text-[11px] font-bold text-white">
          Hoje
        </span>
      </div>

      <div className="relative mt-3 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CHART_DATA} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
            <defs>
              <linearGradient id="demo_fillHoje" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EE4D2D" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EE4D2D" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="demo_fillOntem" x1="0" y1="0" x2="0" y2="1">
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
              interval={1}
            />
            <YAxis stroke="rgba(17,24,39,0.55)" fontSize={10} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid rgba(17,24,39,0.1)", borderRadius: 8, color: "#111827", fontSize: 12 }}
              labelStyle={{ color: "rgba(17,24,39,0.65)" }}
              formatter={(v: number | string, name: string) => [
                Number(v ?? 0).toLocaleString("pt-BR"),
                name === "hoje" ? "Hoje" : "Ontem",
              ]}
            />
            <Area type="monotone" dataKey="ontem" stroke="#14B8A6" strokeWidth={2} strokeDasharray="5 3" fill="url(#demo_fillOntem)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="hoje" stroke="#EE4D2D" strokeWidth={2.2} fill="url(#demo_fillHoje)" dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Top 5 block ──────────────────────────────────────────────────────────────
function Top5Block({ privacy }: { privacy: boolean }) {
  return (
    <div className="h-full rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-bold text-foreground">Top 5 produtos mais vendidos</h3>
      <ol className="mt-3 divide-y divide-border/60">
        {TOP5.map((it, idx) => (
          <li key={it.id} className="flex items-center gap-3 py-2.5">
            <span className="w-4 shrink-0 text-center text-sm font-bold text-[#EE4D2D]">{idx + 1}</span>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white p-1 ring-1 ring-border/60 overflow-hidden">
              <img
                src={it.image}
                alt={it.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[11px] font-medium text-foreground leading-tight">{it.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{it.sales} unidades vendidas</div>
            </div>
            <div
              className="text-right text-xs font-bold text-[#EE4D2D] tabular-nums"
              style={{ fontFamily: "Arial,Helvetica,sans-serif", letterSpacing: "-0.3px" }}
            >
              {privacy ? "•••" : brl(it.revenue)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Recent orders ────────────────────────────────────────────────────────────
function RecentOrders({ privacy }: { privacy: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-bold text-foreground">Pedidos Recentes</h3>
      <div className="space-y-3">
        {ORDERS.map((o) => (
          <div key={o.id} className="flex items-center gap-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-border/60">
              <img
                src={o.image}
                alt={o.name}
                className="max-h-full max-w-full object-contain"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const p = e.currentTarget.parentElement;
                  if (p && !p.querySelector(".fb")) {
                    const s = document.createElement("span");
                    s.className = "fb text-xl";
                    s.textContent = "📦";
                    p.appendChild(s);
                  }
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-foreground">{o.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {o.id} · {privacy ? "R$ •••" : brl(o.price)} · <span className="text-muted-foreground/70">{o.ago}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div
                className="text-base font-black text-[#22c55e] tabular-nums"
                style={{ fontFamily: "Arial,Helvetica,sans-serif" }}
              >
                {privacy ? "+" : `+${brl(o.commission)}`}
              </div>
              <div className="text-[10px] font-medium text-muted-foreground">comissão</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
