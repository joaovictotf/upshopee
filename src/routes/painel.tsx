/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /painel  (demonstração local, por aparelho)
  ═══════════════════════════════════════════════════════════════
  Port fiel da composição aprovada
  (UpShopee_Painel_Demo_Claude_v2_24-08-2026/source/painel-page-approved.tsx)
  para a arquitetura real deste repo: Vite + TanStack Router.

  O que mudou em relação ao pacote de origem:

   · O CSS aprovado redefinia :root, *, e `html, body` — incluindo
     `min-width: 1024px` e o fundo da página. Solto, ele repintaria o
     app inteiro. Aqui ele vive dentro de CSS, inteiramente escopado em
     `.pnlx`, o wrapper da página (mesma abordagem de /ofertas5 com
     `.o5x`). As custom properties do `:root` viraram propriedades do
     wrapper; o `min-width: 1024px` — intencional, o painel é
     desktop-only — vale só dentro dele, nunca no body de verdade;

   · o wrapper acumula o papel de `html/body` e de `.dashboard-shell`:
     é UM elemento, e por isso um seletor só para escopar tudo;

   · resets explícitos de `h1/h2` e `line-height` porque o styles.css
     global do app (`@layer base`) manda Sora, letter-spacing -0.02em e
     line-height 1.6 para dentro de qualquer página. Este bloco é
     unlayered, então ganha da base sem precisar de !important;

   · os itens do menu lateral continuam `<div>`, como no aprovado: são
     ILUSTRATIVOS, não navegam e não mexem na URL;

   · o "⋯" do cabeçalho continua sendo só desenho — faz parte do clone
     da Shopee e não abre nada. NÃO EXISTE editor no /painel: nenhum
     campo, nenhuma gaveta, nenhum formulário, nenhum modal. Nada nesta
     página aceita valor digitado;

   · o sininho é o ÚNICO controle da tela. Um clique = UMA venda
     completa na data selecionada (ver "VENDA SIMULADA" mais abaixo).

  ── DADOS: localStorage, POR APARELHO ──────────────────────────
  Os números moram em localStorage, na chave `upshopee_painel_demo_v1`,
  guardados POR DATA. Isso é intencional e é o oposto do que valia
  antes: cada aparelho tem os SEUS números e eles nunca conversam — o
  iPad do dono pode marcar R$ 6.000 enquanto o computador dele marca
  R$ 3.000, e está certo assim.

  Por isso NADA aqui fala com o Supabase. As tabelas
  `panel_daily_records` e `panel_product_stats` e a RPC
  `panel_apply_demo_sale` continuam no banco, dormentes e sem uso —
  NÃO APAGAR.

  Sem localStorage (aba anônima, storage bloqueado por política) a
  página abre e funciona igual; só não sobrevive ao reload. Leitura e
  escrita são protegidas e o estado vive em memória.

  ROTA ADMIN-ONLY. Mesmo gate de src/routes/dashboard.tsx (authReady →
  user → papel). Só os DADOS saíram do banco; a rota não.

  NÚMEROS DE DEMONSTRAÇÃO. Nada aqui é saldo, comissão real ou saque
  (Regra de Ouro §1 do CLAUDE.md). O catálogo é o real
  (src/lib/mock/affiliate-products.ts) — nome, imagem, preço e
  porcentagem de comissão vêm de lá, nunca duplicados em outro lugar.
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useApp } from "../lib/state";
import { affiliateProducts, type AffiliateProduct } from "../lib/mock/affiliate-products";
import { spDateKey } from "../lib/timeWindow";

/* ══════════════════════════════════════════════════════════════
   ÍCONES / PEÇAS VISUAIS — cópia literal do aprovado
   ══════════════════════════════════════════════════════════════ */

type IconName =
  | "dashboard"
  | "offer"
  | "campaign"
  | "creative"
  | "report"
  | "wallet"
  | "api"
  | "globe"
  | "bell"
  | "calendar"
  | "social"
  | "collapse";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 8h1M12 8h4M8 12h1M12 12h4M8 16h1M12 16h4" /></svg>;
    case "offer":
      return <svg {...common}><path d="M7 15c-2 0-3-1.3-3-3s1-3 3-3h3v6H7Z" /><path d="M10 10c1-4 5-5 8-3v8c-3 2-7 1-8-3" /><circle cx="9" cy="18" r="2" /><path d="M17 10h2" /></svg>;
    case "campaign":
      return <svg {...common}><path d="M5 6h14v4a7 7 0 0 1-14 0V6Z" /><path d="M9 17h6M12 15v5M5 9H3v2a3 3 0 0 0 3 3M19 9h2v2a3 3 0 0 1-3 3" /></svg>;
    case "creative":
      return <svg {...common}><path d="M9 18h6M10 21h4" /><path d="M8 14c-1.3-1.1-2-2.7-2-4.4A6 6 0 1 1 16 14c-.8.7-1 1.4-1 2H9c0-.6-.2-1.3-1-2Z" /><path d="M12 1v2M3 10H1M23 10h-2M4.2 3.2l1.5 1.5M19.8 3.2l-1.5 1.5" /></svg>;
    case "report":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M7 3v4M17 3v4M3 10h18M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01" /></svg>;
    case "wallet":
      return <svg {...common}><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" /><path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" /></svg>;
    case "api":
      return <svg {...common}><circle cx="12" cy="5" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" /><path d="m10.5 6.5-4 9M13.5 6.5l4 9M7 18h10" /></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></svg>;
    case "bell":
      return <svg {...common}><path d="M6 17h12l-1.5-2.2V10a4.5 4.5 0 1 0-9 0v4.8L6 17Z" /><path d="M10 20h4" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M7 3v4M17 3v4M3 10h18" /></svg>;
    case "social":
      return <svg {...common}><circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="5" r="2.5" /><circle cx="13" cy="18" r="2.5" /><path d="m8.3 6.2 7.3-.7M7.5 9.1l4.2 6.6M16.5 7.2l-2.3 8.3" /></svg>;
    case "collapse":
      return <svg {...common}><path d="M5 7h14M5 12h14M5 17h14M9 4 5 7l4 3" /></svg>;
  }
}

function BrandMark() {
  return (
    <img
      className="brand-mark"
      src="/shopee-affiliate-logo.png"
      alt="Shopee Afiliados"
      width="71"
      height="72"
    />
  );
}

function Chevron({ down = false }: { down?: boolean }) {
  return <span className={down ? "chevron down" : "chevron"} aria-hidden="true" />;
}

function InfoDot() {
  return <span className="info-dot" aria-label="Informação">i</span>;
}

/* Itens ILUSTRATIVOS: `<div>`, não `<a>` nem `<Link>`. Nada aqui navega
   nem muda a URL — é a fotografia do menu da Shopee, não um menu. */
const navSections: { icon: IconName; label: string; items: ReactNode[]; first?: boolean }[] = [
  { icon: "dashboard", label: "Painel de controle", first: true, items: ["Painel de controle"] },
  { icon: "offer", label: "Oferta", items: ["Oferta Shopee", "Oferta da loja", "Oferta de produto", "Ofertas Exclusivas", "Link personalizado"] },
  { icon: "campaign", label: "Campanhas", items: [<>Campanhas de<br />Afiliados</>] },
  { icon: "creative", label: "Criativo", items: ["Feed de produto"] },
  { icon: "report", label: "Relatório", items: ["Relatório de vendas", "Relatório de cliques"] },
  { icon: "wallet", label: "Pagamento", items: ["Comissões Validadas", <>Histórico de<br />Pagamento <span className="new-pill">New</span><span className="ellipsis-text">...</span></>] },
  { icon: "api", label: "Abrir API", items: ["Abrir API"] },
];

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Navegação ilustrativa">
      <nav>
        {navSections.map((section, sectionIndex) => (
          <section className={"nav-section " + (section.first ? "first" : "")} key={section.label}>
            <div className="nav-heading">
              <span className="nav-icon"><Icon name={section.icon} size={17} /></span>
              <span>{section.label}</span>
              <Chevron />
            </div>
            <div className="nav-items">
              {section.items.map((item, itemIndex) => {
                const active = sectionIndex === 0 && itemIndex === 0;
                return <div className={"nav-item " + (active ? "active" : "")} aria-current={active ? "page" : undefined} key={itemIndex}>{item}</div>;
              })}
            </div>
          </section>
        ))}
      </nav>
      <div className="sidebar-collapse"><Icon name="collapse" size={17} /></div>
    </aside>
  );
}

/**
 * Nome do cabeçalho. Duplo clique no texto vira <input>; Enter e blur
 * confirmam, Escape cancela e volta ao valor anterior. Mesmo formato de
 * DashboardShell.tsx (`onDoubleClick` troca span por input, foco via
 * `ref` num `setTimeout` curto) — só que aqui não há checagem de admin
 * porque a rota inteira já é admin-only.
 *
 * O rascunho (`draft`) é local: o pai só fica sabendo do nome quando ele
 * é CONFIRMADO. `canceledRef` existe porque o Escape desmonta o input
 * (tira o foco) e isso pode disparar `onBlur` por cima do próprio
 * cancelamento — a flag garante que esse blur tardio não commite o
 * rascunho por engano, não importa a ordem em que os eventos cheguem.
 */
function EditableUserName({ value, onCommit }: { value: string; onCommit: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const canceledRef = useRef(false);

  const startEdit = () => {
    canceledRef.current = false;
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const commit = () => {
    if (canceledRef.current) {
      canceledRef.current = false;
      return;
    }
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
  };

  const cancel = () => {
    canceledRef.current = true;
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="user-name"
        aria-label="Nome de exibição"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
      />
    );
  }
  return (
    <span className="user-name" onDoubleClick={startEdit}>
      {value}
    </span>
  );
}

function Header({
  userName,
  onUserNameCommit,
  onSale,
}: {
  userName: string;
  onUserNameCommit: (next: string) => void;
  onSale: () => void;
}) {
  return (
    <header className="top-header">
      <div className="brand-area"><BrandMark /></div>
      <div className="breadcrumb"><span>Página Inicial</span><b>/</b><strong>Painel de controle</strong></div>
      <div className="header-actions">
        <div className="header-action language"><Icon name="globe" size={18} /><span>Português</span><Chevron down /></div>
        <div className="header-action user">
          <EditableUserName value={userName} onCommit={onUserNameCommit} />
          <Chevron down />
        </div>
        <div className="vertical-line" />
        <div className="utility globe-clock"><Icon name="globe" size={18} /><span className="tiny-clock" /></div>
        {/* SININHO — o único controle da página. Um clique = uma venda
            completa na data que está na tela. Não abre menu, não abre
            editor, não navega.

            É <button> só por causa do teclado e do leitor de tela:
            `.pnlx button.utility` desfaz o estilo de botão do UA e do
            preflight do Tailwind, então ele desenha exatamente como o
            <div> da composição aprovada, no mesmo lugar e do mesmo
            tamanho. Sem `title`: um tooltip aparecendo no meio de uma
            apresentação ao vivo entregaria o truque. */}
        <button
          type="button"
          className="utility"
          onClick={onSale}
          aria-label="Notificações"
        >
          <Icon name="bell" size={18} />
        </button>
        {/* O "⋯" faz parte do clone da Shopee e não faz nada — o mesmo
            <div> inerte do aprovado. */}
        <div className="utility more"><i /><i /><i /></div>
        <div className="help-button">Central de Ajuda</div>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════
   DADOS — localStorage, por aparelho
   ══════════════════════════════════════════════════════════════ */

/** Chave versionada e com namespace próprio: não colide com nenhuma
 *  outra do UpShopee (`upshopee-theme`, `shopsync:*`) e um dia pode
 *  ganhar um `_v2` sem ler dado velho por engano. */
const STORE_KEY = "upshopee_painel_demo_v1";
const STORE_VERSION = 1;

/** Nome mostrado no cabeçalho de um aparelho novo. Editável com duplo
 *  clique (ver EditableUserName) e, como o resto do arquivo local, NÃO
 *  é por data — trocar a data não troca quem está sendo mostrado. */
const DEFAULT_USER_NAME = "Renan";

/** Uma linha do Top 5. `commission` é a comissão ACUMULADA do produto
 *  naquela data — não a de uma venda solta. */
type PanelProduct = {
  id: string;
  units: number;
  commission: number;
};

/** Um dia inteiro do painel: as sete métricas mais os produtos. */
type PanelDay = {
  clicks: number;
  orders: number;
  estimated_commission: number;
  items_sold: number;
  order_value: number;
  new_buyers: number;
  social_clicks: number;
  products: PanelProduct[];
};

/** O arquivo local inteiro. `days` é indexado por "AAAA-MM-DD": trocou
 *  a data, trocaram os números — venda de um dia nunca vaza para outro.
 *  `userName` fica FORA de `days` de propósito: é o nome do cabeçalho,
 *  não uma métrica do dia, e sobrevive a qualquer troca de data. */
type PanelStore = {
  v: number;
  userName: string;
  days: Record<string, PanelDay>;
};

/** As seis métricas com card. `social_clicks` não tem card — aparece em
 *  "Detalhes de cliques" e por isso não entra aqui. */
const METRIC_KEYS = [
  "clicks",
  "orders",
  "estimated_commission",
  "items_sold",
  "order_value",
  "new_buyers",
] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const METRIC_LABEL: Record<MetricKey, string> = {
  clicks: "Cliques",
  orders: "Pedido",
  estimated_commission: "Comissão est.(R$)",
  items_sold: "Itens vendidos",
  order_value: "Valor do pedido(R$)",
  new_buyers: "Novos compradores",
};

/** Métricas em reais formatam diferente de contagem. */
const MONEY_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>([
  "estimated_commission",
  "order_value",
]);

/* ── Datas ─────────────────────────────────────────────────────
   A data é uma string "AAAA-MM-DD" o tempo todo: é a chave do arquivo
   local e é o mesmo formato do <input type="date">, então nunca existe
   um objeto Date por perto para o fuso do visitante estragar. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/**
 * Dia anterior no calendário. `new Date` aqui é aritmética de calendário
 * em UTC (entra e sai por getUTC*), não leitura de "agora" — o fuso da
 * máquina não participa. Para saber que dia é hoje, quem responde é
 * spDateKey(), em America/Sao_Paulo.
 */
function prevDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const at = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

/* ── Números ───────────────────────────────────────────────────
   Nada daqui pode devolver NaN, Infinity ou "-0" para a tela (§4 dos
   requisitos). Toda entrada passa por safe() antes de virar pixel. */

function safe(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  // `n + 0` normaliza -0 para 0: Intl formata -0 como "-0", e "-0" num
  // card de comissão numa apresentação ao vivo é feio sem motivo.
  return Number.isFinite(n) ? n + 0 : 0;
}

/** Dinheiro sempre em centavos exatos. Toda soma de real passa por
 *  aqui, e é isso que faz a coluna "Comissão est. (R$)" do Top 5 fechar
 *  com o card até o último centavo, sem sobra de ponto flutuante. */
const round2 = (v: number) => Math.round(safe(v) * 100) / 100;

const intFmt = (v: number) => Math.round(safe(v)).toLocaleString("pt-BR");

/** Dinheiro: inteiro sai sem casas ("0", como na referência), quebrado
 *  sai com duas ("1.234,50"). */
function moneyFmt(v: number): string {
  const n = safe(v);
  return Number.isInteger(n)
    ? n.toLocaleString("pt-BR")
    : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const metricValueFmt = (key: MetricKey, v: number) =>
  MONEY_METRICS.has(key) ? moneyFmt(v) : intFmt(v);

/** Dinheiro em coluna de tabela: SEMPRE duas casas. Ali "74" ao lado de
 *  "8,40" desalinharia a coluna; no card, que é um número solto, vale a
 *  regra da referência (inteiro sai sem casas). */
const money2Fmt = (v: number) =>
  safe(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Arquivo local ─────────────────────────────────────────────
   Ler, sanear, semear e gravar. Nada aqui lança: localStorage pode não
   existir (aba anônima, storage bloqueado por política) e o que está
   gravado pode ter sido mexido à mão. Nos dois casos a página abre. */

/** Cinco vagas no Top 5 — e é o mesmo número que limita quantos
 *  produtos distintos um dia pode ter (ver pickProduct). É isso que
 *  mantém a soma das unidades do Top 5 igual a "Itens vendidos" e a
 *  soma das comissões igual a "Comissão est. (R$)": nenhuma venda cai
 *  fora da tabela. */
const TOP_SLOTS = 5;

function emptyDay(): PanelDay {
  return {
    clicks: 0,
    orders: 0,
    estimated_commission: 0,
    items_sold: 0,
    order_value: 0,
    new_buyers: 0,
    social_clicks: 0,
    products: [],
  };
}

/** Lê um dia cru sem confiar em nada: chave faltando, texto no lugar de
 *  número, negativo, NaN — tudo vira zero. É o que garante que arquivo
 *  adulterado à mão não derrube a rota nem imprima NaN num card. */
function normalizeDay(raw: unknown): PanelDay {
  const bag = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const count = (v: unknown) => Math.max(0, Math.round(safe(v)));
  const money = (v: unknown) => Math.max(0, round2(safe(v)));

  const rows: PanelProduct[] = [];
  const seen = new Set<string>();
  const list = Array.isArray(bag.products) ? bag.products : [];
  for (const item of list) {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    // Agregação é POR ID: o mesmo id duas vezes viraria linha duplicada
    // no Top 5, e isso não pode acontecer.
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, units: count(row.units), commission: money(row.commission) });
  }

  return {
    clicks: count(bag.clicks),
    orders: count(bag.orders),
    estimated_commission: money(bag.estimated_commission),
    items_sold: count(bag.items_sold),
    order_value: money(bag.order_value),
    new_buyers: count(bag.new_buyers),
    social_clicks: count(bag.social_clicks),
    // O gerador nunca cria um sexto produto. O corte só existe para
    // arquivo adulterado à mão não estourar a tabela.
    products: rows.slice(0, TOP_SLOTS),
  };
}

/* Semente do primeiro uso. Aparelho novo — nada gravado ainda — abre
   EXATAMENTE na composição aprovada: 3 em "Cliques" com "-92,86%", "0%"
   nos outros cinco cards, 3 em "Redes sociais" e o Top 5 todo com "--".

   A porcentagem não está escrita à mão em lugar nenhum: ela CAI do
   cálculo. 42 cliques no dia anterior contra 3 hoje dá
   (3 − 42) / 42 × 100 = −92,857…% → "-92,86%". É o mesmo caminho que
   toda variação da tela percorre, então não existe número de
   demonstração privilegiado passando por fora da conta. */
const SEED_CLICKS_TODAY = 3;
const SEED_CLICKS_PREVIOUS = 42;

function seedStore(): PanelStore {
  const today = spDateKey();
  return {
    v: STORE_VERSION,
    userName: DEFAULT_USER_NAME,
    days: {
      [today]: { ...emptyDay(), clicks: SEED_CLICKS_TODAY, social_clicks: SEED_CLICKS_TODAY },
      [prevDay(today)]: {
        ...emptyDay(),
        clicks: SEED_CLICKS_PREVIOUS,
        social_clicks: SEED_CLICKS_PREVIOUS,
      },
    },
  };
}

function loadStore(): PanelStore {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch {
    /* Storage bloqueado: segue em memória, com a semente. */
  }

  const days: Record<string, PanelDay> = {};
  // `null` = nada válido no arquivo; o nome vira DEFAULT_USER_NAME mais
  // abaixo. Distinto de "" para não confundir "não gravado" com "vazio".
  let userName: string | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") {
        const bag = parsed as { days?: unknown; userName?: unknown };
        if (bag.days && typeof bag.days === "object" && !Array.isArray(bag.days)) {
          for (const [date, value] of Object.entries(bag.days as Record<string, unknown>)) {
            if (DATE_RE.test(date)) days[date] = normalizeDay(value);
          }
        }
        if (typeof bag.userName === "string" && bag.userName.trim()) {
          userName = bag.userName.trim();
        }
      }
    } catch {
      /* JSON quebrado: começa limpo em vez de derrubar a rota. */
    }
  }

  // Sem nenhum dia válido o arquivo é tratado como novo e a semente de
  // vendas entra — mas um nome válido lido do JSON quebrado/parcial
  // ainda assim sobrevive: o nome não é dado de venda, não faz sentido
  // apagá-lo só porque `days` deu errado.
  if (!Object.keys(days).length) {
    const seed = seedStore();
    return userName ? { ...seed, userName } : seed;
  }
  return { v: STORE_VERSION, userName: userName ?? DEFAULT_USER_NAME, days };
}

function saveStore(store: PanelStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* Sem storage ou sem espaço: o painel continua funcionando em
       memória até o reload. Não é motivo para avisar nada na tela. */
  }
}

/**
 * A data anterior do MESMO arquivo local: a mais recente que existir
 * antes da selecionada. "AAAA-MM-DD" ordena por texto na mesma ordem em
 * que ordena no calendário, então comparar string basta.
 *
 * Nenhuma data anterior gravada conta como um dia zerado — a tela abre
 * com "0%" em vez de inventar variação.
 */
function previousDayOf(store: PanelStore, date: string): PanelDay | null {
  let best: string | null = null;
  for (const key of Object.keys(store.days)) {
    if (key >= date) continue;
    if (best === null || key > best) best = key;
  }
  return best === null ? null : store.days[best] ?? null;
}

/* ── Porcentagens ──────────────────────────────────────────────
   Sempre automáticas, sempre contra a data anterior do arquivo local.
   Não existe porcentagem digitada — não existe nada digitado. */

type PctTone = "negative" | "neutral" | "positive";

/** Sair do zero é crescimento total, e "+100,00%" é o jeito seguro de
 *  dizer isso sem imprimir Infinity num card. */
const FROM_ZERO_PCT = 100;

/**
 * Variação contra a data anterior. NUNCA devolve NaN nem Infinity (§4
 * dos requisitos): toda entrada passa por safe() e a divisão por zero é
 * interceptada antes de acontecer.
 */
function autoPct(current: number, previous: PanelDay | null, key: MetricKey): number {
  const before = previous ? safe(previous[key]) : 0;
  const now = safe(current);
  if (before === 0) {
    if (now === 0) return 0;
    return now > 0 ? FROM_ZERO_PCT : -FROM_ZERO_PCT;
  }
  const pct = ((now - before) / before) * 100;
  return Number.isFinite(pct) ? pct : 0;
}

/** Formatação, sinal, casas e cor idênticos ao aprovado: zero sai "0%"
 *  cinza e sem sinal, o resto sai com duas casas e sinal explícito. */
function formatPct(value: number): { text: string; tone: PctTone } {
  const rounded = Math.round(safe(value) * 100) / 100;
  if (rounded === 0) return { text: "0%", tone: "neutral" };
  const body = Math.abs(rounded).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return rounded < 0
    ? { text: `-${body}%`, tone: "negative" }
    : { text: `+${body}%`, tone: "positive" };
}

/* ── Catálogo ──────────────────────────────────────────────────
   Os mesmos 300 produtos que a página de Produtos usa. Nome, imagem,
   preço e porcentagem de comissão vêm SEMPRE daqui; o arquivo local
   guarda só o id, as unidades e a comissão acumulada. */
const productById = new Map<string, AffiliateProduct>(affiliateProducts.map((p) => [p.id, p]));

/**
 * COMISSÃO É DINHEIRO, NÃO PORCENTAGEM.
 *
 * O catálogo guarda `commissionPct` como número inteiro — 30 quer dizer
 * 30%. Esta é a ÚNICA função do arquivo que converte para taxa e a
 * única que conhece o padrão: nem `/ 100` nem `0.3` aparecem em
 * qualquer outro lugar. Um produto de R$ 50,00 a 30% soma R$ 15,00 em
 * "Comissão est. (R$)" — nunca R$ 30,00, nunca "30%".
 */
const DEFAULT_COMMISSION_RATE = 0.3;

function commissionRate(product: AffiliateProduct): number {
  const pct = safe(product.commissionPct);
  return pct > 0 ? pct / 100 : DEFAULT_COMMISSION_RATE;
}

/* ── VENDA SIMULADA ────────────────────────────────────────────
   UM clique no sininho = UMA venda completa na data selecionada. */

/** Uma venda é um item, um pedido, um comprador novo. */
const SALE_QUANTITY = 1;
const SALE_NEW_BUYERS = 1;

/** Cliques plausíveis por venda: venda não acontece sem visita, e parte
 *  dessas visitas veio de rede social — por isso o social é sempre uma
 *  fatia do total, nunca um número maior que ele. */
const CLICKS_PER_SALE_MIN = 4;
const CLICKS_PER_SALE_MAX = 14;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Produto da próxima venda. Enquanto sobrar vaga no Top 5 sai sempre um
 * INÉDITO, para a tabela encher com cinco produtos diferentes; com as
 * cinco vagas ocupadas a venda cai num dos cinco e a quantidade dele
 * cresce. É por isso que nunca existe um sexto produto fora da tabela —
 * e é por isso que as somas do Top 5 fecham com os cards.
 */
function pickProduct(day: PanelDay): AffiliateProduct | null {
  const used = new Set(day.products.map((row) => row.id));
  const pool =
    used.size < TOP_SLOTS
      ? affiliateProducts.filter((p) => !used.has(p.id))
      : affiliateProducts.filter((p) => used.has(p.id));
  if (!pool.length) return null;
  return pool[randInt(0, pool.length - 1)] ?? null;
}

/**
 * Aplica UMA venda na data e devolve o arquivo inteiro já novo.
 *
 * Tudo é calculado antes de qualquer coisa chegar à tela: quem chama faz
 * um `setStore` só, com este objeto pronto. Não existe quadro
 * intermediário em que "Pedido" já subiu e "Comissão est." ainda está
 * velha.
 */
function applySale(store: PanelStore, date: string): PanelStore {
  const day = store.days[date] ?? emptyDay();
  const product = pickProduct(day);
  if (!product) return store;

  const price = Math.max(0, safe(product.price));
  const orderValue = round2(price * SALE_QUANTITY);
  const commission = round2(orderValue * commissionRate(product));

  const clicksAdd = randInt(CLICKS_PER_SALE_MIN, CLICKS_PER_SALE_MAX);
  const socialClicksAdd = randInt(Math.ceil(clicksAdd / 2), clicksAdd);

  /* O MESMO `commission` entra no card e na linha do produto: somar o
     mesmo centavo dos dois lados é o que mantém as duas colunas iguais. */
  const known = day.products.some((row) => row.id === product.id);
  const products: PanelProduct[] = known
    ? day.products.map((row) =>
        row.id === product.id
          ? {
              ...row,
              units: row.units + SALE_QUANTITY,
              commission: round2(row.commission + commission),
            }
          : row,
      )
    : [...day.products, { id: product.id, units: SALE_QUANTITY, commission }];

  const next: PanelDay = {
    clicks: day.clicks + clicksAdd,
    orders: day.orders + 1,
    estimated_commission: round2(day.estimated_commission + commission),
    items_sold: day.items_sold + SALE_QUANTITY,
    order_value: round2(day.order_value + orderValue),
    new_buyers: day.new_buyers + SALE_NEW_BUYERS,
    social_clicks: day.social_clicks + socialClicksAdd,
    products,
  };

  // Espalha o `store` inteiro (preserva `userName`) e só troca `days`:
  // uma venda nunca pode apagar o nome do cabeçalho.
  return { ...store, days: { ...store.days, [date]: next } };
}

/* ── Top 5 ─────────────────────────────────────────────────────
   A agregação por produto já vem pronta do arquivo local: uma linha por
   id, sem duplicata possível. */

type TopRow = {
  id: string;
  product: AffiliateProduct | undefined;
  units: number;
  commission: number;
};

/** Ordena por unidades (desc); empate desempata pela maior comissão
 *  acumulada. O preenchimento até cinco linhas é da renderização, para
 *  as cinco existirem mesmo sem venda nenhuma. */
function buildTop5(day: PanelDay | null): TopRow[] {
  if (!day) return [];
  return day.products
    .map((row) => ({
      id: row.id,
      product: productById.get(row.id),
      units: Math.max(0, Math.round(safe(row.units))),
      commission: Math.max(0, safe(row.commission)),
    }))
    .sort((a, b) => b.units - a.units || b.commission - a.commission)
    .slice(0, TOP_SLOTS);
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES DA TELA
   ══════════════════════════════════════════════════════════════ */

function MetricCard({
  label,
  value,
  change,
  tone,
  active = false,
}: {
  label: string;
  value: string;
  change: string;
  tone: PctTone;
  active?: boolean;
}) {
  return (
    <article className={"metric-card " + (active ? "selected" : "")}>
      <div className="metric-label"><span>{label}</span><InfoDot /></div>
      <div className="metric-data"><strong>{value}</strong><span className={tone}>{change}</span></div>
    </article>
  );
}

function ProductsPanel({ rows }: { rows: TopRow[] }) {
  const padded: (TopRow | null)[] = [...rows];
  while (padded.length < TOP_SLOTS) padded.push(null);

  return (
    <section className="products-panel">
      <h2>Meus Top 5 produtos</h2>
      <div className="products-table" role="table" aria-label="Meus Top 5 produtos">
        <div className="table-row table-head" role="row">
          <div role="columnheader">Produto</div>
          <div className="align-right sortable selected-sort" role="columnheader"><span>Itens vendidos</span><i /></div>
          <div className="align-right sortable" role="columnheader"><span>Comissão est. (R$)</span><i /></div>
          <div role="columnheader">Ação</div>
        </div>
        {padded.map((row, index) => (
          <div className="table-row" role="row" key={row ? `p-${row.id}` : `empty-${index}`}>
            <div role="cell">
              {row ? (
                <span className="product-cell">
                  {row.product ? (
                    <img src={row.product.image} alt="" width={28} height={28} loading="lazy" />
                  ) : null}
                  <span className="product-name" title={row.product?.name}>
                    {/* Sem produto no catálogo para esse id não se inventa
                        nome: mostra o identificador e pronto. */}
                    {row.product?.name ?? `Produto ${row.id}`}
                  </span>
                </span>
              ) : (
                "--"
              )}
            </div>
            <div className="align-right" role="cell">{row ? intFmt(row.units) : "--"}</div>
            <div className="align-right" role="cell">{row ? money2Fmt(row.commission) : "--"}</div>
            {/* Coluna Ação permanece "--", sem botão. */}
            <div role="cell">--</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   PÁGINA
   ══════════════════════════════════════════════════════════════ */

function PainelPage() {
  /* UM estado para o arquivo inteiro. É o que permite aplicar a venda
     num `setStore` só: cliques, pedido, comissão, itens, valor do
     pedido, compradores novos, rede social e Top 5 mudam no MESMO
     quadro, nunca um antes do outro. */
  const [store, setStore] = useState<PanelStore>(loadStore);

  /* Hoje em São Paulo, não no fuso do visitante: um navegador em Tóquio
     não pode oferecer uma data que ainda não começou no Brasil. */
  const maxDate = useMemo(() => spDateKey(), []);
  const [selectedDate, setSelectedDate] = useState<string>(maxDate);

  /* Persistência fora do updater: `setStore` continua puro, e o
     StrictMode pode chamá-lo duas vezes sem gravar dois arquivos. Roda
     também na montagem — é assim que a semente vira arquivo. */
  useEffect(() => {
    saveStore(store);
  }, [store]);

  const daily = store.days[selectedDate] ?? null;
  const previous = useMemo(() => previousDayOf(store, selectedDate), [store, selectedDate]);

  /* O sininho: um clique, uma venda, na data que está na tela. */
  const handleSale = useCallback(() => {
    setStore((current) => applySale(current, selectedDate));
  }, [selectedDate]);

  const onPickDate = useCallback((value: string) => {
    if (!DATE_RE.test(value)) return;
    setSelectedDate(value);
  }, []);

  /* Confirmado (Enter ou blur) no EditableUserName. Não depende da data
     selecionada — troca de data nunca troca esse valor. */
  const onUserNameCommit = useCallback((next: string) => {
    setStore((current) => (current.userName === next ? current : { ...current, userName: next }));
  }, []);

  /* Data sem venda nenhuma mostra zeros — o layout é o mesmo, só os
     números mudam. */
  const cards = METRIC_KEYS.map((key) => {
    const current = safe(daily?.[key] ?? 0);
    return {
      key,
      label: METRIC_LABEL[key],
      value: metricValueFmt(key, current),
      pct: formatPct(autoPct(current, previous, key)),
    };
  });

  const socialClicks = intFmt(safe(daily?.social_clicks ?? 0));
  const top5 = buildTop5(daily);

  return (
    <div className="pnlx">
      <style>{CSS}</style>

      <Header userName={store.userName} onUserNameCommit={onUserNameCommit} onSale={handleSale} />
      <Sidebar />
      <main className="content">
        <section className="date-panel">
          <div className="date-filter">
            <span>Período dos dados</span>
            {/* O texto visível é nosso, formatado em DD/MM/AAAA — o
                <input type="date"> por cima é transparente e serve só
                para abrir o seletor nativo. Assim a data aparece em
                DD/MM/AAAA mesmo num navegador em locale en-US, e a
                caixa continua com os mesmos 230px do aprovado. */}
            <label className="date-input">
              <span>{toBR(selectedDate)}</span>
              <Icon name="calendar" size={17} />
              <input
                type="date"
                aria-label="Período dos dados"
                value={selectedDate}
                max={maxDate}
                onChange={(event) => onPickDate(event.currentTarget.value)}
                onClick={(event) => {
                  const el = event.currentTarget;
                  if (typeof el.showPicker === "function") {
                    try {
                      el.showPicker();
                    } catch {
                      /* alguns navegadores só permitem via gesto direto */
                    }
                  }
                }}
              />
            </label>
          </div>
          <span className="updated-text">Dados atualizados diariamente às 5:30 PM</span>
        </section>

        <section className="metrics-panel">
          <div className="section-heading"><h1>Métricas principais</h1><span>vs dia anterior</span></div>
          <div className="metrics-grid">
            {cards.map((card, index) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                change={card.pct.text}
                tone={card.pct.tone}
                active={index === 0}
              />
            ))}
          </div>
          <div className="click-details">
            <h2>Detalhes de cliques</h2>
            <div className="social-row">
              <span className="social-icon"><Icon name="social" size={19} /></span>
              <span>Redes sociais</span>
              <strong>{socialClicks}</strong>
            </div>
          </div>
        </section>
        <ProductsPanel rows={top5} />
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GATE — mesmo padrão de src/routes/dashboard.tsx
   ══════════════════════════════════════════════════════════════ */

function PainelGate() {
  const { user, authReady, isAdmin } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!isAdmin) navigate({ to: "/dashboard" });
  }, [authReady, user, isAdmin, navigate]);

  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user || !isAdmin) return null;
  return <PainelPage />;
}

export const Route = createFileRoute("/painel")({ component: PainelGate });

/* ══════════════════════════════════════════════════════════════
   CSS — TUDO escopado em `.pnlx`
   ══════════════════════════════════════════════════════════════
   O arquivo de origem (painel-styles-approved.css) redefinia :root, *,
   e `html, body`. Aqui:

    · `:root { … }`            → propriedades do wrapper `.pnlx`;
    · `html, body` + `.dashboard-shell` → o próprio `.pnlx`, que é o
      elemento raiz da página e acumula os dois papéis;
    · `min-width: 1024px`      → no wrapper. O painel é desktop-only de
      propósito; abaixo disso a página corta à direita em vez de
      reflowar, mas o body do app continua sem min-width nenhum;
    · todo o resto ganhou o prefixo `.pnlx `.

   Este bloco é unlayered, então vence o `@layer base` do styles.css
   global sem !important — é o que permite desfazer Sora nos títulos e
   o line-height 1.6 do body só aqui dentro.
   ══════════════════════════════════════════════════════════════ */

const CSS = `
.pnlx{
  --orange: #ee4d2d;
  --text: #333333;
  --muted: #8b8b8b;
  --line: #e2e2e2;
  --page: #f6f6f6;

  min-width: 1024px;
  min-height: 100vh;
  background: var(--page);
  color: var(--text);
  font-family: Arial, "Helvetica Neue", sans-serif;
  font-size: 14px;
  line-height: normal;
  -webkit-font-smoothing: antialiased;
}
.pnlx, .pnlx *{ box-sizing: border-box; }
.pnlx h1, .pnlx h2{ font-family: inherit; letter-spacing: normal; line-height: normal; }

.pnlx .top-header{
  position: fixed;
  z-index: 20;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #ededed;
  box-shadow: 0 1px 7px rgba(0,0,0,.06);
}

.pnlx .brand-area{ width: 68px; height: 56px; display: flex; align-items: center; justify-content: center; color: var(--orange); flex: 0 0 68px; }
.pnlx .brand-mark{ width: 35.5px; height: 36px; display: block; object-fit: contain; }

.pnlx .breadcrumb{ display: flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 15px; }
.pnlx .breadcrumb span{ color: #a2a2a2; }
.pnlx .breadcrumb b{ color: #8f8f8f; font-size: 20px; line-height: 1; font-weight: 400; }
.pnlx .breadcrumb strong{ color: #262626; font-weight: 500; }

.pnlx .header-actions{ margin-left: auto; height: 100%; display: flex; align-items: center; padding-right: 15px; }
.pnlx .header-action{ display: flex; align-items: center; gap: 8px; height: 100%; color: #3f3f3f; white-space: nowrap; }
.pnlx .header-action.language{ margin-right: 35px; }
.pnlx .header-action.user{ margin-right: 25px; gap: 10px; }
/* Largura FIXA para o span e o input ocuparem o mesmo espaço: editar o
   nome nunca empurra o chevron, a linha vertical ou os ícones à direita,
   não importa o que for digitado. Nome comprido corta com reticências
   em vez de esticar o cabeçalho. */
.pnlx .header-action.user .user-name{ display: inline-block; width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.pnlx .header-action.user input.user-name{ border: 0; background: transparent; padding: 0; margin: 0; font: inherit; color: inherit; outline: none; }
.pnlx .vertical-line{ width: 1px; height: 31px; background: #ececec; margin-right: 11px; }
.pnlx .utility{ position: relative; width: 48px; height: 56px; display: flex; align-items: center; justify-content: center; color: #4b4b4b; }
.pnlx .utility.more{ gap: 3px; width: 45px; }
.pnlx .utility.more i{ display: block; width: 3px; height: 3px; border-radius: 50%; background: #373737; }
.pnlx .tiny-clock{ position: absolute; left: 29px; top: 30px; width: 8px; height: 8px; border: 1.2px solid currentColor; border-radius: 50%; background: #fff; }
.pnlx .tiny-clock::after{ content: ""; position: absolute; left: 3px; top: 1px; width: 1px; height: 3px; background: currentColor; transform: rotate(-35deg); transform-origin: bottom; }
.pnlx .help-button{ height: 38px; min-width: 121px; display: flex; align-items: center; justify-content: center; border: 1px solid #e4e4e4; border-radius: 20px; color: #444; white-space: nowrap; font-size: 13px; margin-left: 1px; }

.pnlx .chevron{ width: 7px; height: 7px; border-left: 1.5px solid currentColor; border-top: 1.5px solid currentColor; transform: rotate(45deg); margin-left: auto; margin-right: 2px; }
.pnlx .chevron.down{ transform: rotate(225deg); margin: -4px 1px 0 0; }

.pnlx .sidebar{
  position: fixed;
  z-index: 10;
  top: 56px;
  bottom: 0;
  left: 0;
  width: 200px;
  background: #fff;
  border-right: 1px solid #ededed;
  color: #3d3d3d;
  overflow: hidden;
}

.pnlx .sidebar nav{ height: calc(100% - 27px); overflow: hidden; padding-top: 0; }
.pnlx .nav-section{ margin-top: 15px; }
.pnlx .nav-section.first{ margin-top: 0; }
.pnlx .nav-heading{ height: 35px; padding: 0 17px; display: flex; align-items: center; gap: 9px; color: #666; font-weight: 600; }
.pnlx .nav-icon{ color: #a8aaad; width: 17px; height: 18px; display: inline-flex; align-items: center; }
.pnlx .nav-heading .chevron{ color: #333; width: 6px; height: 6px; }
.pnlx .nav-items{ display: grid; }
.pnlx .nav-item{ min-height: 32px; padding: 7px 15px 7px 40px; line-height: 18px; font-size: 14px; cursor: default; }
.pnlx .nav-item.active{ color: var(--orange); background: #fff5f0; border-right: 2px solid var(--orange); }
.pnlx .new-pill{ display: inline-flex; align-items: center; justify-content: center; height: 17px; padding: 0 5px; margin-left: 3px; background: #ff6547; color: #fff; border-radius: 9px; font-size: 10px; line-height: 1; vertical-align: 1px; }
.pnlx .ellipsis-text{ margin-left: 1px; }
.pnlx .sidebar-collapse{ position: absolute; left: 0; right: 0; bottom: 0; height: 27px; border-top: 1px solid #ededed; display: flex; align-items: center; padding-left: 17px; color: #555; background: #fff; }

.pnlx .content{ margin-left: 200px; padding: 64px 20px 12px 24px; min-height: 100vh; }
.pnlx .date-panel, .pnlx .metrics-panel, .pnlx .products-panel{ background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.08); }
.pnlx .date-panel{ height: 65px; display: flex; align-items: center; justify-content: space-between; padding: 0 25px; }
.pnlx .date-filter{ display: flex; align-items: center; gap: 16px; font-size: 14px; white-space: nowrap; }
.pnlx .date-input{ position: relative; width: 230px; height: 33px; border: 1px solid #dedede; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; color: #606060; padding: 0 13px 0 11px; font-size: 14px; cursor: pointer; }
.pnlx .date-input svg{ color: #a6a6a6; }
.pnlx .date-input input[type="date"]{ position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: transparent; opacity: 0; cursor: pointer; font: inherit; }
.pnlx .date-input:focus-within{ border-color: var(--orange); }
.pnlx .updated-text{ color: #999; font-size: 14px; }
.pnlx .updated-text.error{ color: #ff3e55; }

.pnlx .metrics-panel{ height: 403px; margin-top: 15px; padding: 25px; }
.pnlx .section-heading{ height: 25px; display: flex; justify-content: space-between; align-items: center; }
.pnlx .section-heading h1{ margin: 0; font-size: 19px; line-height: 24px; font-weight: 600; color: #333; }
.pnlx .section-heading > span{ color: #999; font-size: 13px; }
.pnlx .metrics-grid{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.pnlx .metric-card{ height: 82px; border: 1px solid #dedede; border-radius: 4px; padding: 12px 12px 10px; background: #fff; }
.pnlx .metric-card.selected{ border-top: 4px solid var(--orange); padding-top: 9px; }
.pnlx .metric-label{ height: 22px; display: flex; align-items: flex-start; gap: 7px; color: #666; font-weight: 600; }
.pnlx .metric-card.selected .metric-label{ color: var(--orange); }
.pnlx .info-dot{ width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #aeb0b2; border-radius: 50%; color: #8b8d8f; font-size: 9px; font-style: normal; font-weight: 600; line-height: 1; margin-top: 1px; }
.pnlx .metric-data{ height: 36px; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
.pnlx .metric-data strong{ font-size: 24px; line-height: 29px; font-weight: 500; color: #080808; }
.pnlx .metric-data span{ font-size: 11px; font-weight: 600; padding-bottom: 3px; white-space: nowrap; }
.pnlx .negative{ color: #ff3e55; }
.pnlx .neutral{ color: #aaa; }
/* Positivo usa o verde que o app já usa para sucesso (emerald-600 do
   Tailwind, o mesmo dos badges de conta aprovada). Card intocado. */
.pnlx .positive{ color: #059669; }
.pnlx .click-details{ margin-top: 39px; }
.pnlx .click-details h2{ margin: 0 0 17px; font-size: 15px; font-weight: 500; color: #444; }
.pnlx .social-row{ width: 360px; height: 56px; border: 1px solid #e2e2e2; border-radius: 4px; display: flex; align-items: center; padding: 0 13px 0 15px; font-size: 16px; }
.pnlx .social-row .social-icon{ color: #2f80ff; width: 28px; display: inline-flex; align-items: center; }
.pnlx .social-row strong{ margin-left: auto; font-size: 14px; font-weight: 500; }

.pnlx .products-panel{ height: 326px; margin-top: 15px; padding: 25px 32px 20px; }
.pnlx .products-panel h2{ margin: 0 0 13px; height: 24px; font-size: 19px; line-height: 24px; font-weight: 600; color: #333; }
.pnlx .products-table{ width: 100%; border: 1px solid #dedede; border-radius: 4px; overflow: hidden; background: #fff; }
.pnlx .table-row{ display: grid; grid-template-columns: 32% 22% 24% 22%; min-height: 40px; border-top: 1px solid #e7e7e7; color: #4d4d4d; font-size: 12px; }
.pnlx .table-row:first-child{ border-top: 0; }
.pnlx .table-row > div{ display: flex; align-items: center; padding: 0 9px; min-width: 0; }
.pnlx .table-row > div + div{ border-left: 1px solid #fafafa; }
.pnlx .table-head{ background: #fcfcfc; color: #666; font-size: 12px; font-weight: 600; }
.pnlx .table-row .align-right{ justify-content: flex-end; text-align: right; }
.pnlx .sortable{ gap: 9px; }
.pnlx .sortable i{ width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #c8c8c8; margin-top: 3px; }
.pnlx .sortable.selected-sort i{ border-top-color: var(--orange); }

/* Linha preenchida do Top 5: imagem + nome vêm do catálogo real, numa
   linha só com reticências. O aprovado só tinha o estado vazio. */
.pnlx .product-cell{ display: flex; align-items: center; gap: 9px; width: 100%; min-width: 0; }
.pnlx .product-cell img{ width: 28px; height: 28px; flex: 0 0 28px; border-radius: 3px; object-fit: cover; background: #f3f3f3; }
.pnlx .product-name{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }


/* O sininho é <button>: ele é clicável de verdade, e assim funciona no
   teclado e no leitor de tela. Estas propriedades desfazem o que o UA e
   o preflight do Tailwind fazem com button; largura, altura e cor
   continuam vindo de .pnlx .utility, que não é tocada aqui. O resultado
   desenha exatamente como o <div> da composição aprovada. */
.pnlx button.utility{ appearance: none; -webkit-appearance: none; background: none; border: 0; margin: 0; padding: 0; font: inherit; cursor: pointer; }

@media (max-width: 1180px){
  .pnlx .header-action.language{ margin-right: 20px; }
  .pnlx .header-action.user{ margin-right: 15px; }
  .pnlx .help-button{ min-width: 112px; }
}
`;
