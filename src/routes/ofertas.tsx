import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/ofertas")({ component: OfertasPage });

const MENSAL = "https://go.ironpayapp.com.br/knwcyeiala";
const VITALICIO = "https://go.ironpayapp.com.br/jxzfsyhoci";

/* ── Counter animation ── */
const fmt = new Intl.NumberFormat("pt-BR");
function animateCounter(node: HTMLElement, target: number, duration: number, done?: () => void) {
  if (!node || node.dataset.counted === "1") { done?.(); return; }
  node.dataset.counted = "1";
  let start: number | null = null;
  (function tick(ts: number) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    node.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick as any);
    else done?.();
  })(0);
}

function checkIcon() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3}><path className="ck" d="M4 12l5 5L20 6" /></svg>;
}
function chevronDown() {
  return <svg className="chev" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>;
}

const FEATURES = [
  "Minerador completo","Buscas ilimitadas","Todas as ferramentas","Gerador IA de títulos",
  "Gerador IA de ideias","Criar Persona","Gerar Script com IA","Templates de Vídeo",
  "Editor de Vídeo","Comunidade VIP","Suporte prioritário",
];

const FAQ = [
  { q:"Preciso já ser afiliado Shopee?", a:"Não! A UpShopee foi feita tanto para quem já é afiliado quanto para quem nunca vendeu. A plataforma e a comunidade te guiam desde o primeiro passo." },
  { q:"Funciona no celular?", a:"Sim. A plataforma funciona direto do navegador, tanto no celular quanto no computador — sem precisar instalar nada." },
  { q:"É seguro?", a:"Sim. O pagamento é processado por plataforma segura com criptografia, e você ainda conta com 7 dias de garantia incondicional." },
  { q:"Como recebo o acesso?", a:"Imediatamente após a confirmação do pagamento, você recebe o acesso por e-mail e já pode começar a usar todas as ferramentas." },
  { q:"O vitalício tem mensalidade?", a:"Não. O Acesso Vitalício é um pagamento único de R$ 267 — você paga uma vez e usa para sempre, incluindo atualizações." },
  { q:"Posso parcelar?", a:"Sim! O Acesso Vitalício pode ser parcelado em até 12x de R$ 27,61 no cartão de crédito." },
  { q:"E se eu não gostar?", a:"Você tem 7 dias de garantia incondicional. Basta pedir o reembolso dentro desse prazo e devolvemos 100% do valor, sem perguntas." },
];

function OfertasPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const [stickyShow, setStickyShow] = useState(false);
  const vslPanelRef = useRef<HTMLDivElement>(null);

  /* ── Scroll: nav, progress, VSL rise, sticky CTA ── */
  useEffect(() => {
    const s = () => {
      const y = window.scrollY;
      setNavScrolled(y > 50);
      const h = document.documentElement.scrollHeight - innerHeight;
      setProgressWidth(h > 0 ? (y / h) * 100 : 0);
      const pnl = vslPanelRef.current;
      if (pnl) {
        const r = pnl.getBoundingClientRect();
        const p = Math.min(Math.max((innerHeight - r.top) / (innerHeight * 0.6), 0), 1);
        pnl.style.transform = `translateY(${(1-p)*110}px) scale(${0.94+0.06*p})`;
        pnl.style.opacity = String(0.2 + 0.8 * p);
      }
      if (innerWidth > 768) { setStickyShow(false); }
      else {
        const pr = document.getElementById("planos")?.getBoundingClientRect();
        const vslGone = pnl ? pnl.getBoundingClientRect().bottom < 0 : false;
        setStickyShow(vslGone && !(pr && pr.top < innerHeight && pr.bottom > 0));
      }
    };
    window.addEventListener("scroll", s, { passive: true });
    s();
    return () => window.removeEventListener("scroll", s);
  }, []);

  /* ── Reveal observer ── */
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || e.target.classList.contains("in")) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
        const el = e.target as HTMLElement;
        /* counters */
        if (el.classList.contains("counter")) {
          const n = el.querySelector(".num") as HTMLElement | null;
          if (n?.dataset.target) animateCounter(n, +n.dataset.target, 1600, () => el.classList.add("done"));
        }
        /* data-count spans */
        el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
          animateCounter(n, +(n.dataset.count || "0"), 900);
        });
        /* math panel */
        if (el.id === "mathPanel") {
          setTimeout(() => document.getElementById("strike334")?.classList.add("cut"), 1100);
          el.querySelectorAll<HTMLElement>(".bar i").forEach((b) => { if (b.dataset.w) b.style.width = b.dataset.w; });
          document.getElementById("econTag")?.classList.add("pop");
        }
        /* plan cards stripe */
        if (el.classList.contains("plan")) {
          const old = el.querySelector(".old");
          if (old) setTimeout(() => old.classList.add("cut"), 350);
        }
        /* stagger children */
        if (el.classList.contains("stagger")) {
          el.querySelectorAll(":scope > li").forEach((c, i) => {
            ((c as HTMLElement).style.transitionDelay = `${i * 0.09}s`);
          });
        }
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll(".rv, .stagger").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ── Hero load sequence ── */
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    const qs = (s: string) => document.querySelector(s) as HTMLElement | null;
    ids.push(setTimeout(() => qs('.hero .rv[data-dir="down"]')?.classList.add("in"), 100));
    ids.push(setTimeout(() => {
      const h = document.getElementById("headline");
      h?.classList.add("in");
      h?.querySelectorAll(".w").forEach((w, i) => { ((w as HTMLElement).style.transitionDelay = `${i * 0.07}s`); });
    }, 320));
    ids.push(setTimeout(() => qs(".hero .sub")?.classList.add("in"), 950));
    ids.push(setTimeout(() => {
      document.querySelectorAll(".hero-ctas .rv").forEach((b, i) => {
        setTimeout(() => b.classList.add("in"), i * 60);
      });
    }, 1080));
    ids.push(setTimeout(() => qs(".hero-micro")?.classList.add("in"), 1300));
    return () => ids.forEach(clearTimeout);
  }, []);

  /* ── How-it-works line ── */
  useEffect(() => {
    const how = document.getElementById("como-funciona");
    if (!how) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      io.disconnect();
      document.getElementById("lineWrap")?.classList.add("draw");
      document.querySelectorAll(".step").forEach((s, i) => {
        setTimeout(() => s.classList.add("lit"), 500 + i * 620);
      });
    }, { threshold: 0.35 });
    io.observe(how);
    return () => io.disconnect();
  }, []);

  /* ── FAQ accordion ── */
  useEffect(() => {
    const handlers: Array<{ s: HTMLElement; f: (e: Event) => void }> = [];
    document.querySelectorAll(".faq-item").forEach((item) => {
      const sum = item.querySelector("summary") as HTMLElement | null;
      const body = item.querySelector(".faq-a") as HTMLElement | null;
      if (!sum || !body) return;
      const fn = (e: Event) => {
        e.preventDefault();
        const d = item as HTMLDetailsElement;
        if (!d.open) { d.open = true; return; }
        body.style.maxHeight = "0"; body.style.paddingBottom = "0";
        setTimeout(() => { d.open = false; body.style.maxHeight = ""; body.style.paddingBottom = ""; }, 380);
      };
      sum.addEventListener("click", fn);
      handlers.push({ s: sum, f: fn });
    });
    return () => handlers.forEach(({ s, f }) => s.removeEventListener("click", f));
  }, []);

  /* ── Exit popup ── */
  useEffect(() => {
    const pricing = () => document.getElementById("planos");
    const inView = () => { const r = pricing()?.getBoundingClientRect(); return r ? r.top < innerHeight && r.bottom > 0 : false; };
    const open = () => {
      if (sessionStorage.getItem("exitShown") || inView()) return;
      sessionStorage.setItem("exitShown", "1");
      setExitOpen(true);
    };
    const close = () => setExitOpen(false);
    const onMouseOut = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0) open(); };
    document.addEventListener("mouseout", onMouseOut);
    window.history.pushState({ up: 1 }, "");
    const onPop = () => { open(); window.history.pushState({ up: 1 }, ""); };
    window.addEventListener("popstate", onPop);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ── Anchor offset ── */
  useEffect(() => {
    document.querySelectorAll("section, header").forEach((s) => { ((s as HTMLElement).style.scrollMarginTop = "84px"); });
  }, []);

  return (
    <>
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
#progress{position:fixed;top:0;left:0;height:3px;background:var(--grad);z-index:1000;border-radius:0 2px 2px 0}
nav{position:fixed;top:0;left:0;right:0;z-index:900;padding:14px 0;transition:all .35s ease;background:rgba(10,10,12,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid transparent}
nav.scrolled{border-bottom-color:var(--border);background:rgba(10,10,12,.82)}
.nav-in{width:min(1120px,92%);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--font-d);font-weight:700;font-size:1.05rem}
.brand img{width:34px;height:34px;object-fit:contain}
.nav-links{display:flex;gap:4px;background:rgba(20,20,23,.7);border:1px solid var(--border);padding:5px;border-radius:99px}
.nav-links a{font-size:.83rem;font-weight:500;color:var(--muted);padding:7px 15px;border-radius:99px;transition:all .25s ease}
.nav-links a:hover{color:var(--text);background:rgba(244,84,30,.14);box-shadow:0 0 14px rgba(244,84,30,.15) inset}
.nav-cta{font-size:.85rem;font-weight:600;padding:10px 20px;border-radius:99px;background:var(--grad);color:#fff;transition:all .25s ease;box-shadow:0 4px 18px rgba(244,84,30,.3)}
.nav-cta:hover{transform:translateY(-2px);box-shadow:0 6px 26px rgba(244,84,30,.45)}
@media(max-width:860px){.nav-links{display:none}}
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
.float-orb{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(244,84,30,0.15),transparent);pointer-events:none}
.float-orb:nth-child(1){width:200px;height:200px;top:10%;left:5%;animation:orbFloat 8s ease-in-out infinite}
.float-orb:nth-child(2){width:140px;height:140px;top:60%;right:8%;animation:orbFloat 6.5s 1s ease-in-out infinite}
.float-orb:nth-child(3){width:100px;height:100px;bottom:20%;left:30%;animation:orbFloat 7.2s 2s ease-in-out infinite}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(20px,-15px) scale(1.08)}66%{transform:translate(-10px,10px) scale(.94)}}
#vsl{padding:30px 0 90px}
.vsl-title{text-align:center;font-size:clamp(1.15rem,2.4vw,1.5rem);font-weight:600;color:var(--muted);margin-bottom:30px}
.vsl-title b{color:var(--text)}
.vsl-panel{position:relative;max-width:960px;margin:0 auto;aspect-ratio:16/9;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(244,84,30,.12);overflow:hidden;will-change:transform,opacity}
.vsl-panel::before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.05) 50%,transparent 70%);transform:translateX(-100%);animation:sweep 7s ease-in-out infinite;pointer-events:none;z-index:3}
@keyframes sweep{0%,60%{transform:translateX(-100%)}85%,100%{transform:translateX(100%)}}
.vsl-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(244,84,30,.1),transparent 65%)}
.vsl-micro{text-align:center;margin-top:20px;font-size:.82rem;color:var(--muted-2)}
section{padding:90px 0;position:relative}
.sec-head{text-align:center;margin-bottom:56px}
.sec-head h2{font-size:clamp(1.7rem,3.6vw,2.5rem);font-weight:700;margin-top:18px}
.sec-head p{color:var(--muted);max-width:560px;margin:14px auto 0}
#confianca{padding:36px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface-2)}
.trust-line{text-align:center;color:var(--muted-2);font-size:.85rem;margin-bottom:22px;text-transform:uppercase;letter-spacing:.12em}
.counters{display:flex;justify-content:center;gap:clamp(24px,6vw,80px);flex-wrap:wrap}
.counter{text-align:center}
.counter .num{font-family:var(--font-d);font-weight:800;font-size:clamp(1.6rem,3.4vw,2.3rem);color:var(--text)}
.counter .num::before{content:'+'}
.counter .lbl{font-size:.83rem;color:var(--muted);display:flex;align-items:center;gap:6px;justify-content:center}
.counter .tick{width:14px;height:14px;opacity:0;transform:scale(0)}
.counter.done .tick{opacity:1;transform:scale(1);transition:all .35s var(--snap)}
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
.ai-lines i:nth-child(2):after{animation-delay:.5s}.ai-lines i:nth-child(3):after{animation-delay:1s}
@keyframes typeLine{0%{transform:scaleX(0)}30%,80%{transform:scaleX(1)}100%{transform:scaleX(0)}}
.cursor{width:2px;height:16px;background:var(--accent);animation:blink 1s steps(1) infinite;position:absolute;bottom:20px;right:22%}
@keyframes blink{50%{opacity:0}}
.vid-mini{width:78%;aspect-ratio:16/9;border-radius:10px;background:#1a1a1f;border:1px solid var(--border);position:relative;display:flex;align-items:center;justify-content:center}
.vid-mini .play{width:40px;height:40px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;animation:breathe 2s ease-in-out infinite;box-shadow:0 0 22px rgba(244,84,30,.4)}
.vid-mini .play::after{content:'';border-left:12px solid #fff;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px}
.vid-mini .prog{position:absolute;bottom:10px;left:10px;right:10px;height:4px;border-radius:4px;background:#2a2a30;overflow:hidden}
.vid-mini .prog::after{content:'';display:block;height:100%;background:var(--grad);animation:fillProg 5s linear infinite}
@keyframes fillProg{from{width:0}to{width:100%}}
.search-pill{width:84%;display:flex;align-items:center;gap:10px;background:#1a1a1f;border:1px solid var(--border);border-radius:99px;padding:12px 18px;font-size:.85rem;color:var(--muted)}
.search-pill svg{flex:none}
.cycle{position:relative;height:1.2em;flex:1;overflow:hidden}
.cycle span{position:absolute;left:0;top:0;opacity:0;animation:cycleTerm 7.5s infinite}
.cycle span:nth-child(2){animation-delay:2.5s}
.cycle span:nth-child(3){animation-delay:5s}
@keyframes cycleTerm{0%{opacity:0;transform:translateY(8px)}5%,28%{opacity:1;transform:none}33%,100%{opacity:0;transform:translateY(-8px)}}
.bubbles{width:82%;display:flex;flex-direction:column;gap:8px}
.bubbles i{height:26px;border-radius:12px;background:#22222a;opacity:0;animation:bubIn 5.2s ease-in-out infinite}
.bubbles i:nth-child(1){width:62%;animation-delay:0s}
.bubbles i:nth-child(2){width:80%;align-self:flex-end;background:rgba(244,84,30,.3);animation-delay:.7s}
.bubbles i:nth-child(3){width:52%;animation-delay:1.4s}
@keyframes bubIn{0%{opacity:0;transform:translateY(10px)}14%,82%{opacity:1;transform:none}94%,100%{opacity:0}}
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
.econ-tag{display:inline-block;margin-top:22px;font-weight:700;font-size:.92rem;color:#fff;background:var(--grad);padding:9px 20px;border-radius:99px;opacity:0;transform:scale(.7)}
.econ-tag.pop{opacity:1;transform:scale(1);transition:all .45s var(--snap) .9s}
.math-close{margin-top:34px;color:var(--muted);font-size:1rem;max-width:560px;margin-left:auto;margin-right:auto}
.math-close b{color:var(--text)}
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
.badge{display:inline-block;font-size:.68rem;font-weight:700;color:#fff;background:var(--grad);padding:4px 11px;border-radius:99px;margin-left:10px;vertical-align:middle}
.sub-line{font-size:.82rem;color:var(--muted)}
.pill-pay{display:inline-block;font-size:.82rem;color:#ffb597;border:1px solid rgba(244,84,30,.4);background:rgba(244,84,30,.08);border-radius:99px;padding:6px 14px;margin:10px 0 4px}
.vagas{display:flex;align-items:center;gap:8px;justify-content:center;font-size:.85rem;font-weight:600;color:#ffb597;border:1px solid rgba(244,84,30,.45);border-radius:99px;padding:10px;margin:16px 0 4px;animation:heart 1.5s ease-in-out infinite}
@keyframes heart{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
.under-cta{text-align:center;font-size:.78rem;color:var(--muted-2);margin-top:12px}
.trust-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:34px;color:var(--muted);font-size:.88rem;flex-wrap:wrap}
.trust-row .icons{display:flex;gap:10px;opacity:.55}
.seal{flex:none;width:clamp(130px,18vw,170px);aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--font-d);position:relative;background:radial-gradient(circle at 50% 35%,#1d1d22,#101014)}
.seal::before{content:'';position:absolute;inset:-3px;border-radius:50%;padding:3px;background:conic-gradient(#F4541E,#FF7A45,#7a2c12,#F4541E);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:spinRing 9s linear infinite}
@keyframes spinRing{to{transform:rotate(360deg)}}
.seal b{font-size:2rem;color:var(--accent-2)}
.seal span{font-size:.8rem;letter-spacing:.2em;color:var(--muted)}
#garantia h2{font-size:clamp(1.4rem,3vw,1.9rem);margin-bottom:12px}
#garantia p{color:var(--muted);font-size:.95rem}
#garantia .last{margin-top:14px;color:var(--text);font-weight:600}
.faq-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-s);overflow:hidden;transition:border-color .3s ease}
.faq-item[open]{border-color:rgba(244,84,30,.5)}
.faq-item summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;font-weight:600;font-size:.98rem;cursor:pointer}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item .chev{flex:none;transition:transform .35s ease;color:var(--accent)}
.faq-item[open] .chev{transform:rotate(180deg)}
.faq-a{padding:0 24px;max-height:0;overflow:hidden;transition:max-height .4s var(--ease),padding .4s ease;color:var(--muted);font-size:.92rem}
.faq-item[open] .faq-a{max-height:220px;padding:0 24px 22px}
#final{padding:130px 0 120px;text-align:center;position:relative;overflow:hidden}
#final::before{content:'';position:absolute;left:50%;bottom:-420px;transform:translateX(-50%);width:1200px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(244,84,30,.28),rgba(244,84,30,.07) 55%,transparent 75%);pointer-events:none}
footer{border-top:1px solid var(--border);padding:44px 0 110px;background:var(--surface-2)}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:18px;color:var(--muted-2);font-size:.82rem}
.foot .links{display:flex;gap:20px}
.foot .links a:hover{color:var(--text)}
.disclaimer{margin-top:22px;font-size:.75rem;color:var(--muted-2);max-width:640px;line-height:1.55}
#sticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:800;display:none;align-items:center;justify-content:space-between;gap:12px;background:rgba(16,16,20,.92);backdrop-filter:blur(12px);border:1px solid rgba(244,84,30,.4);border-radius:16px;padding:12px 14px 12px 18px;transform:translateY(140%);transition:transform .45s var(--snap);box-shadow:0 -8px 30px rgba(0,0,0,.5)}
#sticky.show{transform:translateY(0)}
@media(max-width:768px){#sticky{display:flex}}
#exit{position:fixed;inset:0;z-index:1100;display:none;align-items:center;justify-content:center;padding:20px}
#exit.open{display:flex}
#exit .bg{position:absolute;inset:0;background:rgba(5,5,7,.72);backdrop-filter:blur(6px);opacity:0;transition:opacity .3s ease}
#exit.open .bg{opacity:1}
#exit .card{position:relative;width:min(420px,100%);background:var(--surface);border:1px solid rgba(244,84,30,.5);border-radius:var(--radius);padding:38px 32px;text-align:center;transform:scale(.9);opacity:0;transition:all .4s var(--snap);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 50px rgba(244,84,30,.15)}
#exit.open .card{transform:scale(1);opacity:1}
#exit .card img{width:48px;margin:0 auto 18px}
#exit h3{font-family:var(--font-d);font-size:1.35rem;margin-bottom:12px}
#exit p{color:var(--muted);font-size:.92rem;margin-bottom:24px}
#exit .close{position:absolute;top:14px;right:16px;color:var(--muted-2);font-size:1.3rem;line-height:1;padding:6px}
#exit .close:hover{color:var(--text)}
#exit .dismiss{display:block;margin-top:16px;font-size:.83rem;color:var(--muted-2)}
#exit .dismiss:hover{color:var(--muted)}
.tilt-card{transition:transform .3s ease,box-shadow .3s ease}
.tilt-card:hover{transform:perspective(800px) rotateY(2deg) rotateX(-1deg) translateY(-6px)}
.section-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(244,84,30,.3),transparent);margin:0 auto;width:60%}
@keyframes sparkTrail{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(30px,-20px) scale(0);opacity:0}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
@media(max-width:900px){.bento{grid-template-columns:repeat(2,1fr)}.b-card,.b-card.wide{grid-column:span 1}.steps{grid-template-columns:1fr}.line-wrap{display:none}.plans{grid-template-columns:1fr;max-width:480px}.plans .vip{order:-1;transform:none}#garantia .box{flex-direction:column;text-align:center}}
@media(max-width:560px){.bento{grid-template-columns:1fr}.hero{padding-top:140px}section{padding:64px 0}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:opacity .3s ease!important}.rv{transform:none!important}.w{transform:none;filter:none}html{scroll-behavior:auto}}
`}</style>

      {/* ═══ PROGRESS ═══ */}
      <div id="progress" style={{ width: `${progressWidth}%`, transition: "width .05s linear" }} />

      {/* ═══ NAV ═══ */}
      <nav id="nav" className={navScrolled ? "scrolled" : ""}>
        <div className="nav-in">
          <a href="#inicio" className="brand"><img src="/brand/logo.png" alt="UpShopee" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />UpShopee</a>
          <div className="nav-links">
            <a href="#inicio">Início</a>
            <a href="#ferramentas">Ferramentas</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="#planos" className="nav-cta">Garantir acesso</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <header className="hero" id="inicio">
        <div className="float-orb" /><div className="float-orb" /><div className="float-orb" />
        <div className="arc" style={{ position: "absolute", top: -560, left: "50%", transform: "translateX(-50%)", width: 1400, height: 820, borderRadius: "50%", background: "radial-gradient(closest-side,rgba(244,84,30,.22),rgba(244,84,30,.06) 55%,transparent 72%)", pointerEvents: "none", animation: "arcIn 1.4s ease both" }} />
        <div className="hero-grid" />
        <div className="wrap">
          <div className="rv" data-dir="down"><span className="pill"><span className="dot" />Para afiliados Shopee e iniciantes</span></div>
          <h1 className="rv" id="headline">
            <span className="w">Isso</span> <span className="w">não</span> <span className="w">é</span> <span className="w">um</span> <span className="w">gasto.</span><br />
            <span className="w">É</span> <span className="w">um</span> <span className="w grad-text">investimento.</span>
          </h1>
          <p className="sub rv" data-dir="up">A plataforma com IA que encontra os produtos que mais pagam comissão e cria seus vídeos — enquanto você foca em lucrar.</p>
          <div className="hero-ctas">
            <a href="#planos" className="btn btn-primary rv" data-dir="left">Quero começar a lucrar <span className="arr">→</span></a>
            <a href="#vsl" className="btn btn-ghost rv" data-dir="right">Assistir apresentação</a>
          </div>
          <p className="hero-micro rv" data-dir="up"><b>✓ Acesso imediato</b>&nbsp;&nbsp;&nbsp;<b>✓ Garantia incondicional de 7 dias</b></p>
          <div className="chevron" aria-hidden="true" />
        </div>
      </header>

      <div className="section-divider" />

      {/* ═══ VSL ═══ */}
      <section id="vsl">
        <div className="wrap">
          <p className="vsl-title rv" data-dir="up">Assista e entenda por que isso <b>se paga sozinho</b></p>
          <div className="vsl-panel" ref={vslPanelRef}>
            <div className="vsl-ph">
              <img src="/brand/logo.png" alt="UpShopee" style={{ width: "min(150px,26%)", animation: "breathe 3.2s ease-in-out infinite" }}
                onError={(e) => { const t = e.currentTarget; t.outerHTML = '<div class="fallback grad-text" style="font-family:Sora,sans-serif;font-weight:800;font-size:2rem;animation:breathe 3.2s ease-in-out infinite;background:linear-gradient(135deg,#F4541E 0%,#FF7A45 100%);-webkit-background-clip:text;background-clip:text;color:transparent">UpShopee</div>'; }} />
            </div>
            <button id="unmute">🔊 Clique para ativar o som</button>
          </div>
          <p className="vsl-micro">🔒 Pagamento 100% seguro &nbsp;·&nbsp; Garantia de 7 dias</p>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ COUNTERS ═══ */}
      <section id="confianca">
        <div className="wrap">
          <p className="trust-line">Confiado por afiliados em todo o Brasil</p>
          <div className="counters">
            <div className="counter rv" data-dir="left"><div className="num" data-target="1250">0</div><div className="lbl">afiliados ativos <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3}><path d="M4 12l5 5L20 6" /></svg></div></div>
            <div className="counter rv" data-dir="up"><div className="num" data-target="38400">0</div><div className="lbl">vídeos gerados por IA <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3}><path d="M4 12l5 5L20 6" /></svg></div></div>
            <div className="counter rv" data-dir="right"><div className="num" data-target="512000">0</div><div className="lbl">produtos minerados <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={3}><path d="M4 12l5 5L20 6" /></svg></div></div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ BENTO ═══ */}
      <section id="ferramentas">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot" />Ferramentas</span>
            <h2 className="rv" data-dir="up">Tudo o que você precisa para lucrar mais.</h2>
            <p className="rv" data-dir="up">Minere, crie e divulgue — em uma única plataforma pensada para afiliados.</p>
          </div>
          <div className="bento stagger">
            <div className="b-card rv flash tilt-card" data-dir="left">
              <div className="b-visual"><div className="mine-bars"><i /><i /><i /><i className="hot" /><i /></div><span className="mine-tag">alta comissão</span></div>
              <h3>Minerador completo</h3><p>Descubra em segundos os produtos que mais vendem e que mais pagam comissão na Shopee.</p>
            </div>
            <div className="b-card rv flash tilt-card" data-dir="up">
              <div className="b-visual"><div className="ai-lines"><i /><i style={{ width: "86%" }} /><i style={{ width: "64%" }} /></div><span className="cursor" /></div>
              <h3>IA criativa</h3><p>Gerador de títulos, ideias, persona e scripts prontos com inteligência artificial.</p>
            </div>
            <div className="b-card rv flash tilt-card" data-dir="right">
              <div className="b-visual"><div className="vid-mini"><span className="play" /><span className="prog" /></div></div>
              <h3>Vídeos prontos para o Shopee Video</h3><p>Templates e editor de vídeo para publicar conteúdo que converte, sem editar do zero.</p>
            </div>
            <div className="b-card wide rv flash tilt-card" data-dir="left">
              <div className="b-visual">
                <div className="search-pill">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth={2}><circle cx={11} cy={11} r={7} /><path d="M21 21l-4-4" /></svg>
                  <span className="cycle"><span>fone bluetooth…</span><span>air fryer…</span><span>kit skincare…</span></span>
                </div>
              </div>
              <h3>Buscas ilimitadas</h3><p>Pesquise quantos produtos quiser, quando quiser — sem limite e sem custo extra.</p>
            </div>
            <div className="b-card wide rv flash tilt-card" data-dir="right">
              <div className="b-visual"><div className="bubbles"><i /><i /><i /></div></div>
              <h3>Comunidade VIP + suporte prioritário</h3><p>Aprenda com quem já lucra e tenha ajuda rápida sempre que precisar.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="como-funciona">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot" />Como funciona</span>
            <h2 className="rv" data-dir="up">Do zero ao lucro em 3 passos.</h2>
          </div>
          <div className="steps">
            <div className="line-wrap" id="lineWrap">
              <svg preserveAspectRatio="none" viewBox="0 0 1000 2" style={{ overflow: "visible" }}>
                <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F4541E" /><stop offset="1" stopColor="#FF7A45" /></linearGradient></defs>
                <path d="M0 1 L1000 1" stroke="url(#lineGrad)" strokeWidth={2} fill="none" strokeDasharray={1000} strokeDashoffset={1000} />
              </svg>
            </div>
            <div className="step rv tilt-card" data-dir="left"><span className="n">1</span><h3>Ative seu acesso</h3><p>Entre na plataforma em minutos — funciona no celular e no computador.</p></div>
            <div className="step rv tilt-card" data-dir="up"><span className="n">2</span><h3>Minere os produtos que mais pagam</h3><p>O minerador mostra o que está vendendo e quanto cada produto paga de comissão.</p></div>
            <div className="step rv tilt-card" data-dir="right"><span className="n">3</span><h3>Deixe a IA criar seus vídeos e divulgue</h3><p>Gere títulos, scripts e vídeos prontos para o Shopee Video — e comece a faturar.</p></div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ MATH ═══ */}
      <section id="contas">
        <div className="wrap">
          <div className="sec-head"><span className="pill rv" data-dir="down"><span className="dot" />Faça as contas</span></div>
          <div className="panel rv tilt-card" data-dir="zoom" id="mathPanel">
            <p className="math-line">2 meses do plano mensal custam <span className="strike" id="strike334">R$ <span data-count="334">0</span></span>.<br />O acesso vitalício custa <span className="glow-num">R$ <span data-count="267">0</span></span> — para sempre.</p>
            <div className="bars">
              <div className="bar-row"><div className="lab"><span>Mensal por 1 ano</span><span>R$ 2.004</span></div><div className="bar"><i className="gray" data-w="100%" /></div></div>
              <div className="bar-row"><div className="lab"><span>Acesso Vitalício</span><span>R$ 267</span></div><div className="bar"><i className="hot" data-w="13.3%" /></div></div>
            </div>
            <span className="econ-tag" id="econTag">Economia de R$ 1.737 no primeiro ano</span>
            <p className="math-close">Quantas comissões você precisa para pagar o investimento?<br /><b>O risco é continuar sem.</b></p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ PRICING ═══ */}
      <section id="planos">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot" />Planos</span>
            <h2 className="rv" data-dir="up">Escolha como você quer investir.</h2>
          </div>
          <div className="plans">
            {/* Mensal */}
            <div className="plan rv tilt-card" data-dir="left">
              <h3>Plano Mensal</h3>
              <p className="tag">Para quem quer começar com baixo investimento</p>
              <span className="old">R$ 247</span>
              <div className="price">R$ <span data-count="167">0</span><small>/mês</small></div>
              <ul className="stagger">{FEATURES.map((f, i) => <li key={i}>{checkIcon()}{f}</li>)}</ul>
              <a href={MENSAL} className="btn btn-ghost">Começar Agora</a>
            </div>
            {/* Vitalício */}
            <div className="plan vip rv tilt-card" data-dir="right">
              <span className="ribbon">OFERTA DE LANÇAMENTO — ENCERRANDO EM BREVE</span>
              <h3>Acesso Vitalício<span className="badge">MAIS POPULAR</span></h3>
              <p className="tag">Garanta agora antes do preço voltar para R$ 497</p>
              <span className="old">R$ 497</span>
              <div className="price glow-num">R$ <span data-count="267">0</span></div>
              <span className="pill-pay">ou <b>12x de R$ 27,61</b> no cartão</span>
              <span className="sub-line">Pagamento único — acesso para sempre</span>
              <span className="vagas">⚡ Apenas 10 vagas restantes neste preço</span>
              <ul className="stagger">{FEATURES.map((f, i) => <li key={i}>{checkIcon()}{f}</li>)}</ul>
              <a href={VITALICIO} className="btn btn-primary">Quero escalar agora <span className="arr">→</span></a>
              <p className="under-cta">💳 Parcelamento disponível — consulte no checkout</p>
            </div>
          </div>
          <div className="trust-row rv" data-dir="up">
            <span>🔒 Pagamento 100% seguro</span>
            <span className="icons">
              <svg width={30} height={18} viewBox="0 0 40 24" fill="#6E6E76"><rect width={40} height={24} rx={4} fill="none" stroke="#3a3a42" /><text x={20} y={16} fontSize={9} textAnchor="middle" fill="#8a8a92" fontFamily="Arial">PIX</text></svg>
              <svg width={30} height={18} viewBox="0 0 40 24" fill="#6E6E76"><rect width={40} height={24} rx={4} fill="none" stroke="#3a3a42" /><circle cx={16} cy={12} r={6} fill="#55555e" /><circle cx={24} cy={12} r={6} fill="#3a3a42" /></svg>
              <svg width={30} height={18} viewBox="0 0 40 24" fill="#6E6E76"><rect width={40} height={24} rx={4} fill="none" stroke="#3a3a42" /><rect x={6} y={10} width={28} height={4} fill="#55555e" /></svg>
            </span>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ GUARANTEE ═══ */}
      <section id="garantia">
        <div className="wrap">
          <div className="box tilt-card" style={{ display: "flex", alignItems: "center", gap: "clamp(26px,5vw,60px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "clamp(30px,5vw,54px)", maxWidth: 860, margin: "0 auto" }}>
            <div className="seal rv" data-dir="zoom"><b>7 DIAS</b><span>GARANTIA</span></div>
            <div>
              <h2 className="rv" data-dir="right">Risco zero: garantia incondicional de 7 dias</h2>
              <p className="rv" data-dir="right">Teste a plataforma por 7 dias. Se não fizer sentido para você, devolvemos 100% do valor — sem perguntas e sem burocracia.</p>
              <p className="last rv" data-dir="right">O único cenário sem retorno é não investir.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FAQ ═══ */}
      <section id="faq">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot" />Dúvidas frequentes</span>
            <h2 className="rv" data-dir="up">Perguntas e respostas.</h2>
          </div>
          <div className="list stagger">
            {FAQ.map((item, i) => (
              <details className="faq-item rv tilt-card" data-dir="up" key={i}>
                <summary>{item.q}{chevronDown()}</summary>
                <div className="faq-a">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ═══ FINAL CTA ═══ */}
      <section id="final">
        <div className="wrap">
          <img src="/brand/logo.png" alt="UpShopee" className="rv" data-dir="zoom" style={{ width: 64, margin: "0 auto 26px" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <h2 className="rv" data-dir="up">Invista uma vez.<br /><span className="grad-text">Lucre sempre.</span></h2>
          <a href={VITALICIO} className="btn btn-primary rv" data-dir="up">Quero meu acesso vitalício <span className="arr">→</span></a>
          <p className="micro rv" data-dir="up" style={{ marginTop: 18, fontSize: ".83rem", color: "var(--muted)" }}>✓ Garantia incondicional de 7 dias&nbsp;&nbsp;·&nbsp;&nbsp;🔒 Pagamento 100% seguro</p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <a href="#inicio" className="brand"><img src="/brand/logo.png" alt="" style={{ width: 26, height: 26 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />UpShopee</a>
            <div className="links"><a href="#">Termos de Uso</a><a href="#">Privacidade</a></div>
            <span>© 2026 UpShopee. Todos os direitos reservados.</span>
          </div>
          <p className="disclaimer">Resultados podem variar de acordo com a dedicação e o contexto de cada afiliado. Os valores citados não constituem promessa de ganhos. A UpShopee é uma ferramenta independente e não possui vínculo oficial com a Shopee.</p>
        </div>
      </footer>

      {/* ═══ STICKY MOBILE CTA ═══ */}
      <div id="sticky" className={stickyShow ? "show" : ""}>
        <span className="p" style={{ fontSize: ".85rem", fontWeight: 600 }}>Vitalício por <b style={{ color: "var(--accent-2)" }}>R$ 267</b></span>
        <a href={VITALICIO} className="btn btn-primary" style={{ padding: "11px 18px", fontSize: ".85rem", animation: "none" }}>Garantir <span className="arr">→</span></a>
      </div>

      {/* ═══ EXIT POPUP ═══ */}
      <div id="exit" role="dialog" aria-modal="true" aria-labelledby="exitTitle" className={exitOpen ? "open" : ""}>
        <div className="bg" onClick={() => setExitOpen(false)} />
        <div className="card">
          <button className="close" aria-label="Fechar" onClick={() => setExitOpen(false)}>✕</button>
          <img src="/brand/logo.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <h3 id="exitTitle">Espera — antes de sair…</h3>
          <p>Você tem <b style={{ color: "#fff" }}>7 dias de garantia incondicional</b>. O risco é zero: teste a UpShopee e, se não fizer sentido, devolvemos 100% do valor.</p>
          <a href={VITALICIO} className="btn btn-primary" style={{ width: "100%" }}>Quero testar sem risco <span className="arr">→</span></a>
          <a href="#" className="dismiss" onClick={(e) => { e.preventDefault(); setExitOpen(false); }}>Não, prefiro sair</a>
        </div>
      </div>
    </>
  );
}
