import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Grid3X3, ShoppingBag, TrendingUp, Users, Radio, Clapperboard, Link2, Settings2, LogOut, Bell, Loader2, Search, Zap, Eye, EyeOff, ShieldCheck, Info, Menu, Trophy, X, Crown } from "lucide-react";
import { useApp, MARKETPLACE_LABEL } from "../../lib/state";
import { brl } from "../../lib/format";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { WhatsAppSupportButton } from "../WhatsAppSupportButton";
import { WhatsAppChannelPopup } from "../WhatsAppChannelPopup";

const COPA_POPUP_KEY = "shopesync.copa_new_products_v1";

function CopaPopup({ onClose, onView }: { onClose: () => void; onView: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-green-500/30 bg-card shadow-2xl shadow-green-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#16a34a,#ca8a04,#16a34a)", backgroundSize: "200% 100%", animation: "copa-shine 2s linear infinite" }} />
        <button onClick={onClose} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="p-6">
          <div className="mb-4 flex justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "linear-gradient(135deg,#15803d,#ca8a04)" }}>
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <div className="copa-badge-new inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-600 to-yellow-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">🏆 Novidade</div>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight">Novos Produtos Adicionados!</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-green-500">10 novos produtos Copa do Mundo 2026</span> foram adicionados com alta demanda e ótimas margens de comissão.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {["Camisa Feminina","Bola Oficial","Messi #10","Kit Torcedor","Squeeze"].map((n) => (
              <span key={n} className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-medium text-green-400">{n}</span>
            ))}
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-medium text-yellow-400">+5 mais</span>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={onView} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110" style={{ background: "linear-gradient(135deg,#15803d,#ca8a04)" }}>
              🏆 Ver produtos
            </button>
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">Depois</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type NavItem = { to: string; label: string; icon: typeof Grid3X3; exact?: boolean; special?: "fire" | "impulsionar"; adminOnly?: boolean };
const baseNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Grid3X3, exact: true },
  { to: "/dashboard/produtos", label: "Produtos", icon: ShoppingBag },



  { to: "/dashboard/impulsionar-vendas", label: "Subir Anúncios", icon: TrendingUp },
  { to: "/dashboard/grupos", label: "Grupos de Divulgação", icon: Users },
  { to: "/dashboard/robo-divulgador", label: "IA Divulgadora", icon: Radio },
  { to: "/dashboard/video-ia", label: "Vídeo IA", icon: Clapperboard },
  { to: "/dashboard/conectar-contas", label: "Conectar Contas", icon: Link2 },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings2 },

];
const adminExtraNav: NavItem[] = [
  { to: "/dashboard/validar-cadastros", label: "Validar Cadastros", icon: ShieldCheck },
];

function Logo() {
  return (
    <div className="flex flex-col items-start py-4">
      <img
        src="/brand/logo.png"
        alt="UpShopee"
        className="w-full max-w-[180px] object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

export function DashboardShell({ children, title, subtitle, actions, onLightningClick, onResetMetrics }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode; onLightningClick?: () => void; onResetMetrics?: () => void }) {
  const { user, logout, isAdmin, selectedMarketplace, privacy, setPrivacy, adminPresentationMode, toggleAdminPresentationMode, hasLightningAccess, recordLightningClick, resetTodaySales, passwordResetRequired } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCopaPopup, setShowCopaPopup] = useState(false);
  const [lightningLoading, setLightningLoading] = useState(false);

  // Show Copa popup once per user on any dashboard page
  useEffect(() => {
    if (!user) return;
    const already = localStorage.getItem(COPA_POPUP_KEY);
    if (!already) {
      const t = setTimeout(() => setShowCopaPopup(true), 900);
      return () => clearTimeout(t);
    }
  }, [user]);

  const handleCopaClose = () => { localStorage.setItem(COPA_POPUP_KEY, "1"); setShowCopaPopup(false); };
  const handleCopaView = () => { localStorage.setItem(COPA_POPUP_KEY, "1"); setShowCopaPopup(false); navigate({ to: "/dashboard/produtos" }); };

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (user && passwordResetRequired) navigate({ to: "/redefinir-senha", replace: true });
  }, [user, passwordResetRequired, navigate]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };
  const showAdmin = isAdmin && !adminPresentationMode;
  const nav: NavItem[] = (showAdmin ? [...baseNav, ...adminExtraNav] : [...baseNav]).filter(({ adminOnly }) => !adminOnly || isAdmin);

  const NavList = (
    <nav className="flex-1 space-y-0.5 px-3">
      {nav.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);

        return (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium tracking-[-0.01em] transition-colors ${
              active
                ? "text-[#EE4D2D]"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                active
                  ? "bg-[#EE4D2D]/10"
                  : "bg-transparent group-hover:bg-muted"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "text-[#EE4D2D]" : ""}`} />
            </span>
            <span className={active ? "font-semibold" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Desktop sidebar — right-aligned, Shopee-style */}
      <aside className="fixed inset-y-0 right-0 hidden w-60 flex-col border-l border-border/50 bg-sidebar md:flex">
        <div className="border-b border-border/50 px-5 pb-4 pt-5 mb-2">
          <Logo />
        </div>
        {NavList}
        <div className="border-t border-border/50 pt-2 mt-2">
          <button
            onClick={handleLogout}
            className="mx-3 mb-3 flex w-[calc(100%-24px)] items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-foreground/50 hover:bg-muted hover:text-foreground/80 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" /> Sair
          </button>
        </div>
      </aside>

      <div className="md:pr-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button aria-label="Abrir menu" className="grid h-9 w-9 place-items-center rounded-lg border border-[#EE4D2D] bg-card text-[#EE4D2D] md:hidden">
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-72 bg-sidebar p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="border-b border-border/50 px-5 pb-4 pt-5 mb-2">
                  <Logo />
                </div>
                {NavList}
                <div className="border-t border-border/50 pt-2 mt-2">
                  <button
                    onClick={handleLogout}
                    className="mx-3 mb-4 flex w-[calc(100%-24px)] items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium tracking-[-0.01em] text-foreground/50 hover:bg-muted hover:text-foreground/80 transition-colors"
                  >
                    <LogOut className="h-[18px] w-[18px]" /> Sair
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight md:text-lg">{title}</h1>
              {subtitle && <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <Search className="h-3.5 w-3.5" /> Buscar...
            </div>
            <Link
              to="/planosup"
              className="hidden items-center gap-1.5 rounded-lg border border-[#EE4D2D]/20 bg-[#FFF8F5] px-3 py-1.5 text-xs font-semibold text-[#EE4D2D] transition-all hover:bg-[#EE4D2D]/10 hover:border-[#EE4D2D]/40 md:flex"
            >
              <Zap className="h-3.5 w-3.5" /> Planos
            </Link>
            <button
              onClick={() => setPrivacy(!privacy)}
              aria-label={privacy ? "Mostrar valores" : "Ocultar valores"}
              title={privacy ? "Mostrar valores" : "Ocultar valores"}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button aria-label="Notificações" className="hidden h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground md:grid">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-xs font-bold text-primary">
                {(user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden min-w-0 max-w-[180px] text-xs leading-tight md:block">
                <div className="truncate font-medium">{user?.name}</div>
                <div className="truncate text-muted-foreground">{user?.email}</div>
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
                    className="grid h-6 w-6 place-items-center rounded-full border border-border/70 bg-background/60 text-muted-foreground transition hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-[280px] text-xs leading-relaxed">
                  <div className="mb-1 text-sm font-semibold text-foreground">Ambiente demonstrativo</div>
                  <p className="text-muted-foreground">
                    Este painel é uma simulação da UpShopee, demonstrando como será a integração prevista para agosto de 2026 com Shopee, Mercado Livre e Shein. Os resultados, métricas, pedidos e comissões exibidos aqui são demonstrativos e não representam resultados reais.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <main key={privacy ? "p1" : "p0"} className="min-w-0 px-4 py-6 md:px-8 md:py-8">
          {actions && <div className="mb-6 flex flex-wrap items-center justify-between gap-3">{actions}</div>}
          {children}
        </main>
      </div>

      {/* WhatsApp Support — visível em todas as páginas do dashboard */}
      <WhatsAppSupportButton />

      {/* WhatsApp Channel Popup — apenas para usuários logados no dashboard */}
      <WhatsAppChannelPopup />

      {/* Copa popup — aparece 1x em qualquer página */}
      {showCopaPopup && <CopaPopup onClose={handleCopaClose} onView={handleCopaView} />}

      {hasLightningAccess && (
        <div className="flex gap-2 fixed bottom-6 left-6 z-50">
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
            className={`grid h-12 w-12 place-items-center rounded-full shadow-2xl shadow-primary/40 ring-1 ring-primary/40 transition hover:scale-105 ${lightningLoading ? "bg-gray-400 cursor-not-allowed" : "bg-primary text-primary-foreground"}`}
          >
            {lightningLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
