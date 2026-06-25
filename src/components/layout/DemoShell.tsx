import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import {
  LayoutDashboard, Package, Bot, Megaphone, Receipt, Calculator,
  Eye, EyeOff, Bell, Search, Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../ui/sheet";

type DemoNavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const DEMO_NAV: DemoNavItem[] = [
  { to: "/demo",                     label: "Dashboard",            icon: LayoutDashboard, exact: true },
  { to: "/demo/produtos",            label: "Produtos",             icon: Package },
  { to: "/demo/robo-divulgador",     label: "Robô Divulgador",      icon: Bot },
  { to: "/demo/grupos",              label: "Grupos de Divulgação", icon: Megaphone },
  { to: "/demo/vendas-clientes",     label: "Vendas / Clientes",    icon: Receipt },
  { to: "/demo/precificacao",        label: "Precificação",         icon: Calculator },
];

function LogoArea() {
  return (
    <div className="flex items-center gap-2">
      <img src="/brand/shopesync-logo.png" alt="UpShopee" className="h-9 w-9 object-contain" />
      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <div className="text-sm font-bold tracking-tight">UpShopee</div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
            style={{ background: "#EE4D2D" }}
          >
            DEMO
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Painel do vendedor</div>
      </div>
    </div>
  );
}

export function DemoShell({
  children,
  title,
  subtitle,
  privacy,
  onTogglePrivacy,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  privacy: boolean;
  onTogglePrivacy: () => void;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavList = (
    <nav className="flex-1 space-y-1 px-3">
      {DEMO_NAV.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to as any}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarCTA = (
    <div className="mx-3 mb-4 mt-2 space-y-2">
      <div className="rounded-lg border border-[#EE4D2D]/30 bg-[#EE4D2D]/5 px-3 py-2 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#EE4D2D]">Modo demonstração</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Dados ilustrativos</div>
      </div>
      <Link
        to="/planos"
        className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold text-white transition hover:brightness-90"
        style={{ background: "#EE4D2D" }}
      >
        ⚡ Assinar Agora
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="px-5 py-5">
          <LogoArea />
        </div>
        {NavList}
        {SidebarCTA}
      </aside>

      <div className="md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Abrir menu"
                  className="grid h-9 w-9 place-items-center rounded-lg border bg-card text-[#EE4D2D] md:hidden"
                  style={{ borderColor: "#EE4D2D" }}
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="px-5 py-5">
                  <LogoArea />
                </div>
                {NavList}
                {SidebarCTA}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight md:text-lg">{title}</h1>
              {subtitle && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <Search className="h-3.5 w-3.5" /> Buscar...
            </div>
            <button
              onClick={onTogglePrivacy}
              aria-label={privacy ? "Mostrar valores" : "Ocultar valores"}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              aria-label="Notificações"
              className="hidden h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground md:grid"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
              <div
                className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-white"
                style={{ background: "#EE4D2D" }}
              >
                D
              </div>
              <div className="hidden min-w-0 max-w-[160px] text-xs leading-tight md:block">
                <div className="truncate font-medium">Usuário Demo</div>
                <div className="truncate text-muted-foreground">demo@upshopee.com</div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
          {actions && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">{actions}</div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
