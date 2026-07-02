import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/ofertas")({ component: OfertasPage });

/* ── Helpers ── */
const CHECKOUT_MENSAL = "https://go.ironpayapp.com.br/knwcyeiala";
const CHECKOUT_VITALICIO = "https://go.ironpayapp.com.br/jxzfsyhoci";
const fmt = new Intl.NumberFormat("pt-BR");
const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function countUp(node: HTMLElement, target: number, dur: number, done?: () => void) {
  if (!node || (node as any).dataset.counted) { done?.(); return; }
  (node as any).dataset.counted = "1";
  if (reduced) { node.textContent = fmt.format(target); done?.(); return; }
  let t0: number | null = null;
  function tick(t: number) {
    if (t0 === null) t0 = t;
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = fmt.format(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
    else done?.();
  }
  requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════════
   PAGE COMPONENT
   ══════════════════════════════════════════════ */
function OfertasPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [progressWidth, setProgressWidth] = useState("0%");
  const [exitOpen, setExitOpen] = useState(false);
  const [stickyShow, setStickyShow] = useState(false);

  const vslPanelRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const lineWrapRef = useRef<HTMLDivElement>(null);
  const mathPanelRef = useRef<HTMLDivElement>(null);
  const observedRef = useRef<Set<Element>>(new Set());
  const hasRunHowRef = useRef(false);
  const stickyShowRef = useRef(false);

  /* ── Unified scroll handler ── */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setNavScrolled(y > 50);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgressWidth(h > 0 ? `${(y / h) * 100}%` : "0%");

      /* VSL rise */
      const panel = vslPanelRef.current;
      if (panel && !reduced) {
        const r = panel.getBoundingClientRect(), vh = window.innerHeight;
        const p = Math.min(Math.max((vh - r.top) / (vh * 0.6), 0), 1);
        panel.style.transform = `translateY(${(1 - p) * 110}px) scale(${0.94 + 0.06 * p})`;
        panel.style.opacity = String(0.2 + 0.8 * p);
      }

      /* Sticky mobile CTA */
      if (window.innerWidth <= 768 && panel && pricingRef.current) {
        const vslGone = panel.getBoundingClientRect().bottom < 0;
        const pr = pricingRef.current.getBoundingClientRect();
        const pricingVisible = pr.top < window.innerHeight && pr.bottom > 0;
        const show = vslGone && !pricingVisible;
        if (show !== stickyShowRef.current) {
          stickyShowRef.current = show;
          setStickyShow(show);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ── Hero load sequence ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const heroIn = (sel: string, delay: number) => {
      const id = setTimeout(() => {
        const el = hero.querySelector(sel);
        if (el) el.classList.add("in");
      }, delay);
      ids.push(id);
    };
    heroIn('.rv[data-dir="down"]', 100);
    ids.push(setTimeout(() => {
      const h = headlineRef.current;
      if (h) {
        h.classList.add("in");
        h.querySelectorAll(".w").forEach((w, i) => { ((w as HTMLElement).style.transitionDelay = `${i * 0.07}s`); });
      }
    }, 320));
    heroIn(".sub", 950);
    ids.push(setTimeout(() => {
      hero.querySelectorAll(".hero-ctas .rv").forEach((b, i) => {
        setTimeout(() => { b.classList.add("in"); }, i * 60);
      });
    }, 1080));
    heroIn(".hero-micro", 1300);
    return () => ids.forEach(clearTimeout);
  }, []);

  /* ── Reveal observer (sections below hero) ── */
  useEffect(() => {
    const observed = observedRef.current;
    const afterReveal = (el: Element) => {
      /* counters */
      if (el.classList.contains("counter")) {
        const num = el.querySelector(".num") as HTMLElement;
        if (num) countUp(num, +(num.dataset.target || "0"), 1600, () => { el.classList.add("done"); });
      }
      /* data-count elements */
      el.querySelectorAll("[data-count]").forEach((n) => {
        countUp(n as HTMLElement, +(n.getAttribute("data-count") || "0"), 900);
      });
      /* math panel */
      if (el.id === "mathPanel") {
        setTimeout(() => { document.getElementById("strike334")?.classList.add("cut"); }, 1100);
        el.querySelectorAll(".bar i").forEach((b) => { ((b as HTMLElement).style.width = (b as HTMLElement).dataset.w || "0"); });
        document.getElementById("econTag")?.classList.add("pop");
      }
      /* plan cards — strike old price */
      if (el.classList.contains("plan")) {
        const old = el.querySelector(".old");
        if (old) setTimeout(() => { old.classList.add("cut"); }, 350);
      }
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !observed.has(e.target)) {
          observed.add(e.target);
          e.target.classList.add("in");
          io.unobserve(e.target);
          afterReveal(e.target);
        }
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -6% 0px" });

    document.querySelectorAll(".rv").forEach((el) => {
      if (!heroRef.current?.contains(el)) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  /* ── How-it-works observer ── */
  useEffect(() => {
    const how = document.getElementById("como-funciona");
    if (!how || hasRunHowRef.current) return;
    const io = new IntersectionObserver((es) => {
      if (!es[0]?.isIntersecting) return;
      io.disconnect();
      hasRunHowRef.current = true;
      lineWrapRef.current?.classList.add("draw");
      document.querySelectorAll(".step").forEach((s, i) => {
        setTimeout(() => { s.classList.add("lit"); }, 500 + i * 620);
      });
    }, { threshold: 0.35 });
    io.observe(how);
    return () => io.disconnect();
  }, []);

  /* ── FAQ accordion ── */
  useEffect(() => {
    const handlers: Array<{ sum: HTMLElement; fn: (e: Event) => void }> = [];
    document.querySelectorAll(".faq-item").forEach((item) => {
      const sum = item.querySelector("summary") as HTMLElement;
      const body = item.querySelector(".faq-a") as HTMLElement;
      if (!sum || !body) return;
      const fn = (e: Event) => {
        e.preventDefault();
        const details = item as HTMLDetailsElement;
        if (!details.open) { details.open = true; }
        else {
          body.style.maxHeight = "0"; body.style.paddingBottom = "0";
          setTimeout(() => {
            details.open = false;
            body.style.maxHeight = ""; body.style.paddingBottom = "";
          }, 380);
        }
      };
      sum.addEventListener("click", fn);
      handlers.push({ sum, fn });
    });
    return () => handlers.forEach(({ sum, fn }) => sum.removeEventListener("click", fn));
  }, []);

  /* ── Exit intent popup ── */
  const openExit = useCallback(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("exitShown")) return;
    if (pricingRef.current) {
      const r = pricingRef.current.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) return;
    }
    sessionStorage.setItem("exitShown", "1");
    setExitOpen(true);
  }, []);
  const closeExit = useCallback(() => setExitOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeExit(); };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0 && Date.now() - t0 > 10000) openExit();
    };
    document.addEventListener("keydown", onKey);
    const t0 = Date.now();
    document.addEventListener("mouseout", onMouseOut);
    const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 820;
    if (isMobile && !sessionStorage.getItem("exitShown")) {
      history.pushState({ up: 1 }, "");
      const onPop = () => {
        if (!sessionStorage.getItem("exitShown")) {
          openExit();
          history.pushState({ up: 1 }, "");
        }
      };
      window.addEventListener("popstate", onPop);
      return () => {
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("mouseout", onMouseOut);
        window.removeEventListener("popstate", onPop);
      };
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [openExit, closeExit]);

  /* ── Anchor offset ── */
  useEffect(() => {
    document.querySelectorAll("section, header").forEach((s) => {
      (s as HTMLElement).style.scrollMarginTop = "84px";
    });
  }, []);

  /* ── Stagger siblings ── */
  useEffect(() => {
    document.querySelectorAll(".rv").forEach((el) => {
      const parent = el.parentElement;
      if (!parent) return;
      const sibs = parent.querySelectorAll(":scope > .rv");
      if (sibs.length > 1) {
        const i = Array.prototype.indexOf.call(sibs, el);
        if (i > 0) ((el as HTMLElement).style.transitionDelay = `${i * 0.09}s`);
      }
    });
  }, []);

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  return (
    <>
      {/* ═══ PROGRESS BAR ═══ */}
      <div id="progress" style={{ position: "fixed", top: 0, left: 0, height: 3, width: progressWidth, background: "linear-gradient(135deg, #F4541E 0%, #FF7A45 100%)", zIndex: 1000, borderRadius: "0 2px 2px 0", transition: "width 0.05s linear" }} />

      {/* ═══ NAV ═══ */}
      <nav id="nav" className={navScrolled ? "scrolled" : ""} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 900, padding: "14px 0", transition: "all .35s ease", background: navScrolled ? "rgba(10,10,12,.82)" : "rgba(10,10,12,.55)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: navScrolled ? "1px solid #26262B" : "1px solid transparent" }}>
        <div className="nav-in" style={{ width: "min(1120px, 92%)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="#inicio" className="brand" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "1.05rem" }}>
            <img src="/brand/logo.png" alt="UpShopee" style={{ width: 34, height: 34, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            UpShopee
          </a>
          <div className="nav-links" style={{ display: "flex", gap: 4, background: "rgba(20,20,23,.7)", border: "1px solid #26262B", padding: 5, borderRadius: 99 }}>
            <a href="#inicio" style={{ fontSize: ".83rem", fontWeight: 500, color: "#A0A0A8", padding: "7px 15px", borderRadius: 99, transition: "all .25s ease" }}>Inicio</a>
            <a href="#ferramentas" style={{ fontSize: ".83rem", fontWeight: 500, color: "#A0A0A8", padding: "7px 15px", borderRadius: 99, transition: "all .25s ease" }}>Ferramentas</a>
            <a href="#como-funciona" style={{ fontSize: ".83rem", fontWeight: 500, color: "#A0A0A8", padding: "7px 15px", borderRadius: 99, transition: "all .25s ease" }}>Como funciona</a>
            <a href="#planos" style={{ fontSize: ".83rem", fontWeight: 500, color: "#A0A0A8", padding: "7px 15px", borderRadius: 99, transition: "all .25s ease" }}>Planos</a>
            <a href="#faq" style={{ fontSize: ".83rem", fontWeight: 500, color: "#A0A0A8", padding: "7px 15px", borderRadius: 99, transition: "all .25s ease" }}>FAQ</a>
          </div>
          <a href="#planos" className="nav-cta" style={{ fontSize: ".85rem", fontWeight: 600, padding: "10px 20px", borderRadius: 99, background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", transition: "all .25s ease", boxShadow: "0 4px 18px rgba(244,84,30,.3)" }}>Garantir acesso</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <header className="hero" id="inicio" ref={heroRef} style={{ position: "relative", padding: "170px 0 40px", textAlign: "center", overflow: "hidden" }}>
        <div className="float-orb" />
        <div className="float-orb" />
        <div className="float-orb" />
        <div className="arc" style={{ position: "absolute", top: -560, left: "50%", transform: "translateX(-50%)", width: 1400, height: 820, borderRadius: "50%", background: "radial-gradient(closest-side,rgba(244,84,30,.22),rgba(244,84,30,.06) 55%,transparent 72%)", pointerEvents: "none", animation: "arcIn 1.4s ease both" }} />
        <div className="hero-grid" style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%,#000 40%,transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 0%,#000 40%,transparent 100%)", pointerEvents: "none" }} />
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="rv" data-dir="down"><span className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: ".8rem", fontWeight: 500, color: "#A0A0A8", border: "1px solid #26262B", background: "rgba(20,20,23,.6)", padding: "8px 18px", borderRadius: 99 }}><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4541E", boxShadow: "0 0 8px #F4541E" }} />Para afiliados Shopee e iniciantes</span></div>
          <h1 className="rv" id="headline" ref={headlineRef} style={{ fontSize: "clamp(2.1rem,5.4vw,3.9rem)", fontWeight: 800, margin: "26px auto 20px", maxWidth: 820, fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em" }}>
            <span className="w">Isso</span> <span className="w">não</span> <span className="w">é</span> <span className="w">um</span> <span className="w">gasto.</span><br />
            <span className="w">É</span> <span className="w">um</span> <span className="w grad-text" style={{ background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>investimento.</span>
          </h1>
          <p className="sub rv" data-dir="up" style={{ color: "#A0A0A8", fontSize: "1.08rem", maxWidth: 600, margin: "0 auto 34px" }}>A plataforma com IA que encontra os produtos que mais pagam comissão e cria seus vídeos — enquanto você foca em lucrar.</p>
          <div className="hero-ctas" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#planos" className="btn btn-primary rv" data-dir="left" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: "1rem", padding: "16px 32px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(244,84,30,.35)" }}>Quero começar a lucrar <span className="arr" style={{ transition: "transform .25s ease" }}>→</span></a>
            <a href="#vsl" className="btn btn-ghost rv" data-dir="right" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: "1rem", padding: "16px 32px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", border: "1px solid #26262B", color: "#FFFFFF", background: "rgba(20,20,23,.5)" }}>Assistir apresentação</a>
          </div>
          <p className="hero-micro rv" data-dir="up" style={{ marginTop: 18, fontSize: ".82rem", color: "#6E6E76" }}><b style={{ color: "#A0A0A8" }}>✓ Acesso imediato</b>&nbsp;&nbsp;&nbsp;<b style={{ color: "#A0A0A8" }}>✓ Garantia incondicional de 7 dias</b></p>
          <div className="chevron" aria-hidden="true" style={{ margin: "44px auto 0", width: 26, height: 26, borderRight: "2px solid #6E6E76", borderBottom: "2px solid #6E6E76", transform: "rotate(45deg)", animation: "bounce 1.8s ease-in-out infinite" }} />
        </div>
      </header>

      <div className="section-divider" />

      {/* ═══ VSL ═══ */}
      <section id="vsl" style={{ padding: "30px 0 90px", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <p className="vsl-title rv" data-dir="up" style={{ textAlign: "center", fontSize: "clamp(1.15rem,2.4vw,1.5rem)", fontWeight: 600, color: "#A0A0A8", marginBottom: 30 }}>Assista e entenda por que isso <b style={{ color: "#FFFFFF" }}>se paga sozinho</b></p>
          <div className="vsl-panel" ref={vslPanelRef} style={{ position: "relative", maxWidth: 960, margin: "0 auto", aspectRatio: "16/9", borderRadius: 20, border: "1px solid #26262B", background: "#101014", boxShadow: "0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(244,84,30,.12)", overflow: "hidden" }}>
            <div className="vsl-ph" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 40%,rgba(244,84,30,.1),transparent 65%)" }}>
              <img src="/brand/logo.png" alt="UpShopee" style={{ width: "min(150px, 26%)", animation: "breathe 3.2s ease-in-out infinite" }} onError={(e) => { const t = e.currentTarget; t.outerHTML = '<div class="fallback grad-text" style="font-family:Sora,sans-serif;font-weight:800;font-size:2rem;animation:breathe 3.2s ease-in-out infinite;background:linear-gradient(135deg,#F4541E 0%,#FF7A45 100%);-webkit-background-clip:text;background-clip:text;color:transparent">UpShopee</div>'; }} />
            </div>
            <button id="unmute" style={{ position: "absolute", inset: 0, margin: "auto", width: "max-content", height: "max-content", zIndex: 5, display: "none", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "1rem", padding: "16px 30px", borderRadius: 99, background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", boxShadow: "0 10px 40px rgba(0,0,0,.5)" }}>🔊 Clique para ativar o som</button>
          </div>
          <p className="vsl-micro" style={{ textAlign: "center", marginTop: 20, fontSize: ".82rem", color: "#6E6E76" }}>🔒 Pagamento 100% seguro &nbsp;·&nbsp; Garantia de 7 dias</p>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ TRUST / COUNTERS ═══ */}
      <section id="confianca" style={{ padding: "36px 0", borderTop: "1px solid #26262B", borderBottom: "1px solid #26262B", background: "#101014", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <p className="trust-line" style={{ textAlign: "center", color: "#6E6E76", fontSize: ".85rem", marginBottom: 22, textTransform: "uppercase", letterSpacing: ".12em" }}>Confiado por afiliados em todo o Brasil</p>
          <div className="counters" style={{ display: "flex", justifyContent: "center", gap: "clamp(24px,6vw,80px)", flexWrap: "wrap" }}>
            <div className="counter rv" data-dir="left" style={{ textAlign: "center" }}><div className="num" data-target="1250" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,3.4vw,2.3rem)", color: "#FFFFFF" }}>0</div><div className="lbl" style={{ fontSize: ".83rem", color: "#A0A0A8", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>afiliados ativos <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3} style={{ width: 14, height: 14, opacity: 0, transform: "scale(0)" }}><path d="M4 12l5 5L20 6" /></svg></div></div>
            <div className="counter rv" data-dir="up" style={{ textAlign: "center" }}><div className="num" data-target="38400" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,3.4vw,2.3rem)", color: "#FFFFFF" }}>0</div><div className="lbl" style={{ fontSize: ".83rem", color: "#A0A0A8", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>vídeos gerados por IA <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3} style={{ width: 14, height: 14, opacity: 0, transform: "scale(0)" }}><path d="M4 12l5 5L20 6" /></svg></div></div>
            <div className="counter rv" data-dir="right" style={{ textAlign: "center" }}><div className="num" data-target="512000" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,3.4vw,2.3rem)", color: "#FFFFFF" }}>0</div><div className="lbl" style={{ fontSize: ".83rem", color: "#A0A0A8", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>produtos minerados <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3} style={{ width: 14, height: 14, opacity: 0, transform: "scale(0)" }}><path d="M4 12l5 5L20 6" /></svg></div></div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FEATURES / BENTO ═══ */}
      <section id="ferramentas" style={{ padding: "90px 0", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="sec-head" style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="pill rv" data-dir="down" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: ".8rem", fontWeight: 500, color: "#A0A0A8", border: "1px solid #26262B", background: "rgba(20,20,23,.6)", padding: "8px 18px", borderRadius: 99 }}><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4541E", boxShadow: "0 0 8px #F4541E" }} />Ferramentas</span>
            <h2 className="rv" data-dir="up" style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "clamp(1.7rem,3.6vw,2.5rem)", fontWeight: 700, marginTop: 18 }}>Tudo o que você precisa para lucrar mais.</h2>
            <p className="rv" data-dir="up" style={{ color: "#A0A0A8", maxWidth: 560, margin: "14px auto 0" }}>Minere, crie e divulgue — em uma única plataforma pensada para afiliados.</p>
          </div>
          <div className="bento stagger" style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 18 }}>
            <div className="b-card rv flash tilt-card" data-dir="left" style={{ gridColumn: "span 2", background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: 26, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", position: "relative" }}>
              <div className="b-visual" style={{ height: 150, borderRadius: 14, background: "#101014", border: "1px solid #26262B", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="mine-bars" style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 96 }}><i /><i /><i /><i className="hot" /><i /></div>
                <span className="mine-tag">alta comissão</span>
              </div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.06rem", fontWeight: 700, marginTop: 14 }}>Minerador completo</h3>
              <p style={{ fontSize: ".88rem", color: "#A0A0A8" }}>Descubra em segundos os produtos que mais vendem e que mais pagam comissão na Shopee.</p>
            </div>
            <div className="b-card rv flash tilt-card" data-dir="up" style={{ gridColumn: "span 2", background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: 26, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", position: "relative" }}>
              <div className="b-visual" style={{ height: 150, borderRadius: 14, background: "#101014", border: "1px solid #26262B", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="ai-lines" style={{ width: "82%", display: "flex", flexDirection: "column", gap: 10 }}><i /><i style={{ width: "86%" }} /><i style={{ width: "64%" }} /></div>
                <span className="cursor" style={{ width: 2, height: 16, background: "#F4541E", animation: "blink 1s steps(1) infinite", position: "absolute", bottom: 20, right: "22%" }} />
              </div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.06rem", fontWeight: 700, marginTop: 14 }}>IA criativa</h3>
              <p style={{ fontSize: ".88rem", color: "#A0A0A8" }}>Gerador de títulos, ideias, persona e scripts prontos com inteligência artificial.</p>
            </div>
            <div className="b-card rv flash tilt-card" data-dir="right" style={{ gridColumn: "span 2", background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: 26, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", position: "relative" }}>
              <div className="b-visual" style={{ height: 150, borderRadius: 14, background: "#101014", border: "1px solid #26262B", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="vid-mini" style={{ width: "78%", aspectRatio: "16/9", borderRadius: 10, background: "#1a1a1f", border: "1px solid #26262B", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}><span className="play" style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 2s ease-in-out infinite", boxShadow: "0 0 22px rgba(244,84,30,.4)" }} /><span className="prog" style={{ position: "absolute", bottom: 10, left: 10, right: 10, height: 4, borderRadius: 4, background: "#2a2a30", overflow: "hidden" }} /></div>
              </div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.06rem", fontWeight: 700, marginTop: 14 }}>Vídeos prontos para o Shopee Video</h3>
              <p style={{ fontSize: ".88rem", color: "#A0A0A8" }}>Templates e editor de vídeo para publicar conteúdo que converte, sem editar do zero.</p>
            </div>
            <div className="b-card wide rv flash tilt-card" data-dir="left" style={{ gridColumn: "span 3", background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: 26, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", position: "relative" }}>
              <div className="b-visual" style={{ height: 150, borderRadius: 14, background: "#101014", border: "1px solid #26262B", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="search-pill" style={{ width: "84%", display: "flex", alignItems: "center", gap: 10, background: "#1a1a1f", border: "1px solid #26262B", borderRadius: 99, padding: "12px 18px", fontSize: ".85rem", color: "#A0A0A8" }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={2}><circle cx={11} cy={11} r={7} /><path d="M21 21l-4-4" /></svg>
                  <span className="cycle" style={{ flex: 1, overflow: "hidden" }}><span className="cycle1">fone bluetooth…</span><span className="cycle2">air fryer…</span><span className="cycle3">kit skincare…</span></span>
                </div>
              </div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.06rem", fontWeight: 700, marginTop: 14 }}>Buscas ilimitadas</h3>
              <p style={{ fontSize: ".88rem", color: "#A0A0A8" }}>Pesquise quantos produtos quiser, quando quiser — sem limite e sem custo extra.</p>
            </div>
            <div className="b-card wide rv flash tilt-card" data-dir="right" style={{ gridColumn: "span 3", background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: 26, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden", position: "relative" }}>
              <div className="b-visual" style={{ height: 150, borderRadius: 14, background: "#101014", border: "1px solid #26262B", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="bubbles" style={{ width: "82%", display: "flex", flexDirection: "column", gap: 8 }}><i /><i /><i /></div>
              </div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.06rem", fontWeight: 700, marginTop: 14 }}>Comunidade VIP + suporte prioritário</h3>
              <p style={{ fontSize: ".88rem", color: "#A0A0A8" }}>Aprenda com quem já lucra e tenha ajuda rápida sempre que precisar.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="como-funciona" style={{ padding: "90px 0", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="sec-head" style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="pill rv" data-dir="down" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: ".8rem", fontWeight: 500, color: "#A0A0A8", border: "1px solid #26262B", background: "rgba(20,20,23,.6)", padding: "8px 18px", borderRadius: 99 }}><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4541E", boxShadow: "0 0 8px #F4541E" }} />Como funciona</span>
            <h2 className="rv" data-dir="up" style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "clamp(1.7rem,3.6vw,2.5rem)", fontWeight: 700, marginTop: 18 }}>Do zero ao lucro em 3 passos.</h2>
          </div>
          <div className="steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 26, position: "relative" }}>
            <div className="line-wrap" ref={lineWrapRef} style={{ position: "absolute", top: 53, left: "12%", right: "12%", height: 2, zIndex: 1 }}>
              <svg preserveAspectRatio="none" viewBox="0 0 1000 2" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F4541E" /><stop offset="1" stopColor="#FF7A45" /></linearGradient>
                <path d="M0 1 L1000 1" stroke="url(#lineGrad)" strokeWidth={2} fill="none" strokeDasharray={1000} strokeDashoffset={1000} />
              </svg>
            </div>
            <div className="step rv tilt-card" data-dir="left" style={{ background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: "30px 26px", position: "relative", zIndex: 2 }}><span className="n">1</span><h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.05rem", margin: "16px 0 8px" }}>Ative seu acesso</h3><p style={{ fontSize: ".9rem", color: "#A0A0A8" }}>Entre na plataforma em minutos — funciona no celular e no computador.</p></div>
            <div className="step rv tilt-card" data-dir="up" style={{ background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: "30px 26px", position: "relative", zIndex: 2 }}><span className="n">2</span><h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.05rem", margin: "16px 0 8px" }}>Minere os produtos que mais pagam</h3><p style={{ fontSize: ".9rem", color: "#A0A0A8" }}>O minerador mostra o que está vendendo e quanto cada produto paga de comissão.</p></div>
            <div className="step rv tilt-card" data-dir="right" style={{ background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: "30px 26px", position: "relative", zIndex: 2 }}><span className="n">3</span><h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.05rem", margin: "16px 0 8px" }}>Deixe a IA criar seus vídeos e divulgue</h3><p style={{ fontSize: ".9rem", color: "#A0A0A8" }}>Gere títulos, scripts e vídeos prontos para o Shopee Video — e comece a faturar.</p></div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ MATH ═══ */}
      <section id="contas" style={{ padding: "90px 0", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="sec-head" style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="pill rv" data-dir="down" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: ".8rem", fontWeight: 500, color: "#A0A0A8", border: "1px solid #26262B", background: "rgba(20,20,23,.6)", padding: "8px 18px", borderRadius: 99 }}><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4541E", boxShadow: "0 0 8px #F4541E" }} />Faça as contas</span>
          </div>
          <div className="panel rv tilt-card" data-dir="zoom" id="mathPanel" ref={mathPanelRef} style={{ background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: "clamp(30px,5vw,60px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <p className="math-line" style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(1.2rem,2.8vw,1.8rem)", fontWeight: 700, maxWidth: 720, margin: "0 auto 40px" }}>2 meses do plano mensal custam <span className="strike" id="strike334">R$ <span data-count="334">0</span></span>.<br />O acesso vitalício custa <span className="glow-num" style={{ color: "#FF7A45", textShadow: "0 0 24px rgba(244,84,30,.55)" }}>R$ <span data-count="267">0</span></span> — para sempre.</p>
            <div className="bars" style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, textAlign: "left" }}>
              <div className="bar-row">
                <div className="lab" style={{ fontSize: ".85rem", color: "#A0A0A8", marginBottom: 7, display: "flex", justifyContent: "space-between" }}><span>Mensal por 1 ano</span><span>R$ 2.004</span></div>
                <div className="bar" style={{ height: 16, borderRadius: 99, background: "#222228", overflow: "hidden" }}><i className="gray" data-w="100%" style={{ display: "block", height: "100%", borderRadius: 99, width: 0, background: "#3a3a42" }} /></div>
              </div>
              <div className="bar-row">
                <div className="lab" style={{ fontSize: ".85rem", color: "#A0A0A8", marginBottom: 7, display: "flex", justifyContent: "space-between" }}><span>Acesso Vitalício</span><span>R$ 267</span></div>
                <div className="bar" style={{ height: 16, borderRadius: 99, background: "#222228", overflow: "hidden" }}><i className="hot" data-w="13.3%" style={{ display: "block", height: "100%", borderRadius: 99, width: 0, background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", boxShadow: "0 0 18px rgba(244,84,30,.4)" }} /></div>
              </div>
            </div>
            <span className="econ-tag" id="econTag" style={{ display: "inline-block", marginTop: 22, fontWeight: 700, fontSize: ".92rem", color: "#fff", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", padding: "9px 20px", borderRadius: 99, opacity: 0, transform: "scale(.7)" }}>Economia de R$ 1.737 no primeiro ano</span>
            <p className="math-close" style={{ marginTop: 34, color: "#A0A0A8", fontSize: "1rem", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>Quantas comissões você precisa para pagar o investimento?<br /><b style={{ color: "#FFFFFF" }}>O risco é continuar sem.</b></p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ PRICING ═══ */}
      <section id="planos" ref={pricingRef} style={{ padding: "100px 0 90px", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="sec-head" style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="pill rv" data-dir="down" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: ".8rem", fontWeight: 500, color: "#A0A0A8", border: "1px solid #26262B", background: "rgba(20,20,23,.6)", padding: "8px 18px", borderRadius: 99 }}><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4541E", boxShadow: "0 0 8px #F4541E" }} />Planos</span>
            <h2 className="rv" data-dir="up" style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "clamp(1.7rem,3.6vw,2.5rem)", fontWeight: 700, marginTop: 18 }}>Escolha como você quer investir.</h2>
          </div>
          <div className="plans" style={{ display: "grid", gridTemplateColumns: "1fr 1.06fr", gap: 26, alignItems: "stretch", maxWidth: 920, margin: "0 auto" }}>
            {/* Mensal */}
            <div className="plan rv tilt-card" data-dir="left" style={{ background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: "34px 30px", display: "flex", flexDirection: "column", position: "relative" }}>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.35rem" }}>Plano Mensal</h3>
              <p className="tag" style={{ fontSize: ".83rem", color: "#A0A0A8", margin: "6px 0 20px" }}>Para quem quer começar com baixo investimento</p>
              <span className="old" style={{ color: "#6E6E76", fontSize: "1rem", position: "relative", display: "inline-block" }}>R$ 247</span>
              <div className="price" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "2.6rem", margin: "4px 0 2px" }}>R$ <span data-count="167">0</span><small style={{ fontSize: "1rem", fontWeight: 600, color: "#A0A0A8" }}>/mês</small></div>
              <ul className="stagger" style={{ listStyle: "none", margin: "24px 0 28px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
                {["Minerador completo","Buscas ilimitadas","Todas as ferramentas","Gerador IA de titulos","Gerador IA de ideias","Criar Persona","Gerar Script com IA","Templates de Video","Editor de Video","Comunidade VIP","Suporte prioritario"].map((f,i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: ".9rem", color: "#d6d6dc" }}><svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3}><path className="ck" d="M4 12l5 5L20 6" /></svg>{f}</li>
                ))}
              </ul>
              <a href={CHECKOUT_MENSAL} className="btn btn-ghost" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: "1rem", padding: "16px 32px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", border: "1px solid #26262B", color: "#FFFFFF", background: "rgba(20,20,23,.5)", width: "100%" }}>Começar Agora</a>
            </div>
            {/* Vitalício */}
            <div className="plan vip rv tilt-card" data-dir="right" style={{ border: "1px solid rgba(244,84,30,.55)", transform: "scale(1.02)", zIndex: 2, background: "linear-gradient(180deg,rgba(244,84,30,.06),#141417 30%)", borderRadius: 20, padding: "34px 30px", display: "flex", flexDirection: "column", position: "relative" }}>
              <span className="ribbon" style={{ position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".06em", color: "#fff", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", padding: "7px 18px", borderRadius: 99, boxShadow: "0 6px 20px rgba(244,84,30,.4)" }}>OFERTA DE LANÇAMENTO — ENCERRANDO EM BREVE</span>
              <h3 style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "1.35rem" }}>Acesso Vitalício<span className="badge" style={{ display: "inline-block", fontSize: ".68rem", fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", padding: "4px 11px", borderRadius: 99, marginLeft: 10, verticalAlign: "middle" }}>MAIS POPULAR</span></h3>
              <p className="tag" style={{ fontSize: ".83rem", color: "#A0A0A8", margin: "6px 0 20px" }}>Garanta agora antes do preço voltar para R$ 497</p>
              <span className="old" style={{ color: "#6E6E76", fontSize: "1rem", position: "relative", display: "inline-block" }}>R$ 497</span>
              <div className="price glow-num" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: "2.6rem", margin: "4px 0 2px", color: "#FF7A45", textShadow: "0 0 24px rgba(244,84,30,.55)" }}>R$ <span data-count="267">0</span></div>
              <span className="pill-pay" style={{ display: "inline-block", fontSize: ".82rem", color: "#ffb597", border: "1px solid rgba(244,84,30,.4)", background: "rgba(244,84,30,.08)", borderRadius: 99, padding: "6px 14px", margin: "10px 0 4px" }}>ou <b>12x de R$ 27,61</b> no cartão</span>
              <span className="sub-line" style={{ fontSize: ".82rem", color: "#A0A0A8" }}>Pagamento único — acesso para sempre</span>
              <span className="vagas" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: ".85rem", fontWeight: 600, color: "#ffb597", border: "1px solid rgba(244,84,30,.45)", borderRadius: 99, padding: 10, margin: "16px 0 4px", animation: "heart 1.5s ease-in-out infinite" }}>⚡ Apenas 10 vagas restantes neste preço</span>
              <ul className="stagger" style={{ listStyle: "none", margin: "24px 0 28px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
                {["Minerador completo","Buscas ilimitadas","Todas as ferramentas","Gerador IA de titulos","Gerador IA de ideias","Criar Persona","Gerar Script com IA","Templates de Video","Editor de Video","Comunidade VIP","Suporte prioritario"].map((f,i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: ".9rem", color: "#d6d6dc" }}><svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3}><path className="ck" d="M4 12l5 5L20 6" /></svg>{f}</li>
                ))}
              </ul>
              <a href={CHECKOUT_VITALICIO} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: "1rem", padding: "16px 32px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(244,84,30,.35)", width: "100%" }}>Quero escalar agora <span className="arr">→</span></a>
              <p className="under-cta" style={{ textAlign: "center", fontSize: ".78rem", color: "#6E6E76", marginTop: 12 }}>💳 Parcelamento disponível — consulte no checkout</p>
            </div>
          </div>
          <div className="trust-row rv" data-dir="up" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 34, color: "#A0A0A8", fontSize: ".88rem", flexWrap: "wrap" }}>
            <span>🔒 Pagamento 100% seguro</span>
            <span className="icons" style={{ display: "flex", gap: 10, opacity: .55 }}>
              <svg width={30} height={18} viewBox="0 0 40 24" fill="#6E6E76"><rect width={40} height={24} rx={4} fill="none" stroke="#3a3a42" /><text x={20} y={16} fontSize={9} textAnchor="middle" fill="#8a8a92" fontFamily="Arial">PIX</text></svg>
              <svg width={30} height={18} viewBox="0 0 40 24" fill="#6E6E76"><rect width={40} height={24} rx={4} fill="none" stroke="#3a3a42" /><circle cx={16} cy={12} r={6} fill="#55555e" /><circle cx={24} cy={12} r={6} fill="#3a3a42" /></svg>
              <svg width={30} height={18} viewBox="0 0 40 24" fill="#6E6E76"><rect width={40} height={24} rx={4} fill="none" stroke="#3a3a42" /><rect x={6} y={10} width={28} height={4} fill="#55555e" /></svg>
            </span>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ GUARANTEE ═══ */}
      <section id="garantia" style={{ padding: "90px 0", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="box tilt-card" style={{ display: "flex", alignItems: "center", gap: "clamp(26px,5vw,60px)", background: "#141417", border: "1px solid #26262B", borderRadius: 20, padding: "clamp(30px,5vw,54px)", maxWidth: 860, margin: "0 auto" }}>
            <div className="seal rv" data-dir="zoom" style={{ flex: "none", width: "clamp(130px,18vw,170px)", aspectRatio: 1, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Sora',sans-serif", position: "relative", background: "radial-gradient(circle at 50% 35%,#1d1d22,#101014)" }}><b style={{ fontSize: "2rem", color: "#FF7A45" }}>7 DIAS</b><span style={{ fontSize: ".8rem", letterSpacing: ".2em", color: "#A0A0A8" }}>GARANTIA</span></div>
            <div>
              <h2 className="rv" data-dir="right" style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "clamp(1.4rem,3vw,1.9rem)", marginBottom: 12 }}>Risco zero: garantia incondicional de 7 dias</h2>
              <p className="rv" data-dir="right" style={{ color: "#A0A0A8", fontSize: ".95rem" }}>Teste a plataforma por 7 dias. Se não fizer sentido para você, devolvemos 100% do valor — sem perguntas e sem burocracia.</p>
              <p className="last rv" data-dir="right" style={{ marginTop: 14, color: "#FFFFFF", fontWeight: 600 }}>O único cenário sem retorno é não investir.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FAQ ═══ */}
      <section id="faq" style={{ padding: "90px 0", position: "relative" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="sec-head" style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="pill rv" data-dir="down" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: ".8rem", fontWeight: 500, color: "#A0A0A8", border: "1px solid #26262B", background: "rgba(20,20,23,.6)", padding: "8px 18px", borderRadius: 99 }}><span className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4541E", boxShadow: "0 0 8px #F4541E" }} />Dúvidas frequentes</span>
            <h2 className="rv" data-dir="up" style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "clamp(1.7rem,3.6vw,2.5rem)", fontWeight: 700, marginTop: 18 }}>Perguntas e respostas.</h2>
          </div>
          <div className="list stagger" style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { q: "Preciso ja ser afiliado Shopee?", a: "Nao! A UpShopee foi feita tanto para quem ja e afiliado quanto para quem nunca vendeu. A plataforma e a comunidade te guiam desde o primeiro passo." },
              { q: "Funciona no celular?", a: "Sim. A plataforma funciona direto do navegador, tanto no celular quanto no computador — sem precisar instalar nada." },
              { q: "E seguro?", a: "Sim. O pagamento e processado por plataforma segura com criptografia, e voce ainda conta com 7 dias de garantia incondicional." },
              { q: "Como recebo o acesso?", a: "Imediatamente apos a confirmacao do pagamento, voce recebe o acesso por e-mail e ja pode comecar a usar todas as ferramentas." },
              { q: "O vitalicio tem mensalidade?", a: "Nao. O Acesso Vitalicio e um pagamento unico de R$ 267 — voce paga uma vez e usa para sempre, incluindo atualizacoes." },
              { q: "Posso parcelar?", a: "Sim! O Acesso Vitalicio pode ser parcelado em ate 12x de R$ 27,61 no cartao de credito." },
              { q: "E se eu nao gostar?", a: "Voce tem 7 dias de garantia incondicional. Basta pedir o reembolso dentro desse prazo e devolvemos 100% do valor, sem perguntas." },
            ].map((item, i) => (
              <details className="faq-item rv tilt-card" data-dir="up" key={i} style={{ background: "#141417", border: "1px solid #26262B", borderRadius: 14, overflow: "hidden" }}>
                <summary style={{ listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "20px 24px", fontWeight: 600, fontSize: ".98rem", cursor: "pointer" }}>{item.q}<svg className="chev" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ flex: "none", transition: "transform .35s ease", color: "#F4541E" }}><path d="M6 9l6 6 6-6" /></svg></summary>
                <div className="faq-a" style={{ padding: "0 24px", maxHeight: 0, overflow: "hidden", color: "#A0A0A8", fontSize: ".92rem" }}>{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FINAL CTA ═══ */}
      <section id="final" style={{ padding: "130px 0 120px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <img src="/brand/logo.png" alt="UpShopee" className="rv" data-dir="zoom" style={{ width: 64, margin: "0 auto 26px" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <h2 className="rv" data-dir="up" style={{ fontFamily: "'Sora',sans-serif", lineHeight: 1.15, letterSpacing: "-.02em", fontSize: "clamp(1.9rem,4.4vw,3rem)", fontWeight: 800, marginBottom: 30 }}>Invista uma vez.<br /><span className="grad-text" style={{ background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Lucre sempre.</span></h2>
          <a href={CHECKOUT_VITALICIO} className="btn btn-primary rv" data-dir="up" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: "1rem", padding: "16px 32px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(244,84,30,.35)" }}>Quero meu acesso vitalicio <span className="arr">→</span></a>
          <p className="micro rv" data-dir="up" style={{ marginTop: 18, fontSize: ".83rem", color: "#A0A0A8" }}>✓ Garantia incondicional de 7 dias&nbsp;&nbsp;·&nbsp;&nbsp;🔒 Pagamento 100% seguro</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: "1px solid #26262B", padding: "44px 0 110px", background: "#101014" }}>
        <div className="wrap" style={{ width: "min(1120px, 92%)", margin: "0 auto" }}>
          <div className="foot" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 18, color: "#6E6E76", fontSize: ".82rem" }}>
            <a href="#inicio" className="brand" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: "1.05rem" }}><img src="/brand/logo.png" alt="" style={{ width: 26, height: 26, objectFit: "contain" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />UpShopee</a>
            <div className="links" style={{ display: "flex", gap: 20 }}><a href="#">Termos de Uso</a><a href="#">Privacidade</a></div>
            <span>© 2026 UpShopee. Todos os direitos reservados.</span>
          </div>
          <p className="disclaimer" style={{ marginTop: 22, fontSize: ".75rem", color: "#6E6E76", maxWidth: 640, lineHeight: 1.55 }}>Resultados podem variar de acordo com a dedicação e o contexto de cada afiliado. Os valores citados não constituem promessa de ganhos. A UpShopee é uma ferramenta independente e não possui vínculo oficial com a Shopee.</p>
        </div>
      </footer>

      {/* ═══ STICKY MOBILE CTA ═══ */}
      <div id="sticky" className={stickyShow ? "show" : ""} style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 800, display: "none", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(16,16,20,.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(244,84,30,.4)", borderRadius: 16, padding: "12px 14px 12px 18px", transform: stickyShow ? "translateY(0)" : "translateY(140%)", transition: "transform .45s cubic-bezier(.34,1.45,.64,1)", boxShadow: "0 -8px 30px rgba(0,0,0,.5)" }}>
        <span className="p" style={{ fontSize: ".85rem", fontWeight: 600 }}>Vitalício por <b style={{ color: "#FF7A45" }}>R$ 267</b></span>
        <a href={CHECKOUT_VITALICIO} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: ".85rem", padding: "11px 18px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(244,84,30,.35)", animation: "none" }}>Garantir <span className="arr">→</span></a>
      </div>

      {/* ═══ EXIT POPUP ═══ */}
      <div id="exit" role="dialog" aria-modal="true" aria-labelledby="exitTitle" className={exitOpen ? "open" : ""} style={{ position: "fixed", inset: 0, zIndex: 1100, display: exitOpen ? "flex" : "none", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="bg" data-close onClick={closeExit} style={{ position: "absolute", inset: 0, background: "rgba(5,5,7,.72)", backdropFilter: "blur(6px)", opacity: exitOpen ? 1 : 0, transition: "opacity .3s ease" }} />
        <div className="card" style={{ position: "relative", width: "min(420px, 100%)", background: "#141417", border: "1px solid rgba(244,84,30,.5)", borderRadius: 20, padding: "38px 32px", textAlign: "center", transform: exitOpen ? "scale(1)" : "scale(.9)", opacity: exitOpen ? 1 : 0, transition: "all .4s cubic-bezier(.34,1.45,.64,1)", boxShadow: "0 30px 90px rgba(0,0,0,.6),0 0 50px rgba(244,84,30,.15)" }}>
          <button className="close" data-close onClick={closeExit} aria-label="Fechar" style={{ position: "absolute", top: 14, right: 16, color: "#6E6E76", fontSize: "1.3rem", lineHeight: 1, padding: 6, background: "none", border: "none", cursor: "pointer" }}>✕</button>
          <img src="/brand/logo.png" alt="" style={{ width: 48, margin: "0 auto 18px" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <h3 id="exitTitle" style={{ fontFamily: "'Sora',sans-serif", fontSize: "1.35rem", marginBottom: 12, color: "#FFFFFF" }}>Espera — antes de sair…</h3>
          <p style={{ color: "#A0A0A8", fontSize: ".92rem", marginBottom: 24 }}>Você tem <b style={{ color: "#fff" }}>7 dias de garantia incondicional</b>. O risco é zero: teste a UpShopee e, se não fizer sentido, devolvemos 100% do valor.</p>
          <a href={CHECKOUT_VITALICIO} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: "1rem", padding: "16px 32px", borderRadius: 99, transition: "transform .2s ease,box-shadow .25s ease", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#F4541E 0%,#FF7A45 100%)", color: "#fff", boxShadow: "0 8px 30px rgba(244,84,30,.35)", width: "100%" }}>Quero testar sem risco <span className="arr">→</span></a>
          <a href="#" className="dismiss" data-close onClick={(e) => { e.preventDefault(); closeExit(); }} style={{ display: "block", marginTop: 16, fontSize: ".83rem", color: "#6E6E76" }}>Não, prefiro sair</a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
         ALL CSS — 2 original blocks + new animations
         ═══════════════════════════════════════════════ */}
      <style>{`
:root{--bg:#0A0A0C;--surface:#141417;--surface-2:#101014;--border:#26262B;--border-warm:#3a2a22;--accent:#F4541E;--accent-2:#FF7A45;--grad:linear-gradient(135deg,#F4541E 0%,#FF7A45 100%);--text:#FFFFFF;--muted:#A0A0A8;--muted-2:#6E6E76;--radius:20px;--radius-s:14px;--snap:cubic-bezier(.34,1.45,.64,1);--ease:cubic-bezier(.22,1,.36,1);--font-d:'Sora',sans-serif;--font-b:'Inter',sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font-b);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
::selection{background:rgba(244,84,30,.35);color:#fff}
.wrap{width:min(1120px,92%);margin:0 auto}
h1,h2,h3{font-family:var(--font-d);line-height:1.15;letter-spacing:-.02em}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

/* reveal / assemble */
.rv{opacity:0;will-change:transform,opacity}
.rv[data-dir="up"]{transform:translateY(36px)}
.rv[data-dir="down"]{transform:translateY(-36px)}
.rv[data-dir="left"]{transform:translateX(-52px)}
.rv[data-dir="right"]{transform:translateX(52px)}
.rv[data-dir="zoom"]{transform:scale(.9)}
.rv.in{opacity:1;transform:none;transition:transform .65s var(--snap),opacity .5s ease}
.rv.in.flash{animation:borderFlash .7s ease .45s}
@keyframes borderFlash{0%{box-shadow:0 0 0 1px rgba(244,84,30,0)}45%{box-shadow:0 0 0 1px rgba(244,84,30,.8),0 0 24px rgba(244,84,30,.25)}100%{box-shadow:0 0 0 1px rgba(244,84,30,0)}}
.w{display:inline-block;opacity:0;transform:translateY(20px);filter:blur(6px)}
.in .w{opacity:1;transform:none;filter:blur(0);transition:all .6s var(--ease)}

/* progress bar */
#progress{position:fixed;top:0;left:0;height:3px;background:var(--grad);z-index:1000;border-radius:0 2px 2px 0}

/* nav */
nav{position:fixed;top:0;left:0;right:0;z-index:900;padding:14px 0;transition:all .35s ease;background:rgba(10,10,12,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid transparent}
nav.scrolled{border-bottom-color:var(--border);background:rgba(10,10,12,.82)}
.nav-in{width:min(1120px,92%);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--font-d);font-weight:700;font-size:1.05rem}
.brand img{width:34px;height:34px;object-fit:contain}
.nav-cta{font-size:.85rem;font-weight:600;padding:10px 20px;border-radius:99px;background:var(--grad);color:#fff;transition:all .25s ease;box-shadow:0 4px 18px rgba(244,84,30,.3)}
.nav-cta:hover{transform:translateY(-2px);box-shadow:0 6px 26px rgba(244,84,30,.45)}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:1rem;padding:16px 32px;border-radius:99px;transition:transform .2s ease,box-shadow .25s ease;position:relative;overflow:hidden}
.btn:active{transform:scale(.98)}
.btn-primary{background:var(--grad);color:#fff;box-shadow:0 8px 30px rgba(244,84,30,.35);animation:glowPulse 2.4s ease-in-out infinite}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(244,84,30,.55)}
.btn-primary::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);animation:shine 6s ease-in-out infinite}
@keyframes shine{0%,78%{left:-80%}92%,100%{left:130%}}
@keyframes glowPulse{0%,100%{box-shadow:0 8px 30px rgba(244,84,30,.35)}50%{box-shadow:0 8px 42px rgba(244,84,30,.55)}}
.btn-ghost{border:1px solid var(--border);color:var(--text);background:rgba(20,20,23,.5)}
.btn-ghost:hover{border-color:var(--accent);background:rgba(244,84,30,.08);transform:translateY(-2px)}
.btn .arr{transition:transform .25s ease}
.btn:hover .arr{transform:translateX(4px)}

/* hero */
.hero{position:relative;padding:170px 0 40px;text-align:center;overflow:hidden}
.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 70% 55% at 50% 0%,#000 40%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse 70% 55% at 50% 0%,#000 40%,transparent 100%);pointer-events:none}
.pill{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:500;color:var(--muted);border:1px solid var(--border);background:rgba(20,20,23,.6);padding:8px 18px;border-radius:99px}
.pill .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent)}
.hero h1{font-size:clamp(2.1rem,5.4vw,3.9rem);font-weight:800;margin:26px auto 20px;max-width:820px}
.grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero .sub{color:var(--muted);font-size:1.08rem;max-width:600px;margin:0 auto 34px}
.hero-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.hero-micro{margin-top:18px;font-size:.82rem;color:var(--muted-2)}
.hero-micro b{color:var(--muted)}
.chevron{margin:44px auto 0;width:26px;height:26px;border-right:2px solid var(--muted-2);border-bottom:2px solid var(--muted-2);transform:rotate(45deg);animation:bounce 1.8s ease-in-out infinite}
@keyframes bounce{0%,100%{transform:rotate(45deg) translate(0,0)}50%{transform:rotate(45deg) translate(6px,6px)}}

/* floating orbs */
.float-orb{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(244,84,30,0.15),transparent);pointer-events:none}
.float-orb:nth-child(1){width:200px;height:200px;top:10%;left:5%;animation:orbFloat 8s ease-in-out infinite}
.float-orb:nth-child(2){width:140px;height:140px;top:60%;right:8%;animation:orbFloat 6.5s 1s ease-in-out infinite}
.float-orb:nth-child(3){width:100px;height:100px;bottom:20%;left:30%;animation:orbFloat 7.2s 2s ease-in-out infinite}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(20px,-15px) scale(1.08)}66%{transform:translate(-10px,10px) scale(.94)}}

/* vsl */
#vsl{padding:30px 0 90px}
.vsl-panel{position:relative;max-width:960px;margin:0 auto;aspect-ratio:16/9;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(244,84,30,.12);overflow:hidden;will-change:transform,opacity}
.vsl-panel::before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.05) 50%,transparent 70%);transform:translateX(-100%);animation:sweep 7s ease-in-out infinite;pointer-events:none;z-index:3}
@keyframes sweep{0%,60%{transform:translateX(-100%)}85%,100%{transform:translateX(100%)}}
.vsl-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(244,84,30,.1),transparent 65%)}
.vsl-micro{text-align:center;margin-top:20px;font-size:.82rem;color:var(--muted-2)}

/* section shell */
section{padding:90px 0;position:relative}
.sec-head{text-align:center;margin-bottom:56px}
.sec-head h2{font-size:clamp(1.7rem,3.6vw,2.5rem);font-weight:700;margin-top:18px}
.sec-head p{color:var(--muted);max-width:560px;margin:14px auto 0}

/* trust strip */
#confianca{padding:36px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface-2)}
.counters{display:flex;justify-content:center;gap:clamp(24px,6vw,80px);flex-wrap:wrap}
.counter{text-align:center}
.counter .num{font-family:var(--font-d);font-weight:800;font-size:clamp(1.6rem,3.4vw,2.3rem);color:var(--text)}
.counter .num::before{content:'+'}
.counter .lbl{font-size:.83rem;color:var(--muted);display:flex;align-items:center;gap:6px;justify-content:center}
.counter .tick{width:14px;height:14px;opacity:0;transform:scale(0)}
.counter.done .tick{opacity:1;transform:scale(1);transition:all .35s var(--snap)}

/* bento features */
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}
.b-card{grid-column:span 2;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px;display:flex;flex-direction:column;gap:8px;transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;overflow:hidden;position:relative}
.b-card.wide{grid-column:span 3}
.b-card:hover{transform:translateY(-4px);border-color:var(--border-warm);box-shadow:0 14px 40px rgba(0,0,0,.4),0 0 24px rgba(244,84,30,.08)}
.b-card h3{font-size:1.06rem;font-weight:700;margin-top:14px}
.b-card p{font-size:.88rem;color:var(--muted)}
.b-visual{height:150px;border-radius:var(--radius-s);background:var(--surface-2);border:1px solid var(--border);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.mine-bars{display:flex;align-items:flex-end;gap:10px;height:96px}
.mine-bars i{width:20px;border-radius:6px 6px 3px 3px;background:#2a2a30;animation:barGrow 3.4s ease-in-out infinite;transform-origin:bottom}
.mine-bars i:nth-child(1){height:38%;animation-delay:0s}
.mine-bars i:nth-child(2){height:56%;animation-delay:.15s}
.mine-bars i:nth-child(3){height:44%;animation-delay:.3s}
.mine-bars i.hot{height:88%;background:var(--grad);box-shadow:0 0 18px rgba(244,84,30,.45);animation-delay:.45s}
.mine-bars i:nth-child(5){height:62%;animation-delay:.6s}
@keyframes barGrow{0%{transform:scaleY(.15)}18%,80%{transform:scaleY(1)}100%{transform:scaleY(.15)}}
.mine-tag{position:absolute;top:14px;right:14px;font-size:.68rem;font-weight:700;color:#fff;background:var(--grad);padding:4px 10px;border-radius:99px;animation:tagPop 3.4s ease-in-out infinite}
@keyframes tagPop{0%,18%{opacity:0;transform:scale(.6)}30%,80%{opacity:1;transform:scale(1)}92%,100%{opacity:0;transform:scale(.6)}}
.ai-lines{width:82%;display:flex;flex-direction:column;gap:10px}
.ai-lines i{height:10px;border-radius:6px;background:#2a2a30;overflow:hidden;position:relative}
.ai-lines i::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(244,84,30,.55),rgba(255,122,69,.55));transform:scaleX(0);transform-origin:left;animation:typeLine 4.2s ease-in-out infinite}
.ai-lines i:nth-child(1)::after{animation-delay:0s}
.ai-lines i:nth-child(2)::after{animation-delay:.5s}
.ai-lines i:nth-child(3)::after{animation-delay:1s}
@keyframes typeLine{0%{transform:scaleX(0)}30%,80%{transform:scaleX(1)}100%{transform:scaleX(0)}}
.vid-mini{width:78%;aspect-ratio:16/9;border-radius:10px;background:#1a1a1f;border:1px solid var(--border);position:relative;display:flex;align-items:center;justify-content:center}
.vid-mini .play{width:40px;height:40px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;animation:breathe 2s ease-in-out infinite;box-shadow:0 0 22px rgba(244,84,30,.4)}
.vid-mini .play::after{content:'';border-left:12px solid #fff;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px}
.vid-mini .prog{position:absolute;bottom:10px;left:10px;right:10px;height:4px;border-radius:4px;background:#2a2a30;overflow:hidden}
.vid-mini .prog::after{content:'';display:block;height:100%;background:var(--grad);animation:fillProg 5s linear infinite}
@keyframes fillProg{from{width:0}to{width:100%}}
.search-pill{width:84%;display:flex;align-items:center;gap:10px;background:#1a1a1f;border:1px solid var(--border);border-radius:99px;padding:12px 18px;font-size:.85rem;color:var(--muted)}
.search-pill svg{flex:none}
.cycle{position:relative;height:1.2em;flex:1;overflow:hidden}
.cycle1,.cycle2,.cycle3{position:absolute;left:0;top:0;opacity:0;animation:cycleTerm 7.5s infinite}
.cycle2{animation-delay:2.5s}
.cycle3{animation-delay:5s}
@keyframes cycleTerm{0%{opacity:0;transform:translateY(8px)}5%,28%{opacity:1;transform:none}33%,100%{opacity:0;transform:translateY(-8px)}}
.bubbles{width:82%;display:flex;flex-direction:column;gap:8px}
.bubbles i{height:26px;border-radius:12px;background:#22222a;opacity:0;animation:bubIn 5.2s ease-in-out infinite}
.bubbles i:nth-child(1){width:62%;animation-delay:0s}
.bubbles i:nth-child(2){width:80%;align-self:flex-end;background:rgba(244,84,30,.3);animation-delay:.7s}
.bubbles i:nth-child(3){width:52%;animation-delay:1.4s}
@keyframes bubIn{0%{opacity:0;transform:translateY(10px)}14%,82%{opacity:1;transform:none}94%,100%{opacity:0}}

/* how it works */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;position:relative}
.step{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:30px 26px;position:relative;z-index:2}
.step .n{width:46px;height:46px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:700;color:var(--muted);transition:all .5s ease;background:var(--surface-2)}
.step.lit .n{border-color:var(--accent);color:#fff;background:var(--grad);box-shadow:0 0 22px rgba(244,84,30,.45);animation:pulse1 .7s ease}
@keyframes pulse1{0%{transform:scale(1)}45%{transform:scale(1.18)}100%{transform:scale(1)}}
.step h3{font-size:1.05rem;margin:16px 0 8px}
.step p{font-size:.9rem;color:var(--muted)}
.line-wrap{position:absolute;top:53px;left:12%;right:12%;height:2px;z-index:1}
.line-wrap svg{width:100%;height:100%;overflow:visible}
.line-wrap path{stroke:url(#lineGrad);stroke-width:2;fill:none;stroke-dasharray:1000;stroke-dashoffset:1000;transition:stroke-dashoffset 1.8s ease}
.line-wrap.draw path{stroke-dashoffset:0}

/* math */
#contas .panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:clamp(30px,5vw,60px);text-align:center;position:relative;overflow:hidden}
#contas .panel::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(244,84,30,.08),transparent 60%);pointer-events:none}
.math-line{font-family:var(--font-d);font-size:clamp(1.2rem,2.8vw,1.8rem);font-weight:700;max-width:720px;margin:0 auto 40px}
.strike{position:relative;white-space:nowrap}
.strike::after{content:'';position:absolute;left:-3%;top:52%;height:3px;width:0;background:var(--accent);border-radius:2px;transition:width .5s ease .4s}
.strike.cut::after{width:106%}
.glow-num{color:var(--accent-2);text-shadow:0 0 24px rgba(244,84,30,.55)}
.bars{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:18px;text-align:left}
.bar-row .lab{font-size:.85rem;color:var(--muted);margin-bottom:7px;display:flex;justify-content:space-between}
.bar{height:16px;border-radius:99px;background:#222228;overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px;width:0;transition:width 1.1s var(--ease) .2s}
.bar i.gray{background:#3a3a42}
.bar i.hot{background:var(--grad);box-shadow:0 0 18px rgba(244,84,30,.4)}
.math-close{margin-top:34px;color:var(--muted);font-size:1rem;max-width:560px;margin-left:auto;margin-right:auto}
.math-close b{color:var(--text)}

/* pricing */
#planos{padding-top:100px}
.plans{display:grid;grid-template-columns:1fr 1.06fr;gap:26px;align-items:stretch;max-width:920px;margin:0 auto}
.plan{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:34px 30px;display:flex;flex-direction:column;position:relative}
.plan .tag{font-size:.83rem;color:var(--muted);margin:6px 0 20px}
.plan h3{font-size:1.35rem}
.old{color:var(--muted-2);font-size:1rem;position:relative;display:inline-block}
.old::after{content:'';position:absolute;left:-3%;top:52%;height:2px;width:0;background:var(--accent);transition:width .4s ease .3s}
.old.cut::after{width:106%}
.price{font-family:var(--font-d);font-weight:800;font-size:2.6rem;margin:4px 0 2px}
.price small{font-size:1rem;font-weight:600;color:var(--muted)}
.plan ul{list-style:none;margin:24px 0 28px;display:flex;flex-direction:column;gap:11px;flex:1}
.plan li{display:flex;gap:10px;align-items:center;font-size:.9rem;color:#d6d6dc}
.plan li svg{flex:none}
.plan li .ck{stroke-dasharray:24;stroke-dashoffset:24}
.plan.in li .ck{animation:drawCk .45s ease forwards}
@keyframes drawCk{to{stroke-dashoffset:0}}
.plan .btn{width:100%}
.vip{border:1px solid rgba(244,84,30,.55);transform:scale(1.02);z-index:2;background:linear-gradient(180deg,rgba(244,84,30,.06),var(--surface) 30%)}
.vip::before{content:'';position:absolute;inset:-1px;border-radius:var(--radius);padding:1px;background:linear-gradient(120deg,#F4541E,#FF7A45,#F4541E,#7a2c12,#F4541E);background-size:300% 300%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:march 5s linear infinite;pointer-events:none}
@keyframes march{0%{background-position:0% 50%}100%{background-position:300% 50%}}
.ribbon{position:absolute;top:-15px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:.72rem;font-weight:700;letter-spacing:.06em;color:#fff;background:var(--grad);padding:7px 18px;border-radius:99px;box-shadow:0 6px 20px rgba(244,84,30,.4)}

/* guarantee */
.seal b{font-size:2rem;color:var(--accent-2)}
.seal span{font-size:.8rem;letter-spacing:.2em;color:var(--muted)}
#garantia h2{font-size:clamp(1.4rem,3vw,1.9rem);margin-bottom:12px}
#garantia p{color:var(--muted);font-size:.95rem}
#garantia .last{margin-top:14px;color:var(--text);font-weight:600}
.seal{flex:none;width:clamp(130px,18vw,170px);aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--font-d);position:relative;background:radial-gradient(circle at 50% 35%,#1d1d22,#101014)}
.seal::before{content:'';position:absolute;inset:-3px;border-radius:50%;padding:3px;background:conic-gradient(#F4541E,#FF7A45,#7a2c12,#F4541E);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:spinRing 9s linear infinite}
@keyframes spinRing{to{transform:rotate(360deg)}}

/* faq */
#faq .list{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.faq-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-s);overflow:hidden;transition:border-color .3s ease}
.faq-item[open]{border-color:rgba(244,84,30,.5)}
.faq-item summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;font-weight:600;font-size:.98rem;cursor:pointer}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item .chev{flex:none;transition:transform .35s ease;color:var(--accent)}
.faq-item[open] .chev{transform:rotate(180deg)}
.faq-a{padding:0 24px;max-height:0;overflow:hidden;transition:max-height .4s var(--ease),padding .4s ease;color:var(--muted);font-size:.92rem}
.faq-item[open] .faq-a{max-height:220px;padding:0 24px 22px}

/* final cta */
#final{padding:130px 0 120px;text-align:center;position:relative;overflow:hidden}
#final::before{content:'';position:absolute;left:50%;bottom:-420px;transform:translateX(-50%);width:1200px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(244,84,30,.28),rgba(244,84,30,.07) 55%,transparent 75%);pointer-events:none}

/* footer */
footer{border-top:1px solid var(--border);padding:44px 0 110px;background:var(--surface-2)}

/* sticky mobile */
#sticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:800;display:none;align-items:center;justify-content:space-between;gap:12px;background:rgba(16,16,20,.92);backdrop-filter:blur(12px);border:1px solid rgba(244,84,30,.4);border-radius:16px;padding:12px 14px 12px 18px;transform:translateY(140%);transition:transform .45s var(--snap);box-shadow:0 -8px 30px rgba(0,0,0,.5)}
#sticky.show{transform:translateY(0)}
@media(max-width:768px){#sticky{display:flex}}

/* exit popup */
#exit{position:fixed;inset:0;z-index:1100;display:none;align-items:center;justify-content:center;padding:20px}
#exit.open{display:flex}

/* new animations */
.tilt-card{transition:transform .3s ease,box-shadow .3s ease}
.tilt-card:hover{transform:perspective(800px) rotateY(2deg) rotateX(-1deg) translateY(-6px)}
.section-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(244,84,30,.3),transparent);margin:0 auto;width:60%;animation:dividerPulse 3s ease-in-out infinite}
@keyframes dividerPulse{0%,100%{opacity:.3}50%{opacity:.8}}
.stagger>*{opacity:0;transform:translateY(20px)}.stagger.in>*{opacity:1;transform:none}
.stagger.in>:nth-child(1){transition:all .5s ease 0s}.stagger.in>:nth-child(2){transition:all .5s ease .08s}.stagger.in>:nth-child(3){transition:all .5s ease .16s}.stagger.in>:nth-child(4){transition:all .5s ease .24s}.stagger.in>:nth-child(5){transition:all .5s ease .32s}.stagger.in>:nth-child(6){transition:all .5s ease .40s}.stagger.in>:nth-child(7){transition:all .5s ease .48s}.stagger.in>:nth-child(8){transition:all .5s ease .56s}.stagger.in>:nth-child(9){transition:all .5s ease .64s}.stagger.in>:nth-child(10){transition:all .5s ease .72s}.stagger.in>:nth-child(11){transition:all .5s ease .80s}
@keyframes sparkTrail{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(30px,-20px) scale(0);opacity:0}}

/* breathe (used in vsl-ph + video) */
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}

/* cursor blink (IA) */
.cursor{width:2px;height:16px;background:var(--accent);animation:blink 1s steps(1) infinite;position:absolute;bottom:20px;right:22%}
@keyframes blink{50%{opacity:0}}

/* responsive */
@media(max-width:900px){
  .bento{grid-template-columns:repeat(2,1fr)}
  .b-card,.b-card.wide{grid-column:span 1}
  .steps{grid-template-columns:1fr}
  .line-wrap{display:none}
  .plans{grid-template-columns:1fr;max-width:480px}
  .plans .vip{order:-1;transform:none}
  #garantia .box{flex-direction:column;text-align:center}
}
@media(max-width:560px){
  .bento{grid-template-columns:1fr}
  .hero{padding-top:140px}
  section{padding:64px 0}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:opacity .3s ease!important}
  .rv{transform:none!important}
  .w{transform:none;filter:none}
  html{scroll-behavior:auto}
}
`}</style>
    </>
  );
}
