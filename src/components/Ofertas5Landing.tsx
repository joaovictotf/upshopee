/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — Ofertas5Landing (landing compartilhada /ofertas5 + /ofertas6)
  ═══════════════════════════════════════════════════════════════
  Fonte única do design usado por /ofertas5 e /ofertas6. Antes eram
  dois arquivos de ~1.100 linhas que precisavam ficar iguais na mão —
  o jeito mais fácil de publicar o link de checkout errado.

  A ÚNICA coisa que varia entre as duas rotas é `config.checkouts`:
   · /ofertas5 é a página do dono — links SEM parâmetro `code`;
   · /ofertas6 é de afiliado — links COM `code=e374ucw`, que é o que
     credita a comissão. Os links moram no arquivo de cada rota.
  Nunca reordenar, encurtar ou "limpar" esses parâmetros.

  Não existe modal de pagamento: cada botão de compra vai direto para
  o checkout Applyfy do plano. Nenhum link IronPay, nenhum "Pix ou
  cartão". Preços, garantia e avisos legais são cópia literal do que
  /ofertas5 já publicava.

  CSS: escopado inteiro em `.o5x`, o wrapper da página — mesmo prefixo
  para as duas rotas, já que agora compartilham a folha. As únicas
  regras fora do wrapper são as duas `:root:has(.o5x)` de
  `scroll-behavior`, que só existem porque o elemento que rola é o
  documento; o `:has()` as deixa inertes em qualquer outra página.
  Os @keyframes usam o prefixo `o5x-` para não colidirem com o app.

  Mesmo tracking global do projeto — nenhum script novo e nenhum
  evento de compra no carregamento.
  ═══════════════════════════════════════════════════════════════
*/
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Plan = "mensal" | "vitalicio";

export interface Ofertas5LandingConfig {
  /** URL de checkout por plano. Texto intocável — ver cabeçalho. */
  checkouts: Record<Plan, string>;
}

type IconName =
  | "search"
  | "chart"
  | "spark"
  | "send"
  | "check"
  | "arrow"
  | "play"
  | "link"
  | "users"
  | "video"
  | "layout"
  | "shield"
  | "menu"
  | "close"
  | "chevron"
  | "phone";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />,
    spark: (
      <>
        <path d="m12 3 1.3 4.2L17.5 9l-4.2 1.8L12 15l-1.3-4.2L6.5 9l4.2-1.8L12 3Z" />
        <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1.1l2-2A5 5 0 0 0 12 4l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="5" width="14" height="14" rx="2" />
        <path d="m17 10 4-2v8l-4-2" />
      </>
    ),
    layout: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    phone: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const platforms = [
  { name: "Shopee", logo: "/platforms/shopee.svg", className: "shopee" },
  { name: "WhatsApp", logo: "/platforms/whatsapp.svg", className: "whatsapp" },
  { name: "Facebook", logo: "/platforms/facebook.svg", className: "facebook" },
  { name: "Instagram", logo: "/platforms/instagram.svg", className: "instagram" },
  { name: "Mercado Livre", logo: "/platforms/mercadolivre.svg", className: "mercadolivre" },
  { name: "SHEIN", logo: "/platforms/shein.svg", className: "shein" },
];

const faq = [
  [
    "Preciso já ser afiliado da Shopee?",
    "Não. A UpShopee atende quem está começando e quem já divulga produtos. Para gerar seu link e receber comissões, você precisa ter ou criar seu cadastro no programa de afiliados da Shopee.",
  ],
  [
    "A UpShopee funciona no celular?",
    "Sim. A plataforma funciona pelo navegador no celular e no computador, sem instalação.",
  ],
  [
    "Preciso aparecer nos vídeos?",
    "Não necessariamente. As ferramentas ajudam a montar conteúdos focados no produto, com roteiro, narração, textos na tela, legenda, hashtags e prompt de vídeo.",
  ],
  [
    "Como encontro produtos dentro da plataforma?",
    "Você pode pesquisar no catálogo e usar informações como comissão, procura, concorrência e vendas do produto na Shopee para escolher o que deseja analisar.",
  ],
  [
    "Quais ferramentas de conteúdo estão disponíveis?",
    "A plataforma reúne geradores de títulos, ideias, textos de anúncio, roteiros, legendas, hashtags, personas e preparação de conteúdo para vídeo.",
  ],
  [
    "Como funciona a divulgação?",
    "Você prepara o texto a partir do produto, encontra páginas públicas de grupos e comunidades e escolhe onde deseja publicar seu link. Alguns grupos podem exigir login ou aprovação.",
  ],
  [
    "Qual a diferença entre o mensal e o vitalício?",
    "O mensal custa R$ 145 por mês enquanto estiver ativo. O vitalício é um pagamento único de R$ 259, com acesso permanente conforme as condições da oferta.",
  ],
  [
    "Existe garantia?",
    "Sim. Você tem 7 dias para testar. Se a plataforma não fizer sentido para você, pode solicitar o reembolso dentro desse prazo.",
  ],
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-lockup">
      <img src="/upshope/logo.webp" width="40" height="40" alt="" />
      {!compact && <span>UpShopee</span>}
    </span>
  );
}

const CSS = `
.o5x{
  --orange: #ee4d2d;
  --orange-dark: #d93e20;
  --orange-soft: #fff1ec;
  --ink: #17191d;
  --ink-2: #24272d;
  --muted: #62666f;
  --muted-2: #8b8f97;
  --line: #e7e5e1;
  --paper: #fcfbf8;
  --white: #ffffff;
  --dark: #111316;
  --green: #16845b;
  --radius-sm: 10px;
  --radius: 18px;
  --radius-lg: 26px;
  --shadow-sm: 0 8px 30px rgba(24, 22, 19, .07);
  --shadow-lg: 0 30px 80px rgba(24, 22, 19, .12);
  --pricing-visible: 0;
}

.o5x, .o5x *{ box-sizing: border-box; }
:root:has(.o5x) { scroll-behavior: smooth; }
.o5x{ margin: 0; min-height: 100dvh; overflow-x: clip; background: var(--paper); color: var(--ink); font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
.o5x button, .o5x a{ font: inherit; }
.o5x button{ cursor: pointer; }
.o5x a{ color: inherit; text-decoration: none; }
.o5x img{ display: block; max-width: 100%; }
.o5x ::selection{ background: #ffd2c3; color: var(--ink); }
.o5x :focus-visible{ outline: 3px solid rgba(238, 77, 45, .35); outline-offset: 3px; }

.o5x .container{ width: min(1240px, calc(100% - 64px)); margin-inline: auto; }
.o5x .section{ padding: 120px 0; }
.o5x .eyebrow{ margin: 0 0 18px; color: var(--orange); font-size: .75rem; line-height: 1; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
.o5x .eyebrow.light{ color: #ff9f81; }
.o5x .eyebrow > span{ display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: var(--orange); box-shadow: 0 0 0 5px rgba(238,77,45,.09); vertical-align: 1px; }
.o5x h1, .o5x h2, .o5x h3, .o5x h4, .o5x p{ margin-top: 0; }
.o5x h1, .o5x h2, .o5x h3{ font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: -.045em; }
.o5x h2{ margin-bottom: 20px; font-size: clamp(2.15rem, 4.4vw, 3.65rem); line-height: 1.06; }

.o5x .site-header{ position: fixed; z-index: 100; inset: 0 0 auto; height: 74px; border-bottom: 1px solid rgba(222,218,211,.78); background: rgba(252,251,248,.88); backdrop-filter: blur(16px); }
.o5x .nav-wrap{ height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
.o5x .brand-lockup{ display: inline-flex; align-items: center; gap: 10px; font-size: 1.03rem; font-weight: 800; letter-spacing: -.03em; }
.o5x .brand-lockup img{ width: 36px; height: 36px; object-fit: contain; }
.o5x .desktop-nav{ display: flex; align-items: center; gap: 34px; margin-left: auto; }
.o5x .desktop-nav a{ position: relative; color: #4e5259; font-size: .88rem; font-weight: 650; }
.o5x .desktop-nav a::after{ content: ""; position: absolute; left: 0; right: 100%; bottom: -8px; height: 2px; background: var(--orange); transition: right .22s ease; }
.o5x .desktop-nav a:hover::after{ right: 0; }
.o5x .nav-actions{ display: flex; align-items: center; gap: 10px; }
.o5x .menu-button{ display: none; align-items: center; justify-content: center; width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 11px; background: var(--white); color: var(--ink); }
.o5x .mobile-menu{ display: none; }

.o5x .button{ min-height: 54px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 0 24px; border: 1px solid transparent; border-radius: 12px; font-size: .82rem; font-weight: 850; letter-spacing: .055em; transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease; }
.o5x .button:hover{ transform: translateY(-2px); }
.o5x .button-primary{ color: #fff; background: var(--orange); box-shadow: 0 10px 24px rgba(238, 77, 45, .22); }
.o5x .button-primary:hover{ background: var(--orange-dark); box-shadow: 0 14px 32px rgba(238, 77, 45, .28); }
.o5x .button-secondary{ border-color: #d9d6d1; color: var(--ink); background: rgba(255,255,255,.74); }
.o5x .button-secondary:hover{ border-color: #bbb7b0; background: #fff; }
.o5x .button-small{ min-height: 42px; padding: 0 17px; font-size: .72rem; border-radius: 10px; }

.o5x .hero{ position: relative; min-height: clamp(650px,calc(100svh - 130px),820px); display: grid; place-items: center; padding: 112px 0 44px; background: radial-gradient(circle at 50% 43%,rgba(238,77,45,.075),transparent 35%),linear-gradient(180deg,#fff 0%,#fdfbf8 100%); overflow: hidden; }
.o5x .hero::before{ content: ""; position: absolute; width: min(880px,82vw); aspect-ratio: 1; border: 1px solid rgba(238,77,45,.08); border-radius: 50%; left: 50%; top: 48%; transform: translate(-50%,-50%); pointer-events: none; }
.o5x .hero-simple-inner{ position: relative; z-index: 2; display: flex; align-items: center; flex-direction: column; text-align: center; }
.o5x .hero-eyebrow{ justify-content: center; margin-bottom: 25px; }
.o5x .hero h1{ max-width: 1040px; margin: 0 auto 27px; font-size: clamp(4rem,7vw,6.9rem); line-height: .92; font-weight: 820; letter-spacing: -.065em; text-wrap: balance; }
.o5x .hero h1 > span{ color: var(--orange); }
.o5x .hero-sub{ max-width: 710px; margin: 0 auto 31px; color: #585c63; font-size: 1.16rem; line-height: 1.65; text-wrap: balance; }
.o5x .hero-actions{ display: flex; justify-content: center; }
.o5x .hero-primary{ position: relative; overflow: hidden; animation: heroCtaBreath 2.8s ease-in-out infinite; }
.o5x .hero-primary::after{ content: ""; position: absolute; inset: -80% auto -80% -30%; width: 22%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.46),transparent); transform: rotate(16deg); animation: heroCtaSweep 3.6s ease-in-out infinite; }
.o5x .hero-primary{ min-height: 58px; padding-inline: 31px; }
.o5x .trust-mini{ display: flex; justify-content: center; flex-wrap: wrap; gap: 18px; margin-top: 23px; color: #646870; font-size: .8rem; font-weight: 650; }
.o5x .trust-mini span{ display: flex; align-items: center; gap: 6px; }
.o5x .trust-mini svg{ color: var(--orange); }
.o5x .hero-scroll{ display: flex; align-items: center; flex-direction: column; gap: 6px; margin-top: 28px; padding: 6px 12px; color: #898b90; font-size: .61rem; font-weight: 800; letter-spacing: .11em; transition: color .2s ease; }
.o5x .hero-scroll:hover{ color: var(--orange); }
.o5x .hero-scroll svg{ animation: scrollNudge 1.8s ease-in-out infinite; }
.o5x .hero-product{ position: relative; min-width: 0; padding: 22px 0 30px; }
.o5x .hero-product-label{ display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0 3px 11px; color: #85888e; font-size: .61rem; }
.o5x .hero-product-label span{ display: flex; align-items: center; gap: 7px; font-weight: 820; letter-spacing: .09em; }
.o5x .hero-product-label i{ width: 7px; height: 7px; border-radius: 50%; background: #19a36f; box-shadow: 0 0 0 5px rgba(25,163,111,.1); }
.o5x .hero-product-label strong{ color: #64676e; font-size: .65rem; }

.o5x .product-frame{ position: relative; width: 100%; overflow: hidden; border: 1px solid #ddd9d2; border-radius: 19px; background: #fff; box-shadow: var(--shadow-lg); }
.o5x .window-bar{ height: 42px; display: flex; align-items: center; gap: 6px; padding: 0 14px; border-bottom: 1px solid #ece9e4; background: #faf9f7; color: #9a9ca0; font-size: .66rem; }
.o5x .window-bar > span{ width: 8px; height: 8px; border-radius: 50%; background: #d7d4cf; }
.o5x .window-bar > span:first-child{ background: #f29b86; }
.o5x .window-bar p{ margin: 0 auto; padding: 5px 20px; border: 1px solid #e7e4df; border-radius: 6px; background: #fff; color: #9b9da1; }
.o5x .window-bar em{ font-style: normal; color: #a3a4a7; }
.o5x .product-shell{ min-height: 438px; display: grid; grid-template-columns: 62px 1fr; }
.o5x .product-shell aside{ padding: 14px 10px; border-right: 1px solid #ece9e5; background: #faf9f7; }
.o5x .product-shell aside .brand-lockup{ display: flex; justify-content: center; margin-bottom: 26px; }
.o5x .product-shell aside .brand-lockup img{ width: 32px; height: 32px; }
.o5x .side-line{ width: 38px; height: 38px; display: grid; place-items: center; margin: 8px auto; border-radius: 9px; color: #8f9196; }
.o5x .side-line.active{ color: var(--orange); background: var(--orange-soft); }
.o5x .app-screen{ min-width: 0; padding: 26px 28px 22px; background: #fff; }
.o5x .screen-toolbar{ display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.o5x .screen-toolbar h3, .o5x .selected-product h3{ margin: 3px 0 0; font-size: 1.08rem; letter-spacing: -.025em; }
.o5x .ui-kicker{ color: #a1a3a7; font-size: .58rem; font-weight: 800; letter-spacing: .13em; }
.o5x .fake-search{ width: 200px; height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #e7e5e1; border-radius: 8px; color: #a0a2a7; font-size: .69rem; }
.o5x .filter-row{ display: flex; gap: 6px; margin: 20px 0 16px; overflow: hidden; }
.o5x .filter-row span{ flex: none; padding: 7px 10px; border: 1px solid #ece9e4; border-radius: 7px; color: #85888f; font-size: .61rem; }
.o5x .filter-row .active{ color: var(--orange); border-color: #fac7b7; background: var(--orange-soft); }
.o5x .product-list{ display: grid; gap: 9px; }
.o5x .mini-product{ min-width: 0; display: grid; grid-template-columns: 58px 1fr 28px; align-items: center; gap: 12px; padding: 10px; border: 1px solid #ece9e5; border-radius: 11px; background: #fff; }
.o5x .mini-product > img{ width: 58px; height: 58px; border-radius: 8px; object-fit: cover; }
.o5x .mini-product h4{ margin: 3px 0 2px; overflow: hidden; font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
.o5x .mini-product p{ margin: 0; color: #888b91; font-size: .62rem; }
.o5x .mini-product p strong{ color: var(--orange); }
.o5x .ui-tag{ display: inline-block; padding: 3px 6px; border-radius: 4px; background: #fff0ea; color: var(--orange); font-size: .49rem; font-weight: 800; }
.o5x .save-dot{ width: 26px; height: 26px; border: 1px solid #e9e6e1; border-radius: 7px; background: #fff; color: #a0a2a6; }
.o5x .floating-card{ position: absolute; z-index: 3; display: flex; align-items: center; gap: 11px; padding: 13px 16px; border: 1px solid #e4e0da; border-radius: 13px; background: rgba(255,255,255,.96); box-shadow: var(--shadow-sm); }
.o5x .floating-card small{ display: block; margin-bottom: 3px; color: #8b8e94; font-size: .63rem; }
.o5x .floating-card strong{ font-size: .79rem; }
.o5x .float-icon{ width: 36px; height: 36px; display: grid; place-items: center; border-radius: 9px; color: #18895e; background: #e8f7f1; }
.o5x .float-icon.orange{ color: var(--orange); background: var(--orange-soft); }
.o5x .floating-commission{ left: -34px; bottom: -3px; }
.o5x .floating-action{ right: -26px; top: 2px; }

.o5x .analysis-screen, .o5x .content-screen, .o5x .distribution-screen{ min-height: 438px; }
.o5x .selected-product{ display: flex; align-items: center; gap: 16px; padding: 15px; border: 1px solid #ece9e5; border-radius: 12px; }
.o5x .selected-product img{ width: 76px; height: 76px; object-fit: cover; border-radius: 9px; }
.o5x .selected-product p{ margin: 4px 0 0; color: var(--muted-2); font-size: .69rem; }
.o5x .metric-grid{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
.o5x .metric-grid > div{ padding: 14px; border: 1px solid #ece9e5; border-radius: 10px; }
.o5x .metric-grid span, .o5x .metric-grid small{ display: block; color: #919399; font-size: .58rem; }
.o5x .metric-grid strong{ display: block; margin: 5px 0 3px; font-size: 1.15rem; }
.o5x .sales-panel{ padding: 15px; border: 1px solid #ece9e5; border-radius: 11px; }
.o5x .sales-panel > div:first-child{ display: flex; justify-content: space-between; font-size: .65rem; font-weight: 700; }
.o5x .sales-panel b{ color: var(--orange); }
.o5x .sales-panel p{ margin: 7px 0 0; color: #a0a2a6; font-size: .54rem; }
.o5x .bars-demo{ height: 95px; display: flex; align-items: flex-end; gap: 8px; margin-top: 10px; }
.o5x .bars-demo i{ flex: 1; height: 38%; border-radius: 4px 4px 1px 1px; background: #f2d3c9; }
.o5x .bars-demo i:nth-child(2){ height: 50%; }.o5x .bars-demo i:nth-child(3){ height: 42%; }.o5x .bars-demo i:nth-child(4){ height: 72%; background: var(--orange); }.o5x .bars-demo i:nth-child(5){ height: 61%; }.o5x .bars-demo i:nth-child(6){ height: 84%; background: #f28b71; }.o5x .bars-demo i:nth-child(7){ height: 68%; }
.o5x .status-chip{ display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 20px; color: #177b56; background: #ecf8f3; font-size: .62rem; font-weight: 700; }
.o5x .status-chip i{ width: 6px; height: 6px; border-radius: 50%; background: #1da46f; }
.o5x .content-layout{ display: grid; grid-template-columns: .65fr 1.35fr; gap: 14px; margin-top: 18px; }
.o5x .content-product, .o5x .generated-copy{ padding: 16px; border: 1px solid #ece9e5; border-radius: 12px; }
.o5x .content-product img{ width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 9px; }
.o5x .content-product strong, .o5x .content-product span{ display: block; }
.o5x .content-product strong{ margin-top: 11px; font-size: .7rem; }.o5x .content-product span{ margin-top: 3px; color: #96989d; font-size: .58rem; }
.o5x .copy-tabs{ display: flex; gap: 18px; padding-bottom: 10px; border-bottom: 1px solid #eeeae5; font-size: .62rem; }.o5x .copy-tabs b{ color: var(--orange); }.o5x .copy-tabs span{ color: #96989c; }
.o5x .generated-copy label{ display: block; margin: 13px 0 5px; color: #9b9da1; font-size: .56rem; font-weight: 700; }.o5x .generated-copy p{ margin: 0; padding: 9px; border-radius: 7px; background: #faf9f7; font-size: .63rem; }
.o5x .copy-lines{ display: grid; gap: 6px; padding: 10px; border-radius: 7px; background: #faf9f7; }.o5x .copy-lines i{ height: 5px; border-radius: 4px; background: #dedbd6; }.o5x .copy-lines i:nth-child(2){ width: 86%; }.o5x .copy-lines i:nth-child(3){ width: 66%; }
.o5x .generated-copy button, .o5x .small-action{ display: flex; align-items: center; gap: 6px; margin-top: 12px; padding: 8px 10px; border: 0; border-radius: 7px; color: #fff; background: var(--orange); font-size: .59rem; font-weight: 750; }
.o5x .group-list{ display: grid; gap: 9px; margin-top: 18px; }.o5x .group-row{ display: grid; grid-template-columns: 36px 1fr auto auto; align-items: center; gap: 10px; padding: 10px; border: 1px solid #ece9e5; border-radius: 10px; }
.o5x .channel-icon{ width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px; color: #17895f; background: #eaf8f2; }.o5x .channel-icon.c1{ color: #3467ad; background: #edf3fb; }.o5x .channel-icon.c2{ color: var(--orange); background: var(--orange-soft); }
.o5x .group-row strong, .o5x .group-row small{ display: block; }.o5x .group-row strong{ font-size: .67rem; }.o5x .group-row small{ margin-top: 2px; color: #96989d; font-size: .53rem; }.o5x .group-row button{ padding: 7px 9px; border: 1px solid #e2dfda; border-radius: 6px; background: #fff; font-size: .55rem; }.o5x .group-status{ color: #16835b; font-size: .54rem; }
.o5x .demo-note{ margin: 11px 0 0; color: #999ba0; font-size: .55rem; }

.o5x .trust-bar{ border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: #fff; }
.o5x .trust-items{ min-height: 86px; display: grid; grid-template-columns: repeat(5, 1fr); align-items: center; }
.o5x .trust-items span{ display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 40px; padding: 0 16px; border-right: 1px solid var(--line); color: #595d64; font-size: .77rem; font-weight: 700; text-align: center; }
.o5x .trust-items span:last-child{ border-right: 0; }.o5x .trust-items svg{ color: var(--orange); }

.o5x .why-section{ padding: 72px 0 104px; border-bottom: 1px solid var(--line); background: #fff; scroll-margin-top: 74px; }
.o5x .why-heading{ display: grid; grid-template-columns: 1.15fr .85fr; column-gap: 80px; align-items: end; margin-bottom: 46px; }
.o5x .why-heading .eyebrow{ grid-column: 1 / -1; }
.o5x .why-heading h2{ margin: 0; font-size: clamp(2.25rem,4vw,3.55rem); }
.o5x .why-heading h2 span{ color: var(--orange); }
.o5x .why-heading > p:last-child{ max-width: 470px; margin: 0 0 5px; color: var(--muted); font-size: .97rem; line-height: 1.7; }
.o5x .why-grid{ display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.o5x .why-card{ position: relative; min-height: 270px; display: flex; flex-direction: column; justify-content: space-between; gap: 36px; padding: 30px; border: 1px solid #e2dfda; border-radius: 19px; background: #fff; box-shadow: 0 14px 42px rgba(24,22,19,.055); overflow: hidden; transition: transform .22s ease,border-color .22s ease,box-shadow .22s ease; }
.o5x .why-card::before{ content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--orange); transform: scaleY(0); transform-origin: bottom; transition: transform .25s ease; }
.o5x .why-card:hover{ transform: translateY(-5px); border-color: #efb4a5; box-shadow: 0 22px 55px rgba(58,35,26,.1); }
.o5x .why-card:hover::before, .o5x .why-card.featured::before{ transform: scaleY(1); }
.o5x .why-card.featured{ border-color: #efb4a5; background: linear-gradient(145deg,#fff 0%,#fff7f3 100%); }
.o5x .why-icon{ width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid #f1c3b7; border-radius: 13px; color: var(--orange); background: var(--orange-soft); }
.o5x .why-card h3{ margin-bottom: 11px; font-size: 1.28rem; letter-spacing: -.035em; }
.o5x .why-card p{ max-width: 335px; margin: 0; color: var(--muted); font-size: .86rem; line-height: 1.65; }
.o5x .why-number{ position: absolute; right: 24px; top: 25px; color: #b5b3ae; font-size: .61rem; font-weight: 850; letter-spacing: .1em; }

.o5x .platform-section{ padding: 92px 0 72px; border-bottom: 1px solid var(--line); background: #fff; overflow: hidden; }
.o5x .platform-heading{ display: grid; grid-template-columns: .9fr 1.1fr; column-gap: 80px; align-items: end; }
.o5x .platform-heading .eyebrow{ grid-column: 1 / -1; }
.o5x .platform-heading h2{ margin: 0; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.o5x .platform-heading h2 span{ color: var(--orange); }
.o5x .platform-heading > p:last-child{ max-width: 500px; margin: 0 0 5px; color: var(--muted); font-size: 1rem; line-height: 1.7; }
.o5x .platform-marquee{ position: relative; width: 100%; margin-top: 55px; overflow: hidden; }
.o5x .platform-marquee::before, .o5x .platform-marquee::after{ content: ""; position: absolute; z-index: 2; top: 0; bottom: 0; width: min(12vw, 170px); pointer-events: none; }
.o5x .platform-marquee::before{ left: 0; background: linear-gradient(90deg,#fff,rgba(255,255,255,0)); }
.o5x .platform-marquee::after{ right: 0; background: linear-gradient(-90deg,#fff,rgba(255,255,255,0)); }
.o5x .platform-track{ width: max-content; display: flex; gap: 14px; padding: 2px 7px; animation: platformLoop 30s linear infinite; }
.o5x .platform-marquee:hover .platform-track{ animation-play-state: paused; }
.o5x .platform-chip{ min-width: 210px; height: 78px; display: flex; align-items: center; gap: 14px; padding: 0 20px; border: 1px solid #e4e1dc; border-radius: 14px; background: #fff; box-shadow: 0 7px 24px rgba(24,22,19,.045); }
.o5x .platform-chip > span{ flex: none; width: 43px; height: 43px; display: grid; place-items: center; border-radius: 11px; background: #f5f4f1; }
.o5x .platform-chip img{ max-width: 27px; max-height: 27px; object-fit: contain; }
.o5x .platform-chip strong{ font-size: .9rem; letter-spacing: -.02em; }
.o5x .platform-chip.shopee > span{ background: #fff0eb; }.o5x .platform-chip.shopee img{ filter: invert(38%) sepia(94%) saturate(1849%) hue-rotate(344deg) brightness(98%) contrast(90%); }
.o5x .platform-chip.whatsapp > span{ background: #eaf9f0; }.o5x .platform-chip.whatsapp img{ filter: invert(61%) sepia(72%) saturate(483%) hue-rotate(93deg) brightness(88%) contrast(92%); }
.o5x .platform-chip.facebook > span{ background: #edf3ff; }.o5x .platform-chip.facebook img{ filter: invert(38%) sepia(82%) saturate(783%) hue-rotate(182deg) brightness(82%) contrast(95%); }
.o5x .platform-chip.instagram > span{ background: #fff0f5; }.o5x .platform-chip.instagram img{ filter: invert(30%) sepia(89%) saturate(3003%) hue-rotate(311deg) brightness(89%) contrast(93%); }
.o5x .platform-chip.mercadolivre > span{ background: #fff7cf; }.o5x .platform-chip.mercadolivre img{ max-width: 34px; max-height: 22px; }
.o5x .platform-chip.shein > span{ background: #f2f2f2; }.o5x .platform-chip.shein img{ max-width: 31px; }
.o5x .platform-note{ display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 22px; color: #8c8f95; font-size: .65rem; text-align: center; }
.o5x .platform-note svg{ flex: none; color: #a5a7ab; }

.o5x .narrow-head{ max-width: 780px; margin-bottom: 58px; }
.o5x .narrow-head > p:last-child, .o5x .centered-head > p:last-child{ max-width: 700px; color: var(--muted); font-size: 1.05rem; line-height: 1.7; }
.o5x .comparison-grid{ display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.o5x .comparison-card{ padding: 40px; border: 1px solid var(--line); border-radius: var(--radius-lg); background: #fff; }
.o5x .comparison-card.muted{ background: #f2f1ee; }
.o5x .comparison-card.organized{ border-color: #f0bcae; box-shadow: inset 0 4px 0 var(--orange); }
.o5x .comparison-title{ display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-bottom: 25px; border-bottom: 1px solid rgba(206,203,197,.8); }
.o5x .comparison-title span{ font-size: .72rem; font-weight: 850; letter-spacing: .13em; }.o5x .comparison-title em{ color: #8a8d93; font-size: .73rem; font-style: normal; }
.o5x .comparison-card ul{ display: grid; gap: 18px; margin: 28px 0 0; padding: 0; list-style: none; }.o5x .comparison-card li{ display: flex; align-items: center; gap: 12px; color: #555960; font-size: .94rem; }
.o5x .minus, .o5x .check-icon{ flex: none; width: 25px; height: 25px; display: grid; place-items: center; border-radius: 50%; }.o5x .minus{ color: #999b9f; background: #e7e5e1; }.o5x .check-icon{ color: #fff; background: var(--orange); }

.o5x .journey-section{ background: #fff; }
.o5x .journey-layout{ display: grid; grid-template-columns: .75fr 1.25fr; gap: 96px; }
.o5x .journey-intro{ position: sticky; top: 150px; align-self: start; }.o5x .journey-intro > p:not(.eyebrow){ max-width: 430px; color: var(--muted); line-height: 1.7; }.o5x .text-link{ display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; color: var(--orange); font-size: .78rem; font-weight: 850; letter-spacing: .07em; }
.o5x .journey-steps{ position: relative; display: grid; }
.o5x .journey-step{ position: relative; display: grid; grid-template-columns: 48px 52px 1fr; gap: 20px; min-height: 170px; padding: 32px 0; border-bottom: 1px solid var(--line); }.o5x .journey-step:first-child{ padding-top: 0; }.o5x .journey-step:last-child{ border-bottom: 0; }
.o5x .step-number{ color: #aaa9a5; font-size: .68rem; font-weight: 800; letter-spacing: .1em; }.o5x .step-icon{ width: 50px; height: 50px; display: grid; place-items: center; border: 1px solid #f3c1b4; border-radius: 13px; color: var(--orange); background: var(--orange-soft); }
.o5x .journey-step h3{ margin: 0 0 9px; font-size: 1.45rem; }.o5x .journey-step p{ max-width: 460px; margin: 0; color: var(--muted); line-height: 1.65; }.o5x .step-connector{ position: absolute; left: 71px; top: 83px; bottom: -36px; width: 1px; background: #efcfc5; }

.o5x .product-demo-section{ overflow: hidden; background: #f1f0ed; }
.o5x .centered-head{ display: flex; flex-direction: column; align-items: center; text-align: center; }.o5x .centered-head > p:last-child{ margin-left: auto; margin-right: auto; }
.o5x .remotion-showcase{ display: grid; grid-template-columns: 1.45fr .55fr; gap: 16px; margin-top: 50px; }
.o5x .remotion-stage{ position: relative; min-height: 500px; border-radius: 24px; background: #121417; box-shadow: 0 30px 80px rgba(24,22,19,.16); overflow: hidden; }
.o5x .remotion-stage > img{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: .75; }
.o5x .remotion-shade{ position: absolute; inset: 0; background: linear-gradient(90deg,rgba(10,12,14,.94) 0%,rgba(10,12,14,.63) 47%,rgba(10,12,14,.1) 100%),linear-gradient(0deg,rgba(10,12,14,.48),transparent 45%); }
.o5x .remotion-copy{ position: absolute; z-index: 2; left: 48px; bottom: 46px; max-width: 540px; color: #fff; }
.o5x .remotion-label{ display: flex; align-items: center; gap: 8px; margin-bottom: 18px; color: #ff9f81; font-size: .66rem; font-weight: 850; letter-spacing: .13em; }
.o5x .remotion-copy h3{ margin-bottom: 24px; font-size: clamp(2rem,3.2vw,3rem); line-height: 1.06; }
.o5x .video-play{ display: inline-flex; align-items: center; gap: 12px; font-size: .72rem; font-weight: 820; letter-spacing: .08em; }
.o5x .video-play > span{ width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: var(--orange); box-shadow: 0 12px 30px rgba(238,77,45,.32); transition: transform .2s ease; }
.o5x .video-play:hover > span{ transform: scale(1.06); }
.o5x .remotion-side{ display: grid; grid-template-columns: 34px 1fr; align-content: center; gap: 0 12px; padding: 34px; border: 1px solid #dedbd5; border-radius: 24px; background: rgba(255,255,255,.75); }
.o5x .remotion-side > span{ width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid #f0b6a7; border-radius: 8px; color: var(--orange); background: var(--orange-soft); font-size: .57rem; font-weight: 850; }
.o5x .remotion-side > div{ padding-bottom: 27px; }
.o5x .remotion-side > div:last-child{ padding-bottom: 0; }
.o5x .remotion-side strong{ display: block; margin: 4px 0 7px; font-size: .87rem; }
.o5x .remotion-side p{ margin: 0; color: var(--muted); font-size: .73rem; line-height: 1.55; }
.o5x .demo-tabs{ display: flex; justify-content: center; gap: 7px; margin-top: 72px; scroll-margin-top: 100px; }.o5x .demo-tabs button{ padding: 11px 20px; border: 1px solid #dcd9d3; border-radius: 9px; color: #6e7177; background: rgba(255,255,255,.7); font-size: .78rem; font-weight: 750; }.o5x .demo-tabs button[aria-selected="true"]{ border-color: var(--orange); color: #fff; background: var(--orange); }
.o5x .demo-frame-wrap{ max-width: 1100px; margin-top: 26px; }.o5x .demo-frame-wrap .product-frame{ box-shadow: 0 35px 100px rgba(25,23,20,.14); }.o5x .demo-frame-wrap .product-shell{ min-height: 510px; }.o5x .demo-frame-wrap .app-screen{ padding: 38px 42px; }.o5x .demo-frame-wrap .analysis-screen, .o5x .demo-frame-wrap .content-screen, .o5x .demo-frame-wrap .distribution-screen{ min-height: 510px; }
.o5x .demo-caption{ max-width: 1100px; display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; color: #787b80; font-size: .76rem; }.o5x .demo-caption span{ display: flex; align-items: center; gap: 8px; }.o5x .demo-caption i{ width: 7px; height: 7px; border-radius: 50%; background: #1ca56f; }.o5x .demo-caption p{ margin: 0; }

.o5x .video-section{ color: var(--ink); background: #fff; }
.o5x .video-section .eyebrow.light{ color: var(--orange); }
.o5x .video-grid{ display: grid; grid-template-columns: .9fr 1.1fr; align-items: center; gap: 88px; }.o5x .video-copy > p:not(.eyebrow){ max-width: 520px; color: var(--muted); font-size: 1.05rem; line-height: 1.75; }.o5x .video-copy h2{ max-width: 560px; }
.o5x .no-face{ display: flex; gap: 14px; max-width: 520px; margin-top: 34px; padding: 20px; border: 1px solid #e5e2dc; border-radius: 15px; background: #faf9f6; box-shadow: 0 10px 30px rgba(24,22,19,.05); }.o5x .no-face > span{ flex: none; width: 43px; height: 43px; display: grid; place-items: center; border-radius: 11px; color: var(--orange); background: var(--orange-soft); }.o5x .no-face strong{ font-size: .88rem; }.o5x .no-face p{ margin: 5px 0 0; color: var(--muted); font-size: .78rem; line-height: 1.55; }
.o5x .video-workflow{ padding: 26px; border: 1px solid #e2dfd9; border-radius: 20px; background: #fff; box-shadow: 0 28px 80px rgba(24,22,19,.1); }.o5x .workflow-top{ display: flex; justify-content: space-between; padding-bottom: 18px; border-bottom: 1px solid #ebe8e3; font-size: .66rem; font-weight: 800; letter-spacing: .12em; }.o5x .workflow-top em{ color: var(--green); font-style: normal; letter-spacing: 0; }
.o5x .workflow-product{ display: flex; align-items: center; gap: 15px; margin: 20px 0; }.o5x .workflow-product img{ width: 78px; height: 78px; border: 1px solid #ece8e2; border-radius: 11px; object-fit: cover; }.o5x .workflow-product small, .o5x .workflow-product strong, .o5x .workflow-product span{ display: block; }.o5x .workflow-product small{ color: #8b8e94; font-size: .61rem; }.o5x .workflow-product strong{ margin: 5px 0; font-size: .84rem; }.o5x .workflow-product span{ color: var(--green); font-size: .64rem; }
.o5x .style-select{ display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; }.o5x .style-select span{ padding: 9px 5px; border: 1px solid #e4e1db; border-radius: 8px; color: #7c7f85; background: #fbfaf8; font-size: .61rem; text-align: center; }.o5x .style-select .selected{ border-color: #efaa98; color: var(--orange); background: var(--orange-soft); }
.o5x .script-card{ display: grid; gap: 14px; margin: 16px 0; padding: 16px; border: 1px solid #e7e4de; border-radius: 11px; background: #faf9f7; }.o5x .script-card span{ display: block; margin-bottom: 7px; color: #96989d; font-size: .55rem; letter-spacing: .1em; }.o5x .script-card b{ color: var(--ink); font-size: .69rem; font-weight: 600; }.o5x .script-card i{ display: block; height: 5px; margin-top: 5px; border-radius: 4px; background: #dedbd5; }.o5x .script-card i:nth-child(3){ width: 84%; }.o5x .script-card i:nth-child(4){ width: 66%; }.o5x .video-workflow > button{ width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 9px; color: #fff; background: var(--orange); font-size: .69rem; font-weight: 800; letter-spacing: .05em; }

.o5x .distribution-section{ background: #fff; }
.o5x .distribution-hub{ position: relative; height: 500px; margin-top: 36px; border: 1px solid var(--line); border-radius: 28px; background: linear-gradient(180deg,#fbfaf7,#f5f3ef); overflow: hidden; }.o5x .distribution-hub::before{ content: ""; position: absolute; inset: 50%; width: 440px; height: 440px; border: 1px dashed #e3c9c1; border-radius: 50%; transform: translate(-50%,-50%); }
.o5x .hub-center{ position: absolute; z-index: 2; left: 50%; top: 50%; width: 270px; display: flex; flex-direction: column; align-items: center; padding: 25px; border: 1px solid #e4dfd8; border-radius: 18px; background: #fff; box-shadow: var(--shadow-lg); transform: translate(-50%,-50%); text-align: center; }.o5x .hub-center img{ width: 80px; height: 80px; margin-bottom: 14px; border-radius: 11px; object-fit: cover; }.o5x .hub-center > span{ color: var(--orange); font-size: .55rem; font-weight: 800; letter-spacing: .11em; }.o5x .hub-center > strong{ margin: 7px 0 12px; font-size: .96rem; }.o5x .hub-center > div{ display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 7px; color: #7e8187; background: #f4f3f0; font-size: .6rem; }
.o5x .hub-channel{ position: absolute; z-index: 2; display: flex; align-items: center; gap: 12px; min-width: 205px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: #fff; box-shadow: var(--shadow-sm); }.o5x .hub-channel > span, .o5x .hub-channel > svg{ flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 9px; color: #fff; background: #24a66e; font-size: .9rem; font-weight: 800; }.o5x .hub-channel strong, .o5x .hub-channel small{ display: block; }.o5x .hub-channel strong{ font-size: .79rem; }.o5x .hub-channel small{ margin-top: 3px; color: #92949a; font-size: .61rem; }.o5x .hub-channel.whatsapp{ left: 10%; top: 17%; }.o5x .hub-channel.facebook{ right: 10%; top: 17%; }.o5x .hub-channel.video{ left: 10%; bottom: 17%; }.o5x .hub-channel.copy{ right: 10%; bottom: 17%; }.o5x .hub-channel.facebook > span{ background: #3f6fb3; }.o5x .hub-channel.video > svg, .o5x .hub-channel.copy > svg{ padding: 8px; color: var(--orange); background: var(--orange-soft); }

.o5x .features-section{ background: #f1f0ed; }
.o5x .feature-head{ display: flex; align-items: end; justify-content: space-between; gap: 50px; margin-bottom: 52px; }.o5x .feature-head h2{ margin-bottom: 0; }.o5x .feature-head > p{ max-width: 440px; margin: 0; color: var(--muted); line-height: 1.65; }
.o5x .bento-grid{ display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }.o5x .feature-card{ position: relative; min-height: 260px; padding: 28px; border: 1px solid #dedbd5; border-radius: 18px; background: rgba(255,255,255,.78); overflow: hidden; }.o5x .feature-card h3{ margin: 18px 0 9px; font-size: 1.28rem; }.o5x .feature-card p{ margin: 0; color: var(--muted); font-size: .86rem; line-height: 1.6; }.o5x .feature-index{ color: #a6a5a1; font-size: .62rem; font-weight: 800; letter-spacing: .1em; }.o5x .feature-symbol{ width: 43px; height: 43px; display: grid; place-items: center; margin-top: 42px; border-radius: 11px; color: var(--orange); background: var(--orange-soft); }.o5x .feature-large{ grid-column: span 2; grid-row: span 2; min-height: 540px; }.o5x .feature-tall{ grid-row: span 2; min-height: 540px; }.o5x .catalog-preview{ display: grid; gap: 8px; margin-top: 28px; padding: 13px; border: 1px solid #e5e1db; border-radius: 13px; background: #f8f7f4; }.o5x .catalog-search{ display: flex; align-items: center; gap: 7px; padding: 10px; border: 1px solid #e6e2dc; border-radius: 8px; color: #9c9da1; background: #fff; font-size: .64rem; }.o5x .catalog-row{ display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 10px; padding: 8px; border-radius: 9px; background: #fff; }.o5x .catalog-row img{ width: 44px; height: 44px; border-radius: 7px; object-fit: cover; }.o5x .catalog-row b, .o5x .catalog-row small{ display: block; }.o5x .catalog-row b{ color: #41444a; font-size: .65rem; }.o5x .catalog-row small{ margin-top: 2px; color: #9b9da1; font-size: .55rem; }.o5x .catalog-row em{ color: var(--orange); font-size: .68rem; font-style: normal; font-weight: 800; }
.o5x .text-preview{ display: grid; gap: 10px; margin-top: 32px; padding: 17px; border: 1px solid #e7e3dd; border-radius: 13px; background: #faf9f6; }.o5x .text-preview span{ color: #85888e; font-size: .63rem; font-weight: 700; }.o5x .text-preview i{ height: 7px; border-radius: 5px; background: #dfdcd6; }.o5x .text-preview i:nth-child(3){ width: 84%; }.o5x .text-preview i:nth-child(4){ width: 62%; }.o5x .text-preview button{ display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border: 0; border-radius: 7px; color: #fff; background: var(--orange); font-size: .6rem; font-weight: 750; }

.o5x .workflow-proof{ padding: 95px 0; background: #fff; }.o5x .proof-grid{ display: grid; grid-template-columns: 1fr 1.3fr; align-items: center; gap: 70px; }.o5x .proof-grid h2{ margin-bottom: 0; font-size: clamp(2rem, 3.5vw, 3rem); }.o5x .proof-steps{ display: flex; align-items: center; justify-content: space-between; gap: 6px; }.o5x .proof-steps > div{ display: flex; align-items: center; gap: 8px; color: var(--orange); }.o5x .proof-steps span{ color: #aaa9a5; font-size: .57rem; }.o5x .proof-steps strong{ color: var(--ink); font-size: .78rem; }.o5x .proof-steps svg{ margin-left: 8px; color: #c4c1bc; }

.o5x .pricing-section{ background: var(--paper); }.o5x .pricing-grid{ max-width: 940px; display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 50px; }.o5x .price-card{ position: relative; display: flex; flex-direction: column; padding: 38px; border: 1px solid var(--line); border-radius: 22px; background: #fff; }.o5x .price-card.featured{ border-color: #ed9f8a; box-shadow: 0 24px 60px rgba(55,34,25,.1); }.o5x .recommended{ position: absolute; left: 28px; top: -13px; padding: 7px 12px; border-radius: 7px; color: #fff; background: var(--orange); font-size: .58rem; font-weight: 850; letter-spacing: .11em; }.o5x .plan-top{ display: flex; justify-content: space-between; margin-bottom: 26px; font-size: .65rem; font-weight: 800; letter-spacing: .1em; }.o5x .plan-top span{ color: var(--orange); }.o5x .plan-top em{ color: #96989c; font-style: normal; font-weight: 600; letter-spacing: 0; }.o5x .price-card h3{ margin: 0 0 7px; font-size: 1.55rem; }.o5x .plan-description{ margin-bottom: 28px; color: var(--muted); font-size: .87rem; }.o5x .price-line{ display: flex; align-items: end; gap: 6px; }.o5x .price-line strong{ font-size: 3.15rem; line-height: 1; letter-spacing: -.06em; }.o5x .price-line span{ color: var(--muted); font-size: .86rem; }.o5x .billing-note{ margin: 10px 0 26px; color: #878a90; font-size: .72rem; }.o5x .price-card ul{ flex: 1; display: grid; gap: 13px; margin: 0 0 30px; padding: 25px 0 0; border-top: 1px solid var(--line); list-style: none; }.o5x .price-card li{ display: flex; align-items: center; gap: 10px; color: #53575e; font-size: .84rem; }.o5x .price-card li svg{ color: var(--orange); }.o5x .price-button{ width: 100%; }.o5x .payment-note{ max-width: 940px; display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 25px; color: #777a80; font-size: .75rem; }.o5x .payment-note svg{ color: var(--orange); }.o5x .payment-note strong{ color: #4d5157; }

.o5x .guarantee-section{ padding-top: 20px; background: var(--paper); }
.o5x .guarantee-card{ position: relative; display: grid; grid-template-columns: 210px 1fr .7fr; align-items: center; gap: 54px; padding: 62px; border: 1px solid #efb6a7; border-radius: 28px; background: linear-gradient(135deg,#fff 0%,#fff9f6 100%); box-shadow: 0 28px 70px rgba(92,49,35,.08); overflow: hidden; animation: guaranteeCardPulse 3.4s ease-in-out infinite; }
.o5x .guarantee-card::before{ content: ""; position: absolute; z-index: 0; inset: -80% auto -80% -45%; width: 30%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.92),transparent); transform: rotate(18deg); animation: guaranteeSweep 4.4s ease-in-out infinite; pointer-events: none; }
.o5x .guarantee-card::after{ content: "7"; position: absolute; right: -26px; bottom: -130px; color: rgba(238,77,45,.035); font-size: 30rem; line-height: 1; font-weight: 900; pointer-events: none; }
.o5x .guarantee-seal{ position: relative; z-index: 1; width: 190px; aspect-ratio: 1; display: grid; place-items: center; padding: 28px; border: 1px solid #ef9f8b; border-radius: 50%; color: var(--orange); background: #fff; box-shadow: inset 0 0 0 9px var(--orange-soft),0 18px 45px rgba(238,77,45,.12); text-align: center; animation: guaranteeFloat 2.8s ease-in-out infinite; }
.o5x .guarantee-seal::before, .o5x .guarantee-seal::after{ content: ""; position: absolute; width: 12px; height: 12px; border-radius: 50%; background: var(--orange); }
.o5x .guarantee-seal::before{ top: 15px; animation: guaranteeDot 1.5s ease-in-out infinite; }.o5x .guarantee-seal::after{ bottom: 15px; animation: guaranteeDot 1.5s .75s ease-in-out infinite; }
.o5x .guarantee-seal > div{ display: flex; align-items: end; justify-content: center; gap: 5px; line-height: .82; }
.o5x .guarantee-seal > div span{ font-size: 4.6rem; font-weight: 900; letter-spacing: -.08em; animation: guaranteeNumber 2.8s ease-in-out infinite; }
.o5x .guarantee-seal > div strong{ padding-bottom: 5px; font-size: .7rem; letter-spacing: .1em; }
.o5x .guarantee-seal p{ margin: 12px 0 0; font-size: .61rem; line-height: 1.35; font-weight: 850; letter-spacing: .12em; }
.o5x .guarantee-content{ position: relative; z-index: 1; }
.o5x .guarantee-content h2{ margin-bottom: 17px; font-size: clamp(2rem,3.2vw,3rem); }
.o5x .guarantee-content h2 span{ color: var(--orange); }
.o5x .guarantee-content > p:not(.eyebrow){ max-width: 650px; margin-bottom: 23px; color: var(--muted); line-height: 1.7; }
.o5x .guarantee-points{ display: grid; gap: 10px; margin-bottom: 27px; }
.o5x .guarantee-points span{ display: flex; align-items: center; gap: 9px; color: #54585f; font-size: .78rem; font-weight: 650; }
.o5x .guarantee-points svg{ flex: none; color: var(--green); }
.o5x .guarantee-content .button{ min-height: 50px; }
.o5x .guarantee-steps{ position: relative; z-index: 1; display: grid; gap: 17px; padding: 26px; border: 1px solid #eee3de; border-radius: 18px; background: rgba(255,255,255,.78); }
.o5x .guarantee-steps > div{ display: grid; grid-template-columns: 30px 1fr; column-gap: 11px; }
.o5x .guarantee-steps span{ grid-row: 1 / 3; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; color: var(--orange); background: var(--orange-soft); font-size: .55rem; font-weight: 850; }
.o5x .guarantee-steps strong{ font-size: .75rem; }
.o5x .guarantee-steps small{ margin-top: 4px; color: #92949a; font-size: .63rem; line-height: 1.4; }
.o5x .guarantee-steps > i{ width: 1px; height: 15px; margin: -9px 0 -9px 14px; background: #ebc9c0; }

.o5x .faq-section{ background: #fff; }.o5x .faq-layout{ display: grid; grid-template-columns: .7fr 1.3fr; gap: 90px; }.o5x .faq-intro{ position: sticky; top: 140px; align-self: start; }.o5x .faq-intro > p:last-child{ max-width: 350px; color: var(--muted); line-height: 1.65; }.o5x .faq-list{ border-top: 1px solid var(--line); }.o5x .faq-item{ border-bottom: 1px solid var(--line); }.o5x .faq-item > button{ width: 100%; min-height: 78px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 4px; border: 0; color: var(--ink); background: transparent; font-size: .97rem; font-weight: 720; text-align: left; }.o5x .faq-item > button svg{ flex: none; color: var(--orange); transition: transform .22s ease; }.o5x .faq-item.open > button svg{ transform: rotate(180deg); }.o5x .faq-answer{ display: grid; grid-template-rows: 0fr; transition: grid-template-rows .25s ease; }.o5x .faq-answer > p{ min-height: 0; overflow: hidden; margin: 0; color: var(--muted); font-size: .9rem; line-height: 1.72; }.o5x .faq-item.open .faq-answer{ grid-template-rows: 1fr; }.o5x .faq-item.open .faq-answer > p{ padding: 0 35px 24px 4px; }

.o5x .independent-note{ border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: #f4f3f0; }.o5x .independent-note .container{ min-height: 92px; display: flex; align-items: center; justify-content: center; gap: 14px; }.o5x .independent-note svg{ flex: none; color: #7b7e84; }.o5x .independent-note p{ max-width: 870px; margin: 0; color: #74777c; font-size: .76rem; line-height: 1.55; }.o5x .independent-note strong{ color: #4e5258; }
.o5x .final-cta{ position: relative; padding: 125px 0; border-top: 1px solid var(--line); color: var(--ink); background: linear-gradient(180deg,#fff 0%,#fff8f5 100%); text-align: center; overflow: hidden; }.o5x .final-cta::before{ content: ""; position: absolute; width: 520px; height: 520px; left: 50%; top: 58%; border: 1px solid rgba(238,77,45,.1); border-radius: 50%; transform: translate(-50%,-50%); box-shadow: 0 0 0 80px rgba(238,77,45,.025),0 0 0 160px rgba(238,77,45,.018); pointer-events: none; }.o5x .final-cta > .container{ position: relative; z-index: 1; }.o5x .final-cta .brand-lockup{ margin-bottom: 28px; }.o5x .final-cta .eyebrow.light{ color: var(--orange); }.o5x .final-cta h2{ max-width: 950px; margin: 0 auto 20px; }.o5x .final-cta h2 span{ color: var(--orange); }.o5x .final-cta > .container > p:not(.eyebrow){ margin-bottom: 30px; color: var(--muted); font-size: 1.05rem; }.o5x .final-trust{ display: flex; justify-content: center; gap: 18px; margin-top: 20px; color: #777a80; font-size: .72rem; }.o5x .final-trust span{ display: flex; align-items: center; gap: 6px; }.o5x .final-trust svg{ color: var(--orange); }
.o5x footer{ padding: 65px 0 42px; border-top: 1px solid var(--line); background: #fff; color: var(--ink); }.o5x .footer-main{ display: flex; justify-content: space-between; gap: 50px; padding-bottom: 40px; border-bottom: 1px solid var(--line); }.o5x .footer-main > div > p{ max-width: 390px; margin: 15px 0 0; color: var(--muted); font-size: .82rem; line-height: 1.6; }.o5x .footer-main nav{ display: flex; gap: 28px; color: #686c73; font-size: .77rem; }.o5x .footer-main nav a:hover{ color: var(--orange); }.o5x .footer-bottom{ display: grid; grid-template-columns: auto 1fr; gap: 50px; padding-top: 30px; color: #80838a; font-size: .68rem; }.o5x .footer-bottom p{ max-width: 760px; margin: 0 0 0 auto; line-height: 1.6; }

.o5x .mobile-sticky{ display: none; }
@keyframes o5x-platformLoop { to { transform: translateX(calc(-50% - 7px)); } }
@keyframes o5x-guaranteeCardPulse { 0%,100% { box-shadow: 0 28px 70px rgba(92,49,35,.08); border-color: #efb6a7; } 50% { box-shadow: 0 32px 90px rgba(238,77,45,.18); border-color: #ee876f; } }
@keyframes o5x-guaranteeSweep { 0%,22% { left: -45%; opacity: 0; } 38% { opacity: 1; } 62%,100% { left: 125%; opacity: 0; } }
@keyframes o5x-guaranteeFloat { 0%,100% { transform: translateY(0) scale(1); box-shadow: inset 0 0 0 9px var(--orange-soft),0 18px 45px rgba(238,77,45,.12); } 50% { transform: translateY(-9px) scale(1.035); box-shadow: inset 0 0 0 9px #ffe8df,0 28px 62px rgba(238,77,45,.24); } }
@keyframes o5x-guaranteeNumber { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes o5x-guaranteeDot { 0%,100% { transform: scale(.72); opacity: .5; } 50% { transform: scale(1.35); opacity: 1; box-shadow: 0 0 0 8px rgba(238,77,45,.1); } }
@keyframes o5x-heroCtaBreath { 0%,100% { box-shadow: 0 10px 24px rgba(238,77,45,.22); } 50% { box-shadow: 0 16px 38px rgba(238,77,45,.38); } }
@keyframes o5x-heroCtaSweep { 0%,30% { left: -30%; opacity: 0; } 42% { opacity: 1; } 62%,100% { left: 125%; opacity: 0; } }
@keyframes o5x-scrollNudge { 0%,100% { transform: translateY(0); } 50% { transform: translateY(4px); } }

@media (max-width: 1100px) {
  .o5x .container{ width: min(100% - 40px, 1000px); }
  .o5x .hero{ min-height: clamp(650px,calc(100svh - 120px),800px); padding: 108px 0 42px; }.o5x .hero h1{ font-size: clamp(3.7rem,8vw,5.8rem); }
  .o5x .desktop-nav{ gap: 22px; }.o5x .trust-items{ grid-template-columns: repeat(3,1fr); padding: 14px 0; }.o5x .trust-items span{ border-right: 0; }
  .o5x .journey-layout{ gap: 60px; }.o5x .video-grid{ gap: 50px; }.o5x .bento-grid{ grid-template-columns: repeat(3,1fr); }.o5x .feature-large{ grid-column: span 2; }.o5x .proof-grid{ grid-template-columns: 1fr; gap: 35px; }.o5x .hub-channel.whatsapp, .o5x .hub-channel.video{ left: 5%; }.o5x .hub-channel.facebook, .o5x .hub-channel.copy{ right: 5%; }
  .o5x .remotion-showcase{ grid-template-columns: 1.25fr .75fr; }.o5x .remotion-copy{ left: 34px; bottom: 34px; }.o5x .guarantee-card{ grid-template-columns: 180px 1fr; gap: 38px; padding: 48px; }.o5x .guarantee-seal{ width: 170px; }.o5x .guarantee-steps{ grid-column: 1 / -1; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; }.o5x .guarantee-steps > i{ width: 32px; height: 1px; margin: 0; }}

@media (max-width: 820px) {
  .o5x .container{ width: min(100% - 36px, 720px); }.o5x .section{ padding: 82px 0; }.o5x .desktop-nav{ display: none; }.o5x .menu-button{ display: flex; }.o5x .nav-actions .button{ display: none; }
  .o5x .mobile-menu{ display: block; max-height: 0; overflow: hidden; border-bottom: 1px solid transparent; background: rgba(252,251,248,.98); transition: max-height .25s ease; }.o5x .mobile-menu.open{ max-height: 290px; border-bottom-color: var(--line); }.o5x .mobile-menu nav{ display: grid; padding: 12px 18px 20px; }.o5x .mobile-menu a{ display: flex; align-items: center; justify-content: space-between; padding: 14px 4px; border-bottom: 1px solid var(--line); font-size: .88rem; font-weight: 700; }
  .o5x .hero{ min-height: clamp(620px,calc(100svh - 100px),760px); padding: 100px 0 40px; }.o5x .hero h1{ font-size: clamp(3.3rem,10vw,5rem); }.o5x .hero-sub{ max-width: 620px; font-size: 1.04rem; }
  .o5x .platform-section{ padding: 72px 0 58px; }.o5x .platform-heading{ grid-template-columns: 1fr; gap: 18px; }.o5x .platform-heading .eyebrow{ grid-column: auto; }.o5x .platform-heading > p:last-child{ margin: 0; }.o5x .platform-marquee{ margin-top: 38px; }.o5x .platform-chip{ min-width: 185px; height: 70px; }
  .o5x .why-section{ padding: 60px 0 82px; }.o5x .why-heading{ grid-template-columns: 1fr; gap: 18px; }.o5x .why-heading .eyebrow{ grid-column: auto; }.o5x .why-heading > p:last-child{ margin: 0; }.o5x .why-grid{ grid-template-columns: 1fr; }.o5x .why-card{ min-height: 0; display: grid; grid-template-columns: 52px 1fr; align-items: start; gap: 18px; }.o5x .why-number{ right: 22px; }
  .o5x .comparison-grid, .o5x .journey-layout, .o5x .video-grid, .o5x .faq-layout{ grid-template-columns: 1fr; }.o5x .journey-intro, .o5x .faq-intro{ position: static; }.o5x .journey-layout{ gap: 50px; }.o5x .video-grid{ gap: 55px; }.o5x .faq-layout{ gap: 45px; }
  .o5x .remotion-showcase{ grid-template-columns: 1fr; }.o5x .remotion-stage{ min-height: 460px; }.o5x .remotion-side{ grid-template-columns: 34px 1fr 34px 1fr 34px 1fr; gap: 12px; padding: 25px; }.o5x .remotion-side > div{ padding: 0; }.o5x .demo-frame-wrap .app-screen{ padding: 28px; }.o5x .distribution-hub{ height: 620px; }.o5x .hub-channel.whatsapp{ left: 6%; top: 10%; }.o5x .hub-channel.facebook{ right: 6%; top: 10%; }.o5x .hub-channel.video{ left: 6%; bottom: 10%; }.o5x .hub-channel.copy{ right: 6%; bottom: 10%; }
  .o5x .feature-head{ align-items: start; flex-direction: column; gap: 20px; }.o5x .bento-grid{ grid-template-columns: repeat(2,1fr); }.o5x .feature-large{ grid-column: span 2; }.o5x .feature-tall{ grid-row: auto; min-height: 320px; }.o5x .proof-steps{ flex-wrap: wrap; }.o5x .pricing-grid{ grid-template-columns: 1fr; max-width: 560px; }.o5x .guarantee-card{ grid-template-columns: 150px 1fr; }.o5x .guarantee-seal{ width: 145px; }.o5x .guarantee-seal > div span{ font-size: 3.7rem; }.o5x .guarantee-content .button{ width: 100%; }.o5x .guarantee-steps{ grid-column: 1 / -1; }
  .o5x .footer-main{ flex-direction: column; }.o5x .footer-main nav{ flex-wrap: wrap; }.o5x .footer-bottom{ grid-template-columns: 1fr; gap: 18px; }.o5x .footer-bottom p{ margin: 0; }
  .o5x .mobile-sticky{ position: fixed; z-index: 90; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 10px 10px 16px; border: 1px solid #34373b; border-radius: 15px; color: #fff; background: rgba(18,20,23,.95); box-shadow: 0 14px 40px rgba(0,0,0,.25); backdrop-filter: blur(12px); transform: translateY(140%); transition: transform .3s ease, opacity .2s ease; }.o5x .mobile-sticky.visible{ opacity: calc(1 - var(--pricing-visible)); transform: translateY(0); }.o5x .mobile-sticky span small, .o5x .mobile-sticky span strong{ display: block; }.o5x .mobile-sticky span small{ color: #9da2a8; font-size: .57rem; }.o5x .mobile-sticky span strong{ margin-top: 2px; font-size: .9rem; }.o5x .mobile-sticky button{ height: 42px; display: flex; align-items: center; gap: 6px; padding: 0 14px; border: 0; border-radius: 9px; color: #fff; background: var(--orange); font-size: .67rem; font-weight: 850; letter-spacing: .06em; }}

@media (max-width: 560px) {
  .o5x .container{ width: calc(100% - 36px); }.o5x .section{ padding: 68px 0; }.o5x h2{ font-size: 2.35rem; }.o5x .site-header, .o5x .nav-wrap{ height: 66px; }.o5x .brand-lockup img{ width: 33px; height: 33px; }
  .o5x .hero{ min-height: clamp(590px,calc(100svh - 86px),720px); padding: 88px 0 34px; }.o5x .hero::before{ width: 135vw; }.o5x .hero .eyebrow{ max-width: 310px; line-height: 1.45; }.o5x .hero-eyebrow{ margin-bottom: 20px; }.o5x .hero h1{ max-width: 390px; margin-bottom: 22px; font-size: clamp(2.8rem,13.2vw,4rem); line-height: .96; letter-spacing: -.06em; }.o5x .hero-sub{ max-width: 390px; margin-bottom: 27px; font-size: .98rem; line-height: 1.58; }.o5x .hero-actions{ width: 100%; }.o5x .hero-actions .button{ width: 100%; padding-inline: 14px; font-size: .72rem; }.o5x .trust-mini{ gap: 9px 16px; margin-top: 20px; }.o5x .hero-scroll{ margin-top: 22px; }
  .o5x .hero-product{ padding-bottom: 26px; }.o5x .product-shell{ min-height: 400px; grid-template-columns: 1fr; }.o5x .product-shell aside{ display: none; }.o5x .window-bar em{ display: none; }.o5x .window-bar p{ margin-right: 0; }.o5x .app-screen{ min-height: 400px; padding: 20px 16px; }.o5x .screen-toolbar{ align-items: start; flex-direction: column; gap: 12px; }.o5x .fake-search{ width: 100%; }.o5x .filter-row{ margin-top: 14px; }.o5x .mini-product{ grid-template-columns: 52px 1fr 25px; }.o5x .mini-product > img{ width: 52px; height: 52px; }.o5x .product-list .mini-product:nth-child(3){ display: none; }.o5x .floating-card{ display: none; }
  .o5x .analysis-screen, .o5x .content-screen, .o5x .distribution-screen{ min-height: 400px; }.o5x .selected-product{ padding: 11px; }.o5x .selected-product img{ width: 60px; height: 60px; }.o5x .metric-grid{ gap: 6px; }.o5x .metric-grid > div{ padding: 10px 8px; }.o5x .metric-grid strong{ font-size: .9rem; }.o5x .content-layout{ grid-template-columns: 1fr; }.o5x .content-product{ display: none; }.o5x .group-row{ grid-template-columns: 34px 1fr auto; }.o5x .group-row .group-status{ display: none; }.o5x .demo-frame-wrap .product-shell, .o5x .demo-frame-wrap .analysis-screen, .o5x .demo-frame-wrap .content-screen, .o5x .demo-frame-wrap .distribution-screen{ min-height: 430px; }.o5x .demo-frame-wrap .app-screen{ min-height: 430px; padding: 21px 16px; }
  .o5x .trust-items{ grid-template-columns: 1fr 1fr; }.o5x .trust-items span{ font-size: .68rem; }.o5x .comparison-card{ padding: 28px 23px; }.o5x .comparison-title{ align-items: start; flex-direction: column; gap: 8px; }.o5x .comparison-card li{ font-size: .84rem; }
  .o5x .platform-section{ padding-top: 64px; }.o5x .platform-heading h2{ font-size: 2.25rem; }.o5x .platform-heading > p:last-child{ font-size: .9rem; }.o5x .platform-marquee::before, .o5x .platform-marquee::after{ width: 38px; }.o5x .platform-chip{ min-width: 168px; padding: 0 15px; }.o5x .platform-note{ align-items: flex-start; text-align: left; }
  .o5x .why-section{ padding: 50px 0 70px; }.o5x .why-heading{ margin-bottom: 32px; }.o5x .why-heading h2{ font-size: 2.2rem; }.o5x .why-heading > p:last-child{ font-size: .9rem; }.o5x .why-card{ grid-template-columns: 47px 1fr; padding: 23px 21px; border-radius: 15px; }.o5x .why-icon{ width: 46px; height: 46px; }.o5x .why-card h3{ padding-right: 28px; font-size: 1.1rem; }.o5x .why-card p{ font-size: .82rem; }.o5x .why-number{ right: 18px; top: 23px; }
  .o5x .journey-step{ grid-template-columns: 38px 46px 1fr; gap: 12px; }.o5x .step-connector{ left: 60px; }.o5x .journey-step h3{ font-size: 1.2rem; }.o5x .journey-step p{ font-size: .85rem; }
  .o5x .remotion-showcase{ margin-top: 36px; }.o5x .remotion-stage{ min-height: 450px; border-radius: 18px; }.o5x .remotion-stage > img{ object-position: 68% center; }.o5x .remotion-shade{ background: linear-gradient(0deg,rgba(10,12,14,.96) 0%,rgba(10,12,14,.64) 62%,rgba(10,12,14,.15) 100%); }.o5x .remotion-copy{ left: 22px; right: 22px; bottom: 25px; }.o5x .remotion-copy h3{ font-size: 2rem; }.o5x .video-play{ font-size: .62rem; }.o5x .video-play > span{ width: 42px; height: 42px; }.o5x .remotion-side{ grid-template-columns: 34px 1fr; padding: 22px; }.o5x .remotion-side > div{ padding-bottom: 20px; }.o5x .demo-tabs{ display: grid; grid-template-columns: 1fr 1fr; margin-top: 52px; }.o5x .demo-tabs button{ width: 100%; }.o5x .demo-caption{ align-items: start; flex-direction: column; }.o5x .video-workflow{ padding: 18px; }.o5x .style-select{ grid-template-columns: 1fr 1fr; }
  .o5x .distribution-hub{ height: auto; display: grid; gap: 10px; padding: 18px; }.o5x .distribution-hub::before{ display: none; }.o5x .hub-center, .o5x .hub-channel{ position: static; width: 100%; min-width: 0; transform: none; }.o5x .hub-center{ order: -1; }.o5x .hub-channel{ padding: 13px; }
  .o5x .bento-grid{ grid-template-columns: 1fr; }.o5x .feature-large{ grid-column: auto; min-height: 510px; }.o5x .feature-tall{ min-height: 380px; }.o5x .feature-card{ min-height: 230px; }
  .o5x .proof-steps{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.o5x .proof-steps > div{ padding: 12px; border: 1px solid var(--line); border-radius: 9px; }.o5x .proof-steps svg{ display: none; }
  .o5x .price-card{ padding: 31px 24px; }.o5x .price-line strong{ font-size: 2.8rem; }.o5x .payment-note{ align-items: start; }.o5x .guarantee-section{ padding-top: 0; }.o5x .guarantee-card{ grid-template-columns: 1fr; padding: 34px 23px; gap: 31px; }.o5x .guarantee-seal{ width: 154px; margin: 0 auto; }.o5x .guarantee-content h2{ font-size: 2.05rem; }.o5x .guarantee-content > p:not(.eyebrow){ font-size: .9rem; }.o5x .guarantee-points span{ align-items: flex-start; }.o5x .guarantee-steps{ grid-column: auto; grid-template-columns: 1fr; }.o5x .guarantee-steps > i{ width: 1px; height: 15px; margin: -9px 0 -9px 14px; }.o5x .independent-note .container{ align-items: flex-start; padding: 24px 0; }
  .o5x .final-cta{ padding: 90px 0 120px; }.o5x .final-cta h2{ font-size: 2.35rem; }.o5x .final-cta .button{ width: 100%; }.o5x .final-trust{ flex-wrap: wrap; }.o5x .footer-main nav{ display: grid; grid-template-columns: 1fr 1fr; }}

@media (prefers-reduced-motion: reduce) {
  :root:has(.o5x) { scroll-behavior: auto !important; }
  .o5x, .o5x *, .o5x *::before, .o5x *::after{ scroll-behavior: auto !important; animation: none !important; transition-duration: .01ms !important; }}
`;

export function Ofertas5Landing({ config }: { config: Ofertas5LandingConfig }) {
  const goToCheckout = (plan: Plan) => {
    window.location.assign(config.checkouts[plan]);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const pricing = pricingRef.current;
    const root = rootRef.current;
    if (!pricing || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => root.style.setProperty("--pricing-visible", entry.isIntersecting ? "1" : "0"),
      { threshold: 0.12 },
    );
    observer.observe(pricing);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="o5x" ref={rootRef}>
      <style>{CSS}</style>

      <header className="site-header">
        <div className="container nav-wrap">
          <a href="#inicio" aria-label="UpShopee — início">
            <Logo />
          </a>
          <nav className="desktop-nav" aria-label="Navegação principal">
            <a href="#beneficios">Benefícios</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-actions">
            <button
              className="button button-primary button-small"
              onClick={() => goToCheckout("vitalicio")}
            >
              COMEÇAR AGORA <Icon name="arrow" size={17} />
            </button>
            <button
              className="menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          <nav aria-label="Navegação móvel">
            {[
              ["Benefícios", "#beneficios"],
              ["Planos", "#planos"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
                <Icon name="arrow" />
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="hero hero-simple" id="inicio">
          <div className="container hero-simple-inner">
            <p className="eyebrow hero-eyebrow">
              <span /> VÍDEOS COM IA PARA AFILIADOS
            </p>
            <h1>
              Destrave suas vendas
              <br />
              <span>sem precisar aparecer.</span>
            </h1>
            <p className="hero-sub">
              Encontre produtos com boas comissões, gere vídeos com inteligência artificial e
              divulgue como afiliado — mesmo começando do zero.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary hero-primary"
                onClick={() => goToCheckout("vitalicio")}
              >
                QUERO COMEÇAR AGORA <Icon name="arrow" />
              </button>
            </div>
            <div className="trust-mini">
              <span>
                <Icon name="shield" size={16} /> 7 dias de garantia
              </span>
              <span>
                <Icon name="check" size={16} /> Acesso imediato
              </span>
            </div>
            <a className="hero-scroll" href="#beneficios">
              CONTINUE PARA DESCOBRIR <Icon name="chevron" size={16} />
            </a>
          </div>
        </section>

        <section className="why-section" id="beneficios" aria-labelledby="why-title">
          <div className="container why-heading">
            <p className="eyebrow">POR QUE A UPSHOPEE</p>
            <h2 id="why-title">
              Simples para começar.
              <br />
              <span>Completa para executar.</span>
            </h2>
            <p>
              Três recursos diretos para tirar sua estratégia do papel e começar a divulgar com mais
              estrutura.
            </p>
          </div>
          <div className="container why-grid">
            <article className="why-card">
              <span className="why-icon">
                <Icon name="video" />
              </span>
              <div>
                <h3>Vídeos gerados com IA</h3>
                <p>
                  Transforme produtos em roteiros, narrações, legendas e estruturas de vídeo para
                  sua divulgação.
                </p>
              </div>
              <span className="why-number">01</span>
            </article>
            <article className="why-card featured">
              <span className="why-icon">
                <Icon name="chart" />
              </span>
              <div>
                <h3>Produtos com alta comissão</h3>
                <p>
                  Use filtros e informações do catálogo para encontrar comissões mais atrativas
                  antes de escolher o que divulgar.
                </p>
              </div>
              <span className="why-number">02</span>
            </article>
            <article className="why-card">
              <span className="why-icon">
                <Icon name="phone" />
              </span>
              <div>
                <h3>Fácil acesso</h3>
                <p>
                  Acesse pelo celular ou computador e concentre sua operação em um único lugar, sem
                  precisar instalar nada.
                </p>
              </div>
              <span className="why-number">03</span>
            </article>
          </div>
        </section>

        <section className="platform-section" aria-labelledby="platform-title">
          <div className="container platform-heading">
            <p className="eyebrow">ONDE SUA ESTRATÉGIA ACONTECE</p>
            <h2 id="platform-title">
              Das oportunidades ao conteúdo.
              <br />
              <span>Das redes à divulgação.</span>
            </h2>
            <p>
              A UpShopee ajuda você a preparar a operação para as plataformas que já fazem parte da
              rotina de quem vende e divulga online.
            </p>
          </div>
          <div className="platform-marquee" aria-label="Plataformas usadas na estratégia">
            <div className="platform-track">
              {[...platforms, ...platforms].map((platform, index) => (
                <div
                  className={`platform-chip ${platform.className}`}
                  key={`${platform.name}-${index}`}
                  aria-hidden={index >= platforms.length}
                >
                  <span>
                    <img
                      src={platform.logo}
                      width="32"
                      height="32"
                      alt={index < platforms.length ? `Logo ${platform.name}` : ""}
                    />
                  </span>
                  <strong>{platform.name}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="container platform-note">
            <Icon name="shield" size={15} />
            <span>
              Marcas exibidas apenas para contextualizar os canais e marketplaces da estratégia. Não
              indicam parceria ou integração oficial.
            </span>
          </div>
        </section>

        <section className="section comparison-section">
          <div className="container narrow-head">
            <p className="eyebrow">MENOS IMPROVISO</p>
            <h2>Pare de montar sua estratégia no escuro.</h2>
            <p>
              Quando cada etapa fica em uma ferramenta diferente, você perde tempo antes mesmo de
              começar a divulgar.
            </p>
          </div>
          <div className="container comparison-grid">
            <article className="comparison-card muted">
              <div className="comparison-title">
                <span>SEM A UPSHOPEE</span>
                <em>Processo fragmentado</em>
              </div>
              <ul>
                {[
                  "Procurar produtos manualmente",
                  "Escolher sem informações suficientes",
                  "Pensar no que postar todos os dias",
                  "Criar textos e roteiros do zero",
                  "Procurar grupos e canais separadamente",
                ].map((item) => (
                  <li key={item}>
                    <span className="minus">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="comparison-card organized">
              <div className="comparison-title">
                <span>COM A UPSHOPEE</span>
                <em>Um fluxo mais organizado</em>
              </div>
              <ul>
                {[
                  "Encontre oportunidades no catálogo",
                  "Analise antes de escolher",
                  "Prepare conteúdo a partir do produto",
                  "Encontre canais para divulgação",
                  "Organize sua estratégia em um só lugar",
                ].map((item) => (
                  <li key={item}>
                    <span className="check-icon">
                      <Icon name="check" size={15} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section pricing-section" id="planos" ref={pricingRef}>
          <div className="container centered-head">
            <p className="eyebrow">PLANOS</p>
            <h2>Escolha como quer começar.</h2>
            <p>As mesmas ferramentas principais, com duas formas claras de acesso.</p>
          </div>
          <div className="container pricing-grid">
            <article className="price-card">
              <div className="plan-top">
                <span>MENSAL</span>
                <em>Flexibilidade</em>
              </div>
              <h3>Plano Mensal</h3>
              <p className="plan-description">Para começar com pagamento recorrente.</p>
              <div className="price-line">
                <strong>R$ 145</strong>
                <span>/mês</span>
              </div>
              <p className="billing-note">Cobrança mensal enquanto o plano estiver ativo.</p>
              <ul>
                {[
                  "Minerador e catálogo de produtos",
                  "Buscas ilimitadas",
                  "Geradores de títulos e ideias",
                  "Imagem UGC: até 5 por dia",
                  "Comunidade VIP",
                  "Suporte prioritário",
                ].map((item) => (
                  <li key={item}>
                    <Icon name="check" size={16} />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="button button-secondary price-button"
                onClick={() => goToCheckout("mensal")}
              >
                ESCOLHER MENSAL <Icon name="arrow" />
              </button>
            </article>
            <article className="price-card featured">
              <div className="recommended">ACESSO VITALÍCIO</div>
              <div className="plan-top">
                <span>VITALÍCIO</span>
                <em>Pagamento único</em>
              </div>
              <h3>Acesso Vitalício</h3>
              <p className="plan-description">Pague uma vez e mantenha seu acesso.</p>
              <div className="price-line">
                <strong>R$ 259</strong>
              </div>
              <p className="billing-note">Ou até 12x de R$ 27,61 no cartão.</p>
              <ul>
                {[
                  "Tudo do plano mensal",
                  "Criar persona e script com IA",
                  "Templates e ferramentas de vídeo",
                  "Imagem UGC ilimitada",
                  "Comunidade VIP",
                  "Suporte prioritário",
                ].map((item) => (
                  <li key={item}>
                    <Icon name="check" size={16} />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="button button-primary price-button"
                onClick={() => goToCheckout("vitalicio")}
              >
                GARANTIR VITALÍCIO <Icon name="arrow" />
              </button>
            </article>
          </div>
          <div className="container payment-note">
            <Icon name="shield" />
            <span>
              <strong>Pagamento processado em ambiente seguro.</strong> Você vai direto para o
              checkout ao escolher seu plano.
            </span>
          </div>
        </section>

        <section className="section guarantee-section">
          <div className="container guarantee-card">
            <div className="guarantee-seal">
              <div>
                <span>7</span>
                <strong>DIAS</strong>
              </div>
              <p>
                GARANTIA
                <br />
                DE SATISFAÇÃO
              </p>
            </div>
            <div className="guarantee-content">
              <p className="eyebrow">VOCÊ DECIDE DEPOIS DE USAR</p>
              <h2>
                Entre, explore e teste
                <br />
                <span>sem assumir o risco.</span>
              </h2>
              <p>
                Você tem 7 dias para conhecer a UpShopee por dentro, testar as ferramentas e avaliar
                se ela faz sentido para sua estratégia. Se não fizer, solicite o reembolso dentro do
                prazo da garantia.
              </p>
              <div className="guarantee-points">
                <span>
                  <Icon name="check" size={16} /> Acesso liberado após a confirmação
                </span>
                <span>
                  <Icon name="check" size={16} /> Sete dias para conhecer a plataforma
                </span>
                <span>
                  <Icon name="check" size={16} /> Reembolso dentro do prazo da garantia
                </span>
              </div>
              <button className="button button-primary" onClick={() => goToCheckout("vitalicio")}>
                COMEÇAR COM 7 DIAS DE GARANTIA <Icon name="arrow" />
              </button>
            </div>
            <div className="guarantee-steps">
              <div>
                <span>01</span>
                <strong>Escolha seu plano</strong>
                <small>Mensal ou acesso vitalício.</small>
              </div>
              <i />
              <div>
                <span>02</span>
                <strong>Acesse a plataforma</strong>
                <small>Explore as ferramentas na prática.</small>
              </div>
              <i />
              <div>
                <span>03</span>
                <strong>Decida com tranquilidade</strong>
                <small>Você está coberto pelo prazo informado.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="container faq-layout">
            <div className="faq-intro">
              <p className="eyebrow">DÚVIDAS FREQUENTES</p>
              <h2>Antes de começar.</h2>
              <p>Respostas diretas sobre a plataforma, os planos e a garantia.</p>
            </div>
            <div className="faq-list">
              {faq.map(([question, answer], index) => (
                <article className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}>
                  <button
                    aria-expanded={openFaq === index}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span>{question}</span>
                    <Icon name="chevron" />
                  </button>
                  <div className="faq-answer">
                    <p>{answer}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="independent-note">
          <div className="container">
            <Icon name="shield" />
            <p>
              <strong>Produto independente.</strong> A UpShopee não representa nem possui vínculo
              oficial com a Shopee. Menções à marca servem apenas para contextualizar o uso da
              plataforma por afiliados.
            </p>
          </div>
        </section>

        <section className="final-cta">
          <div className="container">
            <Logo compact />
            <p className="eyebrow light">ESTRUTURA PARA EXECUTAR</p>
            <h2>
              Você não precisa de mais uma estratégia.
              <br />
              <span>Precisa de estrutura para executar.</span>
            </h2>
            <p>Encontre. Analise. Crie. Divulgue.</p>
            <button className="button button-primary" onClick={() => goToCheckout("vitalicio")}>
              COMEÇAR COM A UPSHOPEE <Icon name="arrow" />
            </button>
            <div className="final-trust">
              <span>
                <Icon name="shield" size={16} /> 7 dias de garantia
              </span>
              <span>
                <Icon name="check" size={16} /> Acesso imediato
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-main">
          <div>
            <Logo />
            <p>Ferramentas para afiliados organizarem sua estratégia de divulgação.</p>
          </div>
          <nav aria-label="Links do rodapé">
            <a href="#beneficios">Benefícios</a>
            <a href="#planos">Planos</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 UpShopee. Todos os direitos reservados.</span>
          <p>
            Resultados podem variar de acordo com a dedicação e o contexto de cada afiliado. Os
            valores citados não constituem promessa de ganhos. A UpShopee é uma ferramenta
            independente e não possui vínculo oficial com a Shopee.
          </p>
        </div>
      </footer>

      <div className={`mobile-sticky ${stickyVisible ? "visible" : ""}`}>
        <span>
          <small>Acesso vitalício</small>
          <strong>R$ 259</strong>
        </span>
        <button onClick={() => goToCheckout("vitalicio")}>
          COMEÇAR <Icon name="arrow" size={17} />
        </button>
      </div>
    </div>
  );
}
