import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations } from "../lib/mock/integrations";
import { Check, ExternalLink, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/conectar-contas")({ component: Conectar });

const SHOPEE_URL = "https://affiliate.shopee.com.br/";
const LS_KEY = "upshopee_shopee_connected";
const shopee = integrations.find((i) => i.id === "shopee")!;
const ml = integrations.find((i) => i.id === "mercadolivre")!;

function Conectar() {
  const [connected, setConnected] = useState(() => localStorage.getItem(LS_KEY) === "true");
  const [waiting, setWaiting] = useState(false);

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

  const handleMLInfo = useCallback(() => {
    toast.info("Mercado Livre", {
      description: "Estamos fechando contrato para trabalharmos juntamente ao Mercado Livre. Em breve você poderá vender também por lá!",
    });
  }, []);

  return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="page-enter">
        <div className="grid gap-4 md:grid-cols-2">
          {/* ═══ Shopee Card ═══ */}
          <IntegrationCard>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <img
                  src={shopee.logo}
                  alt="Shopee"
                  className="h-10 w-10 object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">Shopee</h3>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-[220px]">
                Conecte sua conta da Shopee à nossa ferramenta
              </p>
            </div>
            <div className="mt-5">
              {connected ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <Check className="h-5 w-5" strokeWidth={2.5} />
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
                <div className="flex items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
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
          </IntegrationCard>

          {/* ═══ Mercado Livre Card ═══ */}
          <IntegrationCard>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {/* Em breve badge */}
                <span className="absolute -top-2 -right-2 z-10 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  Em breve
                </span>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <img
                    src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.5/mercadolibre/logo__small.png"
                    alt="Mercado Livre"
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      t.onerror = null;
                      t.src = ml.logo;
                    }}
                  />
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">Mercado Livre</h3>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-[220px]">
                Venda também no Mercado Livre com a mesma praticidade
              </p>
            </div>
            <div className="mt-5">
              <button
                onClick={handleMLInfo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
              >
                <Info className="h-4 w-4" />
                Saiba mais
              </button>
            </div>
          </IntegrationCard>
        </div>
      </div>
    </DashboardShell>
  );
}

/** Shared card shell — identical sizing for both integration cards */
function IntegrationCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7">
      {children}
    </div>
  );
}
