import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations as initial, type Integration } from "../lib/mock/integrations";
import { useApp, type Marketplace } from "../lib/state";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import {
  Loader2, Check, Zap, RefreshCw, TrendingUp, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/conectar-contas")({ component: Conectar });

const DURATION_MS = 30000;

type DisplayStatus = Integration["status"];

function deriveStatus(connStatus: "pending_validation" | "approved" | "rejected" | undefined): DisplayStatus {
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

  return <ShopeeView {...viewProps} />;
}

// ═══════════════════════════════════════════════════════════════════════
// SHOPEE CONNECTION VIEW
// ═══════════════════════════════════════════════════════════════════════

function ShopeeView({ items, active, setActive, onFinish }: ViewProps) {
  const shopee = items[0];
  if (!shopee) return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm shadow-black/[0.02]">
        <p className="text-sm text-gray-500">Nenhuma integração disponível no momento.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
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
      `}</style>

      <div className="flex justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.06]">

            {/* ── Header: logos + animated line ── */}
            <div className="bg-gradient-to-b from-[#FFF8F5] to-white px-8 pb-6 pt-8">
              <div className="flex items-center gap-3">

                {/* UpShopee logo */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
                  <img
                    src="/brand/shopesync-logo.png"
                    alt="UpShopee"
                    className="h-10 w-10 object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>

                {/* Animated dashed line */}
                <div className="relative flex-1">
                  <div className="border-t-2 border-dashed border-[#EE4D2D]/20" />
                  {[0, 0.7, 1.4].map((delay, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#EE4D2D] shadow-sm shadow-[#EE4D2D]/30"
                      style={{ animation: `travel-dot 2.1s ease-in-out infinite`, animationDelay: `${delay}s`, left: "4%" }}
                    />
                  ))}
                </div>

                <ArrowRight className="h-5 w-5 shrink-0 text-[#EE4D2D]/60" />

                {/* Shopee logo */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-500 ${validated ? "border-emerald-400 bg-emerald-50" : "border-[#EE4D2D]/15 bg-white"}`}>
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
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conectada
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
              <BenefitRow icon={<Zap className="h-4 w-4 text-[#EE4D2D]" />} text="Sincronização automática de produtos" />
              <BenefitRow icon={<RefreshCw className="h-4 w-4 text-[#EE4D2D]" />} text="Pedidos atualizados em tempo real" />
              <BenefitRow icon={<TrendingUp className="h-4 w-4 text-[#EE4D2D]" />} text="Comissões calculadas automaticamente" />
            </div>

            {/* ── CTA ── */}
            <div className="border-t border-gray-100 px-8 pb-8 pt-5">
              {validated ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Shopee conectada</p>
                      <p className="text-xs text-emerald-600">Conta validada e pronta para uso</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActive(shopee)}
                    className="w-full rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-500 shadow-sm shadow-black/[0.02] transition-all hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
                  >
                    Reconectar
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setActive(shopee)}
                  className="h-11 w-full rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]"
                >
                  Conectar conta Shopee
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ShopeeConnectionDialog
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF8F5]">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CONNECTION DIALOG
// ═══════════════════════════════════════════════════════════════════════

function ShopeeConnectionDialog({
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

  const validated = integration.status === "Conexão validada" || integration.status === "Ativo";
  const rejected = integration.status === "Conexão recusada";
  const step1Done = progress >= 33;
  const step2Done = progress >= 66;
  const step3Done = phase === "done";
  const lineConnected = phase === "done" && !rejected;

  return (
    <Dialog open={!!integration} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-xl shadow-black/[0.08]">
        <style>{`
          @keyframes dialogConfetti {
            0%   { transform: translateY(-6px) rotate(0deg) scale(1); opacity: 1; }
            100% { transform: translateY(100px) rotate(540deg) scale(0.3); opacity: 0; }
          }
          @keyframes dialogTravelDot {
            0%   { left: 6%;  opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { left: 90%; opacity: 0; }
          }
        `}</style>

        <div className="p-6">
          {/* ── Logos + animated connection line ── */}
          <div className="flex items-center gap-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
              <img
                src="/brand/shopesync-logo.png"
                alt="UpShopee"
                className="h-8 w-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>

            {/* Animated line */}
            <div className="relative flex-1">
              <div className={`border-t-2 transition-all duration-700 ${lineConnected ? "border-emerald-400" : "border-dashed border-[#EE4D2D]/20"}`} />

              {phase === "loading" && [0, 0.4, 0.8].map((delay, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#EE4D2D] shadow-sm shadow-[#EE4D2D]/30"
                  style={{ animation: "dialogTravelDot 1.2s ease-in-out infinite", animationDelay: `${delay}s`, left: "6%" }}
                />
              ))}

              {lineConnected && (
                <div className="absolute left-1/2 top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40 animate-in zoom-in duration-300">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-700 ${lineConnected ? "border-emerald-400 bg-emerald-50" : "border-[#EE4D2D]/15 bg-white"}`}>
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
            <ConnectionStep label="Iniciando conexão..." done={step1Done} active={!step1Done && progress > 0} />
            <ConnectionStep label="Autenticando com a Shopee..." done={step2Done} active={step1Done && !step2Done} />
            <ConnectionStep label="Sincronizando dados..." done={step3Done} active={step2Done && !step3Done} />
          </div>

          {/* ── Progress bar (loading) ── */}
          {phase === "loading" && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
                <span>Processando...</span>
                <span className="font-mono text-[#EE4D2D]">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[#EE4D2D] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* ── Success / done CTA ── */}
          {phase === "done" && (
            <div className="relative mt-5 overflow-visible">
              {!rejected && (
                <div className="pointer-events-none absolute -top-6 left-0 right-0">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-1.5 w-1.5 rounded-full"
                      style={{
                        background: ["#EE4D2D", "#10B981", "#8B5CF6", "#3B82F6", "#F59E0B"][i % 5],
                        left: `${4 + i * 9}%`,
                        animation: "dialogConfetti 1s ease-out forwards",
                        animationDelay: `${i * 0.07}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              <Button
                className={`h-10 w-full rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${rejected ? "bg-gray-700 text-white hover:bg-gray-800" : "bg-[#EE4D2D] text-white shadow-[#EE4D2D]/25 hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30"}`}
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

function ConnectionStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${done ? "bg-emerald-50" : active ? "bg-[#FFF8F5]" : "bg-gray-50"}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : active ? "bg-[#EE4D2D]" : "bg-gray-200"}`}>
        {done
          ? <Check className="h-3.5 w-3.5 text-white" />
          : active
            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            : <span className="h-2 w-2 rounded-full bg-gray-400" />}
      </div>
      <span className={`text-sm font-medium transition-colors duration-500 ${done ? "text-emerald-700" : active ? "text-[#EE4D2D]" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}
