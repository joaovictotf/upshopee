/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — OfertasLanding  (shared landing page component)
  ═══════════════════════════════════════════════════════════════
  Used by /ofertas, /ofertas2, /ofertas3 — each passes its own
  LandingConfig. The CSS is shared; JSX varies by config flags.
  ═══════════════════════════════════════════════════════════════
*/
import { memo, useEffect, useRef, useState } from "react";

export interface LandingConfig {
  checkouts: {
    mensal:    { pix: string; cartao: string };
    vitalicio: { pix: string; cartao: string };
  };
  /** When true, purchase CTAs open the payment-chooser modal. When false, CTAs link directly to Pix. */
  hasPaymentModal: boolean;
  /** When false, hides all cartão/parcelamento copy and the "Posso parcelar?" FAQ. */
  showCartaoOption: boolean;
}

const LOGO = "/brand/logo.png";

/* ── static JSX blocks memoized to skip reconciliation ── */
const MemoTrustStrip = memo(function TrustStrip() {
  return (
    <section id="confianca">
      <div className="wrap">
        <p className="trust-line">Confiado por afiliados em todo o Brasil</p>
        <div className="counters">
          <div className="counter rv" data-dir="left"><div className="num" data-target="1250">0</div><div className="lbl">afiliados ativos <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg></div></div>
          <div className="counter rv" data-dir="up"><div className="num" data-target="38400">0</div><div className="lbl">vídeos gerados por IA <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg></div></div>
          <div className="counter rv" data-dir="right"><div className="num" data-target="512000">0</div><div className="lbl">produtos minerados <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg></div></div>
        </div>
      </div>
    </section>
  );
});

const MemoHowItWorks = memo(function HowItWorks() {
  return (
    <section id="como-funciona">
      <div className="wrap">
        <div className="sec-head">
          <span className="pill rv" data-dir="down"><span className="dot"></span>Como funciona</span>
          <h2 className="rv" data-dir="up">Do zero ao lucro em 3 passos.</h2>
        </div>
        <div className="steps">
          <div className="line-wrap" id="lineWrap">
            <svg preserveAspectRatio="none" viewBox="0 0 1000 2">
              <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F4541E" /><stop offset="1" stopColor="#FF7A45" /></linearGradient></defs>
              <path d="M0 1 L1000 1" />
            </svg>
          </div>
          <div className="step rv" data-dir="left"><span className="n">1</span><h3>Ative seu acesso</h3><p>Entre na plataforma em minutos — funciona no celular e no computador.</p></div>
          <div className="step rv" data-dir="up"><span className="n">2</span><h3>Minere os produtos que mais pagam</h3><p>O minerador mostra o que está vendendo e quanto cada produto paga de comissão.</p></div>
          <div className="step rv" data-dir="right"><span className="n">3</span><h3>Deixe a IA criar seus vídeos e divulgue</h3><p>Gere títulos, scripts e vídeos prontos para o Shopee Video — e comece a faturar.</p></div>
        </div>
      </div>
    </section>
  );
});

const MemoGuarantee = memo(function Guarantee() {
  return (
    <section id="garantia">
      <div className="wrap">
        <div className="box">
          <div className="seal rv" data-dir="zoom"><b>7 DIAS</b><span>GARANTIA</span></div>
          <div>
            <h2 className="rv" data-dir="right">Risco zero: garantia incondicional de 7 dias</h2>
            <p className="rv" data-dir="right">Teste a plataforma por 7 dias. Se não fizer sentido para você, devolvemos 100% do valor — sem perguntas e sem burocracia.</p>
            <p className="last rv" data-dir="right">O único cenário sem retorno é não investir.</p>
          </div>
        </div>
      </div>
    </section>
  );
});

const MemoFooter = memo(function Footer() {
  const hideOnError = (e: { currentTarget: HTMLImageElement }) => { e.currentTarget.style.display = "none"; };
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <a href="#inicio" className="brand"><img src={LOGO} alt="" style={{ width: "26px", height: "26px" }} onError={hideOnError} />UpShopee</a>
          <div className="links"><a href="#">Termos de Uso</a><a href="#">Privacidade</a></div>
          <span>© 2026 UpShopee. Todos os direitos reservados.</span>
        </div>
        <p className="disclaimer">Resultados podem variar de acordo com a dedicação e o contexto de cada afiliado. Os valores citados não constituem promessa de ganhos. A UpShopee é uma ferramenta independente e não possui vínculo oficial com a Shopee.</p>
      </div>
    </footer>
  );
});

const CSS = `:root{--bg:#0A0A0C;--surface:#141417;--surface-2:#101014;--border:#26262B;--border-warm:#3a2a22;--accent:#F4541E;--accent-2:#FF7A45;--grad:linear-gradient(135deg,#F4541E 0%,#FF7A45 100%);--text:#FFFFFF;--muted:#A0A0A8;--muted-2:#6E6E76;--radius:20px;--radius-s:14px;--snap:cubic-bezier(.34,1.45,.64,1);--ease:cubic-bezier(.22,1,.36,1);--font-d:'Sora',sans-serif;--font-b:'Inter',sans-serif;}*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}body{background:var(--bg);color:var(--text);font-family:var(--font-b);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}img{max-width:100%;display:block}a{color:inherit;text-decoration:none}button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}::selection{background:rgba(244,84,30,.35)}.wrap{width:min(1120px,92%);margin:0 auto}h1,h2,h3{font-family:var(--font-d);line-height:1.15;letter-spacing:-.02em}.js .rv{opacity:0;will-change:transform,opacity}.js .rv[data-dir="up"]{transform:translateY(36px)}.js .rv[data-dir="down"]{transform:translateY(-36px)}.js .rv[data-dir="left"]{transform:translateX(-52px)}.js .rv[data-dir="right"]{transform:translateX(52px)}.js .rv[data-dir="zoom"]{transform:scale(.9)}.js .rv.in{opacity:1;transform:none;transition:transform .65s var(--snap),opacity .5s ease}.js .rv.in.flash{animation:borderFlash .7s ease .45s}@keyframes borderFlash{0%{box-shadow:0 0 0 1px rgba(244,84,30,0)}45%{box-shadow:0 0 0 1px rgba(244,84,30,.8),0 0 24px rgba(244,84,30,.25)}100%{box-shadow:0 0 0 1px rgba(244,84,30,0)}}.js .w{display:inline-block;opacity:0;transform:translateY(20px);filter:blur(6px)}.js .in .w{opacity:1;transform:none;filter:blur(0);transition:all .6s var(--ease)}#progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--grad);z-index:1000;border-radius:0 2px 2px 0}nav{position:fixed;top:0;left:0;right:0;z-index:900;padding:14px 0;transition:all .35s ease;background:rgba(10,10,12,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid transparent}nav.scrolled{border-bottom-color:var(--border);background:rgba(10,10,12,.82)}.nav-in{width:min(1120px,92%);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{display:flex;align-items:center;gap:10px;font-family:var(--font-d);font-weight:700;font-size:1.05rem}.brand img{width:34px;height:34px;object-fit:contain}.nav-links{display:flex;gap:4px;background:rgba(20,20,23,.7);border:1px solid var(--border);padding:5px;border-radius:99px}.nav-links a{font-size:.83rem;font-weight:500;color:var(--muted);padding:7px 15px;border-radius:99px;transition:all .25s ease}.nav-links a:hover{color:var(--text);background:rgba(244,84,30,.14);box-shadow:0 0 14px rgba(244,84,30,.15) inset}.nav-cta{font-size:.85rem;font-weight:600;padding:10px 20px;border-radius:99px;background:var(--grad);color:#fff;transition:all .25s ease;box-shadow:0 4px 18px rgba(244,84,30,.3)}.nav-cta:hover{transform:translateY(-2px);box-shadow:0 6px 26px rgba(244,84,30,.45)}@media(max-width:860px){.nav-links{display:none}}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:1rem;padding:16px 32px;border-radius:99px;transition:transform .2s ease,box-shadow .25s ease;position:relative;overflow:hidden}.btn:active{transform:scale(.98)}.btn-primary{background:var(--grad);color:#fff;box-shadow:0 8px 30px rgba(244,84,30,.35);animation:glowPulse 2.4s ease-in-out infinite}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(244,84,30,.55)}.btn-primary::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);animation:shine 6s ease-in-out infinite}@keyframes shine{0%,78%{left:-80%}92%,100%{left:130%}}@keyframes glowPulse{0%,100%{box-shadow:0 8px 30px rgba(244,84,30,.35)}50%{box-shadow:0 8px 42px rgba(244,84,30,.55)}}.btn-ghost{border:1px solid var(--border);color:var(--text);background:rgba(20,20,23,.5)}.btn-ghost:hover{border-color:var(--accent);background:rgba(244,84,30,.08);transform:translateY(-2px)}.btn .arr{transition:transform .25s ease}.btn:hover .arr{transform:translateX(4px)}.hero{position:relative;padding:170px 0 40px;text-align:center;overflow:hidden}.arc{position:absolute;top:-560px;left:50%;transform:translateX(-50%);width:1400px;height:820px;border-radius:50%;background:radial-gradient(closest-side,rgba(244,84,30,.22),rgba(244,84,30,.06) 55%,transparent 72%);pointer-events:none;animation:arcIn 1.4s ease both}.arc::after{content:'';position:absolute;inset:110px;border-radius:50%;border-bottom:2px solid rgba(255,122,69,.5);filter:blur(2px)}@keyframes arcIn{from{opacity:0;transform:translateX(-50%) translateY(-40px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 70% 55% at 50% 0%,#000 40%,transparent 100%);-webkit-mask-image:radial-gradient(ellipse 70% 55% at 50% 0%,#000 40%,transparent 100%);pointer-events:none}.pill{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;font-weight:500;color:var(--muted);border:1px solid var(--border);background:rgba(20,20,23,.6);padding:8px 18px;border-radius:99px}.pill .dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent)}.hero h1{font-size:clamp(2.1rem,5.4vw,3.9rem);font-weight:800;margin:26px auto 20px;max-width:820px}.grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}.hero .sub{color:var(--muted);font-size:1.08rem;max-width:600px;margin:0 auto 34px}.hero-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}.hero-micro{margin-top:18px;font-size:.82rem;color:var(--muted-2)}.hero-micro b{color:var(--muted)}.chevron{margin:44px auto 0;width:26px;height:26px;border-right:2px solid var(--muted-2);border-bottom:2px solid var(--muted-2);transform:rotate(45deg);animation:bounce 1.8s ease-in-out infinite}@keyframes bounce{0%,100%{transform:rotate(45deg) translate(0,0)}50%{transform:rotate(45deg) translate(6px,6px)}}#vsl{padding:30px 0 90px}.vsl-title{text-align:center;font-size:clamp(1.15rem,2.4vw,1.5rem);font-weight:600;color:var(--muted);margin-bottom:30px}.vsl-title b{color:var(--text)}.vsl-panel{position:relative;max-width:960px;margin:0 auto;aspect-ratio:16/9;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-2);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(244,84,30,.12);overflow:hidden;will-change:transform,opacity}.vsl-panel::before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.05) 50%,transparent 70%);transform:translateX(-100%);animation:sweep 7s ease-in-out infinite;pointer-events:none;z-index:3}@keyframes sweep{0%,60%{transform:translateX(-100%)}85%,100%{transform:translateX(100%)}}.vsl-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(244,84,30,.1),transparent 65%)}.vsl-ph img{width:min(150px,26%);animation:breathe 3.2s ease-in-out infinite}.vsl-ph .fallback{font-family:var(--font-d);font-weight:800;font-size:2rem;animation:breathe 3.2s ease-in-out infinite}@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}.vsl-panel video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2}#unmute{position:absolute;inset:0;margin:auto;width:max-content;height:max-content;z-index:5;display:none;align-items:center;gap:10px;font-weight:600;font-size:1rem;padding:16px 30px;border-radius:99px;background:var(--grad);color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.5);animation:glowPulse 2s ease-in-out infinite}#unmute.show{display:inline-flex}.vsl-micro{text-align:center;margin-top:20px;font-size:.82rem;color:var(--muted-2)}section{padding:90px 0;position:relative}.sec-head{text-align:center;margin-bottom:56px}.sec-head h2{font-size:clamp(1.7rem,3.6vw,2.5rem);font-weight:700;margin-top:18px}.sec-head p{color:var(--muted);max-width:560px;margin:14px auto 0}#confianca{padding:36px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface-2)}.trust-line{text-align:center;color:var(--muted-2);font-size:.85rem;margin-bottom:22px;text-transform:uppercase;letter-spacing:.12em}.counters{display:flex;justify-content:center;gap:clamp(24px,6vw,80px);flex-wrap:wrap}.counter{text-align:center}.counter .num{font-family:var(--font-d);font-weight:800;font-size:clamp(1.6rem,3.4vw,2.3rem);color:var(--text)}.counter .num::before{content:'+'}.counter .lbl{font-size:.83rem;color:var(--muted);display:flex;align-items:center;gap:6px;justify-content:center}.counter .tick{width:14px;height:14px;opacity:0;transform:scale(0)}.counter.done .tick{opacity:1;transform:scale(1);transition:all .35s var(--snap)}.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}.b-card{grid-column:span 2;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:26px;display:flex;flex-direction:column;gap:8px;transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;overflow:hidden;position:relative}.b-card.wide{grid-column:span 3}.b-card:hover{transform:translateY(-4px);border-color:var(--border-warm);box-shadow:0 14px 40px rgba(0,0,0,.4),0 0 24px rgba(244,84,30,.08)}.b-card h3{font-size:1.06rem;font-weight:700;margin-top:14px}.b-card p{font-size:.88rem;color:var(--muted)}.b-visual{height:150px;border-radius:var(--radius-s);background:var(--surface-2);border:1px solid var(--border);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.mine-bars{display:flex;align-items:flex-end;gap:10px;height:96px}.mine-bars i{width:20px;border-radius:6px 6px 3px 3px;background:#2a2a30;animation:barGrow 3.4s ease-in-out infinite;transform-origin:bottom}.mine-bars i:nth-child(1){height:38%;animation-delay:0s}.mine-bars i:nth-child(2){height:56%;animation-delay:.15s}.mine-bars i:nth-child(3){height:44%;animation-delay:.3s}.mine-bars i.hot{height:88%;background:var(--grad);box-shadow:0 0 18px rgba(244,84,30,.45);animation-delay:.45s}.mine-bars i:nth-child(5){height:62%;animation-delay:.6s}@keyframes barGrow{0%{transform:scaleY(.15)}18%,80%{transform:scaleY(1)}100%{transform:scaleY(.15)}}.mine-tag{position:absolute;top:14px;right:14px;font-size:.68rem;font-weight:700;color:#fff;background:var(--grad);padding:4px 10px;border-radius:99px;animation:tagPop 3.4s ease-in-out infinite}@keyframes tagPop{0%,18%{opacity:0;transform:scale(.6)}30%,80%{opacity:1;transform:scale(1)}92%,100%{opacity:0;transform:scale(.6)}}.ai-lines{width:82%;display:flex;flex-direction:column;gap:10px}.ai-lines i{height:10px;border-radius:6px;background:#2a2a30;overflow:hidden;position:relative}.ai-lines i::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(244,84,30,.55),rgba(255,122,69,.55));transform:scaleX(0);transform-origin:left;animation:typeLine 4.2s ease-in-out infinite}.ai-lines i:nth-child(1)::after{animation-delay:0s}.ai-lines i:nth-child(2){width:86%}.ai-lines i:nth-child(2)::after{animation-delay:.5s}.ai-lines i:nth-child(3){width:64%}.ai-lines i:nth-child(3)::after{animation-delay:1s}@keyframes typeLine{0%{transform:scaleX(0)}30%,80%{transform:scaleX(1)}100%{transform:scaleX(0)}}.cursor{width:2px;height:16px;background:var(--accent);animation:blink 1s steps(1) infinite;position:absolute;bottom:20px;right:22%}@keyframes blink{50%{opacity:0}}.vid-mini{width:78%;aspect-ratio:16/9;border-radius:10px;background:#1a1a1f;border:1px solid var(--border);position:relative;display:flex;align-items:center;justify-content:center}.vid-mini .play{width:40px;height:40px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;animation:breathe 2s ease-in-out infinite;box-shadow:0 0 22px rgba(244,84,30,.4)}.vid-mini .play::after{content:'';border-left:12px solid #fff;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px}.vid-mini .prog{position:absolute;bottom:10px;left:10px;right:10px;height:4px;border-radius:4px;background:#2a2a30;overflow:hidden}.vid-mini .prog::after{content:'';display:block;height:100%;background:var(--grad);animation:fillProg 5s linear infinite}@keyframes fillProg{from{width:0}to{width:100%}}.search-pill{width:84%;display:flex;align-items:center;gap:10px;background:#1a1a1f;border:1px solid var(--border);border-radius:99px;padding:12px 18px;font-size:.85rem;color:var(--muted)}.search-pill svg{flex:none}.cycle{position:relative;height:1.2em;flex:1;overflow:hidden}.cycle span{position:absolute;left:0;top:0;opacity:0;animation:cycleTerm 7.5s infinite}.cycle span:nth-child(2){animation-delay:2.5s}.cycle span:nth-child(3){animation-delay:5s}@keyframes cycleTerm{0%{opacity:0;transform:translateY(8px)}5%,28%{opacity:1;transform:none}33%,100%{opacity:0;transform:translateY(-8px)}}.bubbles{width:82%;display:flex;flex-direction:column;gap:8px}.bubbles i{height:26px;border-radius:12px;background:#22222a;opacity:0;animation:bubIn 5.2s ease-in-out infinite}.bubbles i:nth-child(1){width:62%;animation-delay:0s}.bubbles i:nth-child(2){width:80%;align-self:flex-end;background:rgba(244,84,30,.3);animation-delay:.7s}.bubbles i:nth-child(3){width:52%;animation-delay:1.4s}@keyframes bubIn{0%{opacity:0;transform:translateY(10px)}14%,82%{opacity:1;transform:none}94%,100%{opacity:0}}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;position:relative}.step{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:30px 26px;position:relative;z-index:2}.step .n{width:46px;height:46px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:700;color:var(--muted);transition:all .5s ease;background:var(--surface-2)}.step.lit .n{border-color:var(--accent);color:#fff;background:var(--grad);box-shadow:0 0 22px rgba(244,84,30,.45);animation:pulse1 .7s ease}@keyframes pulse1{0%{transform:scale(1)}45%{transform:scale(1.18)}100%{transform:scale(1)}}.step h3{font-size:1.05rem;margin:16px 0 8px}.step p{font-size:.9rem;color:var(--muted)}.line-wrap{position:absolute;top:53px;left:12%;right:12%;height:2px;z-index:1}.line-wrap svg{width:100%;height:100%;overflow:visible}.line-wrap path{stroke:url(#lineGrad);stroke-width:2;fill:none;stroke-dasharray:1000;stroke-dashoffset:1000;transition:stroke-dashoffset 1.8s ease}.line-wrap.draw path{stroke-dashoffset:0}#contas .panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:clamp(30px,5vw,60px);text-align:center;position:relative;overflow:hidden}#contas .panel::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(244,84,30,.08),transparent 60%);pointer-events:none}.math-line{font-family:var(--font-d);font-size:clamp(1.2rem,2.8vw,1.8rem);font-weight:700;max-width:720px;margin:0 auto 40px}.strike{position:relative;white-space:nowrap}.strike::after{content:'';position:absolute;left:-3%;top:52%;height:3px;width:0;background:var(--accent);border-radius:2px;transition:width .5s ease .4s}.strike.cut::after{width:106%}.glow-num{color:var(--accent-2);text-shadow:0 0 24px rgba(244,84,30,.55)}.bars{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:18px;text-align:left}.bar-row .lab{font-size:.85rem;color:var(--muted);margin-bottom:7px;display:flex;justify-content:space-between}.bar{height:16px;border-radius:99px;background:#222228;overflow:hidden}.bar i{display:block;height:100%;border-radius:99px;width:0;transition:width 1.1s var(--ease) .2s}.bar i.gray{background:#3a3a42}.bar i.hot{background:var(--grad);box-shadow:0 0 18px rgba(244,84,30,.4)}.econ-tag{display:inline-block;margin-top:22px;font-weight:700;font-size:.92rem;color:#fff;background:var(--grad);padding:9px 20px;border-radius:99px;opacity:0;transform:scale(.7)}.econ-tag.pop{opacity:1;transform:scale(1);transition:all .45s var(--snap) .9s}.math-close{margin-top:34px;color:var(--muted);font-size:1rem;max-width:560px;margin-left:auto;margin-right:auto}.math-close b{color:var(--text)}#planos{padding-top:100px}.plans{display:grid;grid-template-columns:1fr 1.06fr;gap:26px;align-items:stretch;max-width:920px;margin:0 auto}.plan{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:34px 30px;display:flex;flex-direction:column;position:relative}.plan .tag{font-size:.83rem;color:var(--muted);margin:6px 0 20px}.plan h3{font-size:1.35rem}.old{color:var(--muted-2);font-size:1rem;position:relative;display:inline-block;width:fit-content}.old::after{content:'';position:absolute;left:-3%;top:52%;height:2px;width:0;background:var(--accent);transition:width .4s ease .3s}.old.cut::after{width:106%}.price{font-family:var(--font-d);font-weight:800;font-size:2.6rem;margin:4px 0 2px}.price small{font-size:1rem;font-weight:600;color:var(--muted)}.plan ul{list-style:none;margin:24px 0 28px;display:flex;flex-direction:column;gap:11px;flex:1}.plan li{display:flex;gap:10px;align-items:center;font-size:.9rem;color:#d6d6dc}.plan li svg{flex:none}.plan li .ck{stroke-dasharray:24;stroke-dashoffset:24}.plan.in li .ck{animation:drawCk .45s ease forwards}@keyframes drawCk{to{stroke-dashoffset:0}}.plan .btn{width:100%}.vip{border:1px solid rgba(244,84,30,.55);transform:scale(1.02);z-index:2;background:linear-gradient(180deg,rgba(244,84,30,.06),var(--surface) 30%)}.vip::before{content:'';position:absolute;inset:-1px;border-radius:var(--radius);padding:1px;background:linear-gradient(120deg,#F4541E,#FF7A45,#F4541E,#7a2c12,#F4541E);background-size:300% 300%;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:march 5s linear infinite;pointer-events:none}@keyframes march{0%{background-position:0% 50%}100%{background-position:300% 50%}}.ribbon{position:absolute;top:-15px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:.72rem;font-weight:700;letter-spacing:.06em;color:#fff;background:var(--grad);padding:7px 18px;border-radius:99px;box-shadow:0 6px 20px rgba(244,84,30,.4)}.badge{display:inline-block;font-size:.68rem;font-weight:700;color:#fff;background:var(--grad);padding:4px 11px;border-radius:99px;margin-left:10px;vertical-align:middle}.sub-line{font-size:.82rem;color:var(--muted)}.pill-pay{display:inline-block;width:fit-content;font-size:.82rem;color:#ffb597;border:1px solid rgba(244,84,30,.4);background:rgba(244,84,30,.08);border-radius:99px;padding:6px 14px;margin:10px 0 4px}.vagas{display:flex;align-items:center;gap:8px;justify-content:center;font-size:.85rem;font-weight:600;color:#ffb597;border:1px solid rgba(244,84,30,.45);border-radius:99px;padding:10px;margin:16px 0 4px;animation:heart 1.5s ease-in-out infinite}@keyframes heart{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}.under-cta{text-align:center;font-size:.78rem;color:var(--muted-2);margin-top:12px}.trust-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:34px;color:var(--muted);font-size:.88rem;flex-wrap:wrap}.trust-row .icons{display:flex;gap:10px;opacity:.55}#garantia .box{display:flex;align-items:center;gap:clamp(26px,5vw,60px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:clamp(30px,5vw,54px);max-width:860px;margin:0 auto}.seal{flex:none;width:clamp(130px,18vw,170px);aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--font-d);position:relative;background:radial-gradient(circle at 50% 35%,#1d1d22,#101014)}.seal::before{content:'';position:absolute;inset:-3px;border-radius:50%;padding:3px;background:conic-gradient(#F4541E,#FF7A45,#7a2c12,#F4541E);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:spinRing 9s linear infinite}@keyframes spinRing{to{transform:rotate(360deg)}}.seal b{font-size:2rem;color:var(--accent-2)}.seal span{font-size:.8rem;letter-spacing:.2em;color:var(--muted)}#garantia h2{font-size:clamp(1.4rem,3vw,1.9rem);margin-bottom:12px}#garantia p{color:var(--muted);font-size:.95rem}#garantia .last{margin-top:14px;color:var(--text);font-weight:600}#faq .list{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px}.faq-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-s);overflow:hidden;transition:border-color .3s ease}.faq-item[open]{border-color:rgba(244,84,30,.5)}.faq-item summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;font-weight:600;font-size:.98rem;cursor:pointer}.faq-item summary::-webkit-details-marker{display:none}.faq-item .chev{flex:none;transition:transform .35s ease;color:var(--accent)}.faq-item[open] .chev{transform:rotate(180deg)}.faq-a{padding:0 24px;max-height:0;overflow:hidden;transition:max-height .4s var(--ease),padding .4s ease;color:var(--muted);font-size:.92rem}.faq-item[open] .faq-a{max-height:220px;padding:0 24px 22px}#final{padding:130px 0 120px;text-align:center;position:relative;overflow:hidden}#final::before{content:'';position:absolute;left:50%;bottom:-420px;transform:translateX(-50%);width:1200px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(244,84,30,.28),rgba(244,84,30,.07) 55%,transparent 75%);pointer-events:none}#final img{width:64px;margin:0 auto 26px}#final h2{font-size:clamp(1.9rem,4.4vw,3rem);font-weight:800;margin-bottom:30px}#final .micro{margin-top:18px;font-size:.83rem;color:var(--muted)}footer{border-top:1px solid var(--border);padding:44px 0 110px;background:var(--surface-2)}.foot{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:18px;color:var(--muted-2);font-size:.82rem}.foot .links{display:flex;gap:20px}.foot .links a:hover{color:var(--text)}.disclaimer{margin-top:22px;font-size:.75rem;color:var(--muted-2);max-width:640px;line-height:1.55}#sticky{position:fixed;left:12px;right:12px;bottom:12px;z-index:800;display:none;align-items:center;justify-content:space-between;gap:12px;background:rgba(16,16,20,.92);backdrop-filter:blur(12px);border:1px solid rgba(244,84,30,.4);border-radius:16px;padding:12px 14px 12px 18px;transform:translateY(140%);transition:transform .45s var(--snap);box-shadow:0 -8px 30px rgba(0,0,0,.5)}#sticky.show{transform:translateY(0)}#sticky .p{font-size:.85rem;font-weight:600}#sticky .p b{color:var(--accent-2)}#sticky .btn{padding:11px 18px;font-size:.85rem;animation:none}@media(max-width:768px){#sticky{display:flex}}#exit{position:fixed;inset:0;z-index:1100;display:none;align-items:center;justify-content:center;padding:20px}#exit.open{display:flex}#exit .bg{position:absolute;inset:0;background:rgba(5,5,7,.72);backdrop-filter:blur(6px);opacity:0;transition:opacity .3s ease}#exit.open .bg{opacity:1}#exit .card{position:relative;width:min(420px,100%);background:var(--surface);border:1px solid rgba(244,84,30,.5);border-radius:var(--radius);padding:38px 32px;text-align:center;transform:scale(.9);opacity:0;transition:all .4s var(--snap);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 50px rgba(244,84,30,.15)}#exit.open .card{transform:scale(1);opacity:1}#exit .card img{width:48px;margin:0 auto 18px}#exit h3{font-family:var(--font-d);font-size:1.35rem;margin-bottom:12px}#exit p{color:var(--muted);font-size:.92rem;margin-bottom:24px}#exit .close{position:absolute;top:14px;right:16px;color:var(--muted-2);font-size:1.3rem;line-height:1;padding:6px}#exit .close:hover{color:var(--text)}#exit .dismiss{display:block;margin-top:16px;font-size:.83rem;color:var(--muted-2)}#exit .dismiss:hover{color:var(--muted)}#pay-modal{position:fixed;inset:0;z-index:1150;display:none;align-items:center;justify-content:center;padding:20px}#pay-modal.open{display:flex}#pay-modal .bg{position:absolute;inset:0;background:rgba(5,5,7,.72);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease}#pay-modal.open .bg{opacity:1}#pay-modal .card{position:relative;width:min(480px,100%);background:var(--surface);border:1px solid rgba(244,84,30,.5);border-radius:20px;padding:38px 32px 32px;text-align:center;transform:scale(.9);opacity:0;transition:all .4s var(--snap);box-shadow:0 30px 90px rgba(0,0,0,.6),0 0 50px rgba(244,84,30,.15)}#pay-modal.open .card{transform:scale(1);opacity:1}#pay-modal .logo{width:48px;margin:0 auto 18px}#pay-modal h3{font-family:var(--font-d);font-size:1.35rem;margin-bottom:6px}#pay-modal .plan-sub{color:var(--accent-2);font-size:.88rem;font-weight:600;margin-bottom:28px}#pay-modal .close{position:absolute;top:14px;right:16px;color:var(--muted-2);font-size:1.3rem;line-height:1;padding:6px;transition:color .2s}#pay-modal .close:hover{color:var(--text)}.pay-options{display:flex;flex-direction:column;gap:14px}.pay-opt{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:var(--surface-2);border:1px solid var(--border);border-radius:14px;padding:18px;cursor:pointer;transition:all .35s var(--snap);position:relative;overflow:hidden;min-height:72px}.pay-opt:hover{transform:translateY(-3px);border-color:rgba(244,84,30,.45);box-shadow:0 8px 28px rgba(0,0,0,.4),0 0 20px rgba(244,84,30,.08)}.pay-opt:active{transform:scale(.98)}.pay-opt:disabled{pointer-events:none}.pay-opt.dim{opacity:.4;transform:scale(.97)}.pay-opt:not(.dim)::after{content:'';position:absolute;inset:-2px;border-radius:16px;border:2px solid rgba(244,84,30,.4);opacity:0;transition:opacity .35s ease}.pay-opt:not(.dim):focus-visible::after,.pay-opt:not(.dim):hover::after{opacity:1}.pay-icon{width:52px;height:52px;border-radius:12px;background:rgba(30,190,165,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:box-shadow .35s ease}.pay-icon.ccard{background:rgba(255,122,69,.12)}.pay-opt:not(.dim):hover .pay-icon{box-shadow:0 0 18px rgba(30,190,165,.25)}.pay-opt:not(.dim):hover .pay-icon.ccard{box-shadow:0 0 18px rgba(255,122,69,.25)}.pay-text{flex:1;min-width:0}.pay-title{display:block;font-weight:600;font-size:.96rem;color:var(--text)}.pay-sub{display:block;font-size:.8rem;color:var(--muted);margin-top:2px}.pay-pill{font-size:.7rem;font-weight:600;color:#1EBEA5;background:rgba(30,190,165,.14);padding:4px 10px;border-radius:99px;flex-shrink:0}.pay-spin{width:20px;height:20px;border:2px solid rgba(244,84,30,.3);border-top-color:var(--accent);border-radius:50%;animation:paySpin .6s linear infinite;flex-shrink:0;margin-left:4px}@keyframes paySpin{to{transform:rotate(360deg)}}.pay-reassure{margin-top:22px;font-size:.78rem;color:var(--muted-2)}@media(max-width:560px){#pay-modal{align-items:flex-end;padding:0}#pay-modal .card{width:100%;max-width:100%;border-radius:24px 24px 0 0;transform:translateY(100%);transition:all .45s var(--snap);padding:30px 20px 34px}#pay-modal.open .card{transform:translateY(0)}#pay-modal .card::before{content:'';display:block;width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:0 auto 16px}.pay-opt{min-height:64px;padding:15px}.pay-icon{width:46px;height:46px;border-radius:10px}.pay-icon svg{width:24px;height:24px}}@media(max-width:900px){.bento{grid-template-columns:repeat(2,1fr)}.b-card,.b-card.wide{grid-column:span 1}.steps{grid-template-columns:1fr}.line-wrap{display:none}.plans{grid-template-columns:1fr;max-width:480px}.plans .vip{order:-1;transform:none}#garantia .box{flex-direction:column;text-align:center}}@media(max-width:560px){.bento{grid-template-columns:1fr}.hero{padding-top:140px}section{padding:64px 0}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:opacity .3s ease!important}.js .rv{transform:none!important}.js .w{transform:none;filter:none}html{scroll-behavior:auto}}`;

export function OfertasLanding({ config }: { config: LandingConfig }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [stickyShow, setStickyShow] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<null | 'mensal' | 'vitalicio'>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showMensalConfirm, setShowMensalConfirm] = useState(false);
  const paymentPlanRef = useRef<null | 'mensal' | 'vitalicio'>(null);
  useEffect(() => { paymentPlanRef.current = paymentPlan; }, [paymentPlan]);

  // Scroll lock while any overlay is open
  useEffect(() => {
    if (exitOpen || paymentPlan) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [exitOpen, paymentPlan]);

  useEffect(() => {
    /* Liga o gate ".js" das animações (originalmente no <head> inline, movido para cá para evitar crash SSR) */
    document.documentElement.classList.add("js");

    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fmt = new Intl.NumberFormat("pt-BR");
    const timeouts: number[] = [];
    const later = (fn: () => void, ms: number) => { timeouts.push(window.setTimeout(fn, ms)); };

    /* ── Google Fonts (era um <link> no <head> original) ── */
    if (!document.getElementById("ofertas-fonts")) {
      const l = document.createElement("link");
      l.id = "ofertas-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }

    /* ── anchor offset for fixed nav ── */
    root.querySelectorAll<HTMLElement>("section, header").forEach((s) => {
      s.style.scrollMarginTop = "84px";
    });

    /* ── stagger: index siblings inside same parent ── */
    root.querySelectorAll<HTMLElement>(".rv").forEach((el) => {
      const parent = el.parentElement;
      if (!parent) return;
      const sibs = parent.querySelectorAll(":scope > .rv");
      if (sibs.length > 1) {
        const i = Array.prototype.indexOf.call(sibs, el);
        if (i > 0) el.style.transitionDelay = i * 0.09 + "s";
      }
    });

    /* ── hero load sequence ── */
    const hero = root.querySelector<HTMLElement>(".hero")!;
    const heroIn = (sel: string, delay: number) => {
      const el = hero.querySelector(sel);
      if (el) later(() => el.classList.add("in"), delay);
    };
    const runHero = () => {
      heroIn('.rv[data-dir="down"]', 100);
      const h1 = root.querySelector<HTMLElement>("#headline");
      later(() => {
        if (!h1) return;
        h1.classList.add("in");
        h1.querySelectorAll<HTMLElement>(".w").forEach((w, i) => {
          w.style.transitionDelay = i * 0.07 + "s";
        });
      }, 320);
      heroIn(".sub", 950);
      hero.querySelectorAll<HTMLElement>(".hero-ctas .rv").forEach((b, i) => {
        later(() => b.classList.add("in"), 1080 + i * 60);
      });
      heroIn(".hero-micro", 1300);
    };
    if (document.readyState === "complete") runHero();
    else window.addEventListener("load", runHero);

    /* ── count-up ── */
    const countUp = (node: HTMLElement, target: number, dur: number, done?: () => void) => {
      if (!node || node.dataset.counted) { if (done) done(); return; }
      node.dataset.counted = "1";
      if (reduced) { node.textContent = fmt.format(target); if (done) done(); return; }
      let t0: number | null = null;
      const tick = (t: number) => {
        if (!t0) t0 = t;
        let p = Math.min((t - t0) / dur, 1);
        p = 1 - Math.pow(1 - p, 3);
        node.textContent = fmt.format(Math.round(target * p));
        if (p < 1) requestAnimationFrame(tick);
        else if (done) done();
      };
      requestAnimationFrame(tick);
    };

    /* ── things that fire when specific blocks reveal ── */
    const afterReveal = (el: Element) => {
      if (el.classList.contains("counter")) {
        const num = el.querySelector<HTMLElement>(".num");
        if (num) countUp(num, Number(num.dataset.target), 1600, () => el.classList.add("done"));
      }
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
        countUp(n, Number(n.dataset.count), 900);
      });
      if (el instanceof HTMLElement && el.hasAttribute("data-count")) {
        countUp(el, Number(el.dataset.count), 900);
      }
      if (el.classList.contains("plan")) {
        const old = el.querySelector(".old");
        if (old) later(() => old.classList.add("cut"), 350);
      }
      if (el.id === "mathPanel") {
        later(() => { root.querySelector("#strike334")?.classList.add("cut"); }, 1100);
        el.querySelectorAll<HTMLElement>(".bar i").forEach((b) => {
          b.style.width = b.dataset.w || "";
        });
        root.querySelector("#econTag")?.classList.add("pop");
      }
    };

    /* ── reveal observer ── */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !e.target.classList.contains("in")) {
            e.target.classList.add("in");
            io.unobserve(e.target);
            afterReveal(e.target);
          }
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -6% 0px" }
    );
    root.querySelectorAll(".rv").forEach((el) => {
      if (!hero.contains(el)) io.observe(el);
    });

    /* ── how-it-works line + step lighting ── */
    const how = root.querySelector("#como-funciona");
    const howIO = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          howIO.disconnect();
          root.querySelector("#lineWrap")?.classList.add("draw");
          root.querySelectorAll(".step").forEach((s, i) => {
            later(() => s.classList.add("lit"), 500 + i * 620);
          });
        });
      },
      { threshold: 0.35 }
    );
    if (how) howIO.observe(how);

    /* ── nav + progress ── */
    const nav = root.querySelector<HTMLElement>("#nav")!;
    const prog = root.querySelector<HTMLElement>("#progress")!;
    const onScrollUI = () => {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 50);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    };

    /* ── VSL panel rise tied to scroll ── */
    const panel = root.querySelector<HTMLElement>("#vslPanel");
    const vslRise = () => {
      if (reduced || !panel) return;
      const r = panel.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -1000 || r.top > vh + 1000) return;
      const p = Math.min(Math.max((vh - r.top) / (vh * 0.6), 0), 1);
      panel.style.transform = "translateY(" + (1 - p) * 110 + "px) scale(" + (0.94 + 0.06 * p) + ")";
      panel.style.opacity = String(0.2 + 0.8 * p);
    };

    /* ── VSL video autoplay / unmute (activates only when a <video id="vsl-video"> exists) ── */
    const video = root.querySelector<HTMLVideoElement>("#vsl-video");
    const unmute = root.querySelector<HTMLElement>("#unmute")!;
    let vIO: IntersectionObserver | undefined;
    const onUnmute = () => {
      if (!video) return;
      video.muted = false;
      video.currentTime = 0;
      video.play().catch(() => {});
      unmute.classList.remove("show");
    };
    if (video) {
      video.muted = true;
      unmute.classList.add("show");
      vIO = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (e.intersectionRatio >= 0.5) video.play().catch(() => {});
            else if (e.intersectionRatio <= 0.2) video.pause();
          });
        },
        { threshold: [0.2, 0.5] }
      );
      vIO.observe(video);
      unmute.addEventListener("click", onUnmute);
    }

    /* ── FAQ smooth close ── */
    const faqHandlers: Array<{ sum: HTMLElement; fn: (e: Event) => void }> = [];
    root.querySelectorAll<HTMLDetailsElement>(".faq-item").forEach((item) => {
      const sum = item.querySelector<HTMLElement>("summary");
      const body = item.querySelector<HTMLElement>(".faq-a");
      if (!sum || !body) return;
      const fn = (e: Event) => {
        e.preventDefault();
        if (!item.open) {
          item.open = true;
        } else {
          body.style.maxHeight = "0";
          body.style.paddingBottom = "0";
          later(() => {
            item.open = false;
            body.style.maxHeight = "";
            body.style.paddingBottom = "";
          }, 380);
        }
      };
      sum.addEventListener("click", fn);
      faqHandlers.push({ sum, fn });
    });

    /* ── sticky mobile CTA ── */
    const pricing = root.querySelector<HTMLElement>("#planos")!;
    const stickyCheck = () => {
      if (window.innerWidth > 768 || !panel) { setStickyShow(false); return; }
      const vslGone = panel.getBoundingClientRect().bottom < 0;
      const pr = pricing.getBoundingClientRect();
      const pricingVisible = pr.top < window.innerHeight && pr.bottom > 0;
      setStickyShow(vslGone && !pricingVisible);
    };

    /* ── exit-intent popup ── */
    const t0 = Date.now();
    const pricingInView = () => {
      const r = pricing.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    const openExit = () => {
      if (sessionStorage.getItem("exitShown") || pricingInView()) return;
      sessionStorage.setItem("exitShown", "1");
      setExitOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Payment modal takes priority — close it first, then exit popup
      if (paymentPlanRef.current) { setPaymentPlan(null); return; }
      setExitOpen(false);
    };
    document.addEventListener("keydown", onKey);
    /* desktop: mouse leaves through top */
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0 && Date.now() - t0 > 10000) openExit();
    };
    document.addEventListener("mouseout", onMouseOut);
    /* mobile: back-button intent */
    const isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 820;
    const onPop = () => {
      if (!sessionStorage.getItem("exitShown")) {
        openExit();
        history.pushState({ up: 1 }, "");
      }
    };
    if (isMobile && !sessionStorage.getItem("exitShown")) {
      history.pushState({ up: 1 }, "");
      window.addEventListener("popstate", onPop);
    }
    /* mobile fallback: fast upward scroll after 50% of page */
    let lastY = window.scrollY;
    let lastT = Date.now();
    const exitScrollCheck = () => {
      if (!isMobile) return;
      const y = window.scrollY;
      const t = Date.now();
      const scrolledHalf = y > (document.documentElement.scrollHeight - window.innerHeight) * 0.5;
      if (lastY - y > window.innerHeight * 0.6 && t - lastT <= 400 && scrolledHalf) openExit();
      lastY = y;
      lastT = t;
    };

    /* ── unified scroll listener ── */
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        onScrollUI();
        vslRise();
        stickyCheck();
        exitScrollCheck();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    /* ── cleanup ── */
    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener("load", runHero);
      io.disconnect();
      howIO.disconnect();
      if (vIO) vIO.disconnect();
      unmute.removeEventListener("click", onUnmute);
      faqHandlers.forEach(({ sum, fn }) => sum.removeEventListener("click", fn));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const closeExit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setExitOpen(false);
  };
  const closePayment = () => {
    setPaymentPlan(null);
    setPaymentLoading(false);
  };
  const payWith = (method: 'pix' | 'cartao') => {
    if (!paymentPlan) return;
    setPaymentLoading(true);
    setTimeout(() => {
      window.location.href = config.checkouts[paymentPlan][method];
    }, 350);
  };
  const hideOnError = (e: { currentTarget: HTMLImageElement }) => {
    e.currentTarget.style.display = "none";
  };

  // CTA helpers — when hasPaymentModal, vitalício opens payment chooser; otherwise links direct
  const vitalicioHref = config.checkouts.vitalicio.pix;
  const mensalHref = config.checkouts.mensal.pix;

  const ctaVitalicio = config.hasPaymentModal
    ? { href: "#", onClick: (e: React.MouseEvent) => { e.preventDefault(); setPaymentPlan('vitalicio'); } }
    : { href: vitalicioHref, onClick: undefined };
  // Mensal uses inline onClick to show popup — no helper needed

  return (
    <div ref={rootRef}>
      <style>{CSS}</style>
      <div id="progress"></div>

      <nav id="nav">
        <div className="nav-in">
          <a href="#inicio" className="brand">
            <img src={LOGO} alt="UpShopee" onError={hideOnError} />
            UpShopee
          </a>
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

      {/* ═══════════ HERO ═══════════ */}
      <header className="hero" id="inicio">
        <div className="arc"></div>
        <div className="hero-grid"></div>
        <div className="wrap">
          <div className="rv" data-dir="down"><span className="pill"><span className="dot"></span>Para afiliados Shopee e iniciantes</span></div>
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
          <div className="chevron" aria-hidden="true"></div>
        </div>
      </header>

      {/* ═══════════ VSL ═══════════ */}
      <section id="vsl">
        <div className="wrap">
          <p className="vsl-title rv" data-dir="up">Conheça o funcionamento da UpShopee por este vídeo</p>
          <div className="vsl-panel" id="vslPanel">
            <video id="vsl-video" src="/vsl/vsl.mp4" playsInline muted preload="metadata"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 2 }}
            />
            <div className="vsl-ph">
              <img src={LOGO} alt="UpShopee" onError={(e: any) => { e.currentTarget.outerHTML = '<div class="fallback" style="background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;font-family:var(--font-d);font-weight:800;font-size:2rem;animation:breathe 3.2s ease-in-out infinite">UpShopee</div>'; }} />
            </div>
            <button id="unmute">🔊 Clique para ativar o som</button>
          </div>
          <p className="vsl-micro">🔒 Pagamento 100% seguro &nbsp;·&nbsp; Garantia de 7 dias</p>
        </div>
      </section>

      {/* ═══════════ TRUST / COUNTERS ═══════════ */}
      <MemoTrustStrip />

      {/* ═══════════ FEATURES / BENTO ═══════════ */}
      <section id="ferramentas">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot"></span>Ferramentas</span>
            <h2 className="rv" data-dir="up">Tudo o que você precisa para lucrar mais.</h2>
            <p className="rv" data-dir="up">Minere, crie e divulgue — em uma única plataforma pensada para afiliados.</p>
          </div>
          <div className="bento">
            <div className="b-card rv flash" data-dir="left">
              <div className="b-visual">
                <div className="mine-bars"><i></i><i></i><i></i><i className="hot"></i><i></i></div>
                <span className="mine-tag">alta comissão</span>
              </div>
              <h3>Minerador completo</h3>
              <p>Descubra em segundos os produtos que mais vendem e que mais pagam comissão na Shopee.</p>
            </div>
            <div className="b-card rv flash" data-dir="up">
              <div className="b-visual">
                <div className="ai-lines"><i></i><i></i><i></i></div>
                <span className="cursor"></span>
              </div>
              <h3>IA criativa</h3>
              <p>Gerador de títulos, ideias, persona e scripts prontos com inteligência artificial.</p>
            </div>
            <div className="b-card rv flash" data-dir="right">
              <div className="b-visual">
                <div className="vid-mini"><span className="play"></span><span className="prog"></span></div>
              </div>
              <h3>Vídeos prontos para o Shopee Video</h3>
              <p>Templates e editor de vídeo para publicar conteúdo que converte, sem editar do zero.</p>
            </div>
            <div className="b-card wide rv flash" data-dir="left">
              <div className="b-visual">
                <div className="search-pill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                  <span className="cycle"><span>fone bluetooth…</span><span>air fryer…</span><span>kit skincare…</span></span>
                </div>
              </div>
              <h3>Buscas ilimitadas</h3>
              <p>Pesquise quantos produtos quiser, quando quiser — sem limite e sem custo extra.</p>
            </div>
            <div className="b-card wide rv flash" data-dir="right">
              <div className="b-visual">
                <div className="bubbles"><i></i><i></i><i></i></div>
              </div>
              <h3>Comunidade VIP + suporte prioritário</h3>
              <p>Aprenda com quem já lucra e tenha ajuda rápida sempre que precisar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <MemoHowItWorks />

      {/* ═══════════ MATH ═══════════ */}
      <section id="contas">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot"></span>Faça as contas</span>
          </div>
          <div className="panel rv" data-dir="zoom" id="mathPanel">
            <p className="math-line">2 meses do plano mensal custam <span className="strike" id="strike334">R$ <span data-count="290">0</span></span>.<br />O acesso vitalício custa <span className="glow-num">R$ <span data-count="259">0</span></span> — para sempre.</p>
            <div className="bars">
              <div className="bar-row">
                <div className="lab"><span>Mensal por 1 ano</span><span>R$ 1.740</span></div>
                <div className="bar"><i className="gray" data-w="100%"></i></div>
              </div>
              <div className="bar-row">
                <div className="lab"><span>Acesso Vitalício</span><span>R$ 259</span></div>
                <div className="bar"><i className="hot" data-w="14.9%"></i></div>
              </div>
            </div>
            <span className="econ-tag" id="econTag">Economia de R$ 1.481 no primeiro ano</span>
            <p className="math-close">Quantas comissões você precisa para pagar o investimento?<br /><b>O risco é continuar sem.</b></p>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="planos">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot"></span>Planos</span>
            <h2 className="rv" data-dir="up">Escolha como você quer investir.</h2>
          </div>
          <div className="plans">
            <div className="plan rv" data-dir="left">
              <h3>Plano Mensal</h3>
              <p className="tag">Para quem quer começar com baixo investimento</p>
              <span className="old">R$ 247</span>
              <div className="price">R$ <span data-count="145">0</span><small>/mês</small></div>
              <ul>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Minerador completo</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Buscas ilimitadas</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Todas as ferramentas</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Gerador IA de títulos</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Gerador IA de ideias</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Criar Persona</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Gerar Script com IA</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Templates de Vídeo</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Editor de Vídeo</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Comunidade VIP</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Suporte prioritário</li>
              </ul>
              <a href="#" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); setShowMensalConfirm(true); }}>Começar Agora</a>
            </div>

            <div className="plan vip rv" data-dir="right">
              <span className="ribbon">OFERTA DE LANÇAMENTO — ENCERRANDO EM BREVE</span>
              <h3>Acesso Vitalício<span className="badge">MAIS POPULAR</span></h3>
              <p className="tag">Garanta agora antes do preço voltar para R$ 497</p>
              <span className="old">R$ 497</span>
              <div className="price glow-num">R$ <span data-count="259">0</span></div>
              {config.showCartaoOption && (
                <span className="pill-pay">ou <b>12x de R$ 27,61</b> no cartão</span>
              )}
              <span className="sub-line">Pagamento único — acesso para sempre</span>
              <span className="vagas">⚡ Apenas 10 vagas restantes neste preço</span>
              <ul>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Minerador completo</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Buscas ilimitadas</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Todas as ferramentas</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Gerador IA de títulos</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Gerador IA de ideias</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Criar Persona</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Gerar Script com IA</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Templates de Vídeo</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Editor de Vídeo</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Comunidade VIP</li>
                <li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F4541E" strokeWidth="3"><path className="ck" d="M4 12l5 5L20 6" /></svg>Suporte prioritário</li>
              </ul>
              <a {...ctaVitalicio} className="btn btn-primary">Quero escalar agora <span className="arr">→</span></a>
              {config.showCartaoOption && (
                <p className="under-cta">💳 Parcelamento disponível — consulte no checkout</p>
              )}
            </div>
          </div>
          <div className="trust-row rv" data-dir="up">
            <span>🔒 Pagamento 100% seguro</span>
            <span className="icons">
              <svg width="30" height="18" viewBox="0 0 40 24" fill="#6E6E76"><rect width="40" height="24" rx="4" fill="none" stroke="#3a3a42" /><text x="20" y="16" fontSize="9" textAnchor="middle" fill="#8a8a92" fontFamily="Arial">PIX</text></svg>
              {config.showCartaoOption && (
                <>
                  <svg width="30" height="18" viewBox="0 0 40 24" fill="#6E6E76"><rect width="40" height="24" rx="4" fill="none" stroke="#3a3a42" /><circle cx="16" cy="12" r="6" fill="#55555e" /><circle cx="24" cy="12" r="6" fill="#3a3a42" /></svg>
                  <svg width="30" height="18" viewBox="0 0 40 24" fill="#6E6E76"><rect width="40" height="24" rx="4" fill="none" stroke="#3a3a42" /><rect x="6" y="10" width="28" height="4" fill="#55555e" /></svg>
                </>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════ GUARANTEE ═══════════ */}
      <MemoGuarantee />

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq">
        <div className="wrap">
          <div className="sec-head">
            <span className="pill rv" data-dir="down"><span className="dot"></span>Dúvidas frequentes</span>
            <h2 className="rv" data-dir="up">Perguntas e respostas.</h2>
          </div>
          <div className="list">
            <details className="faq-item rv" data-dir="up"><summary>Preciso já ser afiliado Shopee?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Não! A UpShopee foi feita tanto para quem já é afiliado quanto para quem nunca vendeu. A plataforma e a comunidade te guiam desde o primeiro passo.</div></details>
            <details className="faq-item rv" data-dir="up"><summary>Funciona no celular?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Sim. A plataforma funciona direto do navegador, tanto no celular quanto no computador — sem precisar instalar nada.</div></details>
            <details className="faq-item rv" data-dir="up"><summary>É seguro?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Sim. O pagamento é processado por plataforma segura com criptografia, e você ainda conta com 7 dias de garantia incondicional.</div></details>
            <details className="faq-item rv" data-dir="up"><summary>Como recebo o acesso?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Imediatamente após a confirmação do pagamento, você recebe o acesso por e-mail e já pode começar a usar todas as ferramentas.</div></details>
            <details className="faq-item rv" data-dir="up"><summary>O vitalício tem mensalidade?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Não. O Acesso Vitalício é um pagamento único de R$ 259 — você paga uma vez e usa para sempre, incluindo atualizações.</div></details>
            {config.showCartaoOption && (
              <details className="faq-item rv" data-dir="up"><summary>Posso parcelar?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Sim! O Acesso Vitalício pode ser parcelado em até 12x de R$ 27,61 no cartão de crédito.</div></details>
            )}
            <details className="faq-item rv" data-dir="up"><summary>E se eu não gostar?<svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg></summary><div className="faq-a">Você tem 7 dias de garantia incondicional. Basta pedir o reembolso dentro desse prazo e devolvemos 100% do valor, sem perguntas.</div></details>
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section id="final">
        <div className="wrap">
          <img src={LOGO} alt="UpShopee" className="rv" data-dir="zoom" onError={hideOnError} />
          <h2 className="rv" data-dir="up">Invista uma vez.<br /><span className="grad-text">Lucre sempre.</span></h2>
          <a {...ctaVitalicio} className="btn btn-primary rv" data-dir="up">Quero meu acesso vitalício <span className="arr">→</span></a>
          <p className="micro rv" data-dir="up">✓ Garantia incondicional de 7 dias&nbsp;&nbsp;·&nbsp;&nbsp;🔒 Pagamento 100% seguro</p>
        </div>
      </section>

      <MemoFooter />

      {/* ═══════════ STICKY MOBILE CTA ═══════════ */}
      <div id="sticky" className={stickyShow ? "show" : undefined}>
        <span className="p">Vitalício por <b>R$ 259</b></span>
        <a {...ctaVitalicio} className="btn btn-primary">Garantir <span className="arr">→</span></a>
      </div>

      {/* ═══════════ EXIT POPUP ═══════════ */}
      <div id="exit" className={exitOpen ? "open" : undefined} role="dialog" aria-modal="true" aria-labelledby="exitTitle">
        <div className="bg" data-close onClick={closeExit}></div>
        <div className="card">
          <button className="close" data-close aria-label="Fechar" onClick={closeExit}>✕</button>
          <img src={LOGO} alt="" onError={hideOnError} />
          <h3 id="exitTitle">Espera — antes de sair…</h3>
          <p>Você tem <b style={{ color: "#fff" }}>7 dias de garantia incondicional</b>. O risco é zero: teste a UpShopee e, se não fizer sentido, devolvemos 100% do valor.</p>
          {config.hasPaymentModal ? (
            <a href="#" onClick={(e) => { e.preventDefault(); setExitOpen(false); setPaymentPlan('vitalicio'); }} className="btn btn-primary" style={{ width: "100%" }}>Quero testar sem risco <span className="arr">→</span></a>
          ) : (
            <a href={vitalicioHref} className="btn btn-primary" style={{ width: "100%" }}>Quero testar sem risco <span className="arr">→</span></a>
          )}
          <a href="#" className="dismiss" data-close onClick={closeExit}>Não, prefiro sair</a>
        </div>
      </div>

      {/* ═══════════ PAYMENT METHOD MODAL (only when hasPaymentModal) ═══════════ */}
      {config.hasPaymentModal && (
        <div id="pay-modal" className={paymentPlan ? "open" : undefined} role="dialog" aria-modal="true" aria-label="Escolher método de pagamento">
          <div className="bg" onClick={closePayment}></div>
          <div className="card">
            <button className="close" aria-label="Fechar" onClick={closePayment}>✕</button>
            <img src={LOGO} alt="UpShopee" className="logo" onError={hideOnError} />
            <h3>Como você prefere pagar?</h3>
            <p className="plan-sub">
              {paymentPlan === 'vitalicio' ? 'Acesso Vitalício — R$ 259' : 'Plano Mensal — R$ 145/mês'}
            </p>

            <div className="pay-options">
              {/* Pix */}
              <button
                className={`pay-opt${paymentLoading ? " dim" : ""}`}
                onClick={() => payWith('pix')}
                disabled={paymentLoading}
              >
                <div className="pay-icon">
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="10" fill="#1EBEA5" opacity=".18" />
                    <path d="M15.34 24.72l-3.38-3.4a1.71 1.71 0 010-2.4 1.68 1.68 0 012.4 0l1.78 1.8 5.18-5.2a1.68 1.68 0 012.4 0c.66.67.66 1.75 0 2.42l-6.38 6.4a2.2 2.2 0 01-1.45.5 2.3 2.3 0 01-1.35-.42l-.2-.16.04.02-.04-.56z" fill="#1EBEA5" />
                    <path d="M19.66 6.8l-4.22 4.24a.55.55 0 01-.77 0L13.1 9.48a2.2 2.2 0 01.08-3.08 2.16 2.16 0 013.06.06l.04.04-3.12 3.08 8.08-8.1-3.14-3.16h-.05a4.47 4.47 0 00-6.3 0 4.5 4.5 0 000 6.36l4.24 4.26a2.2 2.2 0 001.54.64 2.16 2.16 0 001.54-.64l4.22-4.24a4.47 4.47 0 000-6.36 4.5 4.5 0 00-6.35 0h-.04z" fill="#1EBEA5" />
                    <path d="M12.72 12.72l-4.08 4.1a4.47 4.47 0 000 6.36 4.5 4.5 0 006.35 0l4.24-4.24c.41-.42.63-.97.64-1.54a2.16 2.16 0 00-.63-1.54l-1.08 1.08-3.17 3.17a2.2 2.2 0 01-3.08 0 2.16 2.16 0 01.06-3.06l.04-.04 3.12-3.12-3.12-3.14-.08-.08z" fill="#1EBEA5" />
                  </svg>
                </div>
                <div className="pay-text">
                  <span className="pay-title">Pagar com Pix</span>
                  <span className="pay-sub">Liberação imediata e 10% de desconto</span>
                </div>
                <span className="pay-pill">Mais rápido</span>
                {paymentLoading && <span className="pay-spin" />}
              </button>

              {/* Cartão */}
              <button
                className={`pay-opt${paymentLoading ? " dim" : ""}`}
                onClick={() => payWith('cartao')}
                disabled={paymentLoading}
              >
                <div className="pay-icon ccard">
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="10" fill="#FF7A45" opacity=".18" />
                    <rect x="5" y="10" width="22" height="13" rx="2.5" stroke="#FF7A45" strokeWidth="1.6" />
                    <rect x="5" y="14" width="22" height="2.5" fill="#FF7A45" opacity=".5" />
                    <rect x="11" y="20" width="5" height="1.6" rx=".8" fill="#FF7A45" opacity=".5" />
                    <rect x="18" y="20" width="4" height="1.6" rx=".8" fill="#FF7A45" opacity=".5" />
                  </svg>
                </div>
                <div className="pay-text">
                  <span className="pay-title">Pagar com Cartão</span>
                  <span className="pay-sub">{paymentPlan === 'vitalicio' ? 'até 12x de R$ 27,61' : 'Parcele em até 12x no cartão'}</span>
                </div>
                {paymentLoading && <span className="pay-spin" />}
              </button>
            </div>

            <p className="pay-reassure">🔒 Pagamento 100% seguro · Garantia de 7 dias</p>
          </div>
        </div>
      )}

      {/* Mensal confirmation popup */}
      {showMensalConfirm && (
        <div className="fixed inset-0 z-[1160] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Confirmar plano mensal">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowMensalConfirm(false)}></div>
          <div className="relative w-full max-w-sm rounded-2xl border border-[#26262B] bg-[#141417] p-7 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-4 top-4 text-[#6E6E76] hover:text-white text-lg" onClick={() => setShowMensalConfirm(false)}>✕</button>

            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-white font-bold text-lg mb-3 font-[Sora]">Tem certeza?</h3>

            <p className="text-[#A0A0A8] text-sm leading-relaxed mb-2">
              O <b className="text-white">Acesso Vitalício</b> custa apenas <b className="text-[#F4541E]">R$ 259</b> — pagamento único, acesso para sempre.
            </p>
            <p className="text-[#A0A0A8] text-sm leading-relaxed mb-5">
              No plano mensal você pagaria <b className="text-white">R$ 1.740 em 1 ano</b>. No vitalício, você economiza <b className="text-[#FF7A45]">R$ 1.481</b>.
            </p>

            {config.hasPaymentModal ? (
              <a href="#" onClick={(e) => { e.preventDefault(); setShowMensalConfirm(false); setPaymentPlan('vitalicio'); }}
                className="block w-full rounded-full bg-gradient-to-r from-[#F4541E] to-[#FF7A45] py-3.5 text-sm font-bold text-white mb-2.5 hover:shadow-lg hover:shadow-[#F4541E]/30 transition-all">
                Quero o Vitalício por R$ 259 →
              </a>
            ) : (
              <a href={config.checkouts.vitalicio.pix} target="_blank" rel="noopener noreferrer"
                className="block w-full rounded-full bg-gradient-to-r from-[#F4541E] to-[#FF7A45] py-3.5 text-sm font-bold text-white mb-2.5 hover:shadow-lg hover:shadow-[#F4541E]/30 transition-all">
                Quero o Vitalício por R$ 259 →
              </a>
            )}

            <button onClick={() => { setShowMensalConfirm(false); if (config.hasPaymentModal) { setPaymentPlan('mensal'); } else { window.open(config.checkouts.mensal.pix, "_blank", "noopener,noreferrer"); } }}
              className="w-full text-[#6E6E76] text-xs hover:text-white transition-colors py-2">
              Continuar com o Plano Mensal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
