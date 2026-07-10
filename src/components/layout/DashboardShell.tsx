import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Loader2, Search, Zap, Eye, EyeOff, LogOut } from "lucide-react";
import { useApp, MARKETPLACE_LABEL } from "../../lib/state";
import { brl } from "../../lib/format";
import { toast } from "sonner";
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
  const { user, logout, isAdmin, privacy, setPrivacy, selectedMarketplace, hasLightningAccess, adminBoostActive, recordLightningClick, resetTodaySales, passwordResetRequired } = useApp();
  const navigate = useNavigate();
  const [lightningLoading, setLightningLoading] = useState(false);

  /* ── Editable admin display name/email ── */
  const [adminName, setAdminName] = useState(user?.name || "");
  const [adminEmail, setAdminEmail] = useState(user?.email || "");
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nameFlash, setNameFlash] = useState(false);
  const [emailFlash, setEmailFlash] = useState(false);
  const [adminDockVisible, setAdminDockVisible] = useState(() => {
    try { return localStorage.getItem("upshopee_admin_dock_visible") === "1"; } catch { return false; }
  });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

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

            {/* Admin dock toggle (Bell) — only visible to admins */}
            {isAdmin && (
              <button
                onClick={() => {
                  const next = adminDockVisible ? "0" : "1";
                  localStorage.setItem("upshopee_admin_dock_visible", next);
                  setAdminDockVisible(!adminDockVisible);
                  window.dispatchEvent(new CustomEvent("upshopee:adminDockToggle", { detail: next === "1" }));
                }}
                aria-label={adminDockVisible ? "Ocultar ferramentas administrativas" : "Mostrar ferramentas administrativas"}
                title={adminDockVisible ? "Ocultar ferramentas administrativas" : "Mostrar ferramentas administrativas"}
                className={`hidden h-9 w-9 place-items-center rounded-lg border transition-all duration-200 md:grid ${
                  adminDockVisible
                    ? "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <Bell className="h-4 w-4" />
              </button>
            )}

            {/* User avatar + editable info */}
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                {(adminName || user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden min-w-0 max-w-[180px] text-xs leading-tight md:block">
                {/* Editable name */}
                {isAdmin && editingName ? (
                  <input
                    ref={nameInputRef}
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    onBlur={() => { setEditingName(false); if (adminName.trim()) { setNameFlash(true); setTimeout(() => setNameFlash(false), 1200); } }}
                    onKeyDown={(e) => { if (e.key === "Enter") { setEditingName(false); if (adminName.trim()) { setNameFlash(true); setTimeout(() => setNameFlash(false), 1200); } } }}
                    className={`w-full truncate bg-[var(--accent-soft)] px-1 py-0.5 rounded text-xs font-medium text-[var(--accent)] outline-none transition-colors ${nameFlash ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : ""}`}
                  />
                ) : (
                  <div
                    className={`truncate font-medium rounded px-1 -ml-1 transition-colors ${isAdmin ? "cursor-pointer hover:bg-[var(--accent-soft)]" : ""} ${nameFlash ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : ""}`}
                    onDoubleClick={() => { if (isAdmin) { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 10); } }}
                  >
                    {adminName || user?.name}
                  </div>
                )}
                {/* Editable email */}
                {isAdmin && editingEmail ? (
                  <input
                    ref={emailInputRef}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    onBlur={() => { setEditingEmail(false); if (adminEmail.trim()) { setEmailFlash(true); setTimeout(() => setEmailFlash(false), 1200); } }}
                    onKeyDown={(e) => { if (e.key === "Enter") { setEditingEmail(false); if (adminEmail.trim()) { setEmailFlash(true); setTimeout(() => setEmailFlash(false), 1200); } } }}
                    className={`w-full truncate bg-[var(--accent-soft)] px-1 py-0.5 rounded text-xs text-[var(--muted)] outline-none transition-colors ${emailFlash ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : ""}`}
                  />
                ) : (
                  <div
                    className={`truncate text-[var(--muted)] rounded px-1 -ml-1 transition-colors ${isAdmin ? "cursor-pointer hover:bg-[var(--accent-soft)]" : ""} ${emailFlash ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : ""}`}
                    onDoubleClick={() => { if (isAdmin) { setEditingEmail(true); setTimeout(() => emailInputRef.current?.focus(), 10); } }}
                  >
                    {adminEmail || user?.email}
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="grid h-6 w-6 place-items-center rounded-full border border-[var(--border)]/70 bg-[var(--bg)]/60 text-[var(--muted)] transition hover:text-red-500"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Main content ── */}
        <main key={privacy ? "p1" : "p0"} className="min-w-0 overflow-x-hidden px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-0">
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
              title={`Simular venda em ${MARKETPLACE_LABEL[selectedMarketplace]}${adminBoostActive ? " (impulso ativo)" : ""}`}
              className={`grid h-12 w-12 place-items-center rounded-full shadow-2xl transition hover:scale-105 ${lightningLoading ? "bg-gray-400 cursor-not-allowed" : "bg-[var(--accent)] text-white"} ${adminBoostActive ? "shadow-[var(--accent)]/60 ring-2 ring-[var(--accent)]/60" : "shadow-[var(--accent)]/40 ring-1 ring-[var(--accent)]/40"}`}
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
