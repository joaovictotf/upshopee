import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Loader2, Search, Zap, Eye, EyeOff, Info, LogOut } from "lucide-react";
import { useApp, MARKETPLACE_LABEL } from "../../lib/state";
import { brl } from "../../lib/format";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { BottomDock } from "./BottomDock";

type ShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onLightningClick?: () => void;
  onResetMetrics?: () => void;
  /** Forces the entire viewport (header, background, scrollbars) to light theme.
   *  The floating dock remains global-theme-aware. Used on Dashboard + Metrics. */
  forceLight?: boolean;
};

export function DashboardShell({ children, title, subtitle, actions, onLightningClick, onResetMetrics, forceLight }: ShellProps) {
  const { user, logout, isAdmin, privacy, setPrivacy, selectedMarketplace, adminPresentationMode, toggleAdminPresentationMode, hasLightningAccess, recordLightningClick, resetTodaySales, passwordResetRequired } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [lightningLoading, setLightningLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (user && passwordResetRequired) navigate({ to: "/redefinir-senha", replace: true });
  }, [user, passwordResetRequired, navigate]);

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };

  return (
    <>
      {/* ── Page wrapper (light-scope on protected pages forces full-viewport light theme) ── */}
      <div className={`min-h-dvh overflow-x-hidden ${forceLight ? "light-scope" : "bg-[var(--bg)] text-[var(--text)]"}`}>
        {/* ── Header bar ── */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur px-3 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            {/* Logo — visible on mobile where it was previously in the sidebar */}
            <Link to="/dashboard" className="flex shrink-0 items-center md:hidden">
              <img
                src="/brand/logo.png"
                alt="UpShopee"
                className="h-8 w-auto object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight md:text-lg" style={{ fontFamily: "'Sora', sans-serif" }}>{title}</h1>
              {subtitle && <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Search placeholder — desktop only */}
            <div className="hidden items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] md:flex">
              <Search className="h-3.5 w-3.5" /> Buscar...
            </div>

            {/* Planos link */}
            <Link
              to="/ofertas"
              className="hidden items-center gap-1.5 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent-soft)] md:flex"
            >
              <Zap className="h-3.5 w-3.5" /> Planos
            </Link>

            {/* Privacy toggle */}
            <button
              onClick={() => setPrivacy(!privacy)}
              aria-label={privacy ? "Mostrar valores" : "Ocultar valores"}
              title={privacy ? "Mostrar valores" : "Ocultar valores"}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {/* Notifications */}
            <button aria-label="Notificações" className="hidden h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-colors md:grid">
              <Bell className="h-4 w-4" />
            </button>

            {/* User avatar + info popover */}
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden min-w-0 max-w-[180px] text-xs leading-tight md:block">
                <div className="truncate font-medium">{user?.name}</div>
                <div className="truncate text-[var(--muted)]">{user?.email}</div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label="Informações sobre o ambiente demonstrativo"
                    onClick={() => {
                      if (!isAdmin) return;
                      const enabled = toggleAdminPresentationMode();
                      toast.success(enabled ? "Modo apresentação ativado." : "Modo apresentação desativado.");
                      if (enabled && pathname === "/dashboard/validar-cadastros") navigate({ to: "/dashboard" });
                    }}
                    className="grid h-6 w-6 place-items-center rounded-full border border-[var(--border)]/70 bg-[var(--bg)]/60 text-[var(--muted)] transition hover:text-[var(--text)]"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-[280px] text-xs leading-relaxed">
                  <div className="mb-1 text-sm font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>Ambiente demonstrativo</div>
                  <p className="text-[var(--muted)]">
                    Este painel é uma simulação da UpShopee, demonstrando como será a integração prevista para agosto de 2026 com Shopee, Mercado Livre e Shein. Os resultados, métricas, pedidos e comissões exibidos aqui são demonstrativos e não representam resultados reais.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main key={privacy ? "p1" : "p0"} className="min-w-0 px-4 py-6 md:px-8 md:py-8 pb-28 md:pb-24">
          {actions && <div className="mb-6 flex flex-wrap items-center justify-between gap-3">{actions}</div>}
          {children}
        </main>

        {/* ── Lightning button (admin) ── */}
        {hasLightningAccess && (
          <div className="flex gap-2 fixed bottom-24 md:bottom-20 left-6 z-50">
            <button
              onClick={() => {
                if (window.confirm('Zerar as vendas de hoje?')) {
                  onResetMetrics?.();
                  void (async () => {
                    const r = await resetTodaySales();
                    if (r.ok) {
                      toast.success("Vendas de hoje zeradas em todo o painel.");
                    } else {
                      toast.error(r.error || "Não foi possível zerar as vendas de hoje.");
                    }
                  })();
                }
              }}
              className="w-8 h-8 bg-[#333] hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-all"
              title="Zerar vendas de hoje"
            >
              ✕
            </button>
            <button
              onClick={async () => {
                if (lightningLoading) return;
                setLightningLoading(true);
                onLightningClick?.();
                try {
                  const r = await recordLightningClick();
                  if (!r.ok) { toast.error(r.error || "Não foi possível registrar a comissão."); }
                  else { toast.success(`Nova comissão registrada — ${brl(r.amount ?? 0)}`, { description: `Comissão adicionada ao painel em ${MARKETPLACE_LABEL[selectedMarketplace]}.` }); window.dispatchEvent(new CustomEvent("upshopee-lightning", { detail: r.amount })); }
                } finally {
                  setLightningLoading(false);
                }
              }}
              disabled={lightningLoading}
              aria-label={`Simular venda em ${MARKETPLACE_LABEL[selectedMarketplace]}`}
              title={`Simular venda em ${MARKETPLACE_LABEL[selectedMarketplace]}`}
              className={`grid h-12 w-12 place-items-center rounded-full shadow-2xl shadow-[var(--accent)]/40 ring-1 ring-[var(--accent)]/40 transition hover:scale-105 ${lightningLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[var(--accent)] text-white"}`}
            >
              {lightningLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Dock (rendered OUTSIDE the page wrapper so it always follows the GLOBAL theme, even on light-scoped pages) ── */}
      <BottomDock />
    </>
  );
}
