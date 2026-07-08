import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations } from "../lib/mock/integrations";
import { Check, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/conectar-contas")({ component: Conectar });

const SHOPEE_URL = "https://affiliate.shopee.com.br/";
const LS_KEY = "upshopee_shopee_connected";
const shopee = integrations.find((i) => i.id === "shopee")!;

function Conectar() {
  const [connected, setConnected] = useState(() => localStorage.getItem(LS_KEY) === "true");
  const [waiting, setWaiting] = useState(false);

  // Detect when user returns to the tab after visiting Shopee
  useEffect(() => {
    const onFocus = () => {
      if (waiting) {
        setWaiting(false);
        setConnected(true);
        localStorage.setItem(LS_KEY, "true");
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [waiting]);

  const handleConnect = useCallback(() => {
    setWaiting(true);
    window.open(SHOPEE_URL, "_blank", "noopener,noreferrer");
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setWaiting(false);
    localStorage.removeItem(LS_KEY);
  }, []);

  return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="page-enter">
        {/* Connection card — compact, top-aligned, left-aligned */}
        <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
          {/* Shopee logo + label */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
              <img
                src={shopee.logo}
                alt="Shopee"
                className="h-8 w-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
            <p className="text-sm font-medium text-[var(--text)] leading-snug">
              Conecte sua conta da Shopee à nossa ferramenta
            </p>
          </div>

          {/* Action */}
          <div className="mt-5">
            {connected ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Conta conectada
                </span>
                <button
                  onClick={handleDisconnect}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-warm)] hover:text-[var(--accent)] transition-colors"
                >
                  Desconectar
                </button>
              </div>
            ) : waiting ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                <span className="text-sm text-[var(--muted)]">Aguardando retorno...</span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Conectar
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
