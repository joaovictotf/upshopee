import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations as initial, type Integration } from "../lib/mock/integrations";
import { useApp, type Marketplace } from "../lib/state";
import { Dialog, DialogContent } from "../components/ui/dialog";
import {
  Loader2, Check, RefreshCw, TrendingUp, ArrowRight, Package,
  ShoppingBag, Clock, X,
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
// 3-state machine — replaces 9-step setTimeout spaghetti
// ═══════════════════════════════════════════════════════════════════════

type ConnectState = "idle" | "connecting" | "done";

type ConnectAction = "start" | "finish" | "reset";

function connectReducer(state: ConnectState, action: ConnectAction): ConnectState {
  switch (action) {
    case "start":  return state === "idle" ? "connecting" : state;
    case "finish": return state === "connecting" ? "done" : state;
    case "reset":  return "idle";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SHOPEE CONNECTION VIEW
// ═══════════════════════════════════════════════════════════════════════

function ShopeeView({ items, active, setActive, onFinish }: ViewProps) {
  const shopee = items[0];
  const { data } = useApp();
  const [state, dispatch] = useReducer(connectReducer, "idle");

  // ── Reset state machine when dialog closes ──
  useEffect(() => {
    if (!active && state !== "idle") {
      dispatch("reset");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ── Click handler: one line to start, one line for reduced-motion fallback ──
  const handleConnectClick = useCallback(() => {
    if (state !== "idle") return;
    dispatch("start");

    // Accessibility: skip animation when user prefers reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      dispatch("finish");
      setActive(shopee);
    }
  }, [state, shopee, setActive]);

  // ── Animation end callback: CSS animation (1.8s) completed → open dialog ──
  const handleAnimEnd = useCallback((e: React.AnimationEvent) => {
    if (e.target === e.currentTarget) {
      dispatch("finish");
      setActive(shopee);
    }
  }, [shopee, setActive]);

  // ── Derived values ──
  const validated = shopee?.status === "Conexão validada" || shopee?.status === "Ativo";
  const rejected = shopee?.status === "Conexão recusada";

  const idleStatusLabel = validated ? "Conta Shopee conectada"
    : rejected ? "Conexão recusada"
    : shopee?.status === "Conexão em análise" || shopee?.status === "Conexão solicitada" || shopee?.status === "Em análise" ? "Em análise"
    : "Pronto para conectar";

  const idleDotColor = validated ? "bg-[var(--accent)]"
    : rejected ? "bg-[var(--muted)]"
    : shopee?.status === "Conexão em análise" || shopee?.status === "Conexão solicitada" || shopee?.status === "Em análise" ? "bg-[var(--accent-2)]"
    : "bg-[var(--border)]";

  const idleTextColor = validated ? "text-[var(--accent)]"
    : rejected ? "text-[var(--muted)]"
    : shopee?.status === "Conexão em análise" || shopee?.status === "Conexão solicitada" || shopee?.status === "Em análise" ? "text-[var(--accent-2)]"
    : "text-[var(--muted)]";

  // ── Stats derived from real data ──
  const totalProducts = data?.salesOrders?.length ?? 127;
  const totalOrders = data?.salesOrders?.reduce((sum, o) => sum + ((o as any).quantity ?? 1), 0) ?? 0;
  const totalCommission = data?.salesOrders?.reduce((sum, o) => sum + ((o as any).commission ?? 0), 0) ?? 0;

  if (!shopee) return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="page-enter flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <ShoppingBag className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text)]">Nenhuma integração disponível no momento.</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Tente novamente mais tarde ou entre em contato com o suporte.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-semibold text-[var(--muted)] transition-all duration-200 hover:border-[var(--accent)]/30 hover:text-[var(--accent)] hover:shadow-[var(--shadow-card)]"
        >
          Tentar novamente
        </button>
      </div>
    </DashboardShell>
  );

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════════════════════
           ALL CSS animations — no JS timers involved
           ═══════════════════════════════════════════════════════════ */

        @media (prefers-reduced-motion: no-preference) {
          /* ── Dummy animation on the container for onAnimationEnd timing ── */
          @keyframes cc-timeline {
            from, to { /* 1.8s timeline — no visual change */ }
          }
          .cc-state-connecting {
            animation: cc-timeline 1.8s both;
          }

          /* ── Energy pulse dot travel left→right ── */
          @keyframes cc-energy-travel {
            0%   { left: 0%; opacity: 0.3; transform: translateY(-50%) scale(1); }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { left: 100%; opacity: 0.3; transform: translateY(-50%) scale(1); }
          }
          .cc-energy-pulse-dot {
            animation: cc-energy-travel 2.5s ease-in-out infinite;
          }

          /* ── Energy pulse faster during connecting ── */
          @keyframes cc-energy-travel-fast {
            0%   { left: 0%; opacity: 0.3; transform: translateY(-50%) scale(1); }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { left: 100%; opacity: 0.3; transform: translateY(-50%) scale(1); }
          }
          .cc-state-connecting .cc-energy-pulse-dot {
            animation: cc-energy-travel-fast 0.6s ease-in-out infinite;
          }

          /* ── Status dot breathe (idle) ── */
          @keyframes cc-dot-breathe {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 84, 30, 0.35); }
            50%      { box-shadow: 0 0 0 6px rgba(244, 84, 30, 0); }
          }
          .cc-dot-breathe {
            animation: cc-dot-breathe 2.4s ease-in-out infinite;
          }

          /* ── Status dot pulse (connecting) ── */
          @keyframes cc-dot-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 84, 30, 0.5); }
            50%      { box-shadow: 0 0 0 7px rgba(244, 84, 30, 0); }
          }
          .cc-state-connecting .cc-dot-status {
            animation: cc-dot-pulse 1s ease-in-out infinite;
          }

          /* ── Logo glow (two instances with different delays) ── */
          @keyframes cc-logo-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 84, 30, 0.25); }
            50%      { box-shadow: 0 0 0 8px rgba(244, 84, 30, 0); }
          }
          .cc-state-connecting .cc-logo-up    { animation: cc-logo-glow 1.4s ease-out both; animation-delay: 0.05s; }
          .cc-state-connecting .cc-logo-shopee { animation: cc-logo-glow 1.4s ease-out both; animation-delay: 0.55s; }

          /* ── Track fill animation ── */
          @keyframes cc-track-fill {
            from { width: 0%; }
            to   { width: 100%; }
          }
          .cc-state-connecting .cc-track-fill {
            animation: cc-track-fill 0.9s ease-out both;
          }

          /* ── Status text layers (each fades in and stays, stacked with absolute) ── */
          .cc-status-step {
            opacity: 0;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
          }
          @keyframes cc-status-in {
            from { opacity: 0; transform: translateX(-50%) translateY(3px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
          .cc-state-connecting .cc-status-s1 { animation: cc-status-in 0.18s ease both; animation-delay: 0s; }
          .cc-state-connecting .cc-status-s2 { animation: cc-status-in 0.18s ease both; animation-delay: 0.4s; }
          .cc-state-connecting .cc-status-s3 { animation: cc-status-in 0.18s ease both; animation-delay: 0.65s; }
          .cc-state-connecting .cc-status-s4 { animation: cc-status-in 0.18s ease both; animation-delay: 1.35s; }

          /* ── Benefit highlight — each fires at staggered delay, uses accent tint ── */
          @keyframes cc-benefit-pop {
            0%   { background-color: transparent; border-left-color: var(--border); }
            25%  { background-color: rgba(244, 84, 30, 0.12); border-left-color: #F4541E; }
            100% { background-color: rgba(244, 84, 30, 0.06); border-left-color: #F4541E; }
          }
          .cc-state-connecting .cc-benefit-1 {
            animation: cc-benefit-pop 0.5s ease-out both;
            animation-delay: 0.95s;
          }
          .cc-state-connecting .cc-benefit-2 {
            animation: cc-benefit-pop 0.5s ease-out both;
            animation-delay: 1.15s;
          }
          .cc-state-connecting .cc-benefit-3 {
            animation: cc-benefit-pop 0.5s ease-out both;
            animation-delay: 1.35s;
          }

          /* ── Benefit icon: default fades out, check fades in ── */
          .cc-benefit-icon-def { transition: opacity 0.2s; }
          .cc-benefit-icon-ok  { opacity: 0; }
          @keyframes cc-icon-fade-in {
            from { opacity: 0; transform: scale(0.7); }
            to   { opacity: 1; transform: scale(1); }
          }
          .cc-state-connecting .cc-benefit-1 .cc-benefit-icon-def { opacity: 0; transition-delay: 0.95s; }
          .cc-state-connecting .cc-benefit-1 .cc-benefit-icon-ok  { animation: cc-icon-fade-in 0.25s ease both; animation-delay: 0.95s; }
          .cc-state-connecting .cc-benefit-2 .cc-benefit-icon-def { opacity: 0; transition-delay: 1.15s; }
          .cc-state-connecting .cc-benefit-2 .cc-benefit-icon-ok  { animation: cc-icon-fade-in 0.25s ease both; animation-delay: 1.15s; }
          .cc-state-connecting .cc-benefit-3 .cc-benefit-icon-def { opacity: 0; transition-delay: 1.35s; }
          .cc-state-connecting .cc-benefit-3 .cc-benefit-icon-ok  { animation: cc-icon-fade-in 0.25s ease both; animation-delay: 1.35s; }

          /* ── Benefit text color transition ── */
          .cc-benefit-title { transition: color 0.3s; }
          .cc-state-connecting .cc-benefit-1 .cc-benefit-title { color: #D14818; transition-delay: 0.95s; }
          .cc-state-connecting .cc-benefit-2 .cc-benefit-title { color: #D14818; transition-delay: 1.15s; }
          .cc-state-connecting .cc-benefit-3 .cc-benefit-title { color: #D14818; transition-delay: 1.35s; }

          /* ── Button ripple (pure CSS via :active::after) ── */
          @keyframes cc-ripple {
            from { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            to   { transform: translate(-50%, -50%) scale(15); opacity: 0; }
          }
          .cc-btn-ripple {
            position: relative;
            overflow: hidden;
          }
          .cc-btn-ripple::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 16px;
            height: 16px;
            margin-left: -8px;
            margin-top: -8px;
            background: rgba(255, 255, 255, 0.45);
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
          }
          .cc-btn-ripple:not(:disabled):active::after {
            animation: cc-ripple 0.6s ease-out;
          }
        }

        /* ── Reduced-motion: all animations disabled, state transitions are instant ── */
        @media (prefers-reduced-motion: reduce) {
          .cc-state-connecting {
            animation: none;
          }
          .cc-energy-pulse-dot { animation: none; }
          .cc-dot-breathe { animation: none; }
          .cc-state-connecting .cc-dot-status { animation: none; }
          .cc-state-connecting .cc-logo-up,
          .cc-state-connecting .cc-logo-shopee { animation: none; }
          .cc-state-connecting .cc-track-fill { animation: none; width: 100%; }
          .cc-state-connecting .cc-energy-pulse-dot { animation: none; left: 100%; opacity: 1; }
          .cc-status-step { opacity: 0; position: static; transform: none; }
          .cc-state-connecting .cc-status-s1,
          .cc-state-connecting .cc-status-s2,
          .cc-state-connecting .cc-status-s3,
          .cc-state-connecting .cc-status-s4 { animation: none; opacity: 1; }
          .cc-state-connecting .cc-benefit-1,
          .cc-state-connecting .cc-benefit-2,
          .cc-state-connecting .cc-benefit-3 { animation: none; background-color: rgba(244, 84, 30, 0.06); border-left-color: #F4541E; }
          .cc-state-connecting .cc-benefit-icon-def { opacity: 0; }
          .cc-state-connecting .cc-benefit-icon-ok  { animation: none; opacity: 1; }
          .cc-state-connecting .cc-benefit-title { color: #D14818; }
          .cc-btn-ripple::after { display: none; }
        }

        /* ── Stats row entrance (only on connected page load, not on state change) ── */
        @media (prefers-reduced-motion: no-preference) {
          @keyframes cc-stat-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .cc-stat-in-1 { animation: cc-stat-in 0.35s ease-out both; }
          .cc-stat-in-2 { animation: cc-stat-in 0.35s 0.08s ease-out both; }
          .cc-stat-in-3 { animation: cc-stat-in 0.35s 0.16s ease-out both; }
        }
      `}</style>

      <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
        <div className="page-enter mx-auto w-full max-w-[560px]">

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CONNECTION CARD                                        */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div
            className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)] sm:p-8 ${
              state === "connecting" ? "cc-state-connecting" : ""
            }`}
            onAnimationEnd={handleAnimEnd}
          >

            {/* ── A. Connection visual: two logo tiles + track ── */}
            <div className="flex items-center justify-center gap-0 mb-6">
              {/* UpShopee logo tile */}
              <div className={`cc-logo-up flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-card)] transition-all duration-500 ${
                validated ? "border-[var(--accent-soft)]" : ""
              }`}>
                <img
                  src="/brand/logo.png"
                  alt="UpShopee"
                  className="h-9 w-auto object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>

              {/* Track with energy pulse */}
              <div className="relative flex-1 mx-3" style={{ height: 24 }}>
                {/* Base track */}
                <div className="absolute inset-y-0 top-1/2 -translate-y-1/2 h-px w-full bg-[var(--border)] rounded-full" />
                {/* Animated fill track */}
                <div className={`cc-track-fill absolute inset-y-0 top-1/2 -translate-y-1/2 h-px rounded-full ${
                  validated ? "bg-[var(--accent)] w-full" : "bg-[var(--accent)]/20"
                }`} />
                {/* Energy pulse dot (only when not connected) */}
                {!validated && (
                  <span
                    className="cc-energy-pulse-dot absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[var(--shadow-glow)]"
                    style={{ marginLeft: -5 }}
                  />
                )}
                {/* Solid dot at center when connected */}
                {validated && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </div>

              {/* Shopee logo tile */}
              <div className={`cc-logo-shopee flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border bg-[var(--surface)] p-2 shadow-[var(--shadow-card)] transition-all duration-500 ${
                validated ? "border-[var(--accent-soft)] bg-[var(--accent-soft)]"
                : rejected ? "border-[var(--border-warm)]"
                : "border-[var(--border)]"
              }`}>
                <img
                  src={shopee.logo}
                  alt="Shopee"
                  className="h-9 w-9 object-contain"
                  onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${shopee.id}-logo.svg`; }}
                />
              </div>
            </div>

            {/* ── B. Status pill ── */}
            <div className="flex justify-center mb-7">
              <span className={`inline-flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm font-medium shadow-[var(--shadow-card)] ${
                state === "connecting" ? "text-[var(--accent)] border-[var(--accent-soft)]" : idleTextColor
              }`}>
                <span className={`cc-dot-status inline-block h-2.5 w-2.5 rounded-full ${
                  state === "connecting" ? "bg-[var(--accent)]"
                  : state === "idle" && !validated && !rejected ? `cc-dot-breathe ${idleDotColor}`
                  : idleDotColor
                }`} />
                <span className="relative inline-block" style={{ minWidth: 140, height: 20 }}>
                  {/* Idle text */}
                  <span className={`transition-opacity duration-200 ${state === "connecting" ? "opacity-0" : "opacity-100"}`}>
                    {idleStatusLabel}
                  </span>
                  {/* Connecting text layers — stacked with absolute, only visible during animation */}
                  {state === "connecting" && (
                    <>
                      <span className="cc-status-step cc-status-s1">Conectando...</span>
                      <span className="cc-status-step cc-status-s2">Iniciando conexão...</span>
                      <span className="cc-status-step cc-status-s3">Conectando com a Shopee...</span>
                      <span className="cc-status-step cc-status-s4">Redirecionando...</span>
                    </>
                  )}
                </span>
              </span>
            </div>

            {/* ── C. Benefits ── */}
            <div className="space-y-2.5 mb-8 border-t border-[var(--border)] pt-6">
              {/* Benefit 1 */}
              <div className="cc-benefit-1 group flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 border-l-[3px] border-l-[var(--border)] hover:border-l-[var(--accent)] hover:shadow-[var(--shadow-card)] transition-all duration-200">
                <span className="mt-0.5 shrink-0 relative h-5 w-5">
                  <div className="cc-benefit-icon-def absolute inset-0 flex items-center justify-center rounded-md bg-[var(--muted-bg)] p-0.5">
                    <RefreshCw className="h-4 w-4 text-[var(--muted)]" />
                  </div>
                  <div className="cc-benefit-icon-ok absolute inset-0 flex items-center justify-center rounded-md bg-[var(--accent-soft)] p-0.5">
                    <Check className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                </span>
                <div>
                  <p className="cc-benefit-title text-sm font-semibold text-[var(--text)]">
                    Sincronização automática de produtos
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Seus produtos são importados e organizados automaticamente
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="cc-benefit-2 group flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 border-l-[3px] border-l-[var(--border)] hover:border-l-[var(--accent)] hover:shadow-[var(--shadow-card)] transition-all duration-200">
                <span className="mt-0.5 shrink-0 relative h-5 w-5">
                  <div className="cc-benefit-icon-def absolute inset-0 flex items-center justify-center rounded-md bg-[var(--muted-bg)] p-0.5">
                    <Package className="h-4 w-4 text-[var(--muted)]" />
                  </div>
                  <div className="cc-benefit-icon-ok absolute inset-0 flex items-center justify-center rounded-md bg-[var(--accent-soft)] p-0.5">
                    <Check className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                </span>
                <div>
                  <p className="cc-benefit-title text-sm font-semibold text-[var(--text)]">
                    Pedidos atualizados em tempo real
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Acompanhe cada venda assim que ela acontece
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="cc-benefit-3 group flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 border-l-[3px] border-l-[var(--border)] hover:border-l-[var(--accent)] hover:shadow-[var(--shadow-card)] transition-all duration-200">
                <span className="mt-0.5 shrink-0 relative h-5 w-5">
                  <div className="cc-benefit-icon-def absolute inset-0 flex items-center justify-center rounded-md bg-[var(--muted-bg)] p-0.5">
                    <TrendingUp className="h-4 w-4 text-[var(--muted)]" />
                  </div>
                  <div className="cc-benefit-icon-ok absolute inset-0 flex items-center justify-center rounded-md bg-[var(--accent-soft)] p-0.5">
                    <Check className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                </span>
                <div>
                  <p className="cc-benefit-title text-sm font-semibold text-[var(--text)]">
                    Comissões organizadas automaticamente
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Veja exatamente quanto você ganhou em cada produto
                  </p>
                </div>
              </div>
            </div>

            {/* ── D. CTA / Connected / Rejected state ── */}
            {validated ? (
              /* Connected state — account info card */
              <div className="rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar — Shopee initial */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]">
                    <span className="text-base font-bold text-white">S</span>
                  </div>
                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{shopee.name}</p>
                    <p className="text-xs text-[var(--muted)]">Conta conectada e ativa</p>
                  </div>
                  {/* Desvincular ghost button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info("Desvincular conta", { description: "Esta funcionalidade estará disponível em breve." });
                    }}
                    className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-warm)] hover:text-[var(--accent)] transition-all duration-200"
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            ) : rejected ? (
              /* Rejected state */
              <div className="rounded-2xl border border-[var(--border-warm)] bg-[var(--surface)] p-5 text-center">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]/70">
                  <X className="h-4 w-4" />
                  Conexão recusada
                </span>
                <p className="mt-1.5 text-xs text-[var(--muted)]">Sua solicitação de conexão foi recusada. Entre em contato com o suporte para entender o motivo.</p>
                <button
                  onClick={() => window.open("https://wa.me/5534992017453", "_blank")}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-warm)] hover:text-[var(--accent)] transition-all duration-200"
                >
                  Entrar em contato com suporte
                </button>
              </div>
            ) : (
              /* Idle — CTA button */
              <div>
                <button
                  onClick={handleConnectClick}
                  disabled={state !== "idle"}
                  className={`cc-btn-ripple group relative w-full rounded-2xl py-4 text-[15px] font-semibold text-white outline-none transition-all duration-300 ${
                    state !== "idle"
                      ? "cursor-not-allowed bg-[var(--muted)]"
                      : "bg-[var(--accent-gradient)] hover:shadow-[var(--shadow-glow)] hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-2"
                  }`}
                >
                  {state === "connecting" ? (
                    <span className="relative inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Conectando...
                    </span>
                  ) : (
                    <span className="relative inline-flex items-center gap-2">
                      Conectar conta Shopee
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  )}
                </button>
                <p className="text-center text-xs text-[var(--muted)] mt-3">
                  Conexão segura — você pode desvincular quando quiser.
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* FOOTER STATS (connected only)                          */}
          {/* ═══════════════════════════════════════════════════════ */}
          {validated && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="cc-stat-in-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center shadow-[var(--shadow-card)]">
                <p className="text-lg font-semibold text-[var(--text)]">{totalProducts}</p>
                <p className="text-[11px] text-[var(--muted)]">Produtos</p>
              </div>
              <div className="cc-stat-in-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center shadow-[var(--shadow-card)]">
                <p className="text-lg font-semibold text-[var(--text)]">
                  {totalOrders >= 1000 ? `${(totalOrders / 1000).toFixed(1)}k` : totalOrders}
                </p>
                <p className="text-[11px] text-[var(--muted)]">Pedidos</p>
              </div>
              <div className="cc-stat-in-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center shadow-[var(--shadow-card)]">
                <p className="text-lg font-semibold text-[var(--text)]">
                  {totalCommission >= 1000
                    ? `R$ ${(totalCommission / 1000).toFixed(1)}k`
                    : `R$ ${totalCommission.toFixed(0)}`}
                </p>
                <p className="text-[11px] text-[var(--muted)]">Comissão</p>
              </div>
            </div>
          )}
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
// CONNECTION DIALOG — preserved logic, restyled with design tokens
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
  const isPending = alreadyConnected && !validated && !rejected;
  const step1Done = progress >= 33;
  const step2Done = progress >= 66;
  const step3Done = phase === "done";

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes cd-icon-pop {
            0%   { transform: scale(0.3); opacity: 0; }
            60%  { transform: scale(1.12); }
            100% { transform: scale(1); opacity: 1; }
          }
          .cd-icon-pop {
            animation: cd-icon-pop 0.4s ease-out both;
          }

          @keyframes cd-icon-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 84, 30, 0.4); }
            50%      { box-shadow: 0 0 0 10px rgba(244, 84, 30, 0); }
          }
          .cd-icon-pulse {
            animation: cd-icon-pulse 2s ease-in-out infinite;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cd-icon-pop { animation: none; }
          .cd-icon-pulse { animation: none; }
        }
      `}</style>

      <Dialog open={!!integration} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-0 bg-[var(--surface)] p-0 shadow-[var(--shadow-elevated)]">
          {/* Top colored strip */}
          <div className={`h-1.5 w-full transition-colors duration-500 ${
            phase === "done"
              ? validated ? "bg-[var(--accent)]" : rejected ? "bg-[var(--muted)]" : isPending ? "bg-[var(--accent-2)]" : "bg-[var(--accent)]"
              : "bg-[var(--accent)]"
          }`} />

          <div className="p-6">
            {/* ── Centered animated icon ── */}
            <div className="flex justify-center">
              <div className={`flex items-center justify-center rounded-full transition-all duration-500 ${
                phase === "done"
                  ? validated ? "bg-[var(--accent-soft)] h-16 w-16" : rejected ? "bg-[var(--muted-bg)] h-16 w-16" : "bg-[var(--accent-soft)] h-16 w-16"
                  : "bg-[var(--accent-soft)] h-16 w-16 cd-icon-pulse"
              }`}>
                {phase === "loading" ? (
                  <div className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                ) : validated ? (
                  <Check className="h-8 w-8 text-[var(--accent)] cd-icon-pop" />
                ) : rejected ? (
                  <X className="h-8 w-8 text-[var(--muted)] cd-icon-pop" />
                ) : (
                  <Clock className="h-8 w-8 text-[var(--accent-2)] cd-icon-pop" />
                )}
              </div>
            </div>

            {/* ── Title ── */}
            <div className="mt-4 text-center">
              <h2 className={`text-base font-semibold transition-colors duration-500 ${
                phase === "done"
                  ? validated ? "text-[var(--accent)]" : rejected ? "text-[var(--muted)]" : "text-[var(--accent-2)]"
                  : "text-[var(--text)]"
              }`}>
                {phase === "done"
                  ? validated
                    ? "Conexão estabelecida!"
                    : rejected
                    ? "Não foi possível conectar"
                    : "Solicitação enviada"
                  : "Estabelecendo conexão segura"}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {phase === "done"
                  ? validated
                    ? "Sua conta está sincronizada e pronta para uso."
                    : rejected
                    ? "Entre em contato com o suporte para resolver."
                    : "Sua solicitação está em análise. Prazo: até 3 dias úteis."
                  : "Aguarde enquanto sincronizamos seus dados..."}
              </p>
            </div>

            {/* ── Steps (loading only) ── */}
            {phase === "loading" && (
              <div className="mt-5 space-y-1.5">
                <DialogStep label="Iniciando conexão..." done={step1Done} active={!step1Done && progress > 0} />
                <DialogStep label="Autenticando com a Shopee..." done={step2Done} active={step1Done && !step2Done} />
                <DialogStep label="Sincronizando dados..." done={step3Done} active={step2Done && !step3Done} />
              </div>
            )}

            {/* ── Progress bar (loading only) ── */}
            {phase === "loading" && (
              <div className="mt-5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--muted-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── Close button (done only) ── */}
            {phase === "done" && (
              <div className="mt-5">
                <button
                  onClick={onClose}
                  className={`h-10 w-full rounded-xl text-sm font-semibold text-white transition-colors duration-200 ${
                    rejected
                      ? "bg-[var(--muted)] hover:bg-[var(--text)]/40"
                      : "bg-[var(--accent)] hover:bg-[var(--accent-2)]"
                  }`}
                >
                  {rejected ? "Fechar" : "Concluir"}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DialogStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500 ${
      done ? "bg-[var(--accent-soft)]/40" : active ? "bg-[var(--accent-soft)]/60" : "bg-transparent"
    }`}>
      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
        done ? "bg-[var(--accent)]" : active ? "bg-[var(--accent)]" : "bg-[var(--border)]"
      }`}>
        {done
          ? <Check className="h-2.5 w-2.5 text-white" />
          : active
            ? <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
            : <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />}
      </div>
      <span className={`text-xs font-medium transition-colors duration-500 ${
        done ? "text-[var(--accent)]" : active ? "text-[var(--text)]" : "text-[var(--muted)]"
      }`}>
        {label}
      </span>
    </div>
  );
}
