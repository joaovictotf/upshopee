import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { integrations } from "../lib/mock/integrations";
import { Check, ExternalLink, Loader2, Info, ShieldCheck, Lock, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/dashboard/conectar-contas")({ component: Conectar });

const SHOPEE_URL = "https://account.seller.shopee.com/signin";
const LS_KEY = "upshopee_shopee_connected";
const shopee = integrations.find((i) => i.id === "shopee")!;

/* ═══════ Teaser platforms ═══════ */

interface TeaserPlatform {
  name: string;
  logo: string;
  logoFilter?: string;    // optional CSS filter class for dark/light compatibility
  description: string;
}

const TEASER_PLATFORMS: TeaserPlatform[] = [
  {
    name: "Mercado Livre",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/16/Mercado_Livre_wordmark_%28Portuguese_version%29.svg",
    logoFilter: "dark:brightness-0 dark:invert",
    description: "Venda também no Mercado Livre com a mesma praticidade",
  },
  {
    name: "Amazon",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    description: "Alcance milhões de clientes no maior marketplace do mundo",
  },
  {
    name: "Bling",
    logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgNTYiPjx0ZXh0IHg9IjEwMCIgeT0iMzkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksLWFwcGxlLXN5c3RlbSxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIiBmb250LXNpemU9IjI0IiBmaWxsPSIjMTExIj5CbGluZzwvdGV4dD48L3N2Zz4=",
    description: "Integre seu ERP Bling e automatize seus processos de venda",
  },
  {
    name: "Magalu",
    logo: "https://wx.mlcdn.com.br/shared/magalu/logo-white.svg",
    logoFilter: "brightness-0 dark:brightness-100",
    description: "Venda no marketplace da Magazine Luiza com todo suporte",
  },
  {
    name: "Shein",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Shein_Logo_2017.svg",
    description: "Entre no marketplace de moda que mais cresce no Brasil",
  },
  {
    name: "TikTok Shop",
    logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNjAgNTYiPjx0ZXh0IHg9IjEzMCIgeT0iMzkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksLWFwcGxlLXN5c3RlbSxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNzAwIiBmb250LXNpemU9IjIyIiBmaWxsPSIjMTExIj5UaWtUb2sgU2hvcDwvdGV4dD48L3N2Zz4=",
    description: "Venda diretamente no TikTok Shop e alcance a nova geração",
  },
];

/* ═══════ Copy blocks ═══════ */

const TRUST_ITEMS = [
  { Icon: ShieldCheck, text: "Login feito no site oficial da Shopee" },
  { Icon: Lock, text: "Sua senha nunca passa pela UpShopee" },
  { Icon: Undo2, text: "Desconecte quando quiser, em um clique" },
];

const STEPS = [
  {
    title: "Clique em conectar",
    text: "Abrimos a página de login da Shopee em uma nova aba, no site oficial.",
  },
  {
    title: "Entre na sua conta",
    text: "O acesso acontece direto na Shopee, com toda a segurança de sempre.",
  },
  {
    title: "Volte para esta aba",
    text: "A conexão é confirmada automaticamente — sem etapas extras.",
  },
];

const CONNECTED_PERKS = ["Produtos sincronizados", "Pedidos acompanhados", "Comissões no painel"];

/* ═══════ Motion — every keyframe lives inside the no-preference query,
   so with reduced motion the animations simply never run ═══════ */

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes cc-breathe {
    0%, 100% { opacity: 0.55; transform: scale(1); }
    50%      { opacity: 1;    transform: scale(1.08); }
  }
  @keyframes cc-pop {
    0%   { transform: scale(0);    opacity: 0; }
    70%  { transform: scale(1.18); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes cc-rise {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cc-pop  { animation: cc-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  .cc-rise { animation: cc-rise 0.35s ease-out both; }
}
`;

const SORA = { fontFamily: "'Sora', sans-serif" } as const;

/* ═══════ Component ═══════ */

function Conectar() {
  const { requestMarketplaceConnection, disconnectMarketplace } = useApp();
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
    disconnectMarketplace("shopee");
  }, [disconnectMarketplace]);

  const handleTeaser = useCallback((name: string) => {
    toast.info(name, {
      description: `Estamos fechando parceria com ${name}. Em breve você também poderá vender por lá!`,
    });
  }, []);

  return (
    <DashboardShell
      title="Integrações"
      subtitle="Conecte suas contas de marketplace e acompanhe tudo em um só painel."
    >
      <style>{ANIM_CSS}</style>
      <div className="page-enter">
        {/* ═══ HERO — Shopee ═══ */}
        <section
          className={`relative overflow-hidden rounded-3xl border bg-[var(--surface)] shadow-[var(--shadow-card)] ${
            connected ? "border-emerald-500/30" : "border-[var(--border)]"
          }`}
        >
          {/* Ambient glow */}
          <div
            aria-hidden
            className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl ${
              connected ? "bg-emerald-500/10" : "bg-[var(--accent-soft)]"
            }`}
            style={{ animation: "cc-breathe 6s ease-in-out infinite" }}
          />

          {connected ? (
            /* ── Connected: the reward ── */
            <div className="cc-rise relative flex flex-col gap-6 p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="relative w-fit shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[var(--surface-2)] p-3">
                    <img
                      src={shopee.logo}
                      alt="Shopee"
                      className="h-full w-full object-contain dark:brightness-0 dark:invert"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                  <span className="cc-pop absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-[var(--surface)]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    Conta conectada
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-[var(--text)] sm:text-2xl">
                    Shopee conectada!
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
                    Tudo certo. Sua conta está vinculada e o painel já acompanha a sua operação.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {CONNECTED_PERKS.map((perk) => (
                      <span
                        key={perk}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]"
                      >
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleDisconnect} className="btn-ghost shrink-0 self-start text-xs md:self-center">
                Desconectar conta
              </button>
            </div>
          ) : (
            /* ── Disconnected / waiting ── */
            <div className="relative flex flex-col gap-6 p-5 sm:p-8 md:flex-row md:items-start md:justify-between md:gap-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <img
                    src={shopee.logo}
                    alt="Shopee"
                    className="h-full w-full object-contain dark:brightness-0 dark:invert"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
                <div>
                  <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
                    Disponível agora
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-[var(--text)] sm:text-2xl">
                    Conecte sua conta Shopee
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
                    Vincule sua conta em menos de um minuto e acompanhe produtos, pedidos e
                    comissões direto no painel.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {TRUST_ITEMS.map(({ Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-xs text-[var(--muted)] sm:text-[13px]">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="w-full shrink-0 md:w-72 md:pt-1">
                {waiting ? (
                  <div className="cc-rise rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)] motion-reduce:animate-none" />
                      <p className="text-sm font-semibold text-[var(--text)]" style={SORA}>
                        Aguardando a Shopee…
                      </p>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                      Conclua o login na aba que abrimos. Quando você voltar para cá, a conexão é
                      confirmada automaticamente.
                    </p>
                  </div>
                ) : (
                  <>
                    <button onClick={handleConnect} className="btn-primary w-full py-3!">
                      <ExternalLink className="h-4 w-4" />
                      Conectar com a Shopee
                    </button>
                    <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
                      Abriremos o login da Shopee em uma nova aba.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ═══ HOW IT WORKS — hidden once connected ═══ */}
        {!connected && (
          <section className="mt-4 grid gap-3 sm:grid-cols-3 md:gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]"
                  style={SORA}
                >
                  {i + 1}
                </span>
                <p className="mt-3 text-sm font-semibold text-[var(--text)]" style={SORA}>
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{step.text}</p>
              </div>
            ))}
          </section>
        )}

        {/* ═══ COMING SOON ═══ */}
        <section className="mt-10">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[var(--text)]">Próximas integrações</h3>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              Novos marketplaces estão a caminho — tudo no mesmo painel.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {TEASER_PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="group relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/35 hover:shadow-[var(--shadow-elevated)] sm:p-5"
              >
                <span className="absolute right-3 top-3 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  Em breve
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                  <img
                    src={p.logo}
                    alt={p.name}
                    className={`h-full w-full object-contain ${p.logoFilter ?? "dark:brightness-0 dark:invert"}`}
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--text)]" style={SORA}>{p.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{p.description}</p>
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => handleTeaser(p.name)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Saiba mais
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
