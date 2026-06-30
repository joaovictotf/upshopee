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

  const idleDotColor = validated ? "bg-emerald-500"
    : rejected ? "bg-red-500"
    : shopee?.status === "Conexão em análise" || shopee?.status === "Conexão solicitada" || shopee?.status === "Em análise" ? "bg-amber-500"
    : "bg-gray-400";

  const idleTextColor = validated ? "text-emerald-700"
    : rejected ? "text-red-600"
    : shopee?.status === "Conexão em análise" || shopee?.status === "Conexão solicitada" || shopee?.status === "Em análise" ? "text-amber-700"
    : "text-gray-500";

  // ── Stats derived from real data ──
  const totalProducts = data?.salesOrders?.length ?? 127;
  const totalOrders = data?.salesOrders?.reduce((sum, o) => sum + ((o as any).quantity ?? 1), 0) ?? 0;
  const totalCommission = data?.salesOrders?.reduce((sum, o) => sum + ((o as any).commission ?? 0), 0) ?? 0;

  if (!shopee) return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
          <ShoppingBag className="h-5 w-5 text-[#EE4D2D]" />
        </div>
        <p className="text-sm font-medium text-gray-700">Nenhuma integração disponível no momento.</p>
        <p className="mt-1 text-xs text-gray-400">Tente novamente mais tarde ou entre em contato com o suporte.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-semibold text-gray-600 transition-all duration-200 hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D] hover:shadow-sm"
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

          /* ── Floating background circles ── */
          @keyframes cc-float-1 {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(-14px) scale(1.06); }
          }
          @keyframes cc-float-2 {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(-10px) scale(0.95); }
          }
          @keyframes cc-float-3 {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(-8px) scale(1.04); }
          }
          @keyframes cc-float-4 {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(-16px) scale(0.97); }
          }
          .cc-float-1 { animation: cc-float-1 6s ease-in-out infinite; }
          .cc-float-2 { animation: cc-float-2 8s ease-in-out infinite; }
          .cc-float-3 { animation: cc-float-3 7s ease-in-out infinite; }
          .cc-float-4 { animation: cc-float-4 5.5s ease-in-out infinite; }

          /* ── Orbital ring dot (idle) ── */
          @keyframes cc-orbit {
            from { transform: rotate(0deg) translateX(15px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(15px) rotate(-360deg); }
          }
          .cc-orbit-dot {
            animation: cc-orbit 3s linear infinite;
          }

          /* ── Orbital ring dot (connecting — speeds up) ── */
          @keyframes cc-orbit-fast {
            from { transform: rotate(0deg) translateX(15px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(15px) rotate(-360deg); }
          }
          .cc-state-connecting .cc-orbit-dot {
            animation: cc-orbit-fast 0.7s linear infinite;
          }

          /* ── Status dot breathe (idle) ── */
          @keyframes cc-dot-breathe {
            0%, 100% { box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.35); }
            50%      { box-shadow: 0 0 0 6px rgba(238, 77, 45, 0); }
          }
          .cc-dot-breathe {
            animation: cc-dot-breathe 2.4s ease-in-out infinite;
          }

          /* ── Status dot pulse (connecting) ── */
          @keyframes cc-dot-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.5); }
            50%      { box-shadow: 0 0 0 7px rgba(238, 77, 45, 0); }
          }
          .cc-state-connecting .cc-dot-status {
            animation: cc-dot-pulse 1s ease-in-out infinite;
          }

          /* ── Logo glow (two instances with different delays) ── */
          @keyframes cc-logo-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.25); }
            50%      { box-shadow: 0 0 0 8px rgba(238, 77, 45, 0); }
          }
          .cc-state-connecting .cc-logo-up    { animation: cc-logo-glow 1.4s ease-out both; animation-delay: 0.05s; border-color: #EE4D2D; }
          .cc-state-connecting .cc-logo-shopee { animation: cc-logo-glow 1.4s ease-out both; animation-delay: 0.55s; border-color: #EE4D2D; }

          /* ── Connection line & dots ── */
          @keyframes cc-line-fill {
            from { width: 0%; }
            to   { width: 100%; }
          }
          .cc-state-connecting .cc-line-fill {
            animation: cc-line-fill 0.9s ease-out both;
          }

          @keyframes cc-dot-pop {
            0%   { transform: scale(1); background-color: #d1d5db; }
            40%  { transform: scale(1.35); background-color: #EE4D2D; }
            100% { transform: scale(1); background-color: #EE4D2D; }
          }
          .cc-state-connecting .cc-dot-1 { animation: cc-dot-pop 0.3s ease-out both; animation-delay: 0s; }
          .cc-state-connecting .cc-dot-2 { animation: cc-dot-pop 0.3s ease-out both; animation-delay: 0.35s; }
          .cc-state-connecting .cc-dot-3 { animation: cc-dot-pop 0.3s ease-out both; animation-delay: 0.65s; }

          /* ── Orbital ring border transition ── */
          .cc-state-connecting .cc-ring-border {
            border-color: rgba(238, 77, 45, 0.55);
            transition: border-color 0.3s ease;
          }

          /* ── Arrow color transition ── */
          .cc-state-connecting .cc-arrow {
            color: rgba(238, 77, 45, 0.55);
            transition: color 0.3s ease;
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

          /* ── Benefit confirmation — each fires at staggered delay ── */
          @keyframes cc-benefit-pop {
            0%   { background-color: transparent; border-left-color: #d1d5db; }
            25%  { background-color: rgba(16, 185, 129, 0.12); border-left-color: #34d399; }
            100% { background-color: rgba(16, 185, 129, 0.06); border-left-color: #34d399; }
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
          .cc-state-connecting .cc-benefit-1 .cc-benefit-title { color: #065f46; transition-delay: 0.95s; }
          .cc-state-connecting .cc-benefit-2 .cc-benefit-title { color: #065f46; transition-delay: 1.15s; }
          .cc-state-connecting .cc-benefit-3 .cc-benefit-title { color: #065f46; transition-delay: 1.35s; }

          /* ── Button ripple (pure CSS via :active::after) ── */
          @keyframes cc-ripple {
            from { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
            to   { transform: translate(-50%, -50%) scale(15); opacity: 0; }
          }
          .cc-btn-ripple {
            position: relative;
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
          .cc-float-1, .cc-float-2, .cc-float-3, .cc-float-4 { animation: none; }
          .cc-orbit-dot { animation: none; }
          .cc-dot-breathe { animation: none; }
          .cc-state-connecting .cc-dot-status { animation: none; }
          .cc-state-connecting .cc-logo-up,
          .cc-state-connecting .cc-logo-shopee { animation: none; border-color: #EE4D2D; }
          .cc-state-connecting .cc-line-fill { animation: none; width: 100%; }
          .cc-state-connecting .cc-dot-1,
          .cc-state-connecting .cc-dot-2,
          .cc-state-connecting .cc-dot-3 { animation: none; background-color: #EE4D2D; }
          .cc-status-step { opacity: 0; position: static; transform: none; }
          .cc-state-connecting .cc-status-s1,
          .cc-state-connecting .cc-status-s2,
          .cc-state-connecting .cc-status-s3,
          .cc-state-connecting .cc-status-s4 { animation: none; opacity: 1; }
          .cc-state-connecting .cc-benefit-1,
          .cc-state-connecting .cc-benefit-2,
          .cc-state-connecting .cc-benefit-3 { animation: none; background-color: rgba(16, 185, 129, 0.06); border-left-color: #34d399; }
          .cc-state-connecting .cc-benefit-icon-def { opacity: 0; }
          .cc-state-connecting .cc-benefit-icon-ok  { animation: none; opacity: 1; }
          .cc-state-connecting .cc-benefit-title { color: #065f46; }
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
        <div className="mx-auto max-w-2xl">

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SECTION 1 — Hero banner with animated background       */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#FFF5F0] to-[#FFE8E0] px-8 py-10">
            <div className="cc-float-1 pointer-events-none absolute -top-4 left-[8%] h-20 w-20 rounded-full bg-orange-100/40" />
            <div className="cc-float-2 pointer-events-none absolute right-[12%] top-[15%] h-14 w-14 rounded-full bg-amber-100/50" />
            <div className="cc-float-3 pointer-events-none absolute bottom-[-10%] left-[25%] h-16 w-16 rounded-full bg-orange-200/25" />
            <div className="cc-float-4 pointer-events-none absolute right-[20%] top-[50%] h-10 w-10 rounded-full bg-amber-200/35" />

            <div className="relative">
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EE4D2D]/10">
                <ShoppingBag className="h-5 w-5 text-[#EE4D2D]" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Conectar Contas
              </h2>
              <p className="mt-1.5 max-w-sm text-sm text-gray-500">
                Vincule sua conta Shopee e sincronize tudo automaticamente — produtos, pedidos e comissões em um só lugar.
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SECTION 2 — Connection card                           */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div
            className={`rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-500/5 sm:p-8 ${
              state === "connecting" ? "cc-state-connecting" : ""
            }`}
            onAnimationEnd={handleAnimEnd}
          >

            {/* ── A. Logo row with connection line + nodes ── */}
            <div className="flex items-center justify-center gap-0 mb-7">
              {/* UpShopee logo */}
              <div className={`cc-logo-up flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 bg-white p-2 transition-all duration-500 ${
                validated ? "border-emerald-200" : "border-gray-100"
              }`}>
                <img
                  src="/brand/shopesync-logo.png"
                  alt="UpShopee"
                  className="h-9 w-9 object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>

              {/* Connection line with 3 nodes + orbital ring */}
              <div className="relative flex-1 flex items-center justify-center mx-3" style={{ height: 32 }}>
                {/* Base line underlay */}
                <div className="absolute inset-y-0 top-1/2 -translate-y-1/2 h-px w-full bg-gray-200" />
                {/* Animated fill line */}
                <div className="cc-line-fill absolute inset-y-0 top-1/2 -translate-y-1/2 h-px bg-[#EE4D2D]/20" />

                {/* Three nodes */}
                <div className="relative flex items-center justify-between w-full z-10">
                  <span className="cc-dot-1 inline-block h-[6px] w-[6px] rounded-full bg-gray-300" />
                  {/* Orbital ring at center position */}
                  <span className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
                    <span className={`cc-ring-border absolute inset-0 rounded-full border-[1.5px] transition-colors duration-500 ${
                      validated ? "border-emerald-400" : "border-orange-200"
                    }`} />
                    {validated ? (
                      <Check className="relative h-3 w-3 text-emerald-500" />
                    ) : (
                      <span
                        className="cc-orbit-dot absolute h-1.5 w-1.5 rounded-full bg-[#EE4D2D]"
                        style={{ top: "50%", left: "50%", marginTop: -3, marginLeft: -3 }}
                      />
                    )}
                  </span>
                  <span className="cc-dot-3 inline-block h-[6px] w-[6px] rounded-full bg-gray-300" />
                </div>
              </div>

              {/* Direction arrow */}
              <ArrowRight className="cc-arrow h-4 w-4 shrink-0 text-[#EE4D2D]/30 transition-colors duration-500" />

              {/* Shopee logo */}
              <div className={`cc-logo-shopee flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 bg-white p-2 transition-all duration-500 ${
                validated ? "border-emerald-200 bg-emerald-50"
                : rejected ? "border-red-200 bg-red-50"
                : "border-gray-100"
              }`}>
                <img
                  src={shopee.logo}
                  alt="Shopee"
                  className="h-9 w-9 object-contain"
                  onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = `/brands/${shopee.id}-logo.svg`; }}
                />
              </div>
            </div>

            {/* ── B. Status row ── */}
            <div className="flex justify-center mb-7">
              <span className={`inline-flex items-center gap-2.5 text-sm font-medium ${state === "connecting" ? "text-[#EE4D2D]" : idleTextColor}`}>
                <span className={`cc-dot-status inline-block h-2.5 w-2.5 rounded-full ${
                  state === "connecting" ? "bg-[#EE4D2D]"
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
            <div className="space-y-2.5 mb-8 border-t border-gray-100 pt-6">
              {/* Benefit 1 */}
              <div className={`cc-benefit-1 flex items-start gap-3 rounded-xl px-4 py-3 border-l-[3px] border-l-gray-200 bg-gray-50/50`}>
                <span className="mt-0.5 shrink-0 relative h-5 w-5">
                  <RefreshCw className="cc-benefit-icon-def absolute inset-0 h-5 w-5 text-gray-400" />
                  <Check className="cc-benefit-icon-ok absolute inset-0 h-5 w-5 text-emerald-500" />
                </span>
                <div>
                  <p className="cc-benefit-title text-sm font-medium text-gray-700">
                    Sincronização automática de produtos
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Seus produtos são importados e organizados automaticamente
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className={`cc-benefit-2 flex items-start gap-3 rounded-xl px-4 py-3 border-l-[3px] border-l-gray-200 bg-gray-50/50`}>
                <span className="mt-0.5 shrink-0 relative h-5 w-5">
                  <Package className="cc-benefit-icon-def absolute inset-0 h-5 w-5 text-gray-400" />
                  <Check className="cc-benefit-icon-ok absolute inset-0 h-5 w-5 text-emerald-500" />
                </span>
                <div>
                  <p className="cc-benefit-title text-sm font-medium text-gray-700">
                    Pedidos atualizados em tempo real
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Acompanhe cada venda assim que ela acontece
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className={`cc-benefit-3 flex items-start gap-3 rounded-xl px-4 py-3 border-l-[3px] border-l-gray-200 bg-gray-50/50`}>
                <span className="mt-0.5 shrink-0 relative h-5 w-5">
                  <TrendingUp className="cc-benefit-icon-def absolute inset-0 h-5 w-5 text-gray-400" />
                  <Check className="cc-benefit-icon-ok absolute inset-0 h-5 w-5 text-emerald-500" />
                </span>
                <div>
                  <p className="cc-benefit-title text-sm font-medium text-gray-700">
                    Comissões organizadas automaticamente
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Veja exatamente quanto você ganhou em cada produto
                  </p>
                </div>
              </div>
            </div>

            {/* ── D. CTA Button or Connected state ── */}
            {validated ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Check className="h-4 w-4" />
                  Conectada
                </span>
                <p className="mt-0.5 text-xs text-emerald-600">Sua conta Shopee está vinculada e ativa</p>
              </div>
            ) : rejected ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
                  <X className="h-4 w-4" />
                  Conexão recusada
                </span>
                <p className="mt-0.5 text-xs text-red-600">Entre em contato com o suporte para resolver</p>
              </div>
            ) : (
              <button
                onClick={handleConnectClick}
                disabled={state !== "idle"}
                className={`cc-btn-ripple group relative w-full overflow-hidden rounded-2xl py-4 text-[15px] font-semibold text-white outline-none transition-all duration-300 ${
                  state !== "idle"
                    ? "bg-gray-300 cursor-not-allowed scale-100"
                    : "bg-[#EE4D2D] hover:bg-[#e04525] hover:shadow-lg hover:shadow-[#EE4D2D]/20 hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#EE4D2D]/40 focus-visible:ring-offset-2"
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
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SECTION 3 — Footer stats (connected only)             */}
          {/* ═══════════════════════════════════════════════════════ */}
          {validated && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="cc-stat-in-1 rounded-xl border border-gray-100 bg-white px-4 py-3 text-center">
                <p className="text-lg font-semibold text-gray-900">{totalProducts}</p>
                <p className="text-[11px] text-gray-400">Produtos</p>
              </div>
              <div className="cc-stat-in-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {totalOrders >= 1000 ? `${(totalOrders / 1000).toFixed(1)}k` : totalOrders}
                </p>
                <p className="text-[11px] text-gray-400">Pedidos</p>
              </div>
              <div className="cc-stat-in-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {totalCommission >= 1000
                    ? `R$ ${(totalCommission / 1000).toFixed(1)}k`
                    : `R$ ${totalCommission.toFixed(0)}`}
                </p>
                <p className="text-[11px] text-gray-400">Comissão</p>
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
// CONNECTION DIALOG — unchanged from previous design
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
            0%, 100% { box-shadow: 0 0 0 0 rgba(238, 77, 45, 0.4); }
            50%      { box-shadow: 0 0 0 10px rgba(238, 77, 45, 0); }
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
        <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-lg">
          {/* Top colored strip */}
          <div className={`h-1.5 w-full transition-colors duration-500 ${
            phase === "done"
              ? validated ? "bg-emerald-500" : rejected ? "bg-red-500" : isPending ? "bg-amber-500" : "bg-emerald-500"
              : "bg-[#EE4D2D]"
          }`} />

          <div className="p-6">
            {/* ── Centered animated icon ── */}
            <div className="flex justify-center">
              <div className={`flex items-center justify-center rounded-full transition-all duration-500 ${
                phase === "done"
                  ? validated ? "bg-emerald-100 h-16 w-16" : rejected ? "bg-red-100 h-16 w-16" : "bg-amber-100 h-16 w-16"
                  : "bg-orange-100 h-16 w-16 cd-icon-pulse"
              }`}>
                {phase === "loading" ? (
                  <div className="h-8 w-8 rounded-full border-2 border-[#EE4D2D] border-t-transparent animate-spin" />
                ) : validated ? (
                  <Check className="h-8 w-8 text-emerald-500 cd-icon-pop" />
                ) : rejected ? (
                  <X className="h-8 w-8 text-red-500 cd-icon-pop" />
                ) : (
                  <Clock className="h-8 w-8 text-amber-500 cd-icon-pop" />
                )}
              </div>
            </div>

            {/* ── Title ── */}
            <div className="mt-4 text-center">
              <h2 className={`text-base font-semibold transition-colors duration-500 ${
                phase === "done"
                  ? validated ? "text-emerald-700" : rejected ? "text-red-700" : "text-amber-700"
                  : "text-gray-900"
              }`}>
                {phase === "done"
                  ? validated
                    ? "Conexão estabelecida!"
                    : rejected
                    ? "Não foi possível conectar"
                    : "Solicitação enviada"
                  : "Estabelecendo conexão segura"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
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
                <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#EE4D2D] transition-all duration-300"
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
                      ? "bg-gray-600 hover:bg-gray-700"
                      : "bg-[#EE4D2D] hover:bg-[#e04525]"
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
      done ? "bg-emerald-50/30" : active ? "bg-orange-50/50" : "bg-transparent"
    }`}>
      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
        done ? "bg-emerald-500" : active ? "bg-[#EE4D2D]" : "bg-gray-200"
      }`}>
        {done
          ? <Check className="h-2.5 w-2.5 text-white" />
          : active
            ? <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
            : <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />}
      </div>
      <span className={`text-xs font-medium transition-colors duration-500 ${
        done ? "text-emerald-700" : active ? "text-gray-700" : "text-gray-400"
      }`}>
        {label}
      </span>
    </div>
  );
}
