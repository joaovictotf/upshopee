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

/* ── Custom Duotone Icons (1.8px rounded strokes + gradient fill layer) ── */

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Gauge arc */}
      <path
        d="M5 21A9 9 0 0 1 21 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="dock-icon-outline"
      />
      {/* Tick marks */}
      <path d="M8 22v-2.5M13 23v-2.5M18 21v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="dock-icon-outline" />
      {/* Needle */}
      <line x1="13" y1="15" x2="18" y2="10" stroke="url(#dockGrad)" strokeWidth="2" strokeLinecap="round" className="dock-icon-fill" />
      {/* Center dot */}
      <circle cx="13" cy="15" r="2" fill="url(#dockGrad)" className="dock-icon-fill" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProdutosIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Bag body */}
      <path
        d="M7 9.5L9 21h8l2-11.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dock-icon-outline"
      />
      {/* Bag handle */}
      <path d="M9.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="dock-icon-outline" />
      {/* Upward arrow from top */}
      <path d="M17 5l-4-3-4 3" stroke="url(#dockGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="dock-icon-fill" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GruposIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Two user avatars overlapping */}
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" className="dock-icon-outline" />
      <circle cx="16" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" className="dock-icon-outline" />
      {/* Broadcast arcs */}
      <path d="M20 14c1.5 1.5 2.5 3.5 2.5 6" stroke="url(#dockGrad)" strokeWidth="1.8" strokeLinecap="round" className="dock-icon-fill" />
      <path d="M22.5 11c2.5 2.5 3.5 5.5 3.5 9" stroke="url(#dockGrad)" strokeWidth="1.5" strokeLinecap="round" className="dock-icon-fill" opacity="0.5" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IADivulgadoraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Chat bubble */}
      <path
        d="M5 12a9 9 0 0 1 9-9h0a9 9 0 0 1 0 18h-4l-3 3v-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dock-icon-outline"
      />
      {/* AI sparkle (4-point star) */}
      <path
        d="M10 14l1.5-1.5L13 14l-1.5 1.5L10 14z"
        fill="url(#dockGrad)"
        className="dock-icon-fill"
      />
      {/* Motion arcs */}
      <path d="M8 18c1.5 1 3 1.5 5 1" stroke="url(#dockGrad)" strokeWidth="1.5" strokeLinecap="round" className="dock-icon-fill" opacity="0.6" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function VideoIAIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Clapper/play tile */}
      <rect x="4" y="5" width="18" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" className="dock-icon-outline" />
      {/* Clapper top bar */}
      <path d="M4 9h18" stroke="currentColor" strokeWidth="1.8" className="dock-icon-outline" />
      <path d="M8 5v4M14 5v4" stroke="currentColor" strokeWidth="1.5" className="dock-icon-outline" />
      {/* Play triangle */}
      <path d="M11 12.5l5 3.5-5 3.5v-7z" fill="url(#dockGrad)" className="dock-icon-fill" />
      {/* Sparkle at top-right */}
      <circle cx="20" cy="7" r="1.2" fill="url(#dockGrad)" className="dock-icon-fill" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ConectarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Chain link left */}
      <path
        d="M10 9H7.5A4.5 4.5 0 1 0 7.5 18H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="dock-icon-outline"
      />
      {/* Chain link right */}
      <path
        d="M16 9h2.5A4.5 4.5 0 1 1 18.5 18H16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="dock-icon-outline"
      />
      {/* Energy pulse at junction */}
      <circle cx="13" cy="13.5" r="2.5" fill="url(#dockGrad)" className="dock-icon-fill" />
      <circle cx="13" cy="13.5" r="1" fill="white" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ConfigIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" {...props}>
      {/* Gear outer — 8 rounded teeth */}
      <path
        d="M13 2l1.5 3.5L18 4.5l1 1.5-2.5 2.5 1 1 2.5-2.5L21.5 8 20 11.5 23 13l-3 1.5L21.5 18l-1.5 1-2.5-2.5-1 1 2.5 2.5-1 1.5-3.5-1L13 23l-1.5-3L8 21.5l-1-1.5 2.5-2.5-1-1-2.5 2.5L4.5 18 6 14.5 3 13l3-1.5L4.5 8l1.5-1 2.5 2.5 1-1-2.5-2.5L8 4.5 11.5 6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="dock-icon-outline"
      />
      {/* Core circle */}
      <circle cx="13" cy="13" r="3.5" fill="url(#dockGrad)" className="dock-icon-fill" />
      <defs>
        <linearGradient id="dockGrad" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4541E" />
          <stop offset="1" stopColor="#FF7A45" />
        </linearGradient>
      </defs>
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
  { to: "/dashboard/conectar-contas", tooltip: "Conectar Contas", icon: ConectarIcon },
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
