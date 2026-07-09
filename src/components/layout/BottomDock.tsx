import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTheme } from "../../hooks/use-theme";
import { useApp } from "../../lib/state";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  MessageCircle,
  Bot,
  Clapperboard,
  Link2,
  Settings,
  GraduationCap,
  Sun,
  Moon,
  ShieldCheck,
  Headset,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Bottom Dock — macOS/Windows-11 style floating navigation
   Clean lucide-react icons, theme toggle
   ═══════════════════════════════════════════════════════════════ */

type DockItem = {
  to: string;
  tooltip: string;
  icon: LucideIcon;
  exact?: boolean;
};

/* ── Dock Items Config ── */

const DOCK_ITEMS: DockItem[] = [
  { to: "/dashboard", tooltip: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/produtos", tooltip: "Produtos", icon: ShoppingBag },
  { to: "/dashboard/grupos", tooltip: "Grupos de Divulgação", icon: MessageCircle },
  { to: "/dashboard/robo-divulgador", tooltip: "IA Divulgadora", icon: Bot },
  { to: "/dashboard/video-ia", tooltip: "Vídeo IA", icon: Clapperboard },
  { to: "/dashboard/conectar-contas", tooltip: "Integrações", icon: Link2 },
  { to: "/dashboard/aulas", tooltip: "Aulas", icon: GraduationCap },
  { to: "/dashboard/suporte", tooltip: "Suporte", icon: MessageCircle },
  { to: "/dashboard/configuracoes", tooltip: "Configurações", icon: Settings },
];

/* ── Component ── */

export function BottomDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useApp();

  /* ── Admin dock visibility (toggled by Bell button in header) ── */
  const [adminDockVisible, setAdminDockVisible] = useState(() => {
    try { return localStorage.getItem("upshopee_admin_dock_visible") === "1"; } catch { return false; }
  });

  useEffect(() => {
    const onChange = (e: Event) => {
      if (e instanceof CustomEvent && typeof e.detail === "boolean") {
        setAdminDockVisible(e.detail);
      } else if (e instanceof StorageEvent && e.key === "upshopee_admin_dock_visible") {
        setAdminDockVisible(e.newValue === "1");
      }
    };
    window.addEventListener("upshopee:adminDockToggle", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("upshopee:adminDockToggle", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const adminItems: DockItem[] = isAdmin && adminDockVisible
    ? [
        { to: "/dashboard/validar-cadastros", tooltip: "Validar Cadastros", icon: ShieldCheck },
        { to: "/dashboard/suporte-admin", tooltip: "Responder Tickets", icon: Headset },
      ]
    : [];

  const allItems = [...DOCK_ITEMS, ...adminItems];

  return (
    <>
      {/* Desktop: centered floating pill */}
      <nav
        className="fixed bottom-4 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-0.5 rounded-[24px] border border-[var(--border)] px-2 py-1.5 shadow-[var(--shadow-elevated)] md:flex"
        style={{
          background: theme === "dark"
            ? "rgba(20,20,23,0.82)"
            : "rgba(255,255,255,0.78)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {allItems.map(({ to, tooltip, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={tooltip}
              className="group relative flex h-[48px] w-[48px] items-center justify-center transition-all duration-180 ease-out"
            >
              {/* Tooltip */}
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] opacity-0 shadow-[var(--shadow-elevated)] ring-1 ring-[var(--border)] transition-all duration-180 group-hover:opacity-100 group-hover:-translate-y-0.5">
                {tooltip}
              </span>
              <span
                className={`flex items-center justify-center transition-all duration-180 ${
                  active
                    ? "-translate-y-0.5"
                    : "text-[var(--muted)] group-hover:-translate-y-[3px]"
                }`}
              >
                <Icon
                  strokeWidth={2}
                  className={`h-[26px] w-[26px] transition-all duration-180 ${
                    active ? "text-[var(--accent)]" : ""
                  }`}
                />
              </span>
              {/* Active dot */}
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="mx-1 h-6 w-px bg-[var(--border)]" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Modo noturno" : "Modo claro"}
          className="group relative flex h-[48px] w-[48px] items-center justify-center text-[var(--muted)] transition-all duration-180 hover:-translate-y-[3px] hover:text-[var(--accent)]"
        >
          <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text)] opacity-0 shadow-[var(--shadow-elevated)] ring-1 ring-[var(--border)] transition-all duration-180 group-hover:opacity-100">
            {theme === "light" ? "Modo noturno" : "Modo claro"}
          </span>
          <span className="transition-transform duration-180">
            {theme === "light" ? <Moon strokeWidth={2} size={22} /> : <Sun strokeWidth={2} size={22} />}
          </span>
        </button>
      </nav>

      {/* Mobile: full-width bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--border)] px-1 pb-[env(safe-area-inset-bottom,8px)] pt-1.5 md:hidden"
        style={{
          background: theme === "dark"
            ? "rgba(20,20,23,0.9)"
            : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {allItems.map(({ to, tooltip, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={tooltip}
              className="relative flex flex-col items-center gap-0.5 py-1"
            >
              <span
                className={`flex h-[44px] w-[44px] items-center justify-center transition-all duration-180 ${
                  active ? "-translate-y-0.5" : "text-[var(--muted)]"
                }`}
              >
                <Icon
                  strokeWidth={2}
                  className={`h-[22px] w-[22px] transition-all duration-180 ${
                    active ? "text-[var(--accent)]" : ""
                  }`}
                />
              </span>
              {active && (
                <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          );
        })}

        {/* Theme Toggle (mobile) */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Modo noturno" : "Modo claro"}
          className="relative flex flex-col items-center gap-0.5 py-1 text-[var(--muted)]"
        >
          <span className="flex h-[44px] w-[44px] items-center justify-center">
            {theme === "light" ? <Moon strokeWidth={2} size={22} /> : <Sun strokeWidth={2} size={22} />}
          </span>
          <span className="h-1 w-1 rounded-full bg-transparent" />
        </button>
      </nav>
    </>
  );
}
