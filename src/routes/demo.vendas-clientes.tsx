import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DemoShell } from "../components/layout/DemoShell";

export const Route = createFileRoute("/demo/vendas-clientes")({ component: DemoVendas });

function brl(v: number, priv = false) {
  if (priv) return "R$ •••";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SUMMARY = [
  { label: "Total de vendas",     value: "87" },
  { label: "Receita total",       value: "R$ 9.847,30" },
  { label: "Comissões totais",    value: "R$ 1.247,80" },
  { label: "Ticket médio",       value: "R$ 113,18" },
];

const ORDERS = [
  {
    id: "#91822",
    product:    "Camisa do Brasil da seleção brasileira",
    image:      "https://static.netshoes.com.br/produtos/camiseta-nike-brasil-i-202223-supporter-masculina/30/2IC-9637-030/2IC-9637-030_zoom1.jpg?ims=544x&ts=1779133644",
    customer:   "João V.",
    price:      179.9,
    commission: 78.4,
    status:     "Entregue",
    date:       "08/06/2026",
    ago:        "há 23 min",
  },
  {
    id: "#91799",
    product:    "Mini projetor portátil HD 1080P",
    image:      "https://down-br.img.susercontent.com/file/sg-11134201-7rbm0-lp6med0901yr25",
    customer:   "Maria S.",
    price:      459.9,
    commission: 168.9,
    status:     "Em transporte",
    date:       "08/06/2026",
    ago:        "há 41 min",
  },
  {
    id: "#91755",
    product:    "Álbum da Copa do Mundo 2026",
    image:      "https://down-br.img.susercontent.com/file/br-11134207-820ln-mnqar7zwk26a25",
    customer:   "Carlos M.",
    price:      79.9,
    commission: 38.5,
    status:     "Em separação",
    date:       "08/06/2026",
    ago:        "há 1h 12min",
  },
  {
    id: "#91710",
    product:    "Fone Bluetooth TWS i12 sem fio",
    image:      "https://down-br.img.susercontent.com/file/sg-11134201-7rdwm-mdlgl6i0xjq13c",
    customer:   "Ana P.",
    price:      79.9,
    commission: 32.4,
    status:     "Entregue",
    date:       "08/06/2026",
    ago:        "há 2h 05min",
  },
];

const STATUS_STYLE: Record<string, string> = {
  "Entregue":      "bg-emerald-100 text-emerald-700",
  "Em transporte": "bg-blue-100 text-blue-700",
  "Em separação":  "bg-amber-100 text-amber-700",
};

function DemoVendas() {
  const [privacy, setPrivacy] = useState(false);

  return (
    <DemoShell
      title="Vendas / Clientes"
      subtitle="Acompanhe seus pedidos e comissões em tempo real"
      privacy={privacy}
      onTogglePrivacy={() => setPrivacy((p) => !p)}
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {SUMMARY.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-[11px] font-medium text-[#EE4D2D] leading-tight">{label}</div>
            <div
              className="mt-1.5 text-xl font-bold text-foreground tabular-nums"
              style={{ fontFamily: "Arial,Helvetica,sans-serif" }}
            >
              {privacy && label !== "Total de vendas" ? "•••" : value}
            </div>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold text-foreground">Pedidos Recentes</h3>
          <span className="rounded-full bg-[#EE4D2D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#EE4D2D]">
            {ORDERS.length} pedidos
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {ORDERS.map((o) => (
            <div key={o.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              {/* Product image */}
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-border/60">
                <img
                  src={o.image}
                  alt={o.product}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const p = e.currentTarget.parentElement;
                    if (p && !p.querySelector(".fb")) {
                      const s = document.createElement("span");
                      s.className = "fb text-2xl";
                      s.textContent = "📦";
                      p.appendChild(s);
                    }
                  }}
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground">{o.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {o.status}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{o.product}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Cliente: {privacy ? "•••" : o.customer} · {o.date} · {o.ago}
                </div>
              </div>

              {/* Price + commission */}
              <div className="flex shrink-0 items-center gap-6 sm:flex-col sm:items-end sm:gap-1">
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Valor do pedido</div>
                  <div
                    className="text-sm font-bold text-foreground tabular-nums"
                    style={{ fontFamily: "Arial,Helvetica,sans-serif" }}
                  >
                    {brl(o.price, privacy)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">Comissão</div>
                  <div
                    className="text-lg font-black text-[#22c55e] tabular-nums"
                    style={{ fontFamily: "Arial,Helvetica,sans-serif" }}
                  >
                    {privacy ? "+R$ •••" : `+${brl(o.commission)}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DemoShell>
  );
}
