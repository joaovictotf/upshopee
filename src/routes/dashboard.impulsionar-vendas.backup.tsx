// Mobile-first: all layouts must work on 320px+ screens
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { brl } from "../lib/format";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Flame, Sparkles, TrendingUp, Eye, MousePointerClick, Users, Zap,
  ShieldCheck, Rocket, BarChart3, CheckCircle2, Lock, Activity, Wallet,
  CalendarDays, Layers,
} from "lucide-react";

const BOOST_PACK_24_CHECKOUT_URL = "https://go.ironpayapp.com.br/rnaqezkbld";
const BOOST_PACK_50_CHECKOUT_URL = "https://go.ironpayapp.com.br/a7brsesrse";
const BOOST_PACK_150_CHECKOUT_URL = "https://go.ironpayapp.com.br/kteiyf8epw";
const BOOST_PACK_400_CHECKOUT_URL = "https://go.ironpayapp.com.br/bsyspglspg";

export const Route = createFileRoute("/dashboard/impulsionar-vendas/backup")({
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
  short: string;
  roi: string;
  roiAmount: string;
  guaranteeMin: string;
  checkoutUrl: string;
  badge?: string;
  highlighted?: boolean;
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
    short: "Uma opção acessível para começar a dar mais visibilidade aos seus produtos.",
    roi: "Invista R$ 40,00 e tenha potencial de gerar até R$ 200,00 em comissões.",
    roiAmount: "até R$ 200,00 em comissões",
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
    short: "Mais alcance, mais visualizações e mais chance de conversão em pouco tempo.",
    roi: "Invista R$ 64,90 e tenha potencial de gerar até R$ 324,50 em comissões.",
    roiAmount: "até R$ 324,50 em comissões",
    guaranteeMin: "R$ 129,80",
    checkoutUrl: BOOST_PACK_50_CHECKOUT_URL,
    badge: "Melhor para começar",
    highlighted: true,
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
    short: "Perfeito para produtos com boa margem e potencial de giro maior.",
    roi: "Invista R$ 150,00 e tenha potencial de gerar até R$ 2.000,00 em comissões.",
    roiAmount: "até R$ 2.000,00 em comissões",
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
    short: "O pacote mais forte para quem deseja escalar com o máximo de exposição.",
    roi: "Invista R$ 400,00 e tenha potencial de gerar até R$ 5.000,00 em comissões.",
    roiAmount: "até R$ 5.000,00 em comissões",
    guaranteeMin: "R$ 800,00",
    checkoutUrl: BOOST_PACK_400_CHECKOUT_URL,
    badge: "Maior alcance",
  },
];

// Bar fill widths per pack tier
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

type PageProps = {
  boost: BoostInfo | null;
  selectedPack: Pack | null;
  setSelectedPack: React.Dispatch<React.SetStateAction<Pack | null>>;
  stage: "guarantee" | "how" | "confirm";
  setStage: React.Dispatch<React.SetStateAction<"guarantee" | "how" | "confirm">>;
  startActivate: (p: Pack) => void;
  goToPayment: () => void;
};

// ─── Main component ───────────────────────────────────────────────────────────
function ImpulsionarVendasPage() {
  const { user, myActiveBoost, isAdmin } = useApp();
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [stage, setStage] = useState<"guarantee" | "how" | "confirm">("guarantee");

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  if (!user) return null;

  const startActivate = (pack: Pack) => {
    setSelectedPack(pack);
    setStage("guarantee");
  };

  const goToPayment = () => {
    if (!selectedPack) return;
    window.location.href = selectedPack.checkoutUrl;
  };

  const pageProps: PageProps = {
    boost: myActiveBoost as BoostInfo | null,
    selectedPack,
    setSelectedPack,
    stage,
    setStage,
    startActivate,
    goToPayment,
  };

  return <PremiumView {...pageProps} />;
}

// ─── Activation dialog (shared, identical logic) ──────────────────────────────
function ActivationDialog({ selectedPack, stage, setSelectedPack, setStage, goToPayment }: {
  selectedPack: Pack | null;
  stage: "guarantee" | "how" | "confirm";
  setSelectedPack: React.Dispatch<React.SetStateAction<Pack | null>>;
  setStage: React.Dispatch<React.SetStateAction<"guarantee" | "how" | "confirm">>;
  goToPayment: () => void;
}) {
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
              <p className="text-sm text-muted-foreground">
                Você não precisa se preocupar com a divulgação. O processo é organizado para que seus produtos recebam mais exposição e tenham mais potencial de conversão.
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
                    <span className="text-right font-semibold">
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

// ─── Legacy UI ────────────────────────────────────────────────────────────────
function OldView({ boost, selectedPack, setSelectedPack, stage, setStage, startActivate, goToPayment }: PageProps) {
  return (
    <DashboardShell
      title="Impulsionar vendas 🔥"
      subtitle="Escolha um pacote para aumentar a visibilidade dos seus produtos, alcançar mais pessoas e melhorar sua conversão dentro da operação ShopeSync."
    >
      <BoostPerformanceSection boost={boost} />

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/40">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-amber-900">Mais visibilidade para os seus produtos</h2>
            <p className="mt-1 max-w-2xl text-sm text-amber-900/80">
              Os pacotes abaixo foram pensados para dar mais alcance aos seus produtos, gerar mais visualizações e aumentar a chance de vendas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PACKS.map((p) => (
          <article
            key={p.id}
            className={`relative flex flex-col rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
              p.highlighted ? "border-amber-500/60 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/30" : "border-border"
            }`}
          >
            {p.badge && (
              <span className="absolute -top-3 left-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
                {p.badge}
              </span>
            )}
            <div className="mb-3 flex items-center gap-2">
              <Flame className={`h-4 w-4 ${p.highlighted ? "text-amber-500" : "text-orange-500"}`} />
              <h3 className="text-base font-semibold tracking-tight">{p.name}</h3>
            </div>
            <div className="mb-3">
              {p.originalPrice && (
                <div className="text-sm text-muted-foreground">De <span className="line-through">{brl(p.originalPrice)}</span></div>
              )}
              <div className="flex items-baseline gap-2">
                {p.originalPrice && <span className="text-xs font-semibold text-amber-600">Por</span>}
                <div className="text-2xl font-bold">{brl(p.price)}</div>
              </div>
              <div className="text-xs text-muted-foreground">pacote único</div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{p.short}</p>
            <ul className="space-y-2 text-sm">
              <Row icon={<Users className="h-4 w-4 text-amber-500" />} label="Alcance estimado" value={p.reach} />
              <Row icon={<Eye className="h-4 w-4 text-amber-500" />} label="Visualizações estimadas" value={p.views} />
              <Row icon={<MousePointerClick className="h-4 w-4 text-amber-500" />} label="Interações estimadas" value={p.interactions} />
              <Row icon={<TrendingUp className="h-4 w-4 text-amber-500" />} label="Potencial de conversão" value={p.conversion} />
            </ul>
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                <TrendingUp className="h-3.5 w-3.5" /> Retorno estimado
              </div>
              <p className="mt-1 text-sm text-amber-900">{p.roi}</p>
              <p className="mt-1 text-[11px] text-amber-700/80">Os resultados podem variar conforme produto, preço, oferta, demanda e execução.</p>
            </div>
            <div className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Ideal para: </span>{p.ideal}
            </div>
            <Button
              onClick={() => startActivate(p)}
              className={`mt-5 w-full ${p.highlighted ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600" : ""}`}
            >
              <Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento
            </Button>
          </article>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-amber-500" /> Como funciona o impulsionamento?
        </h3>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A ShopeSync organiza uma estratégia de aumento de visibilidade para os seus produtos, ajudando sua operação a alcançar mais pessoas, gerar mais visualizações e melhorar o potencial de conversão.
        </p>
        <ol className="mt-5 grid gap-3 grid-cols-1 md:grid-cols-3">
          {["Escolha o pack", "Ative o impulsionamento", "Acompanhe o potencial de crescimento"].map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-4">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-600">{i + 1}</div>
              <span className="text-sm font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Perguntas frequentes</h3>
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-sm font-semibold">Esse impulsionamento garante vendas?</div>
            <p className="text-sm text-muted-foreground">
              Sim, o impulsionamento possui garantia condicional. Caso o pacote contratado não gere nenhuma venda dentro do período de acompanhamento definido, você poderá solicitar a devolução do valor investido nesse pack, conforme as regras da garantia.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Garantia condicional
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">Qual o melhor pack para começar?</div>
            <p className="text-sm text-muted-foreground">
              O melhor pack para começar é o Pack Aceleração de R$ 64,90. Ele oferece um bom equilíbrio entre investimento, alcance e potencial de vendas, sendo uma das melhores opções para quem quer começar a impulsionar com mais força.
            </p>
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

// ─── Premium UI ───────────────────────────────────────────────────────────────
function PremiumView({ boost, selectedPack, setSelectedPack, stage, setStage, startActivate, goToPayment }: PageProps) {
  const [hoveredPack, setHoveredPack] = useState<Pack | null>(null);
  const displayPack = hoveredPack;

  return (
    <DashboardShell
      title="Impulsionar vendas 🔥"
      subtitle="Escolha um pacote para aumentar a visibilidade dos seus produtos, alcançar mais pessoas e melhorar sua conversão dentro da operação ShopeSync."
    >
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.45), 0 10px 30px -5px rgba(249,115,22,0.30); }
          50%       { box-shadow: 0 0 0 7px rgba(249,115,22,0),  0 10px 30px -5px rgba(249,115,22,0.40); }
        }
        .btn-escala-glow { animation: glow-pulse 2s ease-in-out infinite; }

        @keyframes maximo-border-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(194,65,12,0.55), 0 8px 28px rgba(234,88,12,0.22); }
          50%       { box-shadow: 0 0 0 5px rgba(194,65,12,0),  0 8px 36px rgba(234,88,12,0.40); }
        }
        @keyframes maximo-shimmer {
          0%, 60%  { transform: translateX(-140%) skewX(-15deg); opacity: 0; }
          68%      { opacity: 1; }
          85%      { transform: translateX(280%) skewX(-15deg); opacity: 0; }
          100%     { transform: translateX(280%) skewX(-15deg); opacity: 0; }
        }
        .card-maximo-shine { animation: maximo-shimmer 3s ease-in-out infinite; }
      `}</style>

      {/* Active boost performance */}
      <BoostPerformanceSection boost={boost} />

      {/* Header banner */}
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

      {/* ── Asymmetric pack grid ── */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PACKS.map((pack) => (
          <PremiumPackCard
            key={pack.id}
            pack={pack}
            onActivate={() => startActivate(pack)}
            onHover={() => setHoveredPack(pack)}
            onLeave={() => setHoveredPack(null)}
          />
        ))}
      </div>

      {/* ── Retorno estimado strip (fades in on hover) ── */}
      <div className={`mt-4 transition-all duration-300 ${displayPack ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"}`}>
        <div className="flex items-start gap-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-md shadow-orange-500/25">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Retorno estimado — {displayPack?.name}</div>
            <p className="mt-0.5 text-sm font-semibold text-gray-800">{displayPack?.roi ?? "—"}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Os resultados podem variar conforme produto, preço, oferta, demanda e execução.</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Garantia mínima</div>
            <div className="mt-0.5 text-base font-black text-gray-900">{displayPack?.guaranteeMin ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* ── Resultados Reais ── */}
      <ResultadosReaisSection />

      {/* ── Como funciona ── */}
      <section className="mt-10 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h3 className="text-xl font-bold text-gray-900">Como funciona o impulsionamento?</h3>
          <p className="mt-2 text-sm text-gray-400">
            A ShopeSync organiza uma estratégia de visibilidade para seus produtos de forma automática.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
          {/* Step 1 */}
          <HowItWorksStep
            icon={<Layers className="h-7 w-7 text-orange-500" />}
            label="Escolha o pack"
            sub="Selecione o nível de visibilidade ideal para sua operação"
          />

          {/* Dashed connector */}
          <div className="hidden sm:flex flex-1 items-center pt-7">
            <div className="w-full border-t-2 border-dashed border-orange-200 animate-pulse" />
          </div>

          {/* Step 2 */}
          <HowItWorksStep
            icon={<Zap className="h-7 w-7 text-orange-500" />}
            label="Ative o impulsionamento"
            sub="Conclua o pagamento e a ativação é imediata"
          />

          {/* Dashed connector */}
          <div className="hidden sm:flex flex-1 items-center pt-7">
            <div className="w-full border-t-2 border-dashed border-orange-200 animate-pulse" />
          </div>

          {/* Step 3 */}
          <HowItWorksStep
            icon={<BarChart3 className="h-7 w-7 text-orange-500" />}
            label="Acompanhe os resultados"
            sub="Veja vendas, comissões e retorno no painel em tempo real"
          />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900">Perguntas frequentes</h3>
        <div className="mt-5 space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-800">Esse impulsionamento garante vendas?</div>
            <p className="mt-1 text-sm text-gray-500">
              Sim, o impulsionamento possui garantia condicional. Caso o pacote contratado não gere nenhuma venda dentro do período de acompanhamento definido, você poderá solicitar a devolução do valor investido nesse pack, conforme as regras da garantia.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Garantia condicional
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <div className="text-sm font-semibold text-gray-800">Qual o melhor pack para começar?</div>
            <p className="mt-1 text-sm text-gray-500">
              O melhor pack para começar é o Pack Aceleração de R$ 64,90. Ele oferece um bom equilíbrio entre investimento, alcance e potencial de vendas, sendo uma das melhores opções para quem quer começar a impulsionar com mais força.
            </p>
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

// ─── Premium pack card ────────────────────────────────────────────────────────
function PremiumPackCard({ pack, onActivate, onHover, onLeave }: {
  pack: Pack;
  onActivate: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const pct = METRIC_PCT[pack.id] ?? 50;
  const isInicio = pack.id === "inicio";
  const isAceleracao = pack.id === "aceleracao";
  const isEscala = pack.id === "escala";
  const isMaximo = pack.id === "maximo";

  // ── Máximo: gradient border wrapper + inner white card ──────────────────────
  if (isMaximo) {
    return (
      <article
        className="relative min-w-0 rounded-2xl cursor-default transition-all duration-300 overflow-visible"
        style={{
          background: "linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)",
          padding: "2px",
          boxShadow: "0 0 40px rgba(234,88,12,0.25)",
        }}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        {/* Badge — positioned on the outer wrapper so it sits above the border */}
        {pack.badge && (
          <span
            className="absolute -top-3 left-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}
          >
            {pack.badge}
          </span>
        )}

        {/* Inner white card */}
        <div className="relative flex flex-col bg-white rounded-[14px] p-5 overflow-hidden h-full">
          {/* Diagonal shimmer sweep */}
          <div
            className="card-maximo-shine pointer-events-none absolute inset-y-0 w-2/5"
            style={{ background: "linear-gradient(90deg, transparent, rgba(234,88,12,0.07), transparent)" }}
          />

          <h3 className="font-bold mb-1 text-base text-gray-900">{pack.name}</h3>

          <div className="mb-1 flex items-baseline gap-1.5">
            <span className="font-black tabular-nums text-3xl text-gray-900">{brl(pack.price)}</span>
          </div>
          <div className="text-xs mb-4 text-gray-500">pacote único</div>

          <p className="text-sm mb-5 text-gray-500">{pack.short}</p>

          <div className="space-y-3 mb-5">
            <MetricBar label="Alcance" value={pack.reach} pct={pct} />
            <MetricBar label="Visualizações" value={pack.views} pct={pct} />
            <MetricBar label="Interações" value={pack.interactions} pct={pct} />
            <MetricBar label="Conversão" value={pack.conversion} pct={pct} />
          </div>

          <div className="mt-auto rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 mb-5">
            <span className="font-semibold text-gray-700">Ideal para: </span>
            {pack.ideal}
          </div>

          <Button
            onClick={onActivate}
            className="w-full text-white hover:opacity-90"
            style={{ backgroundColor: "#EA580C" }}
          >
            <Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento
          </Button>
        </div>
      </article>
    );
  }

  // ── All other cards (unchanged) ─────────────────────────────────────────────
  const cardCls = [
    "relative flex flex-col rounded-2xl border transition-all duration-300 cursor-default min-w-0",
    isInicio && "border-gray-200 bg-white p-5 hover:border-gray-300",
    isAceleracao && "border-orange-200 bg-white p-5 hover:border-orange-400 hover:shadow-md hover:shadow-orange-500/10",
    isEscala && "border-orange-500/70 bg-white p-6 ring-2 ring-orange-500/20 shadow-xl shadow-orange-500/15 hover:shadow-2xl hover:shadow-orange-500/20 lg:-mt-2",
  ].filter(Boolean).join(" ");

  const priceSize = isEscala ? "text-4xl" : "text-2xl";

  return (
    <article className={cardCls} onMouseEnter={onHover} onMouseLeave={onLeave}>
      {/* Badge */}
      {pack.badge && (
        <span className={`absolute -top-3 left-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow ${
          isEscala ? "bg-orange-500" : "bg-[#EA580C]"
        }`}>
          {pack.badge}
        </span>
      )}

      <h3 className={`font-bold mb-1 ${isEscala ? "text-xl" : "text-base"} text-gray-900`}>
        {pack.name}
      </h3>

      {pack.originalPrice && (
        <div className="text-xs mb-0.5 text-gray-500">
          De <span className="line-through">{brl(pack.originalPrice)}</span>
        </div>
      )}

      <div className="mb-1 flex items-baseline gap-1.5">
        {pack.originalPrice && (
          <span className={`text-xs font-semibold ${isEscala ? "text-orange-500" : "text-gray-500"}`}>Por</span>
        )}
        <span className={`font-black tabular-nums ${priceSize} text-gray-900`}>{brl(pack.price)}</span>
      </div>
      <div className="text-xs mb-4 text-gray-500">pacote único</div>

      <p className="text-sm mb-5 text-gray-500">{pack.short}</p>

      <div className="space-y-3 mb-5">
        <MetricBar label="Alcance" value={pack.reach} pct={pct} />
        <MetricBar label="Visualizações" value={pack.views} pct={pct} />
        <MetricBar label="Interações" value={pack.interactions} pct={pct} />
        <MetricBar label="Conversão" value={pack.conversion} pct={pct} />
      </div>

      <div className="mt-auto rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 mb-5">
        <span className="font-semibold text-gray-700">Ideal para: </span>
        {pack.ideal}
      </div>

      {isInicio && (
        <Button variant="outline" onClick={onActivate} className="w-full border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600">
          <Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento
        </Button>
      )}
      {isAceleracao && (
        <Button onClick={onActivate} className="w-full bg-orange-500 text-white shadow-md shadow-orange-500/25 hover:bg-orange-600">
          <Zap className="mr-2 h-4 w-4" /> Ativar impulsionamento
        </Button>
      )}
      {isEscala && (
        <Button onClick={onActivate} className="btn-escala-glow w-full bg-orange-500 text-white hover:bg-orange-600">
          <Flame className="mr-2 h-4 w-4" /> Ativar impulsionamento
        </Button>
      )}
    </article>
  );
}

// ─── Resultados Reais ─────────────────────────────────────────────────────────
const RESULTADO_IMAGES = [
  "/resultados/resultado-1.jpg",
  "/resultados/resultado-2.jpg",
  "/resultados/resultado-3.jpg",
  "/resultados/resultado-4.jpg",
  "/resultados/resultado-5.jpg",
  "/resultados/resultado-6.jpg",
];

function ResultadosReaisSection() {
  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-[#0D0D0D] p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#EE4D2D]">
          PROVA SOCIAL
        </span>
        <h3 className="mt-2 text-xl font-black text-white">
          Resultados Reais de Quem Impulsionou
        </h3>
        <p className="mt-1 text-sm text-white/50">
          Prints reais enviados pelos nossos vendedores
        </p>
      </div>

      {/* Gallery */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {RESULTADO_IMAGES.map((src, i) => (
          <div
            key={i}
            className="snap-start flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(238,77,45,0.3)]"
            style={{ width: 200, aspectRatio: "9 / 16" }}
          >
            <img
              src={src}
              alt={`Resultado ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <p className="mt-5 text-center text-sm font-bold text-[#EE4D2D]">
        🔥 Quer ser o próximo? Escolha seu pack acima.
      </p>
    </section>
  );
}

function MetricBar({ label, value, pct, dark }: { label: string; value: string; pct: number; dark?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className={dark ? "text-white/60" : "text-gray-400"}>{label}</span>
        <span className={`font-semibold ${dark ? "text-white" : "text-gray-700"}`}>{value}</span>
      </div>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${dark ? "bg-white/20" : "bg-gray-100"}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${dark ? "bg-white/80" : "bg-orange-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function HowItWorksStep({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex w-40 flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-orange-100 bg-orange-50 shadow-sm">
        {icon}
      </div>
      <p className="mt-3 text-sm font-bold text-gray-800">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ─── Legacy helpers ───────────────────────────────────────────────────────────
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="text-right font-medium">{value}</span>
    </li>
  );
}

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
  const retornoLabel = boost.eventsReleased === 0
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
            {boost.completed ? "Último impulsionamento concluído" : "Impulsionamento em andamento"} • Pack ativo: <strong>{boost.packName}</strong>
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Wallet className="h-3.5 w-3.5" />} label="Investimento" value={brl(boost.packValue)} />
        <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="Vendas geradas" value={String(boost.eventsReleased)} />
        <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Comissões geradas" value={brl(boost.commissionTotal)} accent />
        <Stat icon={<BarChart3 className="h-3.5 w-3.5" />} label="Retorno atual" value={retornoLabel} />
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do impulsionamento</span>
          <span className="font-medium text-foreground">{boost.completed ? "Impulsionamento concluído" : `${pct}% concluído`}</span>
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

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </div>
      <div className={`mt-1 truncate text-base font-bold ${accent ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}
