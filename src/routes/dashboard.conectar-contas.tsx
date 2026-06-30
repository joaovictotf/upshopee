import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations as initial, type Integration } from "../lib/mock/integrations";
import { useApp, type Marketplace } from "../lib/state";
import { Dialog, DialogContent } from "../components/ui/dialog";
import {
  Loader2, Check, RefreshCw, TrendingUp, ArrowRight, Package,
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-gray-500">Nenhuma integração disponível no momento.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]"
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
    <>
      <style>{`
        /* ── Connection pulse ── */
        @media (prefers-reduced-motion: no-preference) {
          @keyframes cn-path-pulse {
            0%   { left: 5%; opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { left: 88%; opacity: 0; }
          }
          @keyframes cn-dot-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.4); }
            50%      { box-shadow: 0 0 0 5px rgba(238, 77, 45, 0); }
          }
          @keyframes cn-benefit-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .cn-benefit-1 { animation: cn-benefit-in 0.4s 0.1s ease-out both; }
          .cn-benefit-2 { animation: cn-benefit-in 0.4s 0.25s ease-out both; }
          .cn-benefit-3 { animation: cn-benefit-in 0.4s 0.4s ease-out both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cn-benefit-1, .cn-benefit-2, .cn-benefit-3 { animation: none; opacity: 1; }
        }
      `}</style>

      <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
        <div className="mx-auto max-w-2xl">

          {/* Main connection card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">

            {/* ── Connection path: UpShopee → Shopee ── */}
            <div className="flex items-center justify-center gap-3 mb-7">
              {/* UpShopee logo */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white">
                <img
                  src="/brand/shopesync-logo.png"
                  alt="UpShopee"
                  className="h-9 w-9 object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>

              {/* Connection line with nodes + animated pulse */}
              <div className="relative flex-1 mx-2">
                {/* Base line */}
                <div className="absolute inset-y-0 top-1/2 -translate-y-1/2 h-px w-full bg-gray-150" style={{ backgroundColor: "#e5e7eb" }} />

                {/* Three nodes */}
                <div className="relative flex items-center justify-between px-0" style={{ height: 32 }}>
                  {["w-1.5 h-1.5", "w-2 h-2", "w-1.5 h-1.5"].map((size, i) => (
                    <div
                      key={i}
                      className={`${size} rounded-full`}
                      style={{ backgroundColor: i === 1 ? "#EE4D2D" : "#d1d5db", opacity: i === 1 ? 1 : 0.6 }}
                    />
                  ))}

                  {/* Animated pulse */}
                  <div
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#EE4D2D]"
                    style={{ animation: "cn-path-pulse 2.6s ease-in-out infinite" }}
                  />
                </div>
              </div>

              {/* Direction arrow */}
              <ArrowRight className="h-4 w-4 shrink-0 text-[#EE4D2D]/50" />

              {/* Shopee logo */}
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500 ${validated ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-white"}`}>
                <img
                  src={shopee.logo}
                  alt="Shopee"
                  className="h-9 w-9 object-contain"
                  onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${shopee.id}-logo.svg`; }}
                />
              </div>
            </div>

            {/* ── Status badge ── */}
            <div className="flex justify-center mb-7">
              {validated ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" style={{ animation: "cn-dot-pulse 2.4s ease-in-out infinite" }} />
                  Conectada
                </span>
              ) : pending ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Em análise
                </span>
              ) : rejected ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Conexão recusada
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-gray-400" style={{ animation: "cn-dot-pulse 2.4s ease-in-out infinite" }} />
                  Pronto para conectar
                </span>
              )}
            </div>

            {/* ── Benefits ── */}
            <div className="space-y-3 mb-8 border-t border-gray-100 pt-6">
              <div className="cn-benefit-1 flex items-center gap-3 text-sm text-gray-600 opacity-0">
                <RefreshCw className="h-4 w-4 shrink-0 text-gray-400" />
                Sincronização automática de produtos
              </div>
              <div className="cn-benefit-2 flex items-center gap-3 text-sm text-gray-600 opacity-0">
                <Package className="h-4 w-4 shrink-0 text-gray-400" />
                Pedidos atualizados em tempo real
              </div>
              <div className="cn-benefit-3 flex items-center gap-3 text-sm text-gray-600 opacity-0">
                <TrendingUp className="h-4 w-4 shrink-0 text-gray-400" />
                Comissões organizadas automaticamente
              </div>
            </div>

            {/* ── CTA ── */}
            {validated ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800 text-center">Conta conectada e pronta para uso</p>
              </div>
            ) : (
              <button
                onClick={() => setActive(shopee)}
                className="group relative w-full rounded-xl bg-[#EE4D2D] py-3 text-[14px] font-semibold text-white shadow-sm shadow-[#EE4D2D]/15 outline-none transition-all duration-200 hover:-translate-y-px hover:bg-[#e04525] hover:shadow-md hover:shadow-[#EE4D2D]/25 focus-visible:ring-2 focus-visible:ring-[#EE4D2D]/40 focus-visible:ring-offset-2 active:translate-y-0 active:shadow-sm"
              >
                <span className="inline-flex items-center gap-2">
                  Conectar conta Shopee
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </button>
            )}
          </div>
        </div>

        <ShopeeConnectionDialog
          integration={active}
          onClose={() => setActive(null)}
          onFinish={onFinish}
        />
      </DashboardShell>
    </>
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
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes dlg-node-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.5); }
            50%      { box-shadow: 0 0 0 8px rgba(238, 77, 45, 0); }
          }
          @keyframes dlg-done-pop {
            0%   { transform: scale(0.5); opacity: 0; }
            60%  { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        }
      `}</style>

      <Dialog open={!!integration} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-sm overflow-hidden rounded-2xl border-0 bg-white p-6 shadow-sm">
          {/* Logos + connection line */}
          <div className="flex items-center justify-center gap-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white">
              <img
                src="/brand/shopesync-logo.png"
                alt="UpShopee"
                className="h-8 w-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>

            <div className="flex items-center flex-1 mx-0">
              <div className={`h-px flex-1 ${lineConnected ? "bg-emerald-400" : "bg-gray-200"}`} />
            </div>

            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors duration-500 ${lineConnected ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-white"}`}>
              <img
                src={integration.logo}
                alt={integration.name}
                className="h-8 w-8 object-contain"
                onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${integration.id}-logo.svg`; }}
              />
            </div>
          </div>

          {/* Central connection node */}
          <div className="flex justify-center -mt-2.5 mb-2">
            <div
              className={`flex items-center justify-center rounded-full transition-all duration-500 ${
                phase === "loading" ? "h-5 w-5 bg-[#EE4D2D]" : lineConnected ? "h-6 w-6 bg-emerald-500" : "h-5 w-5 bg-gray-200"
              }`}
              style={phase === "loading" ? { animation: "dlg-node-pulse 1.8s ease-in-out infinite" } : lineConnected ? { animation: "dlg-done-pop 0.35s ease-out both" } : undefined}
            >
              {lineConnected && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
          </div>

          {/* Title */}
          <div className="mt-3 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {phase === "done"
                ? validated ? "Conta conectada com sucesso!" : rejected ? "Conexão recusada" : "Conexão solicitada!"
                : `Conectando com ${integration.name}`}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {phase === "done"
                ? validated ? "Seus dados estão sincronizados e prontos para uso." : rejected ? "Entre em contato com o suporte." : "Sua solicitação está em análise. Prazo: até 3 dias úteis."
                : "Aguarde enquanto estabelecemos a conexão..."}
            </p>
          </div>

          {/* Three steps */}
          <div className="mt-5 space-y-1.5">
            <ConnectionStep label="Iniciando conexão..." done={step1Done} active={!step1Done && progress > 0} />
            <ConnectionStep label="Autenticando com a Shopee..." done={step2Done} active={step1Done && !step2Done} />
            <ConnectionStep label="Sincronizando dados..." done={step3Done} active={step2Done && !step3Done} />
          </div>

          {/* Progress bar */}
          {phase === "loading" && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
                <span>Processando...</span>
                <span className="font-mono text-[#EE4D2D]">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[#EE4D2D] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Done CTA */}
          {phase === "done" && (
            <div className="mt-5">
              <button
                onClick={onClose}
                className={`h-10 w-full rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 ${
                  rejected
                    ? "bg-gray-600 hover:bg-gray-700 hover:shadow-md hover:shadow-gray-600/20"
                    : "bg-[#EE4D2D] hover:bg-[#e04525] hover:shadow-md hover:shadow-[#EE4D2D]/25"
                }`}
              >
                {rejected ? "Fechar" : "Concluir"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ConnectionStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500 ${done ? "bg-emerald-50/60" : active ? "bg-gray-50" : "bg-gray-50/50"}`}>
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : active ? "bg-[#EE4D2D]" : "bg-gray-200"}`}>
        {done
          ? <Check className="h-3 w-3 text-white" />
          : active
            ? <Loader2 className="h-3 w-3 animate-spin text-white" />
            : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
      </div>
      <span className={`text-[13px] font-medium transition-colors duration-500 ${done ? "text-emerald-700" : active ? "text-gray-800" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}
