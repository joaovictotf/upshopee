import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Package, Calculator, Megaphone, Plug, Settings, LogOut, Bell, Search, Zap, PackageCheck, Eye, EyeOff, Receipt, ShieldCheck, Info, Menu, Flame, UserPlus, Video, Trophy, X, Bot } from "lucide-react";
import { useApp, MARKETPLACE_LABEL } from "../../lib/state";
import { brl } from "../../lib/format";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { WhatsAppSupportButton } from "../WhatsAppSupportButton";

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

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; special?: "fire"; adminOnly?: boolean };
const baseNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/produtos", label: "Produtos", icon: Package },
  { to: "/dashboard/meus-produtos", label: "Meus Produtos", icon: PackageCheck },
  { to: "/dashboard/vendas-clientes", label: "Vendas / Clientes", icon: Receipt },
  { to: "/dashboard/precificacao", label: "Precificação", icon: Calculator },
  { to: "/dashboard/impulsionar-vendas", label: "Impulsionar vendas", icon: Zap, adminOnly: true },
  { to: "/dashboard/grupos", label: "Grupos de Divulgação", icon: Megaphone },
  { to: "/dashboard/robo-divulgador", label: "Robô Divulgador", icon: Bot },
  { to: "/dashboard/conectar-contas", label: "Conectar Contas", icon: Plug },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  { to: "/dashboard/tutoriais", label: "Tutoriais", icon: Video },
];
const adminExtraNav: NavItem[] = [
  { to: "/dashboard/validar-cadastros", label: "Validar Cadastros", icon: ShieldCheck },
  { to: "/dashboard/adicionar-adms", label: "Adicionar ADMs", icon: UserPlus },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/brand/shopesync-logo.png" alt="ShopeSync" className="h-9 w-9 object-contain" />
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight">ShopeSync</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel do vendedor</div>
      </div>
    </div>
  );
}

export function DashboardShell({ children, title, subtitle, actions, onLightningClick, onResetMetrics }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode; onLightningClick?: () => void; onResetMetrics?: () => void }) {
  const { user, logout, isAdmin, selectedMarketplace, privacy, setPrivacy, adminPresentationMode, toggleAdminPresentationMode, hasLightningAccess, recordLightningClick, resetTodaySales } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showCopaPopup, setShowCopaPopup] = useState(false);

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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };
  const showAdmin = isAdmin && !adminPresentationMode;
  const nav: NavItem[] = (showAdmin ? [...baseNav, ...adminExtraNav] : [...baseNav]).filter(({ adminOnly }) => !adminOnly || isAdmin);

  const NavList = (
    <nav className="flex-1 space-y-1 px-3">
      {nav.map(({ to, label, icon: Icon, exact, special }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        if (special === "fire") {
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "hover:bg-amber-500/10"}`}
            >
              <Flame className="h-4 w-4 text-amber-500 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
              <span className="boost-fire-text">Impulsionar vendas</span>
              <span aria-hidden className="ml-auto text-base leading-none">🔥</span>
            </Link>
          );
        }
        return (
          <Link key={to} to={to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary/15 text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-5 py-5"><Logo /></div>
        {NavList}
        <button onClick={handleLogout} className="mx-3 mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button aria-label="Abrir menu" className="grid h-9 w-9 place-items-center rounded-lg border border-[#EE4D2D] bg-card text-[#EE4D2D] md:hidden">
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="px-5 py-5"><Logo /></div>
                {NavList}
                <button onClick={handleLogout} className="mx-3 mb-4 mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
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
                    Este painel é uma simulação da ShopeSync, demonstrando como será a integração prevista para agosto de 2026 com Shopee, Mercado Livre e Shein. Os resultados, métricas, pedidos e comissões exibidos aqui são demonstrativos e não representam resultados reais.
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

      {/* Copa popup — aparece 1x em qualquer página */}
      {showCopaPopup && <CopaPopup onClose={handleCopaClose} onView={handleCopaView} />}

      {hasLightningAccess && (
        <div className="flex gap-2 fixed bottom-6 right-6 z-50">
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
            onClick={() => {
              onLightningClick?.();
              void (async () => {
                const r = await recordLightningClick();
                if (!r.ok) {
                  toast.error(r.error || "Não foi possível registrar a comissão.");
                  return;
                }
                toast.success(`Nova comissão registrada — ${brl(r.amount ?? 0)}`, {
                  description: `Comissão adicionada ao painel em ${MARKETPLACE_LABEL[selectedMarketplace]}.`,
                });
              })();
            }}
            aria-label={`Simular venda em ${MARKETPLACE_LABEL[selectedMarketplace]}`}
            title={`Simular venda em ${MARKETPLACE_LABEL[selectedMarketplace]}`}
            className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 ring-1 ring-primary/40 transition hover:scale-105"
          >
            <Zap className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}