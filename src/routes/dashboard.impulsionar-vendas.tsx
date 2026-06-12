// Mobile-first: all layouts must work on 320px+ screens
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { brl } from "../lib/format";
import { Button } from "../components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../components/ui/dialog";
import {
  Flame, TrendingUp, Zap, ShieldCheck, Rocket, BarChart3,
  CheckCircle2, Lock, Activity, Wallet, CalendarDays, Layers,
  ChevronDown, Sparkles,
} from "lucide-react";

const BOOST_PACK_24_CHECKOUT_URL  = "https://go.ironpayapp.com.br/rnaqezkbld";
const BOOST_PACK_50_CHECKOUT_URL  = "https://go.ironpayapp.com.br/a7brsesrse";
const BOOST_PACK_150_CHECKOUT_URL = "https://go.ironpayapp.com.br/kteiyf8epw";
const BOOST_PACK_400_CHECKOUT_URL = "https://go.ironpayapp.com.br/bsyspglspg";

export const Route = createFileRoute("/dashboard/impulsionar-vendas")({
  component: ImpulsionarVendasPage,
});

type Pack = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  ideal: string;
  reach: string;
  views: string;
  interactions: string;
  conversion: string;
  roi: string;
  roiAmount: string;
  guaranteeMin: string;
  checkoutUrl: string;
  badge?: string;
};

const PACKS: Pack[] = [
  {
    id: "inicio",
    name: "Pack Início",
    price: 40,
    ideal: "Quem quer dar os primeiros passos e testar aumento de visibilidade.",
    reach: "800 a 1.200 pessoas",
    views: "250 a 450",
    interactions: "20 a 45",
    conversion: "até 1 a 3 vendas",
    roi: "Invista R$ 40,00 e tenha potencial de gerar até R$ 200,00 em comissões.",
    roiAmount: "até R$ 200,00",
    guaranteeMin: "R$ 80,00",
    checkoutUrl: BOOST_PACK_24_CHECKOUT_URL,
  },
  {
    id: "aceleracao",
    name: "Pack Aceleração",
    price: 64.9,
    ideal: "Quem quer movimentar produtos com mais rapidez e ganhar tração.",
    reach: "2.000 a 3.500 pessoas",
    views: "700 a 1.100",
    interactions: "60 a 120",
    conversion: "até 3 a 7 vendas",
    roi: "Invista R$ 64,90 e tenha potencial de gerar até R$ 324,50 em comissões.",
    roiAmount: "até R$ 324,50",
    guaranteeMin: "R$ 129,80",
    checkoutUrl: BOOST_PACK_50_CHECKOUT_URL,
    badge: "Melhor para começar",
  },
  {
    id: "escala",
    name: "Pack Escala",
    price: 150,
    originalPrice: 250,
    ideal: "Quem já validou produtos e quer acelerar o volume de vendas.",
    reach: "6.000 a 10.000 pessoas",
    views: "2.000 a 3.500",
    interactions: "180 a 350",
    conversion: "até 8 a 18 vendas",
    roi: "Invista R$ 150,00 e tenha potencial de gerar até R$ 2.000,00 em comissões.",
    roiAmount: "até R$ 2.000,00",
    guaranteeMin: "R$ 300,00",
    checkoutUrl: BOOST_PACK_150_CHECKOUT_URL,
    badge: "Mais escolhido",
  },
  {
    id: "maximo",
    name: "Pack Máximo",
    price: 400,
    ideal: "Quem quer o maior nível de visibilidade e crescimento potencial.",
    reach: "18.000 a 30.000 pessoas",
    views: "6.000 a 10.000",
    interactions: "500 a 900",
    conversion: "até 20 a 45 vendas",
    roi: "Invista R$ 400,00 e tenha potencial de gerar até R$ 5.000,00 em comissões.",
    roiAmount: "até R$ 5.000,00",
    guaranteeMin: "R$ 800,00",
    checkoutUrl: BOOST_PACK_400_CHECKOUT_URL,
    badge: "Maior alcance",
  },
];

const METRIC_PCT: Record<string, number> = {
  inicio: 20,
  aceleracao: 45,
  escala: 75,
  maximo: 100,
};

type BoostInfo = {
  packName: string; packValue: number; startsAt: string; endsAt: string;
  eventsReleased: number; commissionTotal: number; progressPct: number;
  returnMultiplier: number; completed: boolean;
};

type DialogProps = {
  selectedPack: Pack | null;
  stage: "guarantee" | "how" | "confirm";
  setSelectedPack: React.Dispatch<React.SetStateAction<Pack | null>>;
  setStage: React.Dispatch<React.SetStateAction<"guarantee" | "how" | "confirm">>;
  goToPayment: () => void;
};

// ─── Main ─────────────────────────────────────────────────────────────────────
function ImpulsionarVendasPage() {
  const { user, myActiveBoost, isAdmin } = useApp();
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [stage, setStage] = useState<"guarantee" | "how" | "confirm">("guarantee");
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const startActivate = (pack: Pack) => { setSelectedPack(pack); setStage("guarantee"); };
  const goToPayment = () => { if (selectedPack) window.location.href = selectedPack.checkoutUrl; };
  const boost = myActiveBoost as BoostInfo | null;

  const dialogProps: DialogProps = { selectedPack, stage, setSelectedPack, setStage, goToPayment };

  if (!isAdmin) {
    return (
      <>
        {!policyAccepted && <PolicyModal onAccept={() => setPolicyAccepted(true)} />}
        <LegacyView
          boost={boost}
          selectedPack={selectedPack}
          setSelectedPack={setSelectedPack}
          stage={stage}
          setStage={setStage}
          startActivate={startActivate}
          goToPayment={goToPayment}
        />
      </>
    );
  }

  return <NewView boost={boost} startActivate={startActivate} dialogProps={dialogProps} />;
}

// ─── Policy modal (non-admin, every visit) ────────────────────────────────────
function PolicyModal({ onAccept }: { onAccept: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const id = setInterval(() => {
      const ms = Math.min(Date.now() - startTime, 20000);
      setElapsed(ms);
      if (ms >= 20000) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const done = elapsed >= 20000;
  const secondsLeft = Math.max(0, Math.ceil((20000 - elapsed) / 1000));
  const pct = (elapsed / 20000) * 100;
  const enabled = done && agreed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-orange-100 max-w-lg w-full p-8">
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4EF] text-2xl">
            📋
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 text-center mb-6">
          Política de Impulsionamento
        </h2>

        <div className="space-y-3 mb-6">
          {[
            "Você paga o valor do pack escolhido",
            "O robô divulga seus produtos automaticamente",
            "Garantia: se não gerar vendas equivalentes, devolvemos 100%",
          ].map((text) => (
            <div key={text} className="flex items-start gap-3">
              <span className="font-bold text-[#EE4D2D]">✓</span>
              <span className="text-sm text-gray-700">{text}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          A garantia é condicional e válida quando o impulsionamento não gerar retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, dentro do período de acompanhamento. A devolução segue as regras do programa e pode ser solicitada conforme os critérios estabelecidos.
        </p>

        <div className="mb-5">
          <p className="mb-2 text-xs text-gray-500">
            {done ? "✓ Leitura concluída" : `Leia com atenção — ${secondsLeft}s restantes`}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-none ${done ? "bg-green-500" : "bg-[#EE4D2D]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <label className={`mb-6 flex items-center gap-3 ${done ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
          <input
            type="checkbox"
            disabled={!done}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 accent-[#EE4D2D]"
          />
          <span className="text-sm text-gray-700">Li e concordo com a política</span>
        </label>

        <button
          onClick={enabled ? onAccept : undefined}
          disabled={!enabled}
          className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-wide transition-all ${
            enabled
              ? "cursor-pointer bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          ENTRAR NO IMPULSIONAR →
        </button>
      </div>
    </div>
  );
}

// ─── New conversion-focused view ──────────────────────────────────────────────
function NewView({
  boost,
  startActivate,
  dialogProps,
}: {
  boost: BoostInfo | null;
  startActivate: (p: Pack) => void;
  dialogProps: DialogProps;
}) {
  const [hoveredPack, setHoveredPack] = useState<Pack | null>(null);
  const [roiPack, setRoiPack] = useState<Pack>(PACKS[2]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <DashboardShell
      title="Impulsionar vendas 🔥"
      subtitle="Multiplique sua exposição e alcance mais compradores"
    >
      <style>{`
        @keyframes iv-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(238,77,45,0.5), 0 8px 24px rgba(238,77,45,0.25); }
          50%      { box-shadow: 0 0 0 8px rgba(238,77,45,0), 0 8px 32px rgba(238,77,45,0.40); }
        }
        .iv-btn-glow { animation: iv-glow 2.2s ease-in-out infinite; }
        @keyframes iv-gold-shimmer {
          0%,60%  { transform: translateX(-130%) skewX(-15deg); opacity:0; }
          65%     { opacity: 0.8; }
          85%     { transform: translateX(270%) skewX(-15deg); opacity:0; }
          100%    { opacity:0; }
        }
        .iv-maximo-shine {
          animation: iv-gold-shimmer 3s ease-in-out infinite;
        }
        .iv-scrollbar-hide::-webkit-scrollbar { display:none; }
        .iv-scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      <BoostPerformanceSection boost={boost} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-[#FFF8F5] px-6 py-10 md:px-12 md:py-14 border border-orange-100">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 70% 110%, rgba(238,77,45,0.10) 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#EE4D2D]/30 bg-[#EE4D2D]/10 px-4 py-1.5 mb-6">
            <Flame className="h-3.5 w-3.5 text-[#EE4D2D]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#EE4D2D]">
              +1.200 vendedores já impulsionaram
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.0] tracking-tight text-gray-900 mb-4">
            Multiplique suas vendas
            <br />
            <span style={{ color: "#EE4D2D" }}>no automático</span>
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-xl mb-8">
            Escolha o nível de exposição ideal e deixe o sistema trabalhar por você
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400 font-medium">
            <span>R$234k+ em comissões geradas</span>
            <span className="hidden sm:block w-px h-3 bg-gray-200" />
            <span>4.9★ avaliação média</span>
            <span className="hidden sm:block w-px h-3 bg-gray-200" />
            <span>🛡️ Garantia condicional de resultado</span>
          </div>
        </div>
      </section>

      {/* ── PACK GRID (asymmetric) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch mb-4">
        {/* Início — minimal, 1 col */}
        <article
          className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-gray-300 hover:shadow-md"
          onMouseEnter={() => setHoveredPack(PACKS[0])}
          onMouseLeave={() => setHoveredPack(null)}
        >
          <h3 className="font-bold text-gray-900 text-base mb-1">{PACKS[0].name}</h3>
          <div className="text-2xl font-black text-gray-900 mb-0.5">{brl(PACKS[0].price)}</div>
          <div className="text-xs text-gray-400 mb-4">pacote único</div>
          <div className="space-y-2 mb-4 flex-1">
            <MBar label="Alcance" value={PACKS[0].reach} pct={METRIC_PCT["inicio"]} />
            <MBar label="Views" value={PACKS[0].views} pct={METRIC_PCT["inicio"]} />
            <MBar label="Conversão" value={PACKS[0].conversion} pct={METRIC_PCT["inicio"]} />
          </div>
          <p className="text-xs text-gray-400 mb-5">{PACKS[0].ideal}</p>
          <Button
            variant="outline"
            onClick={() => startActivate(PACKS[0])}
            className="w-full border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600"
          >
            <Zap className="mr-2 h-4 w-4" /> Ativar
          </Button>
        </article>

        {/* Aceleração — orange border, 1 col */}
        <article
          className="relative flex flex-col rounded-2xl border-2 border-orange-400 bg-white p-5 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10"
          onMouseEnter={() => setHoveredPack(PACKS[1])}
          onMouseLeave={() => setHoveredPack(null)}
        >
          {PACKS[1].badge && (
            <span className="absolute -top-3 left-4 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
              {PACKS[1].badge}
            </span>
          )}
          <h3 className="font-bold text-gray-900 text-base mb-1">{PACKS[1].name}</h3>
          <div className="text-2xl font-black text-gray-900 mb-0.5">{brl(PACKS[1].price)}</div>
          <div className="text-xs text-gray-400 mb-4">pacote único</div>
          <div className="space-y-2 mb-4 flex-1">
            <MBar label="Alcance" value={PACKS[1].reach} pct={METRIC_PCT["aceleracao"]} />
            <MBar label="Views" value={PACKS[1].views} pct={METRIC_PCT["aceleracao"]} />
            <MBar label="Conversão" value={PACKS[1].conversion} pct={METRIC_PCT["aceleracao"]} />
          </div>
          <p className="text-xs text-gray-400 mb-5">{PACKS[1].ideal}</p>
          <Button
            onClick={() => startActivate(PACKS[1])}
            className="w-full bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/20"
          >
            <Zap className="mr-2 h-4 w-4" /> Ativar
          </Button>
        </article>

        {/* Escala — dominant, col-span-2 */}
        <article
          className="relative lg:col-span-2 flex flex-col rounded-2xl bg-[#FFF4EF] border-2 border-[#EE4D2D] p-6 md:p-8 shadow-[0_8px_30px_rgba(238,77,45,0.15)] transition-all duration-200 hover:shadow-[0_12px_40px_rgba(238,77,45,0.22)]"
          onMouseEnter={() => setHoveredPack(PACKS[2])}
          onMouseLeave={() => setHoveredPack(null)}
        >
          <div
            className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(238,77,45,0.10) 0%, transparent 70%)" }}
          />
          {PACKS[2].badge && (
            <span className="absolute -top-3 left-6 z-10 rounded-full bg-gradient-to-r from-[#EE4D2D] to-orange-400 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
              ★ {PACKS[2].badge}
            </span>
          )}
          <div className="relative z-10 flex flex-col h-full">
            <h3 className="font-black text-gray-900 text-2xl mb-1">{PACKS[2].name}</h3>
            {PACKS[2].originalPrice && (
              <div className="text-sm text-gray-400 mb-0.5">
                De <span className="line-through">{brl(PACKS[2].originalPrice)}</span>
              </div>
            )}
            <div className="flex items-baseline gap-2 mb-1">
              {PACKS[2].originalPrice && (
                <span className="text-sm font-semibold text-[#EE4D2D]">Por</span>
              )}
              <span className="text-5xl font-black text-[#EE4D2D] tracking-tight">{brl(PACKS[2].price)}</span>
            </div>
            <div className="text-xs text-gray-400 mb-5">pacote único</div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Alcance", value: PACKS[2].reach },
                { label: "Visualizações", value: PACKS[2].views },
                { label: "Interações", value: PACKS[2].interactions },
                { label: "Conversão", value: PACKS[2].conversion, accent: true },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className={`rounded-xl px-4 py-3 ${accent
                    ? "bg-[#EE4D2D]/10 border border-[#EE4D2D]/20"
                    : "bg-white border border-orange-100"
                  }`}
                >
                  <div className={`text-[10px] uppercase tracking-wider mb-1 ${accent ? "text-[#EE4D2D]/70" : "text-gray-400"}`}>{label}</div>
                  <div className={`text-sm font-bold ${accent ? "text-[#EE4D2D]" : "text-gray-900"}`}>{value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-5">
              <MBar label="Alcance" value="" pct={METRIC_PCT["escala"]} tinted />
              <MBar label="Visibilidade" value="" pct={METRIC_PCT["escala"]} tinted />
              <MBar label="Conversão" value="" pct={METRIC_PCT["escala"]} tinted />
            </div>

            <div className="rounded-xl bg-[#EE4D2D]/10 border border-[#EE4D2D]/20 px-4 py-3 mb-5">
              <div className="text-[10px] text-[#EE4D2D]/70 uppercase tracking-wider mb-1">Potencial de retorno</div>
              <div className="text-lg font-black text-[#EE4D2D]">{PACKS[2].roiAmount} em comissões</div>
            </div>

            <p className="text-gray-600 text-sm mb-6 flex-1">{PACKS[2].ideal}</p>

            <Button
              onClick={() => startActivate(PACKS[2])}
              className="iv-btn-glow w-full bg-[#EE4D2D] text-white hover:bg-[#d93e22] text-base py-6 font-bold"
            >
              <Flame className="mr-2 h-5 w-5" /> Ativar Pack Escala
            </Button>
          </div>
        </article>

        {/* Máximo — dark premium, gold border */}
        <article
          className="relative flex flex-col rounded-2xl overflow-hidden p-[2px] transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #92400E 0%, #F59E0B 50%, #92400E 100%)",
            boxShadow: "0 0 32px rgba(245,158,11,0.15)",
          }}
          onMouseEnter={() => setHoveredPack(PACKS[3])}
          onMouseLeave={() => setHoveredPack(null)}
        >
          {PACKS[3].badge && (
            <span
              className="absolute -top-3 left-4 z-10 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow"
              style={{ background: "linear-gradient(135deg, #D97706, #F59E0B)" }}
            >
              {PACKS[3].badge}
            </span>
          )}
          {/* shimmer sweep */}
          <div className="absolute inset-y-0 w-1/3 pointer-events-none iv-maximo-shine z-20"
            style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)" }} />
          <div className="relative flex flex-col bg-white rounded-[14px] p-5 h-full z-10">
            <h3 className="font-bold text-gray-900 text-base mb-1">{PACKS[3].name}</h3>
            <div className="text-2xl font-black text-gray-900 mb-0.5">{brl(PACKS[3].price)}</div>
            <div className="text-xs text-gray-400 mb-4">pacote único</div>
            <div className="space-y-2 mb-4 flex-1">
              <MBar label="Alcance" value={PACKS[3].reach} pct={METRIC_PCT["maximo"]} />
              <MBar label="Views" value={PACKS[3].views} pct={METRIC_PCT["maximo"]} />
              <MBar label="Conversão" value={PACKS[3].conversion} pct={METRIC_PCT["maximo"]} />
            </div>
            <p className="text-xs text-gray-400 mb-5">{PACKS[3].ideal}</p>
            <Button
              onClick={() => startActivate(PACKS[3])}
              className="w-full text-white font-bold hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #B45309, #F59E0B)" }}
            >
              <Zap className="mr-2 h-4 w-4" /> Ativar
            </Button>
          </div>
        </article>
      </div>

      {/* ── RETORNO STRIP (on hover) ──────────────────────────────────────── */}
      <div className={`transition-all duration-300 mb-8 ${hoveredPack ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FFF8F5] border border-[#EE4D2D]/20 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#EE4D2D] mb-0.5">
              Retorno estimado — {hoveredPack?.name}
            </div>
            <p className="text-gray-900 font-semibold text-sm">{hoveredPack?.roi}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Os resultados podem variar conforme produto, preço e demanda.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Retorno mínimo acompanhado</div>
            <div className="text-2xl font-black text-gray-900">{hoveredPack?.guaranteeMin}</div>
          </div>
        </div>
      </div>

      {/* ── RESULTS GALLERY ──────────────────────────────────────────────── */}
      <ResultadosReaisSection />

      {/* ── ROI CALCULATOR ───────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="mb-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EE4D2D]">
            CALCULADORA DE RETORNO
          </span>
          <h3 className="text-xl font-black text-gray-900 mt-1">Quanto posso ganhar?</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => setRoiPack(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                roiPack.id === p.id
                  ? "bg-[#EE4D2D] text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-orange-50 hover:text-gray-900"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 px-5 py-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Você investe</div>
            <div className="text-3xl font-black text-gray-900">{brl(roiPack.price)}</div>
          </div>
          <div className="rounded-xl bg-[#EE4D2D]/10 border border-[#EE4D2D]/20 px-5 py-4">
            <div className="text-xs text-[#EE4D2D]/70 uppercase tracking-wider mb-1">Potencial de retorno</div>
            <div className="text-3xl font-black text-[#EE4D2D]">{roiPack.roiAmount}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-5 py-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Alcance estimado</div>
            <div className="text-xl font-black text-gray-900 leading-tight">{roiPack.reach}</div>
          </div>
        </div>
        <p className="text-gray-400 text-[11px] mt-4">
          Os resultados podem variar conforme produto, preço, oferta e demanda.
        </p>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="mb-8 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EE4D2D]">COMO FUNCIONA</span>
          <h3 className="text-2xl font-black text-gray-900 mt-2">3 passos para impulsionar</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
          {[
            {
              n: "01",
              icon: <Layers className="h-6 w-6 text-[#EE4D2D]" />,
              label: "Escolha o pack ideal",
              sub: "Selecione o nível de exposição para sua operação",
            },
            {
              n: "02",
              icon: <Zap className="h-6 w-6 text-[#EE4D2D]" />,
              label: "Ative o impulsionamento",
              sub: "Conclua o pagamento e a ativação é imediata",
            },
            {
              n: "03",
              icon: <BarChart3 className="h-6 w-6 text-[#EE4D2D]" />,
              label: "Acompanhe os resultados",
              sub: "Veja vendas, comissões e retorno no painel em tempo real",
            },
          ].map((step, i) => (
            <div key={step.n} className="relative flex flex-col items-center text-center">
              {i < 2 && (
                <div className="absolute hidden md:block top-8 left-[calc(50%+44px)] w-[calc(100%-88px)] border-t-2 border-dashed border-[#EE4D2D]/15" />
              )}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EE4D2D]/10 border border-[#EE4D2D]/20 mb-4">
                {step.icon}
              </div>
              <div className="text-[10px] font-bold text-[#EE4D2D]/60 mb-1">{step.n}</div>
              <p className="font-bold text-gray-900 text-sm">{step.label}</p>
              <p className="text-gray-400 text-xs mt-1 max-w-[160px]">{step.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EE4D2D]">DÚVIDAS</span>
          <h3 className="text-xl font-black text-gray-900 mt-1">Perguntas frequentes</h3>
        </div>
        <div className="space-y-2">
          {[
            {
              q: "O impulsionamento garante vendas?",
              a: "O impulsionamento possui garantia condicional. Caso o pacote não gere retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, você pode solicitar a devolução, conforme as regras da garantia.",
            },
            {
              q: "Qual o melhor pack para começar?",
              a: "O Pack Aceleração (R$ 64,90) oferece o melhor equilíbrio entre investimento, alcance e potencial de retorno para quem está começando.",
            },
            {
              q: "Como funciona a ativação?",
              a: "Após o pagamento, a equipe ShopSync ativa o impulsionamento e você acompanha tudo pelo painel em tempo real — alcance, visualizações, interações e comissões geradas.",
            },
            {
              q: "Posso contratar mais de um pack?",
              a: "Sim. Você pode escalar progressivamente, contratando packs maiores conforme valida os resultados.",
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-900 font-semibold text-sm">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-[#EE4D2D] shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-gray-500 text-sm leading-relaxed border-t border-gray-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <ActivationDialog {...dialogProps} />
    </DashboardShell>
  );
}

// ─── MetricBar ────────────────────────────────────────────────────────────────
function MBar({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
  tinted?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-gray-400">{label}</span>
        {value && (
          <span className="font-semibold text-gray-700">{value}</span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-orange-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Results gallery ──────────────────────────────────────────────────────────
const RESULTADO_IMAGES = [
  "/resultados/photo_4994789065806777341_w.jpg",
  "/resultados/photo_4994789065806777342_w.jpg",
  "/resultados/photo_4994789065806777343_w.jpg",
  "/resultados/photo_4994789065806777344_w.jpg",
  "/resultados/photo_4994789065806777345_w.jpg",
  "/resultados/photo_4994789065806777346_w.jpg",
  "/resultados/photo_4994789065806777347_w.jpg",
];

function ResultadosReaisSection() {
  return (
    <section className="mb-8 rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8">
      <div className="mb-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EE4D2D]">PROVA SOCIAL</span>
        <h3 className="mt-2 text-xl font-black text-gray-900">Resultados reais de quem impulsionou</h3>
        <p className="mt-1 text-sm text-gray-500">Prints reais enviados pelos nossos vendedores</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory iv-scrollbar-hide">
        {RESULTADO_IMAGES.map((src, i) => (
          <div
            key={i}
            className="snap-start flex-shrink-0 w-[170px] sm:w-[200px] aspect-[9/16] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-orange-200 hover:border-orange-300 transition-all"
          >
            <img
              src={src}
              alt={`Resultado ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-sm font-bold text-[#EE4D2D]">
        🔥 Quer ser o próximo? Escolha seu pack acima.
      </p>
    </section>
  );
}

// ─── Activation dialog ────────────────────────────────────────────────────────
function ActivationDialog({ selectedPack, stage, setSelectedPack, setStage, goToPayment }: DialogProps) {
  return (
    <Dialog
      open={!!selectedPack}
      onOpenChange={(o) => {
        if (!o) { setSelectedPack(null); setStage("guarantee"); }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {selectedPack && stage === "guarantee" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/40">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl">Garantia condicional do impulsionamento</DialogTitle>
              <DialogDescription className="text-center">
                Você tem total segurança para ativar seu impulsionamento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-green-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <ShieldCheck className="h-4 w-4" /> Garantia condicional
                </div>
                <p className="text-sm text-emerald-900/90">
                  Caso o impulsionamento não gere retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, você poderá solicitar a devolução do valor investido, conforme as regras da garantia condicional.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Exemplo prático</div>
                <p className="mt-1 text-sm text-amber-900">
                  Investindo <strong>{brl(selectedPack.price)}</strong>, o retorno mínimo acompanhado será de <strong>{selectedPack.guaranteeMin}</strong> em comissões.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                A garantia é condicional e segue as regras de acompanhamento do impulsionamento.
              </p>
              <Button
                onClick={() => setStage("how")}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Li e entendi
              </Button>
            </div>
          </>
        )}

        {selectedPack && stage === "how" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/40">
                <Rocket className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl">Como funciona o impulsionamento?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A equipe da ShopSync organiza a divulgação dos produtos que você escolheu, aumentando a visibilidade, o alcance e as chances de venda dentro da sua operação.
              </p>
              <ol className="space-y-2">
                {[
                  { icon: <Flame className="h-4 w-4" />, t: "Você escolhe o pack" },
                  { icon: <Rocket className="h-4 w-4" />, t: "A ShopSync impulsiona seus produtos" },
                  { icon: <BarChart3 className="h-4 w-4" />, t: "Você acompanha os resultados pelo painel" },
                ].map((s, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      {s.icon}
                    </div>
                    <div className="text-sm font-medium">
                      <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                      {s.t}
                    </div>
                  </li>
                ))}
              </ol>
              <Button
                onClick={() => setStage("confirm")}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Entendi
              </Button>
            </div>
          </>
        )}

        {selectedPack && stage === "confirm" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/40">
                <Flame className="h-6 w-6" />
              </div>
              <DialogTitle className="text-center text-xl">Confirmar impulsionamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pacote</div>
                <div className="mt-1 text-lg font-bold">{selectedPack.name}</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Valor do investimento</span>
                    <span className="font-semibold">
                      {selectedPack.originalPrice && (
                        <span className="mr-2 text-xs text-muted-foreground line-through">
                          {brl(selectedPack.originalPrice)}
                        </span>
                      )}
                      {brl(selectedPack.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ganhos estimados</span>
                    <span className="font-semibold text-emerald-700">{selectedPack.roiAmount}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-3 text-xs text-emerald-900">
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Garantia condicional
                </div>
                Se não houver retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, você poderá solicitar a devolução do valor investido, conforme as regras da garantia.
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Checkout seguro via IronPay
              </div>
              <Button
                onClick={goToPayment}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              >
                <Zap className="mr-2 h-4 w-4" /> Ir para pagamento
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Legacy view (non-admin fallback — unchanged from previous build) ──────────
type LegacyPageProps = {
  boost: BoostInfo | null;
  selectedPack: Pack | null;
  setSelectedPack: React.Dispatch<React.SetStateAction<Pack | null>>;
  stage: "guarantee" | "how" | "confirm";
  setStage: React.Dispatch<React.SetStateAction<"guarantee" | "how" | "confirm">>;
  startActivate: (p: Pack) => void;
  goToPayment: () => void;
};

function LegacyView({
  boost, selectedPack, setSelectedPack, stage, setStage, startActivate, goToPayment,
}: LegacyPageProps) {
  const [hoveredPack, setHoveredPack] = useState<Pack | null>(null);

  return (
    <DashboardShell
      title="Impulsionar vendas 🔥"
      subtitle="Escolha um pacote para aumentar a visibilidade dos seus produtos, alcançar mais pessoas e melhorar sua conversão dentro da operação ShopeSync."
    >
      <style>{`
        @keyframes legacy-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.45), 0 10px 30px -5px rgba(249,115,22,0.30); }
          50%       { box-shadow: 0 0 0 7px rgba(249,115,22,0), 0 10px 30px -5px rgba(249,115,22,0.40); }
        }
        .legacy-escala-glow { animation: legacy-glow 2s ease-in-out infinite; }
        @keyframes legacy-maximo-shimmer {
          0%, 60%  { transform: translateX(-140%) skewX(-15deg); opacity: 0; }
          68%      { opacity: 1; }
          85%      { transform: translateX(280%) skewX(-15deg); opacity: 0; }
          100%     { transform: translateX(280%) skewX(-15deg); opacity: 0; }
        }
        .legacy-maximo-shine { animation: legacy-maximo-shimmer 3s ease-in-out infinite; }
      `}</style>

      <BoostPerformanceSection boost={boost} />

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-6 shadow-sm">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/35">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Mais visibilidade para os seus produtos</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-gray-500">
              Os pacotes abaixo foram pensados para dar mais alcance aos seus produtos, gerar mais visualizações e aumentar a chance de vendas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PACKS.map((pack) => (
          <LegacyPackCard
            key={pack.id}
            pack={pack}
            onActivate={() => startActivate(pack)}
            onHover={() => setHoveredPack(pack)}
            onLeave={() => setHoveredPack(null)}
          />
        ))}
      </div>

      <div className={`mt-4 mb-8 transition-all duration-300 ${hoveredPack ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"}`}>
        <div className="flex items-start gap-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-md shadow-orange-500/25">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Retorno estimado — {hoveredPack?.name}</div>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">{hoveredPack?.roi ?? "—"}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Os resultados podem variar conforme produto, preço, oferta, demanda e execução.</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Garantia mínima</div>
            <div className="mt-0.5 text-base font-black text-gray-900">{hoveredPack?.guaranteeMin ?? "—"}</div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm mb-6">
        <div className="mb-8 text-center">
          <h3 className="text-xl font-bold text-gray-900">Como funciona o impulsionamento?</h3>
          <p className="mt-2 text-sm text-gray-400">A ShopeSync organiza uma estratégia de visibilidade para seus produtos de forma automática.</p>
        </div>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
          <LegacyStep icon={<Layers className="h-7 w-7 text-orange-500" />} label="Escolha o pack" sub="Selecione o nível de visibilidade ideal para sua operação" />
          <div className="hidden sm:flex flex-1 items-center pt-7"><div className="w-full border-t-2 border-dashed border-orange-200 animate-pulse" /></div>
          <LegacyStep icon={<Zap className="h-7 w-7 text-orange-500" />} label="Ative o impulsionamento" sub="Conclua o pagamento e a ativação é imediata" />
          <div className="hidden sm:flex flex-1 items-center pt-7"><div className="w-full border-t-2 border-dashed border-orange-200 animate-pulse" /></div>
          <LegacyStep icon={<BarChart3 className="h-7 w-7 text-orange-500" />} label="Acompanhe os resultados" sub="Veja vendas, comissões e retorno no painel em tempo real" />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900">Perguntas frequentes</h3>
        <div className="mt-5 space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-800">Esse impulsionamento garante vendas?</div>
            <p className="mt-1 text-sm text-gray-500">Sim, o impulsionamento possui garantia condicional. Caso o pacote contratado não gere nenhuma venda dentro do período de acompanhamento definido, você poderá solicitar a devolução do valor investido nesse pack, conforme as regras da garantia.</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Garantia condicional
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <div className="text-sm font-semibold text-gray-800">Qual o melhor pack para começar?</div>
            <p className="mt-1 text-sm text-gray-500">O melhor pack para começar é o Pack Aceleração de R$ 64,90. Ele oferece um bom equilíbrio entre investimento, alcance e potencial de vendas, sendo uma das melhores opções para quem quer começar a impulsionar com mais força.</p>
          </div>
        </div>
      </section>

      <ActivationDialog
        selectedPack={selectedPack}
        stage={stage}
        setSelectedPack={setSelectedPack}
        setStage={setStage}
        goToPayment={goToPayment}
      />
    </DashboardShell>
  );
}

function LegacyPackCard({
  pack, onActivate, onHover, onLeave,
}: {
  pack: Pack; onActivate: () => void; onHover: () => void; onLeave: () => void;
}) {
  const pct = METRIC_PCT[pack.id] ?? 50;
  const isInicio = pack.id === "inicio";
  const isAceleracao = pack.id === "aceleracao";
  const isEscala = pack.id === "escala";
  const isMaximo = pack.id === "maximo";

  if (isMaximo) {
    return (
      <article
        className="relative min-w-0 rounded-2xl cursor-default transition-all duration-300 overflow-visible"
        style={{ background: "linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)", padding: "2px", boxShadow: "0 0 40px rgba(234,88,12,0.25)" }}
        onMouseEnter={onHover} onMouseLeave={onLeave}
      >
        {pack.badge && (
          <span className="absolute -top-3 left-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
            {pack.badge}
          </span>
        )}
        <div className="relative flex flex-col bg-white rounded-[14px] p-5 overflow-hidden h-full">
          <div className="legacy-maximo-shine pointer-events-none absolute inset-y-0 w-2/5"
            style={{ background: "linear-gradient(90deg, transparent, rgba(234,88,12,0.07), transparent)" }} />
          <h3 className="font-bold mb-1 text-base text-gray-900">{pack.name}</h3>
          <div className="text-3xl font-black text-gray-900 mb-0.5">{brl(pack.price)}</div>
          <div className="text-xs mb-4 text-gray-500">pacote único</div>
          <p className="text-sm mb-5 text-gray-500 flex-1">{pack.ideal}</p>
          <div className="space-y-3 mb-5">
            <MBar label="Alcance" value={pack.reach} pct={pct} />
            <MBar label="Visualizações" value={pack.views} pct={pct} />
            <MBar label="Conversão" value={pack.conversion} pct={pct} />
          </div>
          <Button onClick={onActivate} className="w-full text-white hover:opacity-90" style={{ backgroundColor: "#EA580C" }}>
            <Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento
          </Button>
        </div>
      </article>
    );
  }

  const cardCls = [
    "relative flex flex-col rounded-2xl border transition-all duration-300 cursor-default min-w-0",
    isInicio    && "border-gray-200 bg-white p-5 hover:border-gray-300",
    isAceleracao && "border-orange-200 bg-white p-5 hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/10",
    isEscala    && "border-orange-500/70 bg-white p-6 ring-2 ring-orange-500/20 shadow-xl shadow-orange-500/15 hover:shadow-2xl hover:shadow-orange-500/20 lg:-mt-2",
  ].filter(Boolean).join(" ");

  return (
    <article className={cardCls} onMouseEnter={onHover} onMouseLeave={onLeave}>
      {pack.badge && (
        <span className={`absolute -top-3 left-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow ${isEscala ? "bg-orange-500" : "bg-[#EA580C]"}`}>
          {pack.badge}
        </span>
      )}
      <h3 className={`font-bold mb-1 ${isEscala ? "text-xl" : "text-base"} text-gray-900`}>{pack.name}</h3>
      {pack.originalPrice && (
        <div className="text-xs mb-0.5 text-gray-500">De <span className="line-through">{brl(pack.originalPrice)}</span></div>
      )}
      <div className="mb-1 flex items-baseline gap-1.5">
        {pack.originalPrice && <span className={`text-xs font-semibold ${isEscala ? "text-orange-500" : "text-gray-500"}`}>Por</span>}
        <span className={`font-black tabular-nums ${isEscala ? "text-4xl" : "text-2xl"} text-gray-900`}>{brl(pack.price)}</span>
      </div>
      <div className="text-xs mb-4 text-gray-500">pacote único</div>
      <p className="text-sm mb-5 text-gray-500 flex-1">{pack.ideal}</p>
      <div className="space-y-3 mb-5">
        <MBar label="Alcance" value={pack.reach} pct={pct} />
        <MBar label="Visualizações" value={pack.views} pct={pct} />
        <MBar label="Conversão" value={pack.conversion} pct={pct} />
      </div>
      {isInicio    && <Button variant="outline" onClick={onActivate} className="w-full border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600"><Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento</Button>}
      {isAceleracao && <Button onClick={onActivate} className="w-full bg-orange-500 text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"><Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento</Button>}
      {isEscala    && <Button onClick={onActivate} className="legacy-escala-glow w-full bg-orange-500 text-white hover:bg-orange-600"><Flame className="mr-2 h-4 w-4" /> Ativar impulsionamento</Button>}
    </article>
  );
}

function LegacyStep({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex w-40 flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-orange-100 bg-orange-50 shadow-sm">{icon}</div>
      <p className="mt-3 text-sm font-bold text-gray-800">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ─── Boost performance (shared) ───────────────────────────────────────────────
function BoostPerformanceSection({ boost }: { boost: BoostInfo | null }) {
  if (!boost) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Nenhum impulsionamento ativo no momento.
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, boost.progressPct));
  const guarantee =
    boost.returnMultiplier >= 2
      ? { text: "Meta mínima de retorno atingida.", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" }
      : boost.completed
        ? { text: "Elegível para análise da garantia condicional.", tone: "text-amber-800 bg-amber-50 border-amber-200" }
        : { text: "O impulsionamento ainda está em acompanhamento.", tone: "text-violet-700 bg-violet-50 border-violet-200" };
  const retornoLabel =
    boost.eventsReleased === 0
      ? "aguardando primeiras vendas"
      : `${boost.returnMultiplier.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}x o valor investido`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Desempenho do impulsionamento</h3>
          <p className="text-xs text-muted-foreground">
            {boost.completed ? "Último impulsionamento concluído" : "Impulsionamento em andamento"} • Pack ativo:{" "}
            <strong>{boost.packName}</strong>
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BStat icon={<Wallet className="h-3.5 w-3.5" />} label="Investimento" value={brl(boost.packValue)} />
        <BStat icon={<Sparkles className="h-3.5 w-3.5" />} label="Vendas geradas" value={String(boost.eventsReleased)} />
        <BStat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Comissões geradas" value={brl(boost.commissionTotal)} accent />
        <BStat icon={<BarChart3 className="h-3.5 w-3.5" />} label="Retorno atual" value={retornoLabel} />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do impulsionamento</span>
          <span className="font-medium text-foreground">
            {boost.completed ? "Impulsionamento concluído" : `${pct}% concluído`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          Acompanhamento: {fmtDate(boost.startsAt)} → {fmtDate(boost.endsAt)}
        </div>
      </div>
      <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${guarantee.tone}`}>
        <div className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" /> Acompanhamento da garantia
        </div>
        <div className="mt-0.5">{guarantee.text}</div>
      </div>
    </div>
  );
}

function BStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`mt-1 truncate text-base font-bold ${accent ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}
