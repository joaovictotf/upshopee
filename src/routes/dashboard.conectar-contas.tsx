import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations as initial, type Integration } from "../lib/mock/integrations";
import { useApp, type Marketplace } from "../lib/state";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import {
  Loader2, Check, CheckCircle2, Clock, Plug, ShieldCheck, ShieldAlert,
  Zap, RefreshCw, TrendingUp, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/conectar-contas")({ component: Conectar });

const DURATION_MS = 30000;

type DisplayStatus = Integration["status"];

function deriveStatus(connStatus: "pending_validation" | "approved" | "rejected" | undefined): DisplayStatus {
  // Connection is automatic/instant — both "approved" and the freshly-written
  // "pending_validation" row render as validated. No admin step in between.
  if (connStatus === "approved" || connStatus === "pending_validation") return "Conexão validada";
  if (connStatus === "rejected") return "Conexão recusada";
  return "Disponível para conexão";
}

type ViewProps = {
  items: Integration[];
  active: Integration | null;
  setActive: (i: Integration | null) => void;
  onFinish: (id: string) => void | Promise<void>;
};

function Conectar() {
  const { myConnections, requestMarketplaceConnection } = useApp();
  const [active, setActive] = useState<Integration | null>(null);

  const items: Integration[] = useMemo(
    () => initial
      .filter((i) => i.id === "shopee")
      .map((i) => ({ ...i, status: deriveStatus(myConnections[i.id as Marketplace]) })),
    [myConnections],
  );

  const handleFinish = async (id: string) => {
    try {
      const r = await requestMarketplaceConnection(id as Marketplace);
      if (!r.ok) { toast.error(r.error || "Não foi possível solicitar a conexão."); return; }
      toast.success("Conexão validada com sucesso.", {
        description: "Sua conta de marketplace está pronta para envio de produtos.",
      });
    } catch (err) {
      console.error("[handleFinish] requestMarketplaceConnection threw:", err);
      toast.error("Não foi possível solicitar a conexão. Tente novamente.");
    }
  };

  const viewProps: ViewProps = { items, active, setActive, onFinish: handleFinish };

  return <PremiumView {...viewProps} />;
}

// ─── Legacy UI ────────────────────────────────────────────────────────────────
function OldView({ items, active, setActive, onFinish }: ViewProps) {
  return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <IntegrationCard key={i.id} integration={i} onConnect={() => setActive(i)} />
        ))}
      </div>
      <ConnectionDialog integration={active} onClose={() => setActive(null)} onFinish={onFinish} />
    </DashboardShell>
  );
}

function IntegrationCard({ integration, onConnect }: { integration: Integration; onConnect: () => void }) {
  const requested =
    integration.status === "Conexão em análise" ||
    integration.status === "Conexão validada" ||
    integration.status === "Conexão recusada" ||
    integration.status === "Conexão solicitada" ||
    integration.status === "Em análise" ||
    integration.status === "Ativo";
  const validated = integration.status === "Conexão validada" || integration.status === "Ativo";
  const rejected = integration.status === "Conexão recusada";
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex h-20 items-center justify-center rounded-lg bg-white p-4">
        <img
          src={integration.logo}
          alt={`Logo ${integration.name}`}
          className="max-h-12 max-w-[160px] object-contain"
          onError={(e) => {
            const t = e.currentTarget;
            t.onerror = null;
            t.src = `/brands/${integration.id}-logo.svg`;
          }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{integration.name}</h3>
        <StatusPill status={integration.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{integration.description}</p>
      {validated ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Conexão validada. Você já pode enviar produtos para este marketplace.
        </div>
      ) : rejected ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <ShieldAlert className="h-3.5 w-3.5" />
          Conexão não validada. Entre em contato com o suporte.
        </div>
      ) : requested ? (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Solicitação enviada. Aguarde validação da equipe ShopeSync. Prazo médio: até 3 dias úteis.
        </div>
      ) : null}
      <Button onClick={onConnect} variant={requested ? "outline" : "default"} className="mt-4 w-full" disabled={validated}>
        {validated ? (
          <><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Conexão validada</>
        ) : requested ? (
          <><Check className="mr-1 h-3.5 w-3.5" /> Ver status da conexão</>
        ) : (
          <><Plug className="mr-1 h-3.5 w-3.5" /> {integration.buttonLabel}</>
        )}
      </Button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Disponível para conexão": "bg-muted text-muted-foreground",
    "Conectando...": "bg-primary/15 text-primary",
    "Conexão solicitada": "bg-amber-500/15 text-amber-400",
    "Em análise": "bg-blue-500/15 text-blue-400",
    "Ativo": "bg-emerald-500/15 text-emerald-400",
    "Conexão em análise": "bg-amber-500/15 text-amber-400",
    "Conexão validada": "bg-emerald-500/15 text-emerald-400",
    "Conexão recusada": "bg-rose-500/15 text-rose-400",
  };
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${map[status] ?? ""}`}>{status}</span>;
}

function ConnectionDialog({
  integration,
  onClose,
  onFinish,
}: {
  integration: Integration | null;
  onClose: () => void;
  onFinish: (id: string) => void | Promise<void>;
}) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const alreadyConnected =
    integration && (
      integration.status === "Conexão em análise" ||
      integration.status === "Conexão validada" ||
      integration.status === "Conexão recusada" ||
      integration.status === "Conexão solicitada" ||
      integration.status === "Em análise" ||
      integration.status === "Ativo"
    );

  useEffect(() => {
    if (!integration) return;
    if (alreadyConnected) { setPhase("done"); setProgress(100); return; }
    setPhase("loading");
    setProgress(0);
    finishedRef.current = false;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setPhase("done");
        onFinish(integration.id);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id]);

  if (!integration) return null;

  const steps = integration.steps;
  const stepIndex = Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));
  const currentStep = steps[stepIndex];
  const validated = integration.status === "Conexão validada" || integration.status === "Ativo";
  const rejected = integration.status === "Conexão recusada";

  return (
    <Dialog open={!!integration} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <div className="mx-auto flex h-16 w-full items-center justify-center rounded-lg bg-white p-3">
            <img src={integration.logo} alt={`Logo ${integration.name}`} className="max-h-10 max-w-[160px] object-contain" onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${integration.id}-logo.svg`; }} />
          </div>
          <DialogTitle className="pt-2 text-center">
            {phase === "done" ? validated ? "Conexão validada" : rejected ? "Conexão recusada" : "Conexão solicitada com sucesso" : `Conectando com ${integration.name}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {phase === "done" ? validated ? `Sua conta ${integration.name} foi validada pela equipe ShopeSync. Você já pode enviar produtos para este marketplace.` : rejected ? `Esta conexão não foi validada. Entre em contato com o suporte.` : `Seu acesso está em análise pela equipe ShopeSync. Após a validação, você poderá enviar produtos para ${integration.name}. Prazo médio para finalização: até 3 dias úteis.` : "Estamos preparando sua integração. Isso pode levar até 30 segundos."}
          </DialogDescription>
        </DialogHeader>
        {phase === "loading" ? (
          <div className="space-y-4 pt-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="animate-fade-in" key={currentStep}>{currentStep}</span>
              </div>
              <span className="font-mono text-primary">{Math.round(progress)}%</span>
            </div>
            <ul className="space-y-1.5 rounded-md border border-border bg-muted/20 p-3 text-xs">
              {steps.map((s, idx) => (
                <li key={s} className={`flex items-center gap-2 ${idx < stepIndex ? "text-muted-foreground line-through" : idx === stepIndex ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {idx < stepIndex ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : idx === stepIndex ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {validated ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium">Conexão validada</p>
                <p className="text-xs text-muted-foreground">Você já pode enviar produtos para este marketplace.</p>
              </div>
            ) : rejected ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                <ShieldAlert className="h-8 w-8 text-rose-400" />
                <p className="text-sm font-medium">Conexão recusada</p>
                <p className="text-xs text-muted-foreground">Entre em contato com o suporte.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                <Clock className="h-8 w-8 text-amber-400" />
                <p className="text-sm font-medium">Conexão em análise</p>
                <p className="text-xs text-muted-foreground">Prazo médio: até 3 dias úteis</p>
              </div>
            )}
            <Button className="w-full" onClick={onClose}>Concluir</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Premium UI ───────────────────────────────────────────────────────────────
function PremiumView({ items, active, setActive, onFinish }: ViewProps) {
  const shopee = items[0];
  if (!shopee) return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma integração disponível no momento.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:border-primary/40"
        >
          Tentar novamente
        </button>
      </div>
    </DashboardShell>
  );

  const validated = shopee.status === "Conexão validada" || shopee.status === "Ativo";
  const pending =
    shopee.status === "Conexão em análise" ||
    shopee.status === "Conexão solicitada" ||
    shopee.status === "Em análise";
  const rejected = shopee.status === "Conexão recusada";

  return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <style>{`
        @keyframes travel-dot {
          0%   { left: 4%;  opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { left: 88%; opacity: 0; }
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(-8px) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(110px) rotate(600deg) scale(0.4); opacity: 0; }
        }
      `}</style>

      <div className="flex justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-white shadow-xl">

            {/* ── Header: logos + animated line ── */}
            <div className="bg-gradient-to-b from-orange-50/70 to-white px-8 pb-6 pt-8">
              <div className="flex items-center gap-3">

                {/* ShopSync logo */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
                  <img
                    src="/brand/shopesync-logo.png"
                    alt="ShopSync"
                    className="h-10 w-10 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>

                {/* Animated dashed line */}
                <div className="relative flex-1">
                  <div className="border-t-2 border-dashed border-orange-200 animate-pulse" />
                  {/* Traveling dots */}
                  {[0, 0.7, 1.4].map((delay, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-orange-400 shadow-sm shadow-orange-300"
                      style={{ animation: `travel-dot 2.1s ease-in-out infinite`, animationDelay: `${delay}s`, left: "4%" }}
                    />
                  ))}
                </div>

                <ArrowRight className="h-5 w-5 shrink-0 text-orange-400" />

                {/* Shopee logo */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-500 ${validated ? "border-green-400 bg-green-50" : "border-orange-100 bg-white"}`}>
                  <img
                    src={shopee.logo}
                    alt="Shopee"
                    className="h-10 w-10 object-contain"
                    onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${shopee.id}-logo.svg`; }}
                  />
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-5 flex justify-center">
                {validated ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Conectada
                  </span>
                ) : pending ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Em análise
                  </span>
                ) : rejected ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-700">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Conexão recusada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-gray-400" /> Disponível para conexão
                  </span>
                )}
              </div>
            </div>

            {/* ── Benefits ── */}
            <div className="space-y-4 border-t border-gray-100 px-8 py-6">
              <BenefitRow icon={<Zap className="h-4 w-4 text-orange-500" />} text="Sincronização automática de produtos" />
              <BenefitRow icon={<RefreshCw className="h-4 w-4 text-orange-500" />} text="Pedidos atualizados em tempo real" />
              <BenefitRow icon={<TrendingUp className="h-4 w-4 text-orange-500" />} text="Comissões calculadas automaticamente" />
            </div>

            {/* ── CTA ── */}
            <div className="border-t border-gray-100 px-8 pb-8 pt-5">
              {validated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 shadow-md shadow-green-500/30">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Shopee conectada</p>
                      <p className="text-xs text-green-600">Conta validada e pronta para uso</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActive(shopee)}
                    className="w-full border-gray-200 text-gray-500 hover:text-gray-700"
                  >
                    Reconectar
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setActive(shopee)}
                  className="w-full bg-orange-500 py-6 text-base font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
                >
                  Conectar conta Shopee
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PremiumConnectionDialog
        integration={active}
        onClose={() => setActive(null)}
        onFinish={onFinish}
      />
    </DashboardShell>
  );
}

function BenefitRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}

// ─── Premium connection dialog ────────────────────────────────────────────────
function PremiumConnectionDialog({
  integration,
  onClose,
  onFinish,
}: {
  integration: Integration | null;
  onClose: () => void;
  onFinish: (id: string) => void | Promise<void>;
}) {
  // ── Identical logic to ConnectionDialog ──────────────────────────────────
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const alreadyConnected =
    integration && (
      integration.status === "Conexão em análise" ||
      integration.status === "Conexão validada" ||
      integration.status === "Conexão recusada" ||
      integration.status === "Conexão solicitada" ||
      integration.status === "Em análise" ||
      integration.status === "Ativo"
    );

  useEffect(() => {
    if (!integration) return;
    if (alreadyConnected) { setPhase("done"); setProgress(100); return; }
    setPhase("loading");
    setProgress(0);
    finishedRef.current = false;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setPhase("done");
        onFinish(integration.id);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id]);

  if (!integration) return null;

  const validated = integration.status === "Conexão validada" || integration.status === "Ativo";
  const rejected = integration.status === "Conexão recusada";

  // Three-step UI driven by the same progress value (unchanged data)
  const step1Done = progress >= 33;
  const step2Done = progress >= 66;
  const step3Done = phase === "done";

  const lineConnected = phase === "done" && !rejected;

  return (
    <Dialog open={!!integration} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm overflow-hidden border-0 bg-white p-0 shadow-2xl">
        <style>{`
          @keyframes travel-dot-dialog {
            0%   { left: 6%;  opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { left: 90%; opacity: 0; }
          }
          @keyframes confetti-fall {
            0%   { transform: translateY(-6px) rotate(0deg) scale(1); opacity: 1; }
            100% { transform: translateY(100px) rotate(540deg) scale(0.3); opacity: 0; }
          }
        `}</style>

        <div className="p-6">
          {/* ── Logos + animated connection line ── */}
          <div className="flex items-center gap-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
              <img
                src="/brand/shopesync-logo.png"
                alt="ShopSync"
                className="h-8 w-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>

            {/* Animated line */}
            <div className="relative flex-1">
              <div className={`border-t-2 transition-all duration-700 ${lineConnected ? "border-green-400" : "border-dashed border-orange-200"}`} />

              {/* Traveling dots (loading only) */}
              {phase === "loading" && [0, 0.4, 0.8].map((delay, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500"
                  style={{ animation: "travel-dot-dialog 1.2s ease-in-out infinite", animationDelay: `${delay}s`, left: "6%" }}
                />
              ))}

              {/* Center checkmark (done) */}
              {lineConnected && (
                <div className="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-green-500 shadow-md shadow-green-500/40 animate-in zoom-in duration-300">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-700 ${lineConnected ? "border-green-400 bg-green-50" : "border-orange-100 bg-white"}`}>
              <img
                src={integration.logo}
                alt={integration.name}
                className="h-8 w-8 object-contain"
                onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${integration.id}-logo.svg`; }}
              />
            </div>
          </div>

          {/* ── Title ── */}
          <div className="mt-5 text-center">
            <h2 className="text-lg font-bold text-gray-900">
              {phase === "done"
                ? validated ? "Conta conectada com sucesso!" : rejected ? "Conexão recusada" : "Conexão solicitada!"
                : `Conectando com ${integration.name}`}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {phase === "done"
                ? validated ? "Seus dados estão sincronizados e prontos para uso." : rejected ? "Entre em contato com o suporte." : "Sua solicitação está em análise. Prazo: até 3 dias úteis."
                : "Aguarde enquanto estabelecemos a conexão..."}
            </p>
          </div>

          {/* ── Three sequential steps ── */}
          <div className="mt-6 space-y-2.5">
            <PremiumStep label="Iniciando conexão..." done={step1Done} active={!step1Done && progress > 0} />
            <PremiumStep label="Autenticando com a Shopee..." done={step2Done} active={step1Done && !step2Done} />
            <PremiumStep label="Sincronizando dados..." done={step3Done} active={step2Done && !step3Done} />
          </div>

          {/* ── Progress bar (loading) ── */}
          {phase === "loading" && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
                <span>Processando...</span>
                <span className="font-mono text-orange-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* ── Success / done CTA ── */}
          {phase === "done" && (
            <div className="relative mt-5 overflow-visible">
              {/* Confetti burst */}
              {!rejected && (
                <div className="pointer-events-none absolute -top-6 left-0 right-0">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-1.5 w-1.5 rounded-full"
                      style={{
                        background: ["#F97316", "#10B981", "#8B5CF6", "#3B82F6", "#F59E0B"][i % 5],
                        left: `${4 + i * 9}%`,
                        animation: "confetti-fall 1s ease-out forwards",
                        animationDelay: `${i * 0.07}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              <Button
                className={`w-full font-semibold shadow-md ${rejected ? "bg-gray-700 hover:bg-gray-800" : "bg-orange-500 text-white shadow-orange-500/25 hover:bg-orange-600"}`}
                onClick={onClose}
              >
                {rejected ? "Fechar" : "Concluir"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PremiumStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${done ? "bg-green-50" : active ? "bg-orange-50" : "bg-gray-50"}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${done ? "bg-green-500" : active ? "bg-orange-500" : "bg-gray-200"}`}>
        {done
          ? <Check className="h-3.5 w-3.5 text-white" />
          : active
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            : <span className="h-2 w-2 rounded-full bg-gray-400" />}
      </div>
      <span className={`text-sm font-medium transition-colors duration-500 ${done ? "text-green-700" : active ? "text-orange-700" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}
