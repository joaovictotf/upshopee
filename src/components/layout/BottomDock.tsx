import { Link, useRouterState } from "@tanstack/react-router";
import { useTheme } from "../../hooks/use-theme";
import type { ComponentType, SVGProps } from "react";

/* ═══════════════════════════════════════════════════════════════
   Bottom Dock — macOS/Windows-11 style floating navigation
   Icon-only, duotone custom SVGs, theme toggle
   ═══════════════════════════════════════════════════════════════ */

type DockItem = {
  to: string;
  tooltip: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
};

/* ── Gradient definition shared by all icons ── */
function DockGradient() {
  return (
    <defs>
      <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#F4541E" />
        <stop offset="1" stopColor="#FF7A45" />
      </linearGradient>
    </defs>
  );
}

/* ── Custom Duotone Icons (2.5px rounded strokes + gradient fill layer) ── */

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* 2×2 app grid — top-left, bottom-left, bottom-right: outline; top-right: filled */}
      <rect x="3.5" y="3.5" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="2.5" className="dock-icon-outline" />
      <rect x="14.5" y="3.5" width="8" height="8" rx="2.5" fill="url(#dockGrad)" className="dock-icon-fill" />
      <rect x="3.5" y="14.5" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="2.5" className="dock-icon-outline" />
      <rect x="14.5" y="14.5" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="2.5" className="dock-icon-outline" />
    </svg>
  );
}

function ProdutosIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* Tag / label shape — pointing right */}
      <path
        d="M2.5 7A2.5 2.5 0 0 1 5 4.5h8l10 10-10 10H5a2.5 2.5 0 0 1-2.5-2.5V7z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="dock-icon-outline"
      />
      {/* 4-point star on the tag (duotone accent) */}
      <path
        d="M13.5 9.5 15 12.5l3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z"
        fill="url(#dockGrad)"
        className="dock-icon-fill"
      />
    </svg>
  );
}

function GruposIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* User 1 (left, outline only) */}
      <circle cx="8.5" cy="8" r="3.5" stroke="currentColor" strokeWidth="2.5" className="dock-icon-outline" />
      <path d="M2 22c0-4.5 3-7.5 6.5-7.5s6.5 3 6.5 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="dock-icon-outline" />
      {/* User 2 (right, body filled with gradient) */}
      <circle cx="17.5" cy="8" r="3.5" stroke="currentColor" strokeWidth="2.5" className="dock-icon-outline" />
      <path d="M11 22c0-4.5 3-7.5 6.5-7.5S24 17.5 24 22" fill="url(#dockGrad)" className="dock-icon-fill" />
    </svg>
  );
}

function IADivulgadoraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* Chat bubble — clean rounded rect with tail */}
      <path
        d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3l-3.5 3.5v-3.5H7a3 3 0 0 1-3-3V7z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="dock-icon-outline"
      />
      {/* AI sparkle inside (4-point star) */}
      <path
        d="M13 10.5 14.2 13l2.8 1-2.8 1-1.2 2.5-1.2-2.5L9 14l2.8-1z"
        fill="url(#dockGrad)"
        className="dock-icon-fill"
      />
    </svg>
  );
}

function VideoIAIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* Rounded frame (phone/screen shape) */}
      <rect x="2.5" y="4" width="21" height="18" rx="4" stroke="currentColor" strokeWidth="2.5" className="dock-icon-outline" />
      {/* Play triangle */}
      <path d="M11.5 10v6l5-3z" fill="url(#dockGrad)" className="dock-icon-fill" />
    </svg>
  );
}

function IntegracoesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* Puzzle piece — clean silhouette with top & bottom tabs */}
      <path
        d="M7 5h6a2.5 2.5 0 0 1 5 0h1.5A2.5 2.5 0 0 1 22 7.5V10a2.5 2.5 0 0 0 0 5v3.5a2.5 2.5 0 0 1-2.5 2.5H18a2.5 2.5 0 0 0-5 0H7A2.5 2.5 0 0 1 4.5 18.5V15a2.5 2.5 0 0 0 0-5V7.5A2.5 2.5 0 0 1 7 5z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="url(#dockGrad)"
        className="dock-icon-outline dock-icon-fill"
      />
    </svg>
  );
}

function ConfigIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      <DockGradient />
      {/* 3 horizontal adjustment sliders */}
      <line x1="3" y1="7.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="dock-icon-outline" />
      <circle cx="19.5" cy="7.5" r="3" fill="url(#dockGrad)" className="dock-icon-fill" />
      <line x1="3" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="dock-icon-outline" />
      <circle cx="13.5" cy="13" r="3" fill="url(#dockGrad)" className="dock-icon-fill" />
      <line x1="3" y1="18.5" x2="20" y2="18.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="dock-icon-outline" />
      <circle cx="23" cy="18.5" r="3" fill="url(#dockGrad)" className="dock-icon-fill" />
    </svg>
  );
}

/* ── Theme toggle icons ── */

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M18 13.5A8 8 0 0 1 8.5 4 7 7 0 1 0 18 13.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Dock Items Config ── */

const DOCK_ITEMS: DockItem[] = [
  { to: "/dashboard", tooltip: "Dashboard", icon: DashboardIcon, exact: true },
  { to: "/dashboard/produtos", tooltip: "Produtos", icon: ProdutosIcon },
  { to: "/dashboard/grupos", tooltip: "Grupos de Divulgação", icon: GruposIcon },
  { to: "/dashboard/robo-divulgador", tooltip: "IA Divulgadora", icon: IADivulgadoraIcon },
  { to: "/dashboard/video-ia", tooltip: "Vídeo IA", icon: VideoIAIcon },
  { to: "/dashboard/conectar-contas", tooltip: "Integrações", icon: IntegracoesIcon },
  { to: "/dashboard/configuracoes", tooltip: "Configurações", icon: ConfigIcon },
];

/* ── Component ── */

export function BottomDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggleTheme } = useTheme();

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
        {DOCK_ITEMS.map(({ to, tooltip, icon: Icon, exact }) => {
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
                  className={`h-[26px] w-[26px] transition-all duration-180 ${
                    active
                      ? "[&_.dock-icon-outline]:text-[var(--accent)] [&_.dock-icon-fill]:opacity-100"
                      : "[&_.dock-icon-outline]:text-current [&_.dock-icon-fill]:opacity-25 group-hover:[&_.dock-icon-fill]:opacity-60"
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
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
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
        {DOCK_ITEMS.map(({ to, tooltip, icon: Icon, exact }) => {
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
                  className={`h-[24px] w-[24px] transition-all duration-180 ${
                    active
                      ? "[&_.dock-icon-outline]:text-[var(--accent)] [&_.dock-icon-fill]:opacity-100"
                      : "[&_.dock-icon-outline]:text-current [&_.dock-icon-fill]:opacity-25"
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
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </span>
          <span className="h-1 w-1 rounded-full bg-transparent" />
        </button>
      </nav>
    </>
  );
}
