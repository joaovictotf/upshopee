import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/planos")({ component: PlanosPage });

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return scrolled;
}

function useCountdown(initialSecs: number) {
  const [rem, setRem] = useState(initialSecs);
  useEffect(() => {
    if (rem <= 0) return;
    const id = setInterval(() => setRem((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rem]);
  const m = String(Math.floor(rem / 60)).padStart(2, "0");
  const s = String(rem % 60).padStart(2, "0");
  return { rem, label: `${m}:${s}` };
}

// ─── Injected CSS ─────────────────────────────────────────────────────────────

function LPStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700;1,800&family=Barlow+Condensed:wght@700;800;900&display=swap');

      html { scroll-behavior: smooth; }
      *, *::before, *::after { box-sizing: border-box; }

      @keyframes _lp_marquee {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      .lp-marquee {
        display: flex;
        animation: _lp_marquee 32s linear infinite;
        will-change: transform;
      }
      .lp-marquee:hover { animation-play-state: paused; }

      @keyframes _lp_shimmer {
        0%   { left: -70%; }
        100% { left: 130%; }
      }
      .lp-shimmer { position: relative; overflow: hidden; }
      .lp-shimmer::after {
        content: '';
        position: absolute;
        top: 0; left: -70%;
        width: 45%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
        animation: _lp_shimmer 2.8s ease-in-out infinite;
        transform: skewX(-12deg);
        pointer-events: none;
      }

      @keyframes _lp_blob {
        0%, 100% { transform: scale(1) translate(0,0); }
        40%       { transform: scale(1.12) translate(16px,-12px); }
        70%       { transform: scale(0.94) translate(-8px,8px); }
      }
      .lp-blob   { animation: _lp_blob  8s ease-in-out infinite; }
      .lp-blob-b { animation: _lp_blob 11s ease-in-out infinite reverse; animation-delay:-4s; }

      @keyframes _lp_fu {
        from { opacity:0; transform:translateY(20px); }
        to   { opacity:1; transform:translateY(0); }
      }
      .lp-fu   { animation: _lp_fu 0.65s ease both; }
      .lp-fu-2 { animation: _lp_fu 0.65s 0.12s ease both; }
      .lp-fu-3 { animation: _lp_fu 0.65s 0.24s ease both; }
      .lp-fu-4 { animation: _lp_fu 0.65s 0.36s ease both; }
      .lp-fu-5 { animation: _lp_fu 0.65s 0.48s ease both; }

      .lp-nav-link {
        position: relative; text-decoration: none;
        color: rgba(255,255,255,0.7); transition: color 0.2s;
        font-family: 'Barlow', sans-serif;
      }
      .lp-nav-link::after {
        content:''; position:absolute; bottom:-4px; left:0;
        width:0; height:1.5px; background:#EE4D2D; transition:width 0.22s;
      }
      .lp-nav-link:hover { color:#EE4D2D; }
      .lp-nav-link:hover::after { width:100%; }

      .lp-feature-card {
        transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
      }
      .lp-feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 16px 48px rgba(238,77,45,0.12);
        border-color: rgba(238,77,45,0.5) !important;
      }

      .lp-accordion-body {
        overflow: hidden;
        transition: max-height 0.34s ease, opacity 0.28s ease, padding-bottom 0.28s ease;
      }

      .lp-testimonials {
        display: flex; gap: 20px; overflow-x: auto;
        padding-bottom: 8px; scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
      }
      .lp-testimonials::-webkit-scrollbar { height: 4px; }
      .lp-testimonials::-webkit-scrollbar-track { background: #080808; }
      .lp-testimonials::-webkit-scrollbar-thumb { background: #1F1F1F; border-radius: 4px; }

      @keyframes _lp_float_a {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
      @keyframes _lp_float_b {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-14px); }
      }
      @keyframes _lp_float_c {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      .lp-float-a { animation: _lp_float_a 4s ease-in-out infinite; }
      .lp-float-b { animation: _lp_float_b 5.5s 1s ease-in-out infinite; }
      .lp-float-c { animation: _lp_float_c 4.8s 2s ease-in-out infinite; }
      .lp-float-cards-hide { display: none; }

      @media (min-width: 900px) {
        .lp-float-cards-hide { display: block; }
        .lp-testimonials {
          display: grid; grid-template-columns: repeat(3,1fr);
          overflow-x: visible;
        }
        .lp-tcard { width: auto !important; flex-shrink: unset !important; }
        .lp-hide-desktop { display: none !important; }
      }
      @media (max-width: 899px) {
        .lp-hide-mobile { display: none !important; }
      }

      @keyframes _lp_pulse_shield {
        0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 12px rgba(238,77,45,0.5)); }
        50%       { transform: scale(1.08); filter: drop-shadow(0 0 28px rgba(238,77,45,0.95)); }
      }
      @keyframes _lp_rotate_ring {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      @keyframes scroll-carousel {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .carousel-track { animation: scroll-carousel 8s linear infinite; }
      .carousel-track:hover { animation-play-state: paused; }

      @media (max-width: 640px) {
        .ecosystem-card { min-width: 220px !important; }
      }

      @media (max-width: 640px) {
        .pricing-card { padding: 24px 20px !important; }
      }
    `}</style>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const scrolled = useScrolled(40);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? "rgba(8,8,8,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: `1px solid ${scrolled ? "#1F1F1F" : "transparent"}`,
      transition: "background 0.35s, border-color 0.35s",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Link to="/planos" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <img src="/brand/shopesync-logo.png" alt="ShopeSync" style={{ height: 34, width: 34, objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: 16, color: "#FFFFFF", letterSpacing: "-0.3px", fontFamily: "'Barlow', sans-serif" }}>ShopeSync</span>
        </Link>

        <div className="lp-hide-mobile" style={{ display: "flex", gap: 28 }}>
          {(["Funcionalidades|#funcionalidades", "Demo|#demo-section", "Planos|#planos", "FAQ|#faq"] as const).map((item) => {
            const [label, href] = item.split("|");
            return <a key={label} href={href} className="lp-nav-link" style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</a>;
          })}
        </div>

        <div className="hidden md:flex items-center" style={{ gap: 8 }}>
          <a href="https://www.instagram.com/shope_sync/" target="_blank" rel="noopener noreferrer" className="text-[#EE4D2D] hover:opacity-80 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#EE4D2D">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
          <a
            href="#planos"
            className="lp-shimmer"
            style={{ fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none", padding: "7px 16px", borderRadius: 999, background: "#EE4D2D", display: "inline-block", transition: "background 0.2s", whiteSpace: "nowrap", fontFamily: "'Barlow', sans-serif", letterSpacing: "0.03em" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#d93e22"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EE4D2D"; }}
          >
            VER PLANOS
          </a>
        </div>

        <button
          className="md:hidden flex items-center justify-center w-10 h-10 text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22 }}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileMenuOpen && (
        <div style={{
          position: "fixed", inset: 0, top: 64, background: "rgba(8,8,8,0.98)",
          zIndex: 49, display: "flex", flexDirection: "column", padding: "32px 24px", gap: 24
        }}>
          {[
            { label: "Funcionalidades", href: "#funcionalidades" },
            { label: "Demo", href: "#demo-section" },
            { label: "Planos", href: "#planos" },
            { label: "FAQ", href: "#faq" },
          ].map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: 22, fontWeight: 700, color: "#FFFFFF", textDecoration: "none", fontFamily: "'Barlow', sans-serif" }}>
              {label}
            </a>
          ))}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <a href="/login" style={{ display: "block", padding: "14px 0", textAlign: "center", border: "1.5px solid #1F1F1F", borderRadius: 10, color: "#FFFFFF", fontWeight: 700, fontSize: 15, textDecoration: "none", fontFamily: "'Barlow', sans-serif" }}>
              Entrar
            </a>
            <a href="#planos" onClick={() => setMobileMenuOpen(false)}
              style={{ display: "block", padding: "14px 0", textAlign: "center", background: "#EE4D2D", borderRadius: 10, color: "#fff", fontWeight: 800, fontSize: 15, textDecoration: "none", fontFamily: "'Barlow', sans-serif" }}>
              VER PLANOS →
            </a>
            <a href="https://www.instagram.com/shope_sync/" target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#EE4D2D", textDecoration: "none", fontSize: 15, fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              Instagram
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{
      position: "relative",
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr",
      alignItems: "center",
      overflow: "hidden",
      paddingTop: 80,
      paddingBottom: 60,
      background: "#080808",
    }}>
      <style>{`
        @media (min-width: 900px) {
          .lp-hero-grid { grid-template-columns: 1fr 1fr !important; gap: 60px !important; }
          .lp-hero-right { display: flex !important; }
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "0 20px", width: "100%" }}>
        <div className="lp-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40, alignItems: "center", width: "100%" }}>

          {/* LEFT */}
          <div>
            <div className="lp-fu reveal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(238,77,45,0.12)", border: "1px solid rgba(238,77,45,0.3)", borderRadius: 999, padding: "7px 16px", marginBottom: 24, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#EE4D2D", textTransform: "uppercase" as const, fontFamily: "'Barlow', sans-serif" }}>
              🤖 AUTOMAÇÃO PARA AFILIADOS SHOPEE
            </div>

            <h1 className="lp-fu-2 tracking-wide leading-[1.1] reveal" style={{ fontSize: "clamp(36px,8vw,80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-1px", color: "#FFFFFF", margin: "0 0 0 0", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase" as const }}>
              Transforme<br />
              Qualquer Produto<br />
              da Shopee em<br />
              <span style={{ background: "linear-gradient(135deg,#EE4D2D 0%,#F97316 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Comissão
              </span>
              <br />
              Automática
            </h1>

            <p className="lp-fu-3 reveal" style={{ marginTop: 24, fontSize: 18, color: "#888888", lineHeight: 1.65, maxWidth: 480, margin: "24px 0 0" }}>
              O robô que divulga seus produtos em centenas de grupos 24h por dia — enquanto você faz outras coisas.
            </p>

            <div className="lp-fu-4" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
              <a
                href="#planos"
                className="lp-shimmer"
                style={{ display: "inline-block", padding: "14px 28px", background: "#EE4D2D", color: "#fff", borderRadius: 10, fontWeight: 800, fontSize: 15, textDecoration: "none", letterSpacing: "0.04em", transition: "background 0.2s, transform 0.15s", minHeight: 48, fontFamily: "'Barlow', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#d93e22"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EE4D2D"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                VER PLANOS →
              </a>
              <a
                href="#demo-section"
                style={{ display: "inline-block", padding: "14px 24px", background: "transparent", color: "#FFFFFF", borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none", border: "1px solid #1F1F1F", transition: "border-color 0.2s, color 0.2s", minHeight: 48, fontFamily: "'Barlow', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#EE4D2D"; (e.currentTarget as HTMLElement).style.color = "#EE4D2D"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1F1F1F"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
              >
                ASSISTIR DEMO
              </a>
            </div>

            {/* Stats row */}
            <div className="lp-fu-5" style={{ display: "flex", flexWrap: "wrap", gap: 0, marginTop: 48, alignItems: "center", justifyContent: "center" }}>
              {[
                { val: "1.200+", label: "vendedores ativos" },
                { val: "R$234k", label: "em comissões geradas" },
                { val: "4.9★", label: "avaliação média" },
              ].map((stat, i) => (
                <div key={stat.val} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ padding: i === 0 ? "0 32px 0 0" : "0 32px" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF", fontFamily: "'Barlow', sans-serif", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{stat.val}</div>
                    <div style={{ fontSize: 12, color: "#888888", marginTop: 2, fontFamily: "'Barlow', sans-serif" }}>{stat.label}</div>
                  </div>
                  {i < 2 && <div style={{ width: 1, height: 36, background: "#1F1F1F", flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="lp-hero-right lp-hide-mobile" style={{ display: "none", position: "relative", alignItems: "center", justifyContent: "center", minHeight: 480 }}>
            {/* Orange radial glow blob */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "80%", height: "80%", background: "radial-gradient(circle, rgba(238,77,45,0.18) 0%, transparent 70%)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0, borderRadius: "50%" }} />

            {/* Video container */}
            <div style={{ position: "relative", zIndex: 1, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(238,77,45,0.3)", boxShadow: "0 0 80px rgba(238,77,45,0.15)", width: "100%", background: "#111111" }}>
              {/* Placeholder background */}
              <div style={{ position: "absolute", inset: 0, background: "#111111", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>▶</div>
                  <div style={{ fontSize: 13, color: "#888888", fontFamily: "'Barlow', sans-serif" }}>Vídeo do produto</div>
                </div>
              </div>
              <video
                autoPlay muted loop playsInline
                poster="/brand/shopesync-logo.png"
                style={{ width: "100%", display: "block", minHeight: 280, background: "#111111", objectFit: "cover", position: "relative", zIndex: 1 }}
              >
                <source src="/demo-video.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Floating Card 1 — Robô Ativo */}
            <div className="lp-float-cards-hide lp-float-a" style={{ position: "absolute", top: -20, right: -24, background: "#111111", border: "1px solid rgba(238,77,45,0.25)", borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 180, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EE4D2D", flexShrink: 0 }} />
                <span style={{ color: "#FFFFFF", fontWeight: 600, fontSize: 13, fontFamily: "'Barlow', sans-serif" }}>Robô Ativo</span>
              </div>
              <div style={{ fontSize: 11, color: "#888888", marginTop: 3, fontFamily: "'Barlow', sans-serif" }}>Divulgando em 47 grupos</div>
            </div>

            {/* Floating Card 2 — Comissão gerada */}
            <div className="lp-float-cards-hide lp-float-b" style={{ position: "absolute", left: -30, top: "38%", background: "#111111", border: "1px solid rgba(238,77,45,0.25)", borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 160, zIndex: 10 }}>
              <div style={{ fontSize: 11, color: "#888888", fontFamily: "'Barlow', sans-serif" }}>💰 Comissão gerada</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#EE4D2D", fontFamily: "Arial, sans-serif", letterSpacing: "-0.5px", marginTop: 4 }}>R$ 2.084,22</div>
            </div>

            {/* Floating Card 3 — Avaliação */}
            <div className="lp-float-cards-hide lp-float-c" style={{ position: "absolute", bottom: -18, right: 16, background: "#111111", border: "1px solid rgba(238,77,45,0.25)", borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 140, zIndex: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>⭐ 4.9/5</div>
              <div style={{ fontSize: 11, color: "#888888", marginTop: 3, fontFamily: "'Barlow', sans-serif" }}>1.247 avaliações</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

const ShopeeLogo = () => (
  <img src="/brands/shopee-logo.svg" alt="Shopee" style={{ width: 24, height: 24, objectFit: "contain" }} />
);
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path fill="#25D366" d="M12 0C5.373 0 0 5.373 0 12c0 2.136.563 4.14 1.543 5.874L.057 23.882l6.196-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.68-.52-5.207-1.427l-.374-.222-3.878.918.978-3.768-.244-.388A9.947 9.947 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const InstagramLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#E4405F" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const MARQUEE_ITEMS = [
  { name: "Shopee", Logo: ShopeeLogo },
  { name: "WhatsApp", Logo: WhatsAppLogo },
  { name: "Facebook", Logo: FacebookLogo },
  { name: "Instagram", Logo: InstagramLogo },
];

function MarqueeSection() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <section style={{ padding: "48px 0", background: "#080808", borderTop: "1px solid #1F1F1F", borderBottom: "1px solid #1F1F1F", overflow: "hidden" }}>
      <p className="reveal" style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#888888", marginBottom: 24, textTransform: "uppercase" as const, fontFamily: "'Barlow', sans-serif" }}>
        Integrado com as maiores plataformas
      </p>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, zIndex: 2, background: "linear-gradient(to right,#080808,transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, zIndex: 2, background: "linear-gradient(to left,#080808,transparent)", pointerEvents: "none" }} />
        <div className="lp-marquee">
          {doubled.map((item, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 32px", flexShrink: 0, borderRight: "1px solid #1F1F1F" }}>
              <item.Logo />
              <span style={{ fontSize: 15, fontWeight: 600, color: "#888888", whiteSpace: "nowrap", fontFamily: "'Barlow', sans-serif" }}>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Statement Section ────────────────────────────────────────────────────────

function StatementSection() {
  return (
    <section style={{ padding: "100px 20px", background: "#080808" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          <div style={{ width: 3, flexShrink: 0, alignSelf: "stretch", background: "linear-gradient(180deg, #EE4D2D, transparent)", borderRadius: 999, minHeight: 140 }} />
          <div>
            <p style={{ fontSize: "clamp(36px,4.5vw,58px)", fontWeight: 800, lineHeight: 1.15, margin: 0, fontFamily: "'Barlow Condensed', sans-serif" }}>
              <span style={{ color: "#FFFFFF" }}>Automatize suas vendas.</span><br />
              <span style={{ color: "#EE4D2D", fontStyle: "italic" }}>Acompanhe em tempo real.</span><br />
              <span style={{ color: "#FFFFFF" }}>Ganhe comissões enquanto dorme.</span>
            </p>
            <p style={{ marginTop: 24, fontSize: 16, color: "#888888", maxWidth: 500, fontFamily: "'Barlow', sans-serif", lineHeight: 1.65 }}>
              Mais de 1.200 vendedores já automatizaram com ShopSync. A plataforma trabalha para você 24 horas por dia.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

const SCREEN_LABELS = ["Dashboard", "Produtos", "Robô Divulgador", "Comissões"];

// ── Screen 1: Dashboard ──────────────────────────────────────────────────────
function ScreenDashboard({ m }: { m: boolean }) {
  const bars = [30, 55, 40, 75, 60, 85, 50, 90, 65, 80, 45, 100];
  return (
    <div style={{ height: "100%", background: "#0D0C0A", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#EE4D2D", padding: m ? "7px 10px" : "10px 14px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: m ? 7 : 8, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: "0.06em" }}>VENDAS HOJE</div>
        <div style={{ fontSize: m ? 20 : 26, fontWeight: 900, color: "#fff", letterSpacing: "-1px", lineHeight: 1.1, fontFamily: "Arial,sans-serif" }}>R$ 2.084,22</div>
        <div style={{ fontSize: m ? 6 : 7.5, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>08/06/2026 — 14:32:19 (GMT-03)</div>
      </div>
      <div style={{ display: "flex", flexDirection: m ? "column" : "row", gap: 6, padding: m ? 7 : 9, flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Métricas */}
        <div style={{ background: "#111108", borderRadius: 6, border: "1px solid #2A2218", padding: m ? "6px 8px" : "7px 9px", flexShrink: 0, ...(m ? {} : { width: "22%" }) }}>
          <div style={{ fontSize: m ? 7 : 8, fontWeight: 700, color: "#F2F2F2", marginBottom: 5 }}>Métricas</div>
          <div style={{ display: m ? "flex" : "block", gap: m ? 10 : 0 }}>
            {[["Visitantes","3.948"],["Pedidos","252"],["Taxa","6.38%"]].map(([l,v]) => (
              <div key={l} style={{ marginBottom: m ? 0 : 5 }}>
                <div style={{ fontSize: m ? 6 : 7, color: "#94A3B8" }}>{l}</div>
                <div style={{ fontSize: m ? 10 : 13, fontWeight: 800, color: "#EE4D2D", fontFamily: "Arial,sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Chart — desktop only */}
        {!m && (
          <div style={{ background: "#111108", borderRadius: 6, border: "1px solid #2A2218", padding: "7px 9px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#F2F2F2", marginBottom: 6 }}>Visão Geral de Vendas</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, flex: 1, minHeight: 0 }}>
              {bars.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === bars.length - 1 ? "#EE4D2D" : `rgba(238,77,45,${0.22 + h / 200})`, borderRadius: "2px 2px 0 0" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {["8h","10h","12h","14h"].map(t => <div key={t} style={{ fontSize: 7, color: "#94A3B8" }}>{t}</div>)}
            </div>
          </div>
        )}
        {/* Top 5 */}
        <div style={{ background: "#111108", borderRadius: 6, border: "1px solid #2A2218", padding: m ? "6px 8px" : "7px 9px", flexShrink: 0, ...(m ? {} : { width: "26%" }) }}>
          <div style={{ fontSize: m ? 7 : 8, fontWeight: 700, color: "#F2F2F2", marginBottom: 5 }}>Top 5 Produtos</div>
          {["Camiseta Shopee","Tênis Running","Perfume 50ml","Fone BT 5.0","Mochila Sport"].slice(0, m ? 3 : 5).map((p, i) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 7, fontWeight: 700, color: "#EE4D2D", width: 8, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ width: 13, height: 13, borderRadius: 3, background: "#2A2218", flexShrink: 0 }} />
              <div style={{ fontSize: m ? 7 : 7.5, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Produtos ───────────────────────────────────────────────────────
function ScreenProdutos({ m }: { m: boolean }) {
  const products = [
    { name: "Camiseta Shopee Verão", comm: "R$ 12,80" },
    { name: "Tênis Running Pro", comm: "R$ 28,40" },
    { name: "Perfume Importado", comm: "R$ 19,90" },
    { name: "Fone Bluetooth 5.0", comm: "R$ 15,60" },
  ];
  return (
    <div style={{ height: "100%", background: "#0D0C0A", padding: m ? 8 : 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: m ? 8 : 9, fontWeight: 700, color: "#F2F2F2", marginBottom: m ? 7 : 8, flexShrink: 0 }}>Catálogo de Produtos</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: m ? 6 : 8, flex: 1, minHeight: 0 }}>
        {products.map((p) => (
          <div key={p.name} style={{ background: "#111108", borderRadius: 7, border: "1px solid #2A2218", padding: m ? "6px 7px" : "7px 8px", display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
            <div style={{ background: "rgba(238,77,45,0.14)", borderRadius: 5, height: m ? 30 : 42, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: m ? 14 : 18 }}>📦</span>
            </div>
            <div style={{ fontSize: m ? 7 : 8, fontWeight: 600, color: "#F2F2F2", lineHeight: 1.3 }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 6, background: "#EE4D2D", color: "#fff", padding: "1px 4px", borderRadius: 3, fontWeight: 700, whiteSpace: "nowrap" as const }}>MAIS VENDIDO</span>
              <span style={{ fontSize: m ? 8 : 9, fontWeight: 800, color: "#EE4D2D", fontFamily: "Arial,sans-serif" }}>{p.comm}</span>
            </div>
            <div style={{ background: "#16a34a", borderRadius: 4, padding: "2px 0", fontSize: 6.5, fontWeight: 700, color: "#fff", textAlign: "center" as const }}>Gerar anúncio</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Screen 3: Robô Divulgador ────────────────────────────────────────────────
function ScreenRobo({ m }: { m: boolean }) {
  return (
    <div style={{ height: "100%", background: "#0D0C0A", padding: m ? 8 : 10, overflow: "hidden", display: "flex", flexDirection: m ? "column" : "row", gap: 8 }}>
      {/* Status card */}
      <div style={{ flex: 1, background: "#111108", borderRadius: 8, border: "1px solid #2A2218", padding: m ? 8 : 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: m ? 8 : 9, fontWeight: 700, color: "#22c55e" }}>ATIVO</span>
          <span style={{ fontSize: m ? 7 : 8, color: "#94A3B8", marginLeft: 2 }}>Robô Divulgador</span>
        </div>
        <div style={{ fontSize: m ? 7 : 8, color: "#94A3B8", marginBottom: 3 }}>Créditos utilizados — 57%</div>
        <div style={{ height: 5, background: "#2A2218", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: "57%", height: "100%", background: "#EE4D2D", borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: m ? 7 : 8, fontWeight: 700, color: "#F2F2F2", marginBottom: 5 }}>Canais ativos</div>
        {[["💬 WhatsApp","✓"],["👥 Facebook","✓"]].map(([c,chk]) => (
          <div key={c} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(238,77,45,0.06)", border: "1px solid rgba(238,77,45,0.15)", borderRadius: 5, padding: m ? "3px 7px" : "4px 8px", marginBottom: 4 }}>
            <span style={{ fontSize: m ? 7 : 8, color: "#F2F2F2" }}>{c}</span>
            <span style={{ fontSize: m ? 7 : 8, color: "#22c55e", fontWeight: 700 }}>{chk}</span>
          </div>
        ))}
        {/* Mobile results inline */}
        {m && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 8 }}>
            {[["VENDAS GERADAS","8"],["RECEITA","R$ 173,90"]].map(([l,v]) => (
              <div key={l} style={{ background: "#0D0C0A", borderRadius: 6, border: "1px solid #2A2218", padding: "5px 7px", textAlign: "center" as const }}>
                <div style={{ fontSize: 6, color: "#94A3B8" }}>{l}</div>
                <div style={{ fontSize: l === "RECEITA" ? 9 : 16, fontWeight: 900, color: "#EE4D2D", fontFamily: "Arial,sans-serif" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Desktop results sidebar */}
      {!m && (
        <div style={{ width: 110, background: "#111108", borderRadius: 8, border: "1px solid #2A2218", padding: 10, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Resultados</div>
          <div>
            <div style={{ fontSize: 7, color: "#94A3B8" }}>VENDAS GERADAS</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#EE4D2D", lineHeight: 1, fontFamily: "Arial,sans-serif" }}>8</div>
          </div>
          <div>
            <div style={{ fontSize: 7, color: "#94A3B8" }}>RECEITA</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#EE4D2D", fontFamily: "Arial,sans-serif" }}>R$ 173,90</div>
          </div>
          <div style={{ height: 1, background: "#2A2218" }} />
          <div style={{ fontSize: 7, color: "#94A3B8", lineHeight: 1.4 }}>Em execução há 4h 32min</div>
        </div>
      )}
    </div>
  );
}

// ── Screen 4: Vendas / Comissões ─────────────────────────────────────────────
function ScreenVendas({ m }: { m: boolean }) {
  const orders = [
    { id: "#82711", product: "Tênis Running Pro X200", price: "R$ 189,90", comm: "+ R$ 28,40" },
    { id: "#82698", product: "Perfume Importado 50ml", price: "R$ 134,00", comm: "+ R$ 19,90" },
  ];
  return (
    <div style={{ height: "100%", background: "#0D0C0A", padding: m ? 8 : 10, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: m ? 4 : 6, marginBottom: m ? 7 : 8 }}>
        {[["629","vendas"],["R$ 234k","receita"],["94","em preparo"]].map(([v,l]) => (
          <div key={l} style={{ background: "#111108", borderRadius: 5, border: "1px solid #2A2218", padding: m ? "5px 4px" : "6px 8px", textAlign: "center" as const }}>
            <div style={{ fontSize: m ? 10 : 12, fontWeight: 900, color: "#EE4D2D", fontFamily: "Arial,sans-serif" }}>{v}</div>
            <div style={{ fontSize: m ? 6 : 7, color: "#94A3B8" }}>{l}</div>
          </div>
        ))}
      </div>
      {orders.map((o) => (
        <div key={o.id} style={{ background: "#111108", borderRadius: 7, border: "1px solid #2A2218", padding: m ? "6px 8px" : "8px 10px", marginBottom: m ? 5 : 6, display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: m ? 24 : 28, height: m ? 24 : 28, borderRadius: 5, background: "rgba(238,77,45,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: m ? 10 : 12 }}>📦</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: m ? 7 : 8, fontWeight: 600, color: "#F2F2F2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.product}</div>
            <div style={{ fontSize: m ? 6 : 7, color: "#94A3B8" }}>{o.id} • {o.price}</div>
          </div>
          <div style={{ fontSize: m ? 9 : 10, fontWeight: 800, color: "#22c55e", flexShrink: 0, fontFamily: "Arial,sans-serif" }}>{o.comm}</div>
        </div>
      ))}
    </div>
  );
}

// ── Slideshow dots ────────────────────────────────────────────────────────────
function SlideshowDots({ total, current, onChange, label }: { total: number; current: number; onChange: (i: number) => void; label: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: 16 }}>
      <div style={{ display: "inline-flex", gap: 7, marginBottom: 8, alignItems: "center" }}>
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 999, background: i === current ? "#EE4D2D" : "#1F1F1F", border: "none", cursor: "pointer", padding: 0, transition: "width 0.3s ease, background 0.3s ease" }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#888888", fontFamily: "'Barlow', sans-serif" }}>{label}</div>
    </div>
  );
}

// ── Slideshow wrapper ─────────────────────────────────────────────────────────
const DEMO_SCREENS = [ScreenDashboard, ScreenProdutos, ScreenRobo, ScreenVendas];

function DemoSlideshow({ mobile }: { mobile: boolean }) {
  const [screen, setScreen] = useState(0);

  useEffect(() => {
    setScreen(0);
    const id = setInterval(() => setScreen((s) => (s + 1) % DEMO_SCREENS.length), 3500);
    return () => clearInterval(id);
  }, [mobile]);

  const slides = (
    <>
      {DEMO_SCREENS.map((Screen, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, opacity: screen === i ? 1 : 0, transition: "opacity 0.4s ease", pointerEvents: screen === i ? "auto" : "none" }}>
          <Screen m={mobile} />
        </div>
      ))}
    </>
  );

  if (!mobile) {
    return (
      <div>
        {/* Browser frame */}
        <div style={{ borderRadius: 12, border: "2px solid rgba(238,77,45,0.4)", boxShadow: "0 0 60px rgba(238,77,45,0.22),0 0 120px rgba(238,77,45,0.07)", overflow: "hidden", background: "#080808" }}>
          {/* Browser chrome */}
          <div style={{ height: 36, background: "#111111", borderBottom: "1px solid #1F1F1F", display: "flex", alignItems: "center", padding: "0 12px", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#FF5F57","#FFBD2E","#28CA41"].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: "#1a1a18", borderRadius: 5, height: 22, display: "flex", alignItems: "center", paddingLeft: 10, gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", border: "1px solid #1F1F1F", flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: "#888888" }}>
                shopsync.com/{SCREEN_LABELS[screen].toLowerCase().replace(/ /g, "-")}
              </span>
            </div>
          </div>
          {/* Content */}
          <div style={{ aspectRatio: "16/9", position: "relative", overflow: "hidden" }}>
            {slides}
          </div>
        </div>
        <SlideshowDots total={DEMO_SCREENS.length} current={screen} onChange={setScreen} label={SCREEN_LABELS[screen]} />
      </div>
    );
  }

  // Mobile: iPhone frame
  return (
    <div>
      <div style={{ width: 256, margin: "0 auto", borderRadius: 40, border: "4px solid rgba(238,77,45,0.4)", boxShadow: "0 0 60px rgba(238,77,45,0.22),0 0 120px rgba(238,77,45,0.07)", overflow: "hidden", background: "#080808", position: "relative" }}>
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 80, height: 22, background: "#080808", borderRadius: "0 0 14px 14px", zIndex: 10 }} />
        {/* Status bar */}
        <div style={{ height: 40, background: "#111111", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px 6px", flexShrink: 0 }}>
          <span style={{ fontSize: 8, color: "#888888", fontWeight: 600 }}>9:41</span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 7, color: "#888888" }}>●●●</span>
            <span style={{ fontSize: 7, color: "#888888" }}>WiFi</span>
            <span style={{ fontSize: 7, color: "#888888" }}>100%</span>
          </div>
        </div>
        {/* Screens */}
        <div style={{ height: 440, position: "relative", overflow: "hidden" }}>
          {slides}
        </div>
        {/* Home indicator */}
        <div style={{ height: 28, background: "#111111", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 60, height: 4, background: "#1F1F1F", borderRadius: 999 }} />
        </div>
      </div>
      <SlideshowDots total={DEMO_SCREENS.length} current={screen} onChange={setScreen} label={SCREEN_LABELS[screen]} />
    </div>
  );
}

// ── Ecosystem Carousel ────────────────────────────────────────────────────────

const ECOSYSTEM_CARDS = [
  {
    title: "Copy de IA",
    desc: "Scripts, textos e anúncios gerados por IA em segundos",
    topBg: "linear-gradient(135deg, #1a0a2e, #0d0d1a)",
    glow: "radial-gradient(circle at 50% 60%, rgba(139,92,246,0.3) 0%, transparent 65%)",
    illustration: (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <div style={{ position: "absolute", top: 18, right: 20, color: "#8B5CF6", fontSize: 20, lineHeight: 1 }}>✦</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, width: 148, position: "relative" }}>
          <div style={{ height: 11, background: "rgba(255,255,255,0.18)", borderRadius: 999 }} />
          <div style={{ height: 11, background: "rgba(139,92,246,0.75)", borderRadius: 999, width: "80%" }} />
          <div style={{ height: 11, background: "rgba(255,255,255,0.1)", borderRadius: 999, width: "55%" }} />
          <div style={{ height: 11, background: "rgba(139,92,246,0.4)", borderRadius: 999, width: "70%", marginTop: 4 }} />
        </div>
      </div>
    ),
  },
  {
    title: "Robô Divulgador",
    desc: "Grupos de WhatsApp e Facebook divulgados automaticamente",
    topBg: "linear-gradient(135deg, #0a1f0a, #0d0d1a)",
    glow: "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.25) 0%, transparent 65%)",
    illustration: (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <svg width="148" height="148" viewBox="0 0 150 150" fill="none">
          <line x1="75" y1="75" x2="30" y2="30" stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" />
          <line x1="75" y1="75" x2="120" y2="30" stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" />
          <line x1="75" y1="75" x2="30" y2="120" stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" />
          <line x1="75" y1="75" x2="120" y2="120" stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" />
          <circle cx="75" cy="75" r="16" fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="2" />
          <circle cx="75" cy="75" r="6" fill="#22c55e" />
          <circle cx="30" cy="30" r="13" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5" />
          <text x="30" y="34" textAnchor="middle" fill="rgba(34,197,94,0.9)" fontSize="8" fontWeight="700">WA</text>
          <circle cx="120" cy="30" r="13" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5" />
          <text x="120" y="34" textAnchor="middle" fill="rgba(34,197,94,0.9)" fontSize="8" fontWeight="700">FB</text>
          <circle cx="30" cy="120" r="13" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5" />
          <text x="30" y="124" textAnchor="middle" fill="rgba(34,197,94,0.9)" fontSize="8" fontWeight="700">IG</text>
          <circle cx="120" cy="120" r="13" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5" />
          <text x="120" y="124" textAnchor="middle" fill="rgba(34,197,94,0.9)" fontSize="8" fontWeight="700">TK</text>
        </svg>
      </div>
    ),
  },
  {
    title: "Entrega Automática",
    desc: "Pedidos processados e entregues sem você fazer nada",
    topBg: "linear-gradient(135deg, #0a1a1f, #0d0d1a)",
    glow: "radial-gradient(circle at 50% 50%, rgba(20,184,166,0.25) 0%, transparent 65%)",
    illustration: (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <svg width="140" height="130" viewBox="0 0 140 130" fill="none">
          <rect x="20" y="50" width="100" height="70" rx="6" fill="rgba(20,184,166,0.1)" stroke="#14b8a6" strokeWidth="2" />
          <path d="M20 50 L70 28 L70 50" fill="rgba(20,184,166,0.15)" stroke="#14b8a6" strokeWidth="2" strokeLinejoin="round" />
          <path d="M120 50 L70 28 L70 50" fill="rgba(20,184,166,0.08)" stroke="#14b8a6" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="105" cy="112" r="16" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="2.5" />
          <path d="M97 112 l6 6 l11-11" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
  },
  {
    title: "Produtos Validados",
    desc: "Catálogo curado com alta demanda e comissão garantida",
    topBg: "linear-gradient(135deg, #1f0d0a, #0d0d1a)",
    glow: "radial-gradient(circle at 50% 50%, rgba(238,77,45,0.2) 0%, transparent 65%)",
    illustration: (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <div style={{ position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 60, height: 60, borderRadius: 10, background: "rgba(238,77,45,0.08)", border: "1px solid rgba(238,77,45,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "6px" }}>
                <div style={{ width: "80%", height: 4, background: "rgba(238,77,45,0.5)", borderRadius: 999, marginBottom: 3 }} />
                <div style={{ width: "60%", height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 999 }} />
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: "#EE4D2D", borderRadius: 999, padding: "3px 10px", fontSize: 8, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" as const, letterSpacing: "0.06em" }}>
            MAIS VENDIDO
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Fornecedores Confiáveis",
    desc: "Parceiros verificados com estoque real e entrega garantida",
    topBg: "linear-gradient(135deg, #0a0f1f, #0d0d1a)",
    glow: "radial-gradient(circle at 50% 45%, rgba(59,130,246,0.28) 0%, transparent 65%)",
    illustration: (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", zIndex: 2, gap: 10 }}>
        <svg width="96" height="106" viewBox="0 0 100 115" fill="none">
          <path d="M50 8 L12 24 L12 56 C12 80 28 100 50 108 C72 100 88 80 88 56 L88 24 Z" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M33 57 l12 12 l22-22" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(59,130,246,0.85)", letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 999, padding: "3px 10px" }}>
          Verificado
        </div>
      </div>
    ),
  },
];

function EcosystemSection() {
  const doubled = [...ECOSYSTEM_CARDS, ...ECOSYSTEM_CARDS];
  return (
    <section id="demo-section" style={{ padding: "96px 0", background: "#080808", overflow: "hidden" }}>
      <div style={{ padding: "0 20px", marginBottom: 52, maxWidth: 1180, marginLeft: "auto", marginRight: "auto" }}>
        <p className="reveal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#EE4D2D", textTransform: "uppercase" as const, marginBottom: 16, fontFamily: "'Barlow', sans-serif" }}>
          TUDO QUE O SHOPSYNC FAZ POR VOCÊ
        </p>
        <h2 style={{ fontSize: "clamp(32px,4.5vw,52px)", fontWeight: 900, lineHeight: 1.1, color: "#FFFFFF", margin: 0, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "-1px", maxWidth: 520 }}>
          Um ecossistema completo
          <br /><span style={{ color: "#EE4D2D" }}>para vender no digital.</span>
        </h2>
      </div>
      <div style={{ overflow: "hidden" }}>
        <div className="carousel-track" style={{ display: "flex" }}>
          {doubled.map((card, i) => (
            <div key={i} className="reveal ecosystem-card" style={{ minWidth: 280, height: 380, borderRadius: 24, background: "#0D0D14", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0, marginLeft: 10, marginRight: 10, transitionDelay: `${i * 0.1}s` }}>
              <div style={{ height: 200, background: card.topBg, position: "relative", flexShrink: 0, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: card.glow, zIndex: 1 }} />
                {card.illustration}
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 15, margin: 0, fontFamily: "'Barlow', sans-serif" }}>{card.title}</h3>
                <p style={{ color: "#888888", fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: "'Barlow', sans-serif" }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: "🤖", title: "Robô Divulgador", desc: "Divulga seus produtos automaticamente em centenas de grupos de WhatsApp e Facebook 24h por dia" },
  { icon: "📦", title: "Catálogo de Produtos", desc: "Acesse 1.000+ produtos validados com alta comissão prontos para divulgar" },
  { icon: "📊", title: "Dashboard Estilo Shopee", desc: "Acompanhe suas vendas, comissões e métricas em tempo real igual ao painel da Shopee" },
  { icon: "💰", title: "Precificação Automática", desc: "Calcule o preço ideal de cada produto com margem, taxa Shopee e lucro líquido automático" },
  { icon: "🔥", title: "Impulsionar Vendas", desc: "Pacotes de visibilidade com garantia de retorno para escalar suas comissões" },
  { icon: "📱", title: "Grupos de Divulgação", desc: "Acesse diretório de grupos + gerador de texto com IA para divulgar no tom certo" },
];

function FeaturesSection() {
  return (
    <section id="funcionalidades" style={{ padding: "100px 20px", background: "#080808" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#EE4D2D", textTransform: "uppercase" as const, marginBottom: 14, fontFamily: "'Barlow', sans-serif" }}>Tudo que você precisa</p>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0, color: "#FFFFFF", fontFamily: "'Barlow Condensed', sans-serif" }}>Automatize do início ao fim</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 20 }}>
          {FEATURES.map((f, index) => (
            <div key={f.title} className="lp-feature-card reveal" style={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 16, padding: "28px 24px", transitionDelay: `${index * 0.1}s` }}>
              <div style={{ width: 56, height: 56, background: "rgba(238,77,45,0.08)", border: "1px solid rgba(238,77,45,0.2)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 18, flexShrink: 0 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.3px", color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#888888", lineHeight: 1.65, margin: 0, fontFamily: "'Barlow', sans-serif" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: "01", title: "Crie sua conta", desc: "Acesse o painel em segundos. Sem burocracia, sem configurações complexas." },
  { n: "02", title: "Configure o Robô", desc: "Escolha seus produtos e canais de divulgação. O setup leva menos de 5 minutos." },
  { n: "03", title: "Receba Comissões", desc: "O robô trabalha 24h enquanto você acompanha tudo pelo dashboard em tempo real." },
];

function HowItWorksSection() {
  return (
    <section id="como-funciona" style={{ padding: "100px 20px", background: "#080808" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#EE4D2D", textTransform: "uppercase" as const, marginBottom: 14, fontFamily: "'Barlow', sans-serif" }}>É simples assim</p>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0, color: "#FFFFFF", fontFamily: "'Barlow Condensed', sans-serif" }}>3 passos para começar a automatizar</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 40 }}>
          {STEPS.map((step, i) => (
            <div key={step.n} className="reveal" style={{ textAlign: "center", position: "relative", transitionDelay: `${i * 0.1}s` }}>
              {i < STEPS.length - 1 && (
                <div className="lp-hide-mobile" style={{ position: "absolute", top: 27, left: "calc(50% + 30px)", width: "calc(100% - 60px)", height: 1, borderTop: "1.5px dashed rgba(238,77,45,0.4)", pointerEvents: "none" }} />
              )}
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #EE4D2D", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 18, fontWeight: 900, color: "#EE4D2D", fontFamily: "'Barlow', sans-serif" }}>
                {step.n}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.3px", color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: "#888888", lineHeight: 1.65, margin: 0, fontFamily: "'Barlow', sans-serif" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const LINKS = {
  mensal: {
    cartao: 'https://go.perfectpay.com.br/PPU38CQC838',
    pix: 'https://go.ironpayapp.com.br/knwcyeiala',
  },
  vitalicio: {
    cartao: 'https://go.perfectpay.com.br/PPU38CQC83E',
    pix: 'https://go.ironpayapp.com.br/jxzfsyhoci',
  },
} as const;

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="8" cy="8" r="8" fill="rgba(238,77,45,0.15)" />
      <path d="M4.5 8l2.5 2.5 4-4.5" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const MENSAL_FEATURES = ["Robô Divulgador ilimitado", "Produtos validados para vender", "Publicação nos maiores grupos", "Copy de IA para WhatsApp", "Dashboard estilo Shopee"];
const VITALICIO_FEATURES = ["Robô Divulgador ilimitado", "Produtos validados para vender", "Publicação nos maiores grupos", "Copy de IA para WhatsApp", "Dashboard estilo Shopee", "BÔNUS: acesso vitalício a todos os recursos futuros"];

function PricingSection() {
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    plan: 'mensal' | 'vitalicio' | null;
  }>({ open: false, plan: null });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaymentModal({ open: false, plan: null });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <section id="planos" style={{ padding: "100px 20px", background: "#080808", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 60% 50% at 50% 100%,rgba(238,77,45,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span className="text-[#EE4D2D] font-black text-[11px] uppercase tracking-[0.2em] reveal">INVESTIMENTO</span>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "12px 0 12px", color: "#FFFFFF", fontFamily: "'Barlow Condensed', sans-serif" }}>Escolha seu Plano</h2>
          <p style={{ color: "#888888", fontSize: 15, margin: 0, fontFamily: "'Barlow', sans-serif" }}>Sem taxas ocultas. Cancele quando quiser.</p>
        </div>

        <div className="text-center mb-8">
          <p className="text-white font-black text-2xl md:text-3xl">
            Esse é o valor da sua liberdade financeira hoje
          </p>
          <p className="text-[#EE4D2D] font-bold text-lg mt-2">
            💸 Menos que um delivery por mês
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 20, alignItems: "start" }}>
          {/* Mensal */}
          <div className="reveal pricing-card" style={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 20, padding: "36px 32px" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>Mensal</h3>
            <p style={{ fontSize: 13, color: "#888888", margin: "0 0 24px", fontFamily: "'Barlow', sans-serif" }}>Para testar sem compromisso.</p>
            <div style={{ marginBottom: 28 }}>
              <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-2px", color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>R$145</span>
              <span style={{ fontSize: 14, color: "#888888", fontFamily: "'Barlow', sans-serif" }}>/mês</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 32 }}>
              {MENSAL_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#F2F2F2", fontFamily: "'Barlow', sans-serif" }}><CheckIcon />{f}</div>
              ))}
            </div>
            <button
              onClick={() => setPaymentModal({ open: true, plan: 'mensal' })}
              style={{ display: "block", width: "100%", padding: "14px 0", textAlign: "center" as const, background: "transparent", border: "1.5px solid #1F1F1F", borderRadius: 10, color: "#F2F2F2", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "border-color 0.2s, background 0.2s", fontFamily: "'Barlow', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#EE4D2D"; (e.currentTarget as HTMLElement).style.background = "rgba(238,77,45,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1F1F1F"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              QUERO O ACESSO MENSAL
            </button>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#888]">
              <span>🔒 Pagamento Seguro</span>
              <span>🛡️ 7 dias de garantia</span>
            </div>
          </div>

          {/* Vitalício */}
          <div className="reveal pricing-card" style={{ background: "linear-gradient(145deg, rgba(238,77,45,0.08) 0%, #111111 50%)", border: "1.5px solid #EE4D2D", borderRadius: 20, padding: "36px 32px", position: "relative", boxShadow: "0 0 60px rgba(238,77,45,0.15)", transitionDelay: "0.1s" }}>
            <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#EE4D2D,#F97316)", borderRadius: 999, padding: "5px 18px", fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" as const, letterSpacing: "0.04em", fontFamily: "'Barlow', sans-serif" }}>
              MAIS ESCOLHIDO · ECONOMIZE 80%
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>Vitalício</h3>
            <p style={{ fontSize: 13, color: "#888888", margin: "0 0 20px", fontFamily: "'Barlow', sans-serif" }}>Pague uma vez. Use para sempre.</p>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, color: "#888888", textDecoration: "line-through", marginBottom: 2, fontFamily: "'Barlow', sans-serif" }}>De R$528</div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#EE4D2D", marginRight: 4, fontFamily: "'Barlow', sans-serif" }}>Por</span>
                <span style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-2px", color: "#EE4D2D", fontFamily: "'Barlow', sans-serif" }}>R$285</span>
              </div>
              <div style={{ fontSize: 12, color: "#888888", marginTop: 4, fontFamily: "'Barlow', sans-serif" }}>via PIX · pagamento único</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 32 }}>
              {VITALICIO_FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#F2F2F2", fontFamily: "'Barlow', sans-serif" }}><CheckIcon />{f}</div>
              ))}
            </div>

            <button
              onClick={() => setPaymentModal({ open: true, plan: 'vitalicio' })}
              className="lp-shimmer"
              style={{ display: "block", width: "100%", padding: "16px 0", textAlign: "center" as const, background: "#EE4D2D", borderRadius: 10, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", border: "none", letterSpacing: "0.04em", transition: "background 0.2s, transform 0.15s", fontFamily: "'Barlow', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#d93e22"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EE4D2D"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            >
              QUERO O ACESSO VITALÍCIO →
            </button>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-[#888]">
              <span>🔒 Pagamento Seguro</span>
              <span>🛡️ 7 dias de garantia</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-8 text-white/50 text-sm">
          <span>🛡️</span>
          <span>7 dias de garantia total — devolvemos 100% se não gostar</span>
        </div>
        <p className="text-center mt-4 text-sm font-bold text-[#EE4D2D] animate-pulse">
          496 / 500 vagas — restam apenas 4 vagas
        </p>
      </div>

      {paymentModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPaymentModal({ open: false, plan: null })}
        >
          <div
            className="bg-[#0F0F1A] rounded-3xl p-8 max-w-sm w-full border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Plan icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EE4D2D] flex items-center justify-center text-3xl">🚀</div>
            </div>
            {/* Plan name */}
            <p className="text-[#EE4D2D] font-black text-xs uppercase tracking-widest text-center mb-2">
              {paymentModal.plan === 'mensal' ? 'PLANO MENSAL' : 'PLANO VITALÍCIO'}
            </p>
            {/* Price */}
            <h2 className="text-white font-black text-4xl text-center mb-1">
              {paymentModal.plan === 'mensal' ? 'R$145' : 'R$285'}
            </h2>
            {/* Subtitle */}
            <p className="text-white/50 text-sm text-center mb-6">
              {paymentModal.plan === 'mensal' ? 'por mês · cancele quando quiser' : 'pagamento único — acesso vitalício'}
            </p>
            <hr className="border-white/10 mb-6" />
            <p className="text-white/60 text-sm text-center mb-4">Como prefere pagar?</p>

            {/* Payment options — both large, equal prominence */}
            <div className="flex flex-col gap-3 mb-4">
              {/* PIX */}
              <a
                href={LINKS[paymentModal.plan!].pix}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#0D2B1F] border-2 border-[#32BCAD] rounded-2xl py-5 px-5 w-full hover:bg-[#0D3524] transition-all"
              >
                <svg viewBox="0 0 512 512" width="28" height="28" fill="#32BCAD" style={{ flexShrink: 0 }}>
                  <path d="M242.4 292.5C247.8 287.1 255.1 284.1 262.5 284.1C269.9 284.1 277.2 287.1 282.6 292.5L364.1 374C377 386.9 393.9 394.1 412.1 394.1H427.4L344.6 476.8C319.9 501.5 279.6 501.5 254.9 476.8L172.8 394.1H188.4C206.6 394.1 223.5 386.9 236.4 374L242.4 292.5zM282.6 219.5C277.2 224.9 269.9 227.9 262.5 227.9C255.1 227.9 247.8 224.9 242.4 219.5L160.1 138C147.2 125.1 130.3 117.9 112.1 117.9H96.8L179.6 35.2C204.3 10.5 244.6 10.5 269.3 35.2L352.1 117.9H336.5C318.3 117.9 301.4 125.1 288.5 138L282.6 219.5z"/>
                </svg>
                <div>
                  <p className="text-white font-bold text-base">PIX</p>
                  <p className="text-[#32BCAD] text-xs mt-0.5">Aprovação instantânea</p>
                </div>
              </a>

              {/* Cartão */}
              <a
                href={LINKS[paymentModal.plan!].cartao}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#1A1030] border-2 border-purple-700 rounded-2xl py-5 px-5 w-full hover:bg-[#1E1438] transition-all"
              >
                <span className="text-2xl" style={{ flexShrink: 0 }}>💳</span>
                <div>
                  <p className="text-white font-bold text-base">Cartão de Crédito</p>
                  <p className="text-purple-400 text-xs mt-0.5">Até 12x · Visa, Master, Elo, Amex</p>
                </div>
              </a>
            </div>

            {/* Trust */}
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs mb-4">
              <span>🔒 Pagamento 100% seguro · 🛡️ 7 dias de garantia</span>
            </div>

            {/* Close */}
            <button
              onClick={() => setPaymentModal({ open: false, plan: null })}
              className="w-full text-white/40 text-sm hover:text-white transition-colors py-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  { name: "Carla Mendes", role: "Vendedora Shopee", photo: "https://randomuser.me/api/portraits/women/65.jpg", text: "Em 3 semanas usando o robô, já recebi mais de R$2.800 em comissões. Antes eu ficava horas divulgando manualmente e não chegava nem perto disso." },
  { name: "Rafael Souza", role: "Vendedor Shopee", photo: "https://randomuser.me/api/portraits/men/41.jpg", text: "Assinar o plano vitalício foi a melhor decisão que tomei. O robô divulga sozinho nos grupos enquanto eu trabalho no meu emprego fixo. Renda extra garantida." },
  { name: "Amanda Costa", role: "Vendedora Shopee", photo: "https://randomuser.me/api/portraits/women/29.jpg", text: "O dashboard é incrível, parece o próprio painel da Shopee. Consigo ver tudo em tempo real: pedidos, comissões, métricas. Muito profissional." },
];

function TestimonialsSection() {
  return (
    <section style={{ padding: "100px 0", background: "#080808" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#EE4D2D", textTransform: "uppercase" as const, marginBottom: 14, fontFamily: "'Barlow', sans-serif" }}>Resultados reais</p>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0, color: "#FFFFFF", fontFamily: "'Barlow Condensed', sans-serif" }}>O que dizem nossos vendedores</h2>
        </div>
        <div className="lp-testimonials">
          {TESTIMONIALS.map((t, index) => (
            <div key={t.name} className="lp-tcard reveal" style={{ width: "min(360px,82vw)", flexShrink: 0, background: "#111111", border: "1px solid #1F1F1F", borderRadius: 16, padding: "28px 24px", scrollSnapAlign: "start", transitionDelay: `${index * 0.1}s` }}>
              <div style={{ fontSize: 48, lineHeight: 1, color: "#EE4D2D", opacity: 0.5, marginBottom: 12, fontFamily: "Georgia, serif" }}>"</div>
              <p style={{ fontSize: 14.5, color: "#888888", lineHeight: 1.7, margin: "0 0 24px", fontFamily: "'Barlow', sans-serif" }}>{t.text}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={t.photo} alt={t.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(238,77,45,0.3)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#888888", fontFamily: "'Barlow', sans-serif" }}>{t.role}</div>
                  <div style={{ fontSize: 13, marginTop: 3, color: "#EE4D2D", letterSpacing: "1px" }}>★★★★★</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Guarantee ────────────────────────────────────────────────────────────────

function GuaranteeSection() {
  return (
    <section className="py-20 bg-[#080808] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(238,77,45,0.1)_0%,transparent_70%)]" />

      <div className="container mx-auto px-4 text-center relative z-10 max-w-2xl">
        <div className="text-6xl md:text-8xl mb-6 animate-[pulse_2s_ease-in-out_infinite] reveal">🛡️</div>

        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 reveal">
          7 DIAS DE GARANTIA TOTAL
        </h2>

        <p className="text-[#888] text-lg leading-relaxed mb-4 reveal">
          Acesse tudo, teste cada recurso por 7 dias.
        </p>
        <p className="text-white font-bold text-xl mb-4">
          Se não fizer pelo menos <span className="text-[#EE4D2D]">1 venda</span> ou não gostar por qualquer motivo,
        </p>
        <p className="text-white text-lg mb-2">
          devolvemos <span className="text-[#EE4D2D] font-black">100% do seu dinheiro</span>, nota por nota.
        </p>
        <p className="text-[#888] text-lg mb-10">
          Sem perguntas. Sem burocracia. <span className="text-white font-bold">Zero risco.</span>
        </p>

        <a
          href="https://go.ironpayapp.com.br/jxzfsyhoci"
          className="inline-block bg-[#EE4D2D] text-white font-black text-lg uppercase tracking-widest rounded-full px-12 py-5 shadow-[0_0_40px_rgba(238,77,45,0.4)] hover:scale-[1.03] transition-all duration-200 w-full md:w-auto reveal"
        >
          🛡️ QUERO MEU ACESSO COM GARANTIA
        </a>

        <p className="text-[#888] text-xs mt-4">Acesso vitalício · R$285 · Pagamento único</p>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: "Preciso ter experiência com Shopee para usar?", a: "Não. O ShopSync foi desenvolvido para qualquer pessoa, desde iniciantes até vendedores experientes. A plataforma guia você em cada passo e o robô funciona de forma automática." },
  { q: "O robô divulgador funciona automaticamente?", a: "Sim. Após configurar uma vez, o robô opera 24 horas por dia, 7 dias por semana, divulgando seus produtos nos grupos selecionados sem nenhuma intervenção manual." },
  { q: "Qual a diferença entre Mensal e Vitalício?", a: "O plano Mensal cobra R$145 por mês e pode ser cancelado a qualquer momento. O plano Vitalício é um pagamento único de R$285 que garante acesso completo para sempre, incluindo todas as atualizações futuras." },
  { q: "Como funciona a garantia de 7 dias?", a: "Simples: se dentro de 7 dias você não estiver satisfeito, entre em contato pelo suporte e devolveremos 100% do valor pago. Sem questionamentos." },
  { q: "Consigo acessar em qualquer dispositivo?", a: "Sim. O ShopSync funciona perfeitamente em computador, celular e tablet. Seu painel fica disponível de qualquer lugar com acesso à internet." },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" style={{ padding: "100px 20px", background: "#080808" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p className="reveal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#EE4D2D", textTransform: "uppercase" as const, marginBottom: 14, fontFamily: "'Barlow', sans-serif" }}>Dúvidas frequentes</p>
          <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0, color: "#FFFFFF", fontFamily: "'Barlow Condensed', sans-serif" }}>Perguntas Frequentes</h2>
        </div>
        <div>
          {FAQS.map((faq, i) => (
            <div key={i} className="reveal" style={{ borderBottom: "1px solid #1F1F1F", transitionDelay: `${i * 0.1}s` }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "20px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.4, fontFamily: "'Barlow', sans-serif" }}>{faq.q}</span>
                <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: open === i ? "#EE4D2D" : "rgba(238,77,45,0.12)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s, transform 0.28s", transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M1.5 3.5l4 4 4-4" stroke={open === i ? "#fff" : "#EE4D2D"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <div className="lp-accordion-body" style={{ maxHeight: open === i ? 240 : 0, opacity: open === i ? 1 : 0, paddingBottom: open === i ? 20 : 0 }}>
                <p style={{ margin: 0, fontSize: 14.5, color: "#888888", lineHeight: 1.7, fontFamily: "'Barlow', sans-serif" }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section style={{ padding: "100px 20px", textAlign: "center", position: "relative", overflow: "hidden", background: "#080808" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 60% 80% at 50% 50%,rgba(238,77,45,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
        <h2 className="reveal" style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 16px", lineHeight: 1.05, color: "#FFFFFF", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase" as const }}>
          Pronto para Automatizar<br />suas Vendas?
        </h2>
        <p style={{ fontSize: 16, color: "#888888", margin: "0 0 36px", lineHeight: 1.6, fontFamily: "'Barlow', sans-serif" }}>
          Junte-se a mais de 1.200 vendedores que já usam o ShopSync
        </p>
        <a
          href="https://go.ironpayapp.com.br/jxzfsyhoci"
          target="_blank" rel="noopener noreferrer"
          className="lp-shimmer"
          style={{ display: "inline-block", padding: "16px 36px", background: "#EE4D2D", color: "#fff", borderRadius: 12, fontWeight: 800, fontSize: 16, textDecoration: "none", letterSpacing: "0.04em", transition: "background 0.2s, transform 0.15s", minHeight: 52, fontFamily: "'Barlow', sans-serif" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#d93e22"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#EE4D2D"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
        >
          ⚡ COMEÇAR AGORA
        </a>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer style={{ borderTop: "1px solid #1F1F1F", padding: "48px 20px 32px", background: "#000000" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <img src="/brand/shopesync-logo.png" alt="ShopSync" style={{ height: 30, width: 30, objectFit: "contain" }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: "#FFFFFF", fontFamily: "'Barlow', sans-serif" }}>ShopSync</span>
            </div>
            <p style={{ fontSize: 13, color: "#888888", margin: 0, maxWidth: 220, fontFamily: "'Barlow', sans-serif" }}>Automatize suas vendas na Shopee</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, fontSize: 13 }}>
            {[
              { label: "Funcionalidades", href: "#funcionalidades" },
              { label: "Planos", href: "#planos" },
              { label: "Suporte", href: "https://wa.me" },
              { label: "Entrar", href: "/login" },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{ color: "#888888", textDecoration: "none", transition: "color 0.2s", fontFamily: "'Barlow', sans-serif" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#EE4D2D"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#888888"; }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center", paddingTop: 24, borderTop: "1px solid #1F1F1F", fontSize: 12, color: "#888888" }}>
          <span style={{ fontFamily: "'Barlow', sans-serif" }}>© 2026 ShopSync. Todos os direitos reservados.</span>
          <div style={{ display: "flex", gap: 20, alignItems: "center", fontFamily: "'Barlow', sans-serif" }}>
            <span>🔒 SSL SEGURO</span>
            <span>🛡️ PAGAMENTO PROTEGIDO</span>
            <span>💬 SUPORTE 24/7</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PlanosPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: "'Barlow', -apple-system, BlinkMacSystemFont, sans-serif", background: "#080808", color: "#F2F2F2", minHeight: "100vh", overflowX: "hidden" }}>
      <LPStyles />
      <Navbar />
      <Hero />
      <MarqueeSection />
      <StatementSection />
      <EcosystemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <GuaranteeSection />
      <FAQSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
}
