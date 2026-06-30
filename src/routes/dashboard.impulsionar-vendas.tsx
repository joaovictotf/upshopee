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
  TrendingUp, Zap, ShieldCheck, BarChart3,
  CheckCircle2, Lock, Activity, Wallet, CalendarDays, Layers,
  ChevronDown, Copy, Check,
} from "lucide-react";

const EVOPAY_CREATE_PIX_URL =
  "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/evopay-create-pix";

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

    badge: "Maior alcance",
  },
];

const METRIC_PCT: Record<string, number> = {
  inicio: 20,
  aceleracao: 45,
  escala: 75,
  maximo: 100,
};

type QrState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; qrCodeText: string; qrCodeUrl: string; qrCodeBase64: string; transactionId: string; clientReference: string }
  | { status: "error"; message: string };

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
  const { user, myActiveBoost, isAdmin, currentUserId } = useApp();
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [stage, setStage] = useState<"guarantee" | "how" | "confirm">("guarantee");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [paymentPack, setPaymentPack] = useState<Pack | null>(null);
  const [qrState, setQrState] = useState<QrState>({ status: "idle" });

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const startActivate = (pack: Pack) => { setSelectedPack(pack); setStage("guarantee"); };
  const goToPayment = async () => {
    if (!selectedPack || !user || !currentUserId) return;
    setPaymentPack(selectedPack);
    setStage("guarantee"); // reset dialog for next time
    setSelectedPack(null); // close ActivationDialog
    setQrState({ status: "loading" });

    try {
      const res = await fetch(EVOPAY_CREATE_PIX_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPack.price,
          packName: selectedPack.id,
          userId: currentUserId,
          userEmail: user.email ?? "",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erro ao gerar PIX");
      setQrState({
        status: "success",
        qrCodeText: data.qrCodeText,
        qrCodeUrl: data.qrCodeUrl,
        qrCodeBase64: data.qrCodeBase64,
        transactionId: data.transactionId,
        clientReference: data.clientReference,
      });
    } catch (err) {
      setQrState({
        status: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao gerar PIX",
      });
    }
  };
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
        {qrState.status !== "idle" && (
          <PixQrModal
            qrState={qrState}
            pack={paymentPack}
            onClose={() => { setQrState({ status: "idle" }); setPaymentPack(null); }}
            onRetry={() => {
              setQrState({ status: "idle" });
              if (paymentPack) { setSelectedPack(paymentPack); setStage("confirm"); }
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <NewView boost={boost} startActivate={startActivate} dialogProps={dialogProps} />
      {qrState.status !== "idle" && (
        <PixQrModal
          qrState={qrState}
          pack={paymentPack}
          onClose={() => { setQrState({ status: "idle" }); setPaymentPack(null); }}
          onRetry={() => {
            setQrState({ status: "idle" });
            if (paymentPack) { setSelectedPack(paymentPack); setStage("confirm"); }
          }}
        />
      )}
    </>
  );
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
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-lg w-full p-6 md:p-8">
        <div className="flex justify-center mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
            <ShieldCheck className="h-6 w-6 text-gray-700" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-5">
          Termos de Campanha
        </h2>

        <div className="space-y-3 mb-5">
          {[
            "Você paga o valor do pack escolhido",
            "O robô divulga seus produtos automaticamente",
            "Garantia: se não gerar vendas equivalentes, devolvemos 100%",
          ].map((text) => (
            <div key={text} className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#EE4D2D] mt-0.5 shrink-0" />
              <span className="text-sm text-gray-700">{text}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          A garantia é condicional e válida quando a campanha não gerar retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, dentro do período de acompanhamento. A devolução segue as regras do programa e pode ser solicitada conforme os critérios estabelecidos.
        </p>

        <div className="mb-5">
          <p className="mb-2 text-xs text-gray-500">
            {done ? "Leitura concluída" : `Leia com atenção — ${secondsLeft}s restantes`}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-none ${done ? "bg-emerald-500" : "bg-[#EE4D2D]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <label className={`mb-5 flex items-center gap-3 ${done ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
          <input
            type="checkbox"
            disabled={!done}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 accent-[#EE4D2D]"
          />
          <span className="text-sm text-gray-700">Li e concordo com os termos</span>
        </label>

        <button
          onClick={enabled ? onAccept : undefined}
          disabled={!enabled}
          className={`w-full rounded-lg py-3 text-sm font-semibold transition-all ${
            enabled
              ? "cursor-pointer bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
              : "cursor-not-allowed bg-gray-200 text-gray-400"
          }`}
        >
          CONTINUAR
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
  const [roiPack, setRoiPack] = useState<Pack>(PACKS[2]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <DashboardShell
      title="Subir Anúncios"
      subtitle="Escolha um plano de visibilidade para seus produtos"
    >
      <BoostPerformanceSection boost={boost} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Subir Anúncios
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-xl">
          Aumente o alcance dos seus produtos e conquiste mais compradores
        </p>
      </section>

      {/* ── PACK GRID (uniform 4-col) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {PACKS.map((pack) => {
          const isEscala = pack.id === "escala";
          const isMaximo = pack.id === "maximo";
          const isAceleracao = pack.id === "aceleracao";
          const isHighlighted = isEscala || isAceleracao;

          return (
            <article
              key={pack.id}
              className={`relative flex flex-col rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-sm ${
                isEscala
                  ? "border-t-2 border-t-[#EE4D2D] border-x-gray-200 border-b-gray-200"
                  : isMaximo
                  ? "border-gray-200"
                  : "border-gray-200"
              }`}
            >
              {/* Badge */}
              {pack.badge && (
                <div className="mb-3">
                  <span className={`text-[11px] font-medium ${
                    isEscala ? "text-[#EE4D2D]" : isMaximo ? "text-amber-600" : "text-gray-500"
                  }`}>
                    {pack.badge}
                  </span>
                </div>
              )}

              <h3 className="font-semibold text-gray-900 text-sm mb-1">{pack.name}</h3>

              {pack.originalPrice && (
                <div className="text-sm text-gray-400 line-through mb-0.5">
                  {brl(pack.originalPrice)}
                </div>
              )}

              <div className="text-2xl font-bold text-gray-900 mb-4">
                {brl(pack.price)}
              </div>

              {/* Metrics as simple text rows */}
              <div className="space-y-2 mb-5 flex-1">
                <MetricRow label="Alcance" value={pack.reach} />
                <MetricRow label="Views" value={pack.views} />
                <MetricRow label="Interações" value={pack.interactions} />
                <MetricRow label="Conversão" value={pack.conversion} />
                <MetricRow label="Retorno" value={pack.roiAmount} />
              </div>

              <p className="text-xs text-gray-400 mb-5 leading-relaxed">{pack.ideal}</p>

              <Button
                onClick={() => startActivate(pack)}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold ${
                  isHighlighted
                    ? "bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
                    : "border border-gray-200 text-gray-700 bg-white hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
                }`}
              >
                <Zap className="mr-2 h-4 w-4" /> Ativar
              </Button>
            </article>
          );
        })}
      </div>

      {/* ── RESULTS GALLERY ──────────────────────────────────────────────── */}
      <ResultadosReaisSection />

      {/* ── ROI CALCULATOR ───────────────────────────────────────────────── */}
      <section className="mb-10 rounded-xl bg-white border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Simule seu retorno</h3>
        <p className="text-sm text-gray-500 mb-5">Selecione um pack para ver o potencial de ganhos</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => setRoiPack(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                roiPack.id === p.id
                  ? "bg-[#EE4D2D] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 px-5 py-4">
            <div className="text-xs text-gray-500 mb-1">Você investe</div>
            <div className="text-2xl font-bold text-gray-900">{brl(roiPack.price)}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-5 py-4">
            <div className="text-xs text-gray-500 mb-1">Potencial de retorno</div>
            <div className="text-2xl font-bold text-[#EE4D2D]">{roiPack.roiAmount}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-5 py-4">
            <div className="text-xs text-gray-500 mb-1">Alcance estimado</div>
            <div className="text-lg font-bold text-gray-900 leading-tight">{roiPack.reach}</div>
          </div>
        </div>
        <p className="text-gray-400 text-xs mt-4">
          Os resultados podem variar conforme produto, preço, oferta e demanda.
        </p>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="mb-10 rounded-xl bg-white border border-gray-200 p-6 md:p-8">
        <div className="mb-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900">Como funciona</h3>
          <p className="mt-2 text-sm text-gray-500">3 passos para anunciar</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              n: "1",
              icon: <Layers className="h-5 w-5 text-[#EE4D2D]" />,
              label: "Escolha o pack ideal",
              sub: "Selecione o nível de exposição para sua operação",
            },
            {
              n: "2",
              icon: <Zap className="h-5 w-5 text-[#EE4D2D]" />,
              label: "Ative o anúncio",
              sub: "Conclua o pagamento e a ativação é imediata",
            },
            {
              n: "3",
              icon: <BarChart3 className="h-5 w-5 text-[#EE4D2D]" />,
              label: "Acompanhe os resultados",
              sub: "Veja vendas, comissões e retorno no painel em tempo real",
            },
          ].map((step) => (
            <div key={step.n} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 mb-4">
                {step.icon}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{step.label}</p>
              <p className="text-gray-500 text-xs mt-1 max-w-[180px]">{step.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="mb-10 rounded-xl bg-white border border-gray-200 p-6 md:p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Perguntas frequentes</h3>
        <div className="space-y-2">
          {[
            {
              q: "O anúncio garante vendas?",
              a: "A campanha possui garantia condicional. Caso o pacote não gere retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, você pode solicitar a devolução, conforme as regras da garantia.",
            },
            {
              q: "Qual o melhor pack para começar?",
              a: "O Pack Aceleração (R$ 64,90) oferece o melhor equilíbrio entre investimento, alcance e potencial de retorno para quem está começando.",
            },
            {
              q: "Como funciona a ativação?",
              a: "Após o pagamento, a equipe UpShopee ativa a campanha e você acompanha tudo pelo painel em tempo real — alcance, visualizações, interações e comissões geradas.",
            },
            {
              q: "Posso contratar mais de um pack?",
              a: "Sim. Você pode escalar progressivamente, contratando packs maiores conforme valida os resultados.",
            },
          ].map((faq, i) => (
            <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900 font-medium text-sm">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
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

// ─── MetricRow (simple text, no bars) ─────────────────────────────────────────
function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

// ─── MetricBar (for LegacyView) ───────────────────────────────────────────────
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
          className="h-full rounded-full bg-[#EE4D2D]"
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
    <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6 md:p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Resultados</h3>
      <p className="text-sm text-gray-500 mb-5">Resultados reais de quem anunciou</p>
      <div
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingRight: "60px" }}
      >
        {RESULTADO_IMAGES.map((src, i) => (
          <div
            key={i}
            className="snap-start flex-shrink-0 w-[160px] sm:w-[200px] aspect-[9/16] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all"
          >
            <img
              src={src}
              alt={`Resultado ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 md:hidden">deslize para ver mais</p>
      <p className="mt-5 text-center text-sm font-medium text-[#EE4D2D]">
        Quer ser o próximo? Escolha seu pack acima.
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
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-gray-100">
                <ShieldCheck className="h-6 w-6 text-gray-700" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold">Garantia condicional</DialogTitle>
              <DialogDescription className="text-center">
                Você tem total segurança para ativar sua campanha.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <ShieldCheck className="h-4 w-4" /> Garantia condicional
                </div>
                <p className="text-sm text-gray-600">
                  Caso a campanha não gere retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, você poderá solicitar a devolução do valor investido, conforme as regras da garantia condicional.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-600">Exemplo prático</div>
                <p className="mt-1 text-sm text-gray-700">
                  Investindo <strong>{brl(selectedPack.price)}</strong>, o retorno mínimo acompanhado será de <strong>{selectedPack.guaranteeMin}</strong> em comissões.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                A garantia é condicional e segue as regras de acompanhamento da campanha.
              </p>
              <Button
                onClick={() => setStage("how")}
                className="w-full bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Li e entendi
              </Button>
            </div>
          </>
        )}

        {selectedPack && stage === "how" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-gray-100">
                <TrendingUp className="h-6 w-6 text-gray-700" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold">Como funciona?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                A equipe da UpShopee organiza a divulgação dos produtos que você escolheu, aumentando a visibilidade, o alcance e as chances de venda dentro da sua operação.
              </p>
              <ol className="space-y-2">
                {[
                  { icon: <Layers className="h-4 w-4" />, t: "Você escolhe o pack" },
                  { icon: <BarChart3 className="h-4 w-4" />, t: "A UpShopee anuncia seus produtos" },
                  { icon: <TrendingUp className="h-4 w-4" />, t: "Você acompanha os resultados pelo painel" },
                ].map((s, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-gray-700">
                      {s.icon}
                    </div>
                    <div className="text-sm font-medium text-gray-800">
                      <span className="mr-2 text-xs text-gray-400">{i + 1}.</span>
                      {s.t}
                    </div>
                  </li>
                ))}
              </ol>
              <Button
                onClick={() => setStage("confirm")}
                className="w-full bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Entendi
              </Button>
            </div>
          </>
        )}

        {selectedPack && stage === "confirm" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-gray-100">
                <Zap className="h-6 w-6 text-[#EE4D2D]" />
              </div>
              <DialogTitle className="text-center text-lg font-semibold">Confirmar anúncio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-500">Pacote</div>
                <div className="mt-1 text-lg font-bold text-gray-900">{selectedPack.name}</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Valor do investimento</span>
                    <span className="font-semibold text-gray-900">
                      {selectedPack.originalPrice && (
                        <span className="mr-2 text-xs text-gray-400 line-through">
                          {brl(selectedPack.originalPrice)}
                        </span>
                      )}
                      {brl(selectedPack.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Ganhos estimados</span>
                    <span className="font-semibold text-emerald-700">{selectedPack.roiAmount}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-gray-800">
                  <ShieldCheck className="h-3.5 w-3.5" /> Garantia condicional
                </div>
                Se não houver retorno mínimo equivalente ao dobro do valor investido em comissões registradas no painel, você poderá solicitar a devolução do valor investido, conforme as regras da garantia.
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Lock className="h-3 w-3" /> Pagamento seguro via PIX
              </div>
              <Button
                onClick={goToPayment}
                className="w-full bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
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

// ─── Legacy view (non-admin fallback) ─────────────────────────────────────────
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
  return (
    <DashboardShell
      title="Subir Anúncios"
      subtitle="Escolha um pacote para aumentar a visibilidade dos seus produtos, alcançar mais pessoas e melhorar sua conversão dentro da operação UpShopee."
    >
      <BoostPerformanceSection boost={boost} />

      {/* ── INFO BANNER ──────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EE4D2D]/10">
            <TrendingUp className="h-5 w-5 text-[#EE4D2D]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mais visibilidade para os seus produtos</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Os pacotes abaixo foram pensados para dar mais alcance aos seus produtos, gerar mais visualizações e aumentar a chance de vendas.
            </p>
          </div>
        </div>
      </div>

      {/* ── PACK GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {PACKS.map((pack) => (
          <LegacyPackCard
            key={pack.id}
            pack={pack}
            onActivate={() => startActivate(pack)}
          />
        ))}
      </div>

      {/* ── RESULTS GALLERY ──────────────────────────────────────────────── */}
      <ResultadosReaisSection />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 mb-6">
        <div className="mb-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Como funciona?</h3>
          <p className="mt-2 text-sm text-gray-500">A UpShopee organiza uma estratégia de visibilidade para seus produtos de forma automática.</p>
        </div>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
          <LegacyStep icon={<Layers className="h-5 w-5 text-[#EE4D2D]" />} label="Escolha o pack" sub="Selecione o nível de visibilidade ideal para sua operação" />
          <div className="hidden sm:flex flex-1 items-center pt-7"><div className="w-full border-t-2 border-dashed border-gray-200" /></div>
          <LegacyStep icon={<Zap className="h-5 w-5 text-[#EE4D2D]" />} label="Ative o anúncio" sub="Conclua o pagamento e a ativação é imediata" />
          <div className="hidden sm:flex flex-1 items-center pt-7"><div className="w-full border-t-2 border-dashed border-gray-200" /></div>
          <LegacyStep icon={<BarChart3 className="h-5 w-5 text-[#EE4D2D]" />} label="Acompanhe os resultados" sub="Veja vendas, comissões e retorno no painel em tempo real" />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">Perguntas frequentes</h3>
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-800">A campanha garante vendas?</div>
            <p className="mt-1 text-sm text-gray-500">Sim, a campanha possui garantia condicional. Caso o pacote contratado não gere nenhuma venda dentro do período de acompanhamento definido, você poderá solicitar a devolução do valor investido nesse pack, conforme as regras da garantia.</p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700">
              <ShieldCheck className="h-3 w-3" /> Garantia condicional
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <div className="text-sm font-semibold text-gray-800">Qual o melhor pack para começar?</div>
            <p className="mt-1 text-sm text-gray-500">O melhor pack para começar é o Pack Aceleração de R$ 64,90. Ele oferece um bom equilíbrio entre investimento, alcance e potencial de vendas, sendo uma das melhores opções para quem quer começar a anunciar com mais força.</p>
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

// ─── LegacyPackCard ───────────────────────────────────────────────────────────
function LegacyPackCard({
  pack, onActivate,
}: {
  pack: Pack; onActivate: () => void;
}) {
  const pct = METRIC_PCT[pack.id] ?? 50;
  const isEscala = pack.id === "escala";
  const isAceleracao = pack.id === "aceleracao";

  return (
    <article
      className={`relative flex flex-col rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-sm ${
        isEscala
          ? "border-t-2 border-t-[#EE4D2D] border-x-gray-200 border-b-gray-200"
          : "border-gray-200"
      }`}
    >
      {pack.badge && (
        <div className="mb-3">
          <span className={`text-[11px] font-medium ${
            isEscala ? "text-[#EE4D2D]" : isAceleracao ? "text-gray-500" : "text-gray-500"
          }`}>
            {pack.badge}
          </span>
        </div>
      )}

      <h3 className={`font-semibold text-gray-900 mb-1 ${isEscala ? "text-base" : "text-sm"}`}>{pack.name}</h3>

      {pack.originalPrice && (
        <div className="text-xs text-gray-400 mb-0.5">De <span className="line-through">{brl(pack.originalPrice)}</span></div>
      )}

      <div className="mb-1 flex items-baseline gap-1.5">
        {pack.originalPrice && <span className="text-xs text-gray-500">Por</span>}
        <span className={`font-bold tabular-nums ${isEscala ? "text-2xl" : "text-xl"} text-gray-900`}>{brl(pack.price)}</span>
      </div>

      <div className="text-xs text-gray-400 mb-4">pacote único</div>

      <p className="text-sm text-gray-500 mb-5 flex-1 leading-relaxed">{pack.ideal}</p>

      <div className="space-y-2.5 mb-5">
        <MBar label="Alcance" value={pack.reach} pct={pct} />
        <MBar label="Visualizações" value={pack.views} pct={pct} />
        <MBar label="Conversão" value={pack.conversion} pct={pct} />
      </div>

      <Button
        onClick={onActivate}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold ${
          isEscala || isAceleracao
            ? "bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
            : "border border-gray-200 text-gray-700 bg-white hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
        }`}
      >
        <Zap className="mr-2 h-4 w-4" /> Ativar anúncio
      </Button>
    </article>
  );
}

// ─── LegacyStep ───────────────────────────────────────────────────────────────
function LegacyStep({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex w-40 flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-gray-800">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ─── Boost performance (shared) ───────────────────────────────────────────────
function BoostPerformanceSection({ boost }: { boost: BoostInfo | null }) {
  if (!boost) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
        Nenhum anúncio ativo no momento.
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, boost.progressPct));
  const guarantee =
    boost.returnMultiplier >= 2
      ? { text: "Meta mínima de retorno atingida.", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" }
      : boost.completed
        ? { text: "Elegível para análise da garantia condicional.", tone: "text-amber-700 bg-amber-50 border-amber-200" }
        : { text: "A campanha ainda está em acompanhamento.", tone: "text-gray-600 bg-gray-50 border-gray-200" };
  const retornoLabel =
    boost.eventsReleased === 0
      ? "aguardando primeiras vendas"
      : `${boost.returnMultiplier.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}x o valor investido`;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#EE4D2D]/10">
          <Activity className="h-4 w-4 text-[#EE4D2D]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Desempenho do anúncio</h3>
          <p className="text-xs text-gray-500">
            {boost.completed ? "Último anúncio concluído" : "Anúncio em andamento"} • Pack ativo:{" "}
            <strong>{boost.packName}</strong>
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BStat icon={<Wallet className="h-3.5 w-3.5" />} label="Investimento" value={brl(boost.packValue)} />
        <BStat icon={<Zap className="h-3.5 w-3.5" />} label="Vendas geradas" value={String(boost.eventsReleased)} />
        <BStat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Comissões geradas" value={brl(boost.commissionTotal)} accent />
        <BStat icon={<BarChart3 className="h-3.5 w-3.5" />} label="Retorno atual" value={retornoLabel} />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Progresso</span>
          <span className="font-medium text-gray-900">
            {boost.completed ? "Anúncio concluído" : `${pct}% concluído`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-[#EE4D2D] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
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
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
        {icon}{label}
      </div>
      <div className={`mt-1 truncate text-sm font-semibold ${accent ? "text-[#EE4D2D]" : "text-gray-900"}`}>{value}</div>
    </div>
  );
}

// ─── PIX QR Code Modal ─────────────────────────────────────────────────────────
function PixQrModal({
  qrState,
  pack,
  onClose,
  onRetry,
}: {
  qrState: QrState;
  pack: Pack | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (qrState.status !== "success") return;
    try {
      await navigator.clipboard.writeText(qrState.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback for insecure contexts
      const ta = document.createElement("textarea");
      ta.value = qrState.qrCodeText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-md">
        {/* ── Loading ─────────────────────────────────────────────────── */}
        {qrState.status === "loading" && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#EE4D2D]/20 border-t-[#EE4D2D]" />
            <p className="text-sm font-medium text-gray-700">Gerando PIX...</p>
            <p className="mt-1 text-xs text-gray-500">Conectando ao EvoPay</p>
            {pack && (
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-2 text-center">
                <span className="text-xs text-gray-500">
                  {pack.name} • {brl(pack.price)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {qrState.status === "error" && (
          <div className="flex flex-col items-center py-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-500">
              <span className="text-xl font-bold">!</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">Erro ao gerar PIX</p>
            <p className="mt-1 text-center text-xs text-gray-500">{qrState.message}</p>
            <div className="mt-6 flex w-full gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                onClick={onRetry}
                className="flex-1 rounded-lg bg-[#EE4D2D] py-2.5 text-sm font-semibold text-white hover:bg-[#d93e22]"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* ── Success ─────────────────────────────────────────────────── */}
        {qrState.status === "success" && pack && (
          <div className="flex flex-col items-center">
            <DialogHeader className="w-full">
              <DialogTitle className="text-center text-lg font-semibold">
                Pagamento PIX — {pack.name}
              </DialogTitle>
              <DialogDescription className="text-center">
                Escaneie o QR Code ou copie o código PIX para pagar
              </DialogDescription>
            </DialogHeader>

            {/* QR Code image */}
            <div className="my-4 flex justify-center rounded-xl border border-gray-200 bg-white p-3">
              <img
                src={`data:image/png;base64,${qrState.qrCodeBase64}`}
                alt="QR Code PIX"
                className="h-48 w-48 object-contain sm:h-56 sm:w-56"
              />
            </div>

            {/* Pack info */}
            <div className="mb-4 w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Valor</span>
                <span className="font-bold text-gray-900">{brl(pack.price)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-gray-500">Pacote</span>
                <span className="font-semibold text-[#EE4D2D]">{pack.name}</span>
              </div>
            </div>

            {/* PIX code text */}
            <div className="mb-3 w-full">
              <p className="mb-1 text-[10px] font-semibold text-gray-500 uppercase">
                Código PIX (copia e cola)
              </p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                <p className="break-all text-[11px] leading-relaxed text-gray-700 font-mono select-all">
                  {qrState.qrCodeText}
                </p>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-[#EE4D2D] text-white hover:bg-[#d93e22]"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Código copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar código PIX
                </>
              )}
            </button>

            {/* Auto-activation message */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs text-gray-600">
                Após o pagamento, seu anúncio será{" "}
                <strong>ativado automaticamente</strong>.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
