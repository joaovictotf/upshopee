/**
 * UpShopee — Planos (Ultra-Premium Landing Page)
 * ===============================================
 * Built: 2026-07-01
 * Stack: React 19 + TanStack Router + vanilla CSS IntersectionObserver
 *
 * THINGS TO REPLACE:
 *   {{VSL_VIDEO_URL}}      — real VSL video embed URL (section 3)
 *   COUNTER_NUMBERS         — real metrics (section 4, lines ~PROOF_COUNTERS)
 *   TESTIMONIAL_DATA        — real testimonials (section 9)
 *   CHECKOUT_LINKS are read from the LINKS constant below
 *
 * DESIGN: Dark premium (#0D0D0F bg), orange accent (#F4541E),
 *         Inter font, mobile-first, 15 sections, exit-intent popup.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export const Route = createFileRoute("/vendas")({ component: PlanosPage });

// ═══════════════════════════════════════════════════════════════════
// CONFIG — change these when replacing placeholders
// ═══════════════════════════════════════════════════════════════════

const CHECKOUT_MENSAL  = "https://checkout.wiven.com.br/checkout/cmqhil5uf00uk01pkrfkcg47g?offer=9FP58KU";
const CHECKOUT_MENSAL_PIX = "https://go.ironpayapp.com.br/knwcyeiala";
const CHECKOUT_VITALICIO = "https://checkout.wiven.com.br/checkout/cmqhil5uf00uk01pkrfkcg47g?offer=YO807KG";
const CHECKOUT_VITALICIO_PIX = "https://go.ironpayapp.com.br/jxzfsyhoci";

const VSL_VIDEO_URL = "{{VSL_VIDEO_URL}}"; // ← replace with real embed

const COUNTERS = { affiliates: 1247, videos: 8930, products: 45620 };

const TESTIMONIALS = [
  { name: "Ana Souza", role: "Afiliada Shopee", quote: "Entrei sem saber nada. Em 3 semanas já estava com 4 vídeos no ar e comissão pingando todo dia. A IA cria tudo — eu só posto.", photo: "https://i.pravatar.cc/120?img=1" },
  { name: "Carlos Mendes", role: "Afiliado Shopee", quote: "O minerador de produtos sozinho já vale o investimento. Descobri produtos que pagam R$ 80 de comissão que eu nunca acharia sozinho.", photo: "https://i.pravatar.cc/120?img=3" },
  { name: "Juliana Rocha", role: "Afiliada Shopee", quote: "Peguei o vitalício achando que era arriscado. Em 15 dias já tinha recuperado o valor. Melhor decisão que tomei esse ano.", photo: "https://i.pravatar.cc/120?img=5" },
];

const FAQ_ITEMS = [
  { q: "Preciso já ser afiliado da Shopee para usar?", a: "Não! Você pode começar do zero. A UpShopee te ajuda a se cadastrar no programa de afiliados e já mostrar os melhores produtos para divulgar." },
  { q: "Funciona no celular?", a: "Sim. Toda a plataforma é 100% responsiva. Você pode minerar produtos, gerar ideias e acompanhar suas comissões direto do seu smartphone." },
  { q: "É seguro? Como recebo o acesso?", a: "Totalmente seguro. Após a confirmação do pagamento você recebe o acesso imediato por e-mail. O pagamento é processado por plataformas certificadas (IronPay / PerfectPay)." },
  { q: "O plano vitalício tem mensalidade?", a: "Não. É pagamento único — acesso para sempre. Sem cobranças recorrentes, sem taxas escondidas." },
  { q: "Posso parcelar?", a: "Sim! O plano vitalício pode ser parcelado em até 12x de R$ 27,61 no cartão de crédito. Consulte as opções no checkout." },
  { q: "E se eu não gostar?", a: "Você tem 7 dias de garantia incondicional. Teste a plataforma e, se não fizer sentido para você, devolvemos 100% do valor. Sem perguntas." },
  { q: "Tem suporte?", a: "Sim. Comunidade VIP no WhatsApp + suporte prioritário por e-mail. Você nunca está sozinho." },
];

// ═══════════════════════════════════════════════════════════════════
// TINY UTILITY HOOKS
// ═══════════════════════════════════════════════════════════════════

function useScrolled(threshold = 50) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return scrolled;
}

function useScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const fn = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0) { setPct(0); return; }
      setPct(Math.min(100, (window.scrollY / h) * 100));
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return pct;
}

function useCountUp(target: number, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf: number; const startT = performance.now();
    const step = (now: number) => {
      const elapsed = now - startT;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return val;
}

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.2, once = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); if (once) obs.disconnect(); } else if (!once) setInView(false); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return inView;
}

// ═══════════════════════════════════════════════════════════════════
// REUSABLE MICRO-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className} style={{ flexShrink: 0 }}>
    <circle cx="9" cy="9" r="9" fill="rgba(244,84,30,0.12)" />
    <path d="M5.5 9l2.5 2.5 5-5" stroke="#F4541E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Section = ({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`relative py-16 md:py-24 px-5 md:px-8 lg:px-12 ${className}`}>
    <div className="mx-auto max-w-7xl">{children}</div>
  </section>
);

const SectionTitle = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <h2 className={`text-3xl md:text-5xl font-extrabold tracking-tight mb-4 ${light ? "text-white" : "text-white"}`}>
    {children}
  </h2>
);

const Subtle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-base md:text-lg leading-relaxed ${className}`} style={{ color: "#A0A0A8" }}>{children}</p>
);

// ═══════════════════════════════════════════════════════════════════
// ANIMATION OBSERVER — reusable reveal wrapper
// ═══════════════════════════════════════════════════════════════════

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.18);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

function PlanosPage() {
  const scrolled = useScrolled(50);
  const progress = useScrollProgress();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exitPopupVisible, setExitPopupVisible] = useState(false);
  const [exitPopupDismissed, setExitPopupDismissed] = useState(() => typeof sessionStorage !== "undefined" && sessionStorage.getItem("lp_exit_seen_v4") === "1");
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);

  // Pricing section visibility (hide mobile sticky CTA when pricing is visible)
  const pricingRef = useRef<HTMLElement>(null);
  const pricingVisible = useInView(pricingRef, 0.1, false);

  // Hero out-of-view detection for mobile CTA
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { setHeroVisible(e.isIntersecting); }, { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setShowMobileCTA(!heroVisible && !pricingVisible && !exitPopupVisible); }, [heroVisible, pricingVisible, exitPopupVisible]);

  // ── Parallax orbs for hero ──
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Exit-intent popup (desktop: mouse leaves top; mobile: back-button + scroll velocity) ──
  const exitPopupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(0);
  const hasShownPopup = useRef(false);

  const dismissExitPopup = useCallback(() => {
    setExitPopupVisible(false);
    setExitPopupDismissed(true);
    try { sessionStorage.setItem("lp_exit_seen_v4", "1"); } catch {}
  }, []);

  useEffect(() => {
    if (exitPopupDismissed || hasShownPopup.current) return;
    // Desktop: mouse leaves viewport top
    const onMouseLeave = (e: MouseEvent) => { if (e.clientY <= 0 && !exitPopupDismissed) { hasShownPopup.current = true; setExitPopupVisible(true); } };
    document.addEventListener("mouseleave", onMouseLeave);

    // Mobile: rapid upward scroll
    let scrollTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      const now = Date.now();
      const dy = window.scrollY - lastScrollY.current;
      const dt = now - lastScrollTime.current;
      lastScrollY.current = window.scrollY; lastScrollTime.current = now;
      if (dt > 0 && window.scrollY > window.innerHeight * 0.5 && dy < -(window.innerHeight * 0.6) && dt < 400 && !exitPopupDismissed) {
        hasShownPopup.current = true; setExitPopupVisible(true);
      }
    };
    // Mobile: back-button intent
    const onPop = (e: PopStateEvent) => { e.preventDefault(); history.pushState(null, ""); if (!exitPopupDismissed) { hasShownPopup.current = true; setExitPopupVisible(true); } };
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      history.pushState(null, "");
      window.addEventListener("popstate", onPop);
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [exitPopupDismissed]);

  // Close popup on ESC
  useEffect(() => {
    if (!exitPopupVisible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismissExitPopup(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPopupVisible, dismissExitPopup]);

  // ── Disable popup when pricing is in view ──
  useEffect(() => {
    if (pricingVisible && exitPopupVisible) dismissExitPopup();
  }, [pricingVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── VSL section ref ──
  const vslRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ fontFamily: "'Inter', 'Barlow', -apple-system, BlinkMacSystemFont, sans-serif", background: "#0D0D0F", color: "#F2F2F2", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap');
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #0D0D0F; }

        /* Animations */
        @keyframes lp-orbit1 { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(60px,-30px) scale(1.04); } 66% { transform: translate(-20px,50px) scale(0.97); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes lp-orbit2 { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(-70px,20px) scale(0.96); } 66% { transform: translate(40px,-40px) scale(1.03); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes lp-orbit3 { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,60px) scale(1.02); } 66% { transform: translate(-50px,-20px) scale(0.98); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes lp-glow-pulse { 0%,100% { box-shadow: 0 0 40px rgba(244,84,30,0.3); } 50% { box-shadow: 0 0 80px rgba(244,84,30,0.5); } }
        @keyframes lp-shine { 0% { left: -60%; } 100% { left: 120%; } }
        @keyframes lp-bounce-chevron { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        @keyframes lp-heartbeat { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes lp-strike { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes lp-ring-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes lp-particle-float { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-200px) translateX(40px); opacity: 0; } }
        @keyframes lp-marquee-led {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .lp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-weight: 700; text-decoration: none; border: none; cursor: pointer;
          border-radius: 14px; transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          font-family: inherit; white-space: nowrap;
        }
        .lp-btn:active { transform: scale(0.98); }
        .lp-btn-primary {
          background: linear-gradient(135deg, #F4541E, #FF7A45);
          color: #fff; position: relative; overflow: hidden;
          box-shadow: 0 0 40px rgba(244,84,30,0.25);
        }
        .lp-btn-primary:hover { box-shadow: 0 0 60px rgba(244,84,30,0.4); transform: translateY(-2px); }
        .lp-btn-primary::after {
          content: ''; position: absolute; top: 0; left: -60%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: lp-shine 6s ease-in-out infinite;
        }

        .lp-glow-border {
          position: relative;
        }
        .lp-glow-border::before {
          content: ''; position: absolute; inset: -2px; border-radius: inherit;
          background: linear-gradient(90deg, #F4541E, #FF7A45, #F4541E, #FF7A45);
          background-size: 300% 100%;
          animation: lp-marquee-led 4s linear infinite;
          z-index: -1; opacity: 0.7;
        }

        @keyframes lp-fadeup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .lp-fadeup { animation: lp-fadeup 0.6s cubic-bezier(0.22,1,0.36,1) both; }

        /* Accordion */
        .lp-faq-item { border-bottom: 1px solid #26262B; }
        .lp-faq-trigger { width: 100%; background: none; border: none; color: inherit; font: inherit; cursor: pointer; padding: 20px 0; display: flex; justify-content: space-between; align-items: center; text-align: left; font-weight: 600; font-size: 15px; }
        .lp-faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.22,1,0.36,1); }
        .lp-faq-answer.open { max-height: 300px; }
        .lp-faq-chevron { transition: transform 0.3s; opacity: 0.4; }
        .lp-faq-chevron.open { transform: rotate(180deg); opacity: 0.8; }

        /* Testimonial carousel */
        .lp-testimonial-track { display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .lp-testimonial-track::-webkit-scrollbar { display: none; }
        .lp-testimonial-card { min-width: 300px; scroll-snap-align: start; }

        @media (max-width: 768px) {
          .lp-testimonial-card { min-width: 80vw; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════ */}
      {/* EXIT-INTENT POPUP */}
      {exitPopupVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={dismissExitPopup}>
          <div
            className="relative rounded-2xl p-8 w-full text-center shadow-2xl"
            style={{ maxWidth: 420, background: "#16161A", border: "1px solid #26262B" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={dismissExitPopup} className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg leading-none">&times;</button>
            <img src="/brand/logo.png" alt="UpShopee" className="h-10 mx-auto mb-5 object-contain" />
            <h3 className="text-xl font-extrabold text-white mb-3">Espera — antes de sair…</h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#A0A0A8" }}>
              Você tem 7 dias de garantia incondicional. O risco é zero: teste a UpShopee e, se não fizer sentido, devolvemos 100% do valor.
            </p>
            <a href={CHECKOUT_VITALICIO} className="lp-btn lp-btn-primary h-14 w-full text-base rounded-2xl mb-3">
              Quero testar sem risco →
            </a>
            <button onClick={dismissExitPopup} className="text-xs underline cursor-pointer" style={{ color: "#666", background: "none", border: "none" }}>
              Não, prefiro sair
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* PROGRESS BAR */}
      <div className="fixed top-0 left-0 right-0 z-[99] h-[3px]" style={{ background: "#0D0D0F" }}>
        <div className="h-full transition-none" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #F4541E, #FF7A45)" }} />
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* STICKY HEADER */}
      <header
        className="fixed top-[3px] left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(13,13,15,0.92)" : "rgba(13,13,15,0.6)",
          backdropFilter: "blur(16px)",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
        }}
      >
        <div className="mx-auto flex items-center justify-between h-16 px-5 md:px-8 lg:px-12 max-w-7xl">
          <a href="#" className="flex items-center gap-2 flex-shrink-0">
            <img src="/brand/logo.png" alt="UpShopee" className="h-10 object-contain" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              ["#como-funciona", "Como funciona"],
              ["#recursos", "Recursos"],
              ["#depoimentos", "Depoimentos"],
              ["#planos", "Planos"],
            ].map(([href, label]) => (
              <a key={label} href={href} className="text-sm font-medium transition-colors hover:text-white" style={{ color: "#A0A0A8", textDecoration: "none" }}>
                {label}
              </a>
            ))}
          </div>

          <a href="#planos" className="lp-btn lp-btn-primary h-10 px-5 text-sm rounded-xl hidden md:inline-flex">
            Garantir meu acesso
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1 p-2 z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <span className={`block h-0.5 w-6 transition-all ${mobileMenuOpen ? "rotate-45 translate-y-[6px]" : ""}`} style={{ background: "#fff" }} />
            <span className={`block h-0.5 w-6 transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} style={{ background: "#fff" }} />
            <span className={`block h-0.5 w-6 transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} style={{ background: "#fff" }} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-5 pb-6 pt-2" style={{ background: "rgba(13,13,15,0.98)", backdropFilter: "blur(20px)" }}>
            {[
              ["#como-funciona", "Como funciona"],
              ["#recursos", "Recursos"],
              ["#depoimentos", "Depoimentos"],
              ["#planos", "Planos"],
            ].map(([href, label]) => (
              <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block py-3 text-base font-medium transition-colors hover:text-white border-b"
                style={{ color: "#A0A0A8", textDecoration: "none", borderColor: "#1F1F1F" }}>
                {label}
              </a>
            ))}
            <a href="#planos" onClick={() => setMobileMenuOpen(false)}
              className="lp-btn lp-btn-primary h-12 w-full text-sm rounded-xl mt-4">
              Garantir meu acesso
            </a>
          </div>
        )}
      </header>

      {/* ════════════════════════════════════════════════ */}
      {/* 1. HERO */}
      <section ref={heroRef} className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20" style={{ background: "#0D0D0F" }}>
        {/* Radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(244,84,30,0.1) 0%, transparent 70%)" }} />

        {/* Parallax orbs */}
        <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: "#F4541E", transform: `translateY(${scrollY * 0.03}px)`, animation: "lp-orbit1 18s ease-in-out infinite" }} />
        <div className="absolute top-[40%] right-[5%] w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15" style={{ background: "#FF7A45", transform: `translateY(${-scrollY * 0.05}px)`, animation: "lp-orbit2 22s ease-in-out infinite" }} />
        <div className="absolute bottom-[10%] left-[30%] w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-12" style={{ background: "#888", transform: `translateY(${scrollY * 0.02}px)`, animation: "lp-orbit3 20s ease-in-out infinite" }} />

        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">
          {/* Eyebrow */}
          <Reveal delay={0}>
            <span className="inline-block rounded-full text-xs font-bold uppercase tracking-wider mb-6 px-4 py-1.5" style={{ border: "1px solid rgba(244,84,30,0.4)", color: "#F4541E", background: "rgba(244,84,30,0.08)" }}>
              Para afiliados Shopee — iniciantes ou experientes
            </span>
          </Reveal>

          {/* H1 — word stagger handled by Reveal on the whole block */}
          <Reveal delay={150}>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6">
              Isso não é um gasto.
              <br />
              <span style={{ background: "linear-gradient(135deg, #F4541E, #FF7A45)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                É o investimento
              </span>
              {" "}que coloca a
              <br />
              Shopee para trabalhar por você.
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: "#A0A0A8" }}>
              A plataforma completa com IA que encontra os produtos que mais pagam comissão e cria seus vídeos — enquanto você foca em lucrar.
            </p>
          </Reveal>

          <Reveal delay={450}>
            <a href={CHECKOUT_VITALICIO} className="lp-btn lp-btn-primary h-16 px-10 text-lg rounded-2xl" style={{ animation: "lp-glow-pulse 3s ease-in-out infinite" }}>
              Quero meu acesso vitalício →
            </a>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs" style={{ color: "#777" }}>
              <span>✓ Acesso imediato</span>
              <span>✓ Garantia incondicional de 7 dias</span>
            </div>
          </Reveal>

          {/* Scroll-down chevron */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: "lp-bounce-chevron 2s ease-in-out infinite" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* 2. VSL SECTION */}
      <Section id="vsl" className="bg-[#0D0D0F]">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Assista e entenda por que isso <span style={{ color: "#F4541E" }}>se paga sozinho</span>
            </h2>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div ref={vslRef} className="lp-glow-border mx-auto rounded-2xl" style={{ maxWidth: 900 }}>
            {/* VSL_VIDEO: replace this inner div with the video embed. URL: VSL_VIDEO_URL — keep autoplay muted + click-to-unmute overlay ("Clique para ativar o som") when added */}
            <div className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#16161A" }}>
              {/* Floating particles */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="absolute rounded-full pointer-events-none" style={{
                  width: 4 + Math.random() * 6, height: 4 + Math.random() * 6,
                  background: `rgba(244,84,30,${0.3 + Math.random() * 0.4})`,
                  left: `${Math.random() * 90}%`, top: `${Math.random() * 90}%`,
                  animation: `lp-particle-float ${3 + Math.random() * 5}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 4}s`,
                }} />
              ))}
              {/* Pulsing logo */}
              <div className="text-center z-10">
                <img src="/brand/logo.png" alt="UpShopee" className="h-14 md:h-20 mx-auto object-contain" style={{ filter: "brightness(1.2)", animation: "lp-glow-pulse 3s ease-in-out infinite" }} />
                <p className="mt-4 text-sm font-medium" style={{ color: "#666" }}>Vídeo de apresentação em breve</p>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 3. PROOF COUNTERS */}
      <Section id="prova-social" className="bg-[#0D0D0F]">
        <CountersRow />
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 4. PAIN SECTION */}
      <Section id="dores" className="bg-[#111114]">
        <Reveal>
          <div className="text-center mb-12">
            <span className="inline-block rounded-full text-xs font-bold uppercase tracking-wider mb-4 px-4 py-1.5" style={{ border: "1px solid rgba(244,84,30,0.4)", color: "#F4541E" }}>
              Você já passou por isso?
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">O jeito antigo de afiliar <span style={{ color: "#F4541E" }}>não funciona mais</span></h2>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { emoji: "🔍", title: "Não sabe qual produto divulgar", text: "Horas rolando a Shopee tentando adivinhar o que vende. Resultado: frustração e tempo perdido." },
            { emoji: "🎬", title: "Perde horas criando vídeo", text: "Roteiro, gravação, edição — cada vídeo consome uma tarde inteira. E o resultado ainda parece amador." },
            { emoji: "🪙", title: "Divulga produto que paga centavos", text: "Passa o dia postando e no fim do mês a comissão mal paga o café. O produto certo faz toda diferença." },
            { emoji: "📉", title: "Vê outros afiliados lucrando mais", text: "A sensação de que existe um segredo que você ainda não descobriu. E existe mesmo — chama-se ferramenta certa." },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="rounded-2xl p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 cursor-default group" style={{ background: "#16161A", border: "1px solid #26262B" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(244,84,30,0.5)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#26262B"; }}>
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p style={{ color: "#A0A0A8", fontSize: 14, lineHeight: 1.65 }}>{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 5. FEATURES */}
      <Section id="recursos" className="bg-[#0D0D0F]">
        <Reveal>
          <div className="text-center mb-12">
            <span className="inline-block rounded-full text-xs font-bold uppercase tracking-wider mb-4 px-4 py-1.5" style={{ border: "1px solid rgba(244,84,30,0.4)", color: "#F4541E" }}>
              Tudo o que você recebe
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Seu <span style={{ color: "#F4541E" }}>arsenal completo</span> de afiliado profissional</h2>
          </div>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              icon: "⛏️", title: "Minerador de Produtos", subtitle: "Encontre os produtos certos em segundos",
              bullets: ["Minerador completo que revela best-sellers", "Buscas ilimitadas — explore sem restrições", "Filtros por comissão, categoria e demanda", "Descubra produtos com alta margem de lucro"],
            },
            {
              icon: "🧠", title: "Suite Criativa com IA", subtitle: "Deixe a inteligência artificial trabalhar por você",
              bullets: ["Gerador IA de títulos que convertem", "Gerador IA de ideias para vídeos", "Criar Persona — defina seu público-alvo", "Gerar Script com IA — roteiro pronto"],
            },
            {
              icon: "🎥", title: "Vídeos Profissionais", subtitle: "Produza vídeos que vendem sem saber editar",
              bullets: ["Templates de Vídeo prontos para usar", "Editor de Vídeo integrado", "Formatos otimizados para Shopee Video", "Exportação em 9:16 com um clique"],
            },
            {
              icon: "👑", title: "Comunidade VIP + Suporte", subtitle: "Você nunca está sozinho nessa jornada",
              bullets: ["Comunidade VIP no WhatsApp", "Suporte prioritário por e-mail", "Acesso a estratégias exclusivas", "Atualizações e novos recursos constantes"],
            },
          ].map((card, i) => (
            <Reveal key={i} delay={i * 150}>
              <div className="rounded-2xl p-6 md:p-8 h-full transition-all duration-300 hover:-translate-y-1" style={{ background: "#16161A", border: "1px solid #26262B" }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl text-2xl flex-shrink-0" style={{ background: "rgba(244,84,30,0.1)" }}>
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{card.title}</h3>
                    <p style={{ color: "#A0A0A8", fontSize: 13 }}>{card.subtitle}</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {card.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm" style={{ color: "#C0C0C8" }}>
                      <CheckIcon /><span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 6. HOW IT WORKS */}
      <Section id="como-funciona" className="bg-[#111114]">
        <Reveal>
          <div className="text-center mb-14">
            <span className="inline-block rounded-full text-xs font-bold uppercase tracking-wider mb-4 px-4 py-1.5" style={{ border: "1px solid rgba(244,84,30,0.4)", color: "#F4541E" }}>
              3 passos simples
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Do zero ao <span style={{ color: "#F4541E" }}>lucro</span> em 3 passos</h2>
          </div>
        </Reveal>
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 md:gap-4 max-w-4xl mx-auto relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5" style={{ background: "#26262B" }} />
          {[
            { step: 1, title: "Ative seu acesso", desc: "Escolha o plano ideal e receba acesso imediato a todas as ferramentas da plataforma." },
            { step: 2, title: "Minere os produtos certos", desc: "Use o minerador inteligente para encontrar os produtos que mais pagam comissão na Shopee." },
            { step: 3, title: "Deixe a IA criar seus vídeos", desc: "A suíte de IA gera títulos, scripts e templates. Você publica e acompanha as vendas." },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 200}>
              <div className="flex flex-col items-center text-center flex-1 relative z-10">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-extrabold text-white mb-5" style={{ background: "linear-gradient(135deg, #F4541E, #FF7A45)", boxShadow: "0 0 30px rgba(244,84,30,0.3)" }}>
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p style={{ color: "#A0A0A8", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 7. THE MATH SECTION */}
      <Section id="contas" className="bg-[#0D0D0F]">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Faça as <span style={{ color: "#F4541E" }}>contas</span></h2>
          </div>
        </Reveal>
        <MathComparison />
        <Reveal delay={400}>
          <p className="text-center text-lg leading-relaxed mt-10 max-w-2xl mx-auto" style={{ color: "#A0A0A8" }}>
            Quantas comissões você precisa para pagar o investimento? Faça a conta — e perceba que <span style={{ color: "#F4541E", fontWeight: 600 }}>o risco é continuar sem</span>.
          </p>
        </Reveal>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 8. TESTIMONIALS */}
      <Section id="depoimentos" className="bg-[#111114]">
        <Reveal>
          <div className="text-center mb-10">
            <span className="inline-block rounded-full text-xs font-bold uppercase tracking-wider mb-4 px-4 py-1.5" style={{ border: "1px solid rgba(244,84,30,0.4)", color: "#F4541E" }}>
              Quem já investiu
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Resultados <span style={{ color: "#F4541E" }}>reais</span></h2>
          </div>
        </Reveal>
        <div className="lp-testimonial-track pb-4">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 150}>
              <div className="lp-testimonial-card rounded-2xl p-6 md:p-8 flex flex-col" style={{ background: "#16161A", border: "1px solid #26262B" }}>
                <div className="flex items-center gap-3 mb-4">
                  <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p style={{ color: "#A0A0A8", fontSize: 12 }}>{t.role}</p>
                  </div>
                </div>
                <p style={{ color: "#C0C0C8", fontSize: 14, lineHeight: 1.7 }}>"{t.quote}"</p>
                <div className="mt-auto pt-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => <span key={s} className="text-sm">⭐</span>)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 9. PRICING */}
      <section ref={pricingRef} id="planos" className="relative py-20 md:py-28 px-5 md:px-8" style={{ background: "#0D0D0F" }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block rounded-full text-xs font-bold uppercase tracking-wider mb-4 px-4 py-1.5" style={{ border: "1px solid rgba(244,84,30,0.4)", color: "#F4541E" }}>
                Escolha como investir
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white">
                Invista uma vez. <span style={{ color: "#F4541E" }}>Lucre sempre.</span>
              </h2>
            </div>
          </Reveal>

          {/* Mobile: Vitalício first */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch justify-center">
            {/* MENSAL — slide from left */}
            <Reveal delay={0}>
              <div className="flex-1 rounded-2xl p-6 md:p-8 flex flex-col relative md:order-1 order-2" style={{ background: "#16161A", border: "1px solid #26262B", maxWidth: 420 }}>
                <h3 className="text-xl font-bold text-white mb-1">Plano Mensal</h3>
                <p className="text-xs mb-4" style={{ color: "#777" }}>Para quem quer começar com baixo investimento</p>

                {/* Prices */}
                <div className="mb-5">
                  <span className="text-3xl line-through mr-2" style={{ color: "#555" }}>R$ 247</span>
                  <span className="text-5xl font-extrabold" style={{ color: "#F4541E" }}>R$ 167</span>
                  <span className="text-sm font-medium" style={{ color: "#A0A0A8" }}>/mês</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    "Minerador completo de produtos", "Buscas ilimitadas", "Gerador IA de títulos", "Gerador IA de ideias", "Criar Persona", "Gerar Script com IA",
                    "Templates de Vídeo", "Editor de Vídeo", "Comunidade VIP", "Suporte prioritário", "Acesso a todas as atualizações",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#C0C0C8" }}><CheckIcon /><span>{f}</span></li>
                  ))}
                </ul>

                <div className="mt-auto space-y-3">
                  <a href={CHECKOUT_MENSAL} className="lp-btn lp-btn-primary h-14 w-full text-base rounded-2xl">
                    Começar Agora
                  </a>
                  <a href={CHECKOUT_MENSAL_PIX} className="lp-btn h-12 w-full text-sm rounded-xl block text-center leading-[48px]" style={{ background: "transparent", border: "1px solid #333", color: "#A0A0A8", textDecoration: "none" }}>
                    🏦 Pagar com PIX
                  </a>
                </div>
              </div>
            </Reveal>

            {/* VITALÍCIO — hero card, slide from right */}
            <Reveal delay={150}>
              <div className="flex-1 rounded-2xl p-6 md:p-8 flex flex-col relative md:order-2 order-1" style={{ background: "#16161A", border: "1px solid rgba(244,84,30,0.4)", maxWidth: 420, boxShadow: "0 0 60px rgba(244,84,30,0.1)" }}>
                {/* Badges */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap" style={{ background: "linear-gradient(90deg, #F4541E, #FF7A45)", animation: "lp-heartbeat 1.5s ease-in-out infinite" }}>
                  OFERTA DE LANÇAMENTO
                </div>

                <div className="flex items-center gap-2 mb-1 mt-2">
                  <h3 className="text-xl font-bold text-white">Acesso Vitalício</h3>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase" style={{ background: "rgba(244,84,30,0.15)", color: "#F4541E" }}>MAIS POPULAR</span>
                </div>
                <p className="text-xs mb-4" style={{ color: "#777" }}>Garanta agora antes do preço voltar para R$ 497</p>

                {/* Prices */}
                <div className="mb-3">
                  <span className="text-2xl line-through mr-2" style={{ color: "#555" }}>R$ 497</span>
                  <span className="text-6xl font-extrabold" style={{ color: "#F4541E" }}>R$ 267</span>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: "#A0A0A8" }}>ou 12x de R$ 27,61 no cartão</p>
                <p className="text-xs mb-5 font-semibold" style={{ color: "#F4541E" }}>Pagamento único — acesso para sempre</p>

                {/* Scarcity pill */}
                <div className="rounded-xl px-3 py-2 text-xs font-semibold mb-5 text-center" style={{ background: "rgba(244,84,30,0.08)", border: "1px solid rgba(244,84,30,0.2)", animation: "lp-heartbeat 1.5s ease-in-out infinite" }}>
                  <span style={{ color: "#F4541E" }}>⚡ Apenas 10 vagas restantes neste preço</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {[
                    "Minerador completo de produtos", "Buscas ilimitadas", "Gerador IA de títulos", "Gerador IA de ideias", "Criar Persona", "Gerar Script com IA",
                    "Templates de Vídeo", "Editor de Vídeo", "Comunidade VIP", "Suporte prioritário", "Acesso vitalício a todas as atualizações",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#C0C0C8" }}><CheckIcon /><span>{f}</span></li>
                  ))}
                </ul>

                <div className="mt-auto space-y-3">
                  <a href={CHECKOUT_VITALICIO} className="lp-btn lp-btn-primary h-14 w-full text-base rounded-2xl" style={{ animation: "lp-glow-pulse 3s ease-in-out infinite" }}>
                    Quero escalar agora →
                  </a>
                  <a href={CHECKOUT_VITALICIO_PIX} className="lp-btn h-12 w-full text-sm rounded-xl block text-center leading-[48px]" style={{ background: "transparent", border: "1px solid #333", color: "#A0A0A8", textDecoration: "none" }}>
                    🏦 Pagar com PIX
                  </a>
                  <p className="text-center text-xs" style={{ color: "#666" }}>💳 Parcelamento disponível — consulte no checkout</p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Trust row */}
          <Reveal delay={300}>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-10 text-xs" style={{ color: "#666" }}>
              <span>🔒 Pagamento 100% seguro</span>
              <span>🏦 Pix</span>
              <span>💳 Visa / Mastercard</span>
              <span>🛡️ 7 dias de garantia</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* 10. GUARANTEE */}
      <Section id="garantia" className="bg-[#111114]">
        <Reveal>
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            {/* Seal */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center mb-8" style={{ background: "conic-gradient(#F4541E, #FF7A45, #F4541E)", padding: 4 }}>
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center" style={{ background: "#111114" }}>
                <span className="text-2xl md:text-3xl font-black" style={{ color: "#F4541E" }}>7</span>
                <span className="text-xs md:text-sm font-bold" style={{ color: "#F4541E" }}>DIAS</span>
              </div>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Risco zero: <span style={{ color: "#F4541E" }}>garantia incondicional</span> de 7 dias
            </h2>
            <Subtle className="text-center mb-6">
              Teste a UpShopee por 7 dias. Se não fizer sentido para você, devolvemos 100% do valor — sem perguntas, sem letras miúdas.
            </Subtle>
            <p className="text-lg font-bold" style={{ color: "#F4541E" }}>
              O único cenário sem retorno é não investir.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 11. FAQ */}
      <Section id="faq" className="bg-[#0D0D0F]">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white">Perguntas <span style={{ color: "#F4541E" }}>frequentes</span></h2>
          </div>
        </Reveal>
        <div className="max-w-2xl mx-auto">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} delay={i * 80} />
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════ */}
      {/* 12. FINAL CTA */}
      <section className="relative py-20 md:py-32 overflow-hidden" style={{ background: "#0D0D0F" }}>
        {/* Radial glow behind text */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom, rgba(244,84,30,0.2) 0%, transparent 70%)" }} />
        {/* Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            width: 2 + Math.random() * 4, height: 2 + Math.random() * 4,
            background: `rgba(244,84,30,${0.3 + Math.random() * 0.5})`,
            left: `${Math.random() * 100}%`, bottom: 0,
            animation: `lp-particle-float ${4 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }} />
        ))}
        <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
          <Reveal>
            <img src="/brand/logo.png" alt="UpShopee" className="h-12 md:h-16 mx-auto mb-8 object-contain" />
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
              Invista uma vez.
              <br />
              <span style={{ color: "#F4541E" }}>Lucre sempre.</span>
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <a href={CHECKOUT_VITALICIO} className="lp-btn lp-btn-primary h-16 px-12 text-lg rounded-2xl" style={{ animation: "lp-glow-pulse 3s ease-in-out infinite" }}>
              Quero meu acesso vitalício →
            </a>
            <div className="mt-5 flex items-center justify-center gap-4 text-xs" style={{ color: "#777" }}>
              <span>✓ Acesso imediato</span>
              <span>✓ Garantia de 7 dias</span>
              <span>🔒 Pagamento seguro</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/* 13. FOOTER */}
      <footer className="py-12 px-5 md:px-8" style={{ background: "#0A0A0C", borderTop: "1px solid #1F1F1F" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <img src="/brand/logo.png" alt="UpShopee" className="h-8 object-contain" />
            <div className="flex gap-6 text-sm" style={{ color: "#777" }}>
              <a href="#" style={{ color: "#777", textDecoration: "none" }}>Termos de Uso</a>
              <a href="#" style={{ color: "#777", textDecoration: "none" }}>Privacidade</a>
              <a href="https://www.instagram.com/shope_sync/" target="_blank" rel="noopener noreferrer" style={{ color: "#777", textDecoration: "none" }}>Instagram</a>
            </div>
          </div>
          <div className="text-center text-xs leading-relaxed" style={{ color: "#555" }}>
            <p>© 2026 UpShopee. Todos os direitos reservados.</p>
            <p className="mt-2 max-w-2xl mx-auto">
              Resultados podem variar de acordo com a dedicação e o contexto de cada afiliado. Os valores citados não constituem promessa de ganhos.
            </p>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════ */}
      {/* 14. MOBILE STICKY CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300"
        style={{ transform: showMobileCTA ? "translateY(0)" : "translateY(100%)", background: "rgba(13,13,15,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid #1F1F1F" }}
      >
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="text-sm">
            <span className="text-white font-bold">Vitalício por R$ 267</span>
            <span className="block text-xs" style={{ color: "#777" }}>Acesso para sempre</span>
          </div>
          <a href={CHECKOUT_VITALICIO} className="lp-btn lp-btn-primary h-11 px-6 text-sm rounded-xl flex-shrink-0">
            Garantir →
          </a>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function CountersRow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.3);
  const a = useCountUp(COUNTERS.affiliates, 1800, inView);
  const v = useCountUp(COUNTERS.videos, 2000, inView);
  const p = useCountUp(COUNTERS.products, 2200, inView);

  const fmt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <div ref={ref} className="flex flex-wrap justify-center gap-8 md:gap-20 text-center">
      {[
        { val: a, label: "afiliados ativos", suffix: "+" },
        { val: v, label: "vídeos gerados por IA", suffix: "+" },
        { val: p, label: "produtos minerados", suffix: "+" },
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="text-4xl md:text-6xl font-extrabold tabular-nums" style={{ color: "#F4541E" }}>
            +{fmt(item.val)}
          </div>
          <p className="text-sm mt-2 font-medium" style={{ color: "#A0A0A8" }}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function MathComparison() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.3);
  const mensalYear = 2004; // R$ 167 × 12
  const vitalicio = 267;
  const economia = mensalYear - vitalicio;
  const m = useCountUp(mensalYear, 1500, inView);
  const v = useCountUp(vitalicio, 1800, inView);

  return (
    <div ref={ref} className="max-w-3xl mx-auto">
      {/* Headline */}
      <div className="text-center mb-10">
        <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">
          2 meses do plano mensal custam{" "}
          <span style={{ color: "#F4541E" }}>R$ 334</span>.
          <br />
          O acesso vitalício custa{" "}
          <span style={{ color: "#F4541E", fontSize: "1.2em" }}>R$ 267</span>
          {" "}— <span style={{ borderBottom: "3px solid #F4541E" }}>para sempre</span>.
        </p>
      </div>

      {/* Visual bars */}
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: "#A0A0A8" }}>Mensal por 1 ano</span>
            <span className="font-bold" style={{ color: "#777" }}>R$ {m.toLocaleString("pt-BR")}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#1F1F1F" }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: inView ? "100%" : "0%", background: "#444" }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: "#F4541E" }}>Vitalício</span>
            <span className="font-bold" style={{ color: "#F4541E" }}>R$ {v.toLocaleString("pt-BR")}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "#1F1F1F" }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: inView ? `${(vitalicio / mensalYear) * 100}%` : "0%", background: "linear-gradient(90deg, #F4541E, #FF7A45)" }} />
          </div>
        </div>
      </div>

      {/* Savings tag */}
      <div className="text-center mt-8">
        <span className="inline-block rounded-xl px-5 py-2.5 text-base font-bold" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}>
          Economia de R$ {economia.toLocaleString("pt-BR")} no primeiro ano
        </span>
      </div>
    </div>
  );
}

function FaqItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.15);

  return (
    <Reveal delay={delay}>
      <div ref={ref} className="lp-faq-item">
        <button className="lp-faq-trigger" onClick={() => setOpen(!open)}>
          <span>{q}</span>
          <svg width="16" height="16" viewBox="0 0 16 16" className={`lp-faq-chevron ${open ? "open" : ""}`}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
        </button>
        <div className={`lp-faq-answer ${open ? "open" : ""}`}>
          <p className="pb-5 text-sm leading-relaxed" style={{ color: "#A0A0A8" }}>{a}</p>
        </div>
      </div>
    </Reveal>
  );
}

export default PlanosPage;
