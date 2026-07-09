import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "../lib/state";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, ArrowRight, LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

/* ── CSS animations (GPU-accelerated) ── */

const LOGIN_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes login-slide-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes login-orb-pulse {
    0%, 100% { transform: scale(1);   opacity: 0.18; }
    50%      { transform: scale(1.12); opacity: 0.26; }
  }
  .lg-enter { animation: login-slide-up 0.5s ease-out both; }
  .lg-orb   { animation: login-orb-pulse 6s ease-in-out infinite; }
}
@media (prefers-reduced-motion: reduce) {
  .lg-enter { animation: none; }
  .lg-orb   { animation: none; }
}
`;

function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await login(email, password);
      if (!r.ok) {
        if (r.pending) {
          navigate({ to: "/conta-em-analise" });
          return;
        }
        if (r.blocked) {
          navigate({ to: "/pagamento-bloqueado" });
          return;
        }
        toast.error(r.error || "Nao foi possivel entrar.");
        return;
      }
      if (r.passwordReset) {
        navigate({ to: "/redefinir-senha" });
        return;
      }
      navigate({ to: "/dashboard" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{LOGIN_CSS}</style>
      <div className="flex min-h-dvh bg-[#FFF8F5] dark:bg-[var(--bg)]">
        {/* ═══ LEFT: Branding panel (desktop) ═══ */}
        <div className="relative hidden w-[520px] flex-shrink-0 flex-col justify-between overflow-hidden bg-[#EE4D2D] p-14 lg:flex">
          {/* Dot pattern background */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 65%, white 1.5px, transparent 1.5px)",
                backgroundSize: "64px 64px, 88px 88px",
              }}
            />
          </div>

          {/* Animated gradient orb */}
          <div className="lg-orb pointer-events-none absolute -top-32 -right-32 h-[360px] w-[360px] rounded-full opacity-[0.16] blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)" }}
          />

          {/* Logo */}
          <div className="relative z-10">
            <img
              src="/brand/logo.png"
              alt="UpShopee"
              className="h-20 w-auto object-contain drop-shadow-lg"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>

          {/* Headline */}
          <div className="relative z-10">
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Venda mais com um
              <br />
              painel feito para operar.
            </h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/80">
              Conecte Shopee, Mercado Livre e Shein, encontre produtos validados e
              envie direto para sua loja.
            </p>
          </div>

          {/* Copyright */}
          <div className="relative z-10">
            <p className="text-xs text-white/35">
              &copy; UpShopee &middot; Painel do vendedor
            </p>
          </div>
        </div>

        {/* ═══ RIGHT: Form panel ═══ */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-0">
          <div className="lg-enter w-full max-w-[420px]">
            {/* Mobile logo */}
            <img
              src="/brand/logo.png"
              alt="UpShopee"
              className="mx-auto mb-10 block h-12 w-auto object-contain lg:hidden"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />

            {/* Heading */}
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                Bem-vindo de volta
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-[var(--muted)]">
                Entre para continuar gerenciando sua operação
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[var(--text)]">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#EE4D2D] focus:ring-2 focus:ring-[#EE4D2D]/15 dark:border-[var(--border)] dark:bg-[var(--bg)] dark:text-[var(--text)] dark:placeholder:text-[var(--muted)] dark:focus:border-[var(--accent)] dark:focus:ring-[var(--accent)]/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-[var(--text)]">
                    Senha
                  </label>
                  <Link
                    to="/redefinir-senha"
                    className="text-xs font-semibold text-[#EE4D2D] transition-colors hover:text-[#EE4D2D]/70 dark:text-[var(--accent)]"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-12 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-[#EE4D2D] focus:ring-2 focus:ring-[#EE4D2D]/15 dark:border-[var(--border)] dark:bg-[var(--bg)] dark:text-[var(--text)] dark:placeholder:text-[var(--muted)] dark:focus:border-[var(--accent)] dark:focus:ring-[var(--accent)]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-[var(--muted)]"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-[#EE4D2D] to-[#FF7A45] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 transition-all duration-200 hover:shadow-lg hover:shadow-[#EE4D2D]/35 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-[var(--border)]" />
              <span className="text-xs text-gray-400 dark:text-[var(--muted)]">ou continue com</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-[var(--border)]" />
            </div>

            {/* Register */}
            <p className="text-center text-sm text-gray-500 dark:text-[var(--muted)]">
              Não tem conta?{" "}
              <Link
                to="/register"
                className="font-semibold text-[#EE4D2D] transition-colors hover:text-[#EE4D2D]/70 dark:text-[var(--accent)]"
              >
                Criar conta
              </Link>
            </p>

            {/* Plans link */}
            <p className="mt-3 text-center">
              <Link
                to="/ofertas"
                className="text-xs font-medium text-gray-400 transition-colors hover:text-[#EE4D2D] dark:text-[var(--muted)] dark:hover:text-[var(--accent)]"
              >
                Ver planos e preços →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
