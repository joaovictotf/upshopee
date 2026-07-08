import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations } from "../lib/mock/integrations";
import { Check, ExternalLink, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/dashboard/conectar-contas")({ component: Conectar });

const SHOPEE_URL = "https://affiliate.shopee.com.br/";
const LS_KEY = "upshopee_shopee_connected";
const shopee = integrations.find((i) => i.id === "shopee")!;

/* ═══════ Teaser platforms ═══════ */

interface TeaserPlatform {
  name: string;
  logo: string;
  fallback: string;   // initials shown if logo fails
  description: string;
}

const TEASER_PLATFORMS: TeaserPlatform[] = [
  {
    name: "Mercado Livre",
    logo: "https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.5/mercadolibre/logo__small.png",
    fallback: "ML",
    description: "Venda também no Mercado Livre com a mesma praticidade",
  },
  {
    name: "Amazon",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    fallback: "AM",
    description: "Alcance milhões de clientes na maior marketplace do mundo",
  },
  {
    name: "Bling",
    logo: "https://www.bling.com.br/assets/images/logo-bling.svg",
    fallback: "BL",
    description: "Integre seu ERP Bling e automatize seus processos de venda",
  },
  {
    name: "Magalu",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Magazine_Luiza_logo.svg",
    fallback: "MG",
    description: "Venda no marketplace da Magazine Luiza com todo suporte",
  },
  {
    name: "Shein",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Shein_Logo_2017.svg",
    fallback: "SH",
    description: "Entre no marketplace de moda que mais cresce no Brasil",
  },
  {
    name: "TikTok Shop",
    logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/TikTok_Shop_logo.svg",
    fallback: "TT",
    description: "Venda diretamente no TikTok Shop e alcance a nova geração",
  },
];

/* ═══════ Component ═══════ */

function Conectar() {
  const { requestMarketplaceConnection } = useApp();
  const [connected, setConnected] = useState(() => localStorage.getItem(LS_KEY) === "true");
  const [waiting, setWaiting] = useState(false);

  // Sync localStorage → global state on mount
  useEffect(() => {
    if (connected) {
      requestMarketplaceConnection("shopee");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect when user returns from Shopee tab
  useEffect(() => {
    const onFocus = () => {
      if (waiting) {
        setWaiting(false);
        setConnected(true);
        localStorage.setItem(LS_KEY, "true");
        requestMarketplaceConnection("shopee");
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [waiting, requestMarketplaceConnection]);

  const handleConnect = useCallback(() => {
    setWaiting(true);
    window.open(SHOPEE_URL, "_blank", "noopener,noreferrer");
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setWaiting(false);
    localStorage.removeItem(LS_KEY);
  }, []);

  const handleTeaser = useCallback((name: string) => {
    toast.info(name, {
      description: `Estamos fechando parceria com ${name}. Em breve você também poderá vender por lá!`,
    });
  }, []);

  return (
    <DashboardShell title="Conectar Contas" subtitle="Vincule suas contas de marketplace para sincronizar produtos e pedidos.">
      <div className="page-enter">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {/* ═══ Shopee — Active ═══ */}
          <IntegrationCard>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <img
                  src={shopee.logo}
                  alt="Shopee"
                  className="h-11 w-11 object-contain dark:brightness-0 dark:invert"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">Shopee</h3>
              <p className="mt-1 text-xs text-[var(--muted)] max-w-[200px]">
                Conecte sua conta da Shopee à nossa ferramenta
              </p>
            </div>
            <div className="mt-auto pt-5">
              {connected ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                    Conta conectada
                  </span>
                  <button
                    onClick={handleDisconnect}
                    className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-warm)] hover:text-[var(--accent)] transition-colors"
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

          {/* ═══ Teaser cards ═══ */}
          {TEASER_PLATFORMS.map((p) => (
            <IntegrationCard key={p.name}>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <span className="absolute -top-2 -right-2 z-10 rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
                    Em breve
                  </span>
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                    <img
                      src={p.logo}
                      alt={p.name}
                      className="h-11 w-11 object-contain dark:brightness-0 dark:invert"
                      onError={(e) => {
                        const t = e.currentTarget as HTMLImageElement;
                        if (t.dataset.fb === "1") return;
                        t.dataset.fb = "1";
                        // Show initials as fallback
                        const parent = t.parentElement;
                        if (parent) {
                          t.style.display = "none";
                          const span = document.createElement("span");
                          span.className = "text-lg font-bold text-[var(--muted)]";
                          span.textContent = p.fallback;
                          parent.appendChild(span);
                        }
                      }}
                    />
                  </div>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">{p.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)] max-w-[200px]">
                  {p.description}
                </p>
              </div>
              <div className="mt-auto pt-5">
                <button
                  onClick={() => handleTeaser(p.name)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
                >
                  <Info className="h-4 w-4" />
                  Saiba mais
                </button>
              </div>
            </IntegrationCard>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

/** Shared card shell — identical sizing for all integration cards */
function IntegrationCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      {children}
    </div>
  );
}
