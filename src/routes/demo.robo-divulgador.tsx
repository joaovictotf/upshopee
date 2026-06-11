import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { DemoShell } from "../components/layout/DemoShell";
import { Bot, MessageCircle, Wifi, TrendingUp, Zap, Sparkles, ChevronRight, Check } from "lucide-react";

export const Route = createFileRoute("/demo/robo-divulgador")({ component: DemoRobo });

const INITIAL_CREDITS = 10000;
const USED_CREDITS = 4300;
const CREDIT_PCT = Math.round(((INITIAL_CREDITS - USED_CREDITS) / INITIAL_CREDITS) * 100);

const MOCK_LOG = [
  { id: "l1",  type: "sale",     msg: "Venda via Grupos de WhatsApp • +R$ 78,40",  time: "14:21", channel: "whatsapp" },
  { id: "l2",  type: "activity", msg: "Postando em 12 grupos de WhatsApp...",       time: "14:17", channel: "whatsapp" },
  { id: "l3",  type: "activity", msg: "Compartilhando em 8 grupos ativos",           time: "14:09", channel: "facebook" },
  { id: "l4",  type: "sale",     msg: "Venda via Grupos do Facebook • +R$ 168,90",  time: "13:58", channel: "facebook" },
  { id: "l5",  type: "activity", msg: "Alcançando 320 membros no grupo Promoções",  time: "13:52", channel: "whatsapp" },
  { id: "l6",  type: "sale",     msg: "Venda via Grupos de WhatsApp • +R$ 38,50",   time: "13:41", channel: "whatsapp" },
  { id: "l7",  type: "activity", msg: "Postando em grupos do Facebook...",           time: "13:34", channel: "facebook" },
  { id: "l8",  type: "sale",     msg: "Venda via Grupos do Facebook • +R$ 32,40",   time: "13:22", channel: "facebook" },
  { id: "l9",  type: "activity", msg: "Divulgando no Grupo Ofertas SP 🔥",           time: "13:11", channel: "whatsapp" },
  { id: "l10", type: "sale",     msg: "Venda via Grupos de WhatsApp • +R$ 24,50",   time: "12:58", channel: "whatsapp" },
];

function DemoRobo() {
  const [privacy, setPrivacy] = useState(false);

  return (
    <DemoShell
      title="Robô Divulgador"
      subtitle="Divulgação automática dos seus produtos em grupos e contatos."
      privacy={privacy}
      onTogglePrivacy={() => setPrivacy((p) => !p)}
    >
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* ── Left panel ── */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Status card — ATIVO */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500/60 bg-orange-50 p-6 shadow-lg shadow-orange-500/10">
            <div className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl bg-orange-500/5" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl shadow-orange-500/40">
                  <Bot className="h-10 w-10 text-white" />
                  <span className="absolute -inset-1 animate-ping rounded-2xl bg-orange-400/20" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 ring-2 ring-white shadow-md shadow-green-500/50">
                    <span className="h-2 w-2 animate-ping rounded-full bg-green-300" />
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold text-gray-900">Robô Divulgador</h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-green-700">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      ATIVO
                    </span>
                  </div>
                  <p className="mt-1.5 animate-in fade-in text-sm font-medium text-green-600">
                    🤖 Divulgando no Grupo Ofertas SP 🔥
                  </p>
                </div>
              </div>
              <button
                disabled
                className="shrink-0 cursor-not-allowed rounded-xl border-2 border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-400 opacity-60"
              >
                Parar robô (demo)
              </button>
            </div>

            {/* Credits meter */}
            <div className="mt-5 rounded-xl border border-gray-100 bg-white/80 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-4xl font-black tabular-nums text-gray-900">
                    {CREDIT_PCT}<span className="text-2xl text-gray-300">%</span>
                  </span>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Créditos disponíveis</p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-400">
                  {(INITIAL_CREDITS - USED_CREDITS).toLocaleString("pt-BR")} <span className="text-gray-200">/</span> {INITIAL_CREDITS.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-700"
                  style={{ width: `${CREDIT_PCT}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-400">Cada venda consome 30–50 créditos · Até 333 vendas automáticas</p>
            </div>
          </div>

          {/* Channel pills */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Canais de divulgação</h3>
            <p className="mt-1 text-sm text-gray-500">Canais ativos nesta sessão de demonstração.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { label: "Grupos de WhatsApp", icon: MessageCircle, active: true },
                { label: "Grupos do Facebook",  icon: Wifi,          active: true },
              ].map(({ label, icon: Icon, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 rounded-full border-2 px-5 py-2.5 text-sm font-semibold ${
                    active
                      ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/25"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Info tips */}
          <div className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-4 text-xs text-gray-400 shadow-sm">
            <div className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              <span>O robô divulga automaticamente durante todo o dia enquanto ativo.</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              <span>Cada venda consome 30–50 créditos de divulgação.</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" />
              <span>Quanto mais canais selecionados, maior o alcance da divulgação.</span>
            </div>
          </div>
        </div>

        {/* ── Dark right sidebar ── */}
        <div className="space-y-4 xl:w-80">
          {/* Metrics panel */}
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Sessão de demonstração</h3>
            <div className="mt-4 space-y-3">
              <StatCard
                icon={<TrendingUp className="h-4 w-4 text-orange-400" />}
                label="Vendas geradas"
                value={privacy ? "•••" : "8"}
                accent
              />
              <StatCard
                icon={<Zap className="h-4 w-4 text-violet-400" />}
                label="Créditos gastos"
                value={privacy ? "•••" : "427"}
              />
              <StatCard
                icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                label="Receita gerada"
                value={privacy ? "•••" : "R$ 173,90"}
              />
            </div>
          </div>

          {/* Activity feed */}
          <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Atividade recente</h3>
            <div className="mt-4 max-h-[380px] overflow-y-auto">
              <div className="space-y-px">
                {MOCK_LOG.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 border-l-2 py-2.5 pl-3 ${
                      entry.type === "sale" ? "border-green-500" : "border-blue-500"
                    }`}
                  >
                    <p
                      className={`min-w-0 flex-1 truncate text-xs leading-snug ${
                        entry.type === "sale" ? "font-semibold text-green-400" : "text-slate-400"
                      }`}
                    >
                      {entry.msg}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-600">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}

function StatCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? "bg-slate-800 ring-1 ring-orange-500/30" : "bg-slate-800"}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-black tabular-nums ${accent ? "text-orange-400" : "text-white"}`}>{value}</div>
    </div>
  );
}
