/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — PainelEditor
  ═══════════════════════════════════════════════════════════════
  Overlay de edição dos números de demonstração do /painel.

  COMPONENTE PURO. Não fala com o Supabase, não importa o client, não
  sabe o nome de nenhuma tabela. Recebe os dados por prop e devolve o
  resultado por `onSave`; quem persiste é o pai. É isso que deixa o
  arquivo pequeno o bastante para caber de uma vez — e testável sem
  rede.

  NÚMEROS DE DEMONSTRAÇÃO. Nada daqui é saldo, comissão real ou saque.

  CATÁLOGO: nome e imagem saem de src/lib/mock/affiliate-products por
  `n`, na hora de desenhar. O que este editor EMITE por produto são só
  três campos — product_n, items_sold, commission_per_sale. Nome,
  imagem, URL e preço não são copiados para lugar nenhum: no dia em que
  o catálogo for regerado, quem mostra o nome novo é o catálogo.

  CSS: todo seletor abaixo começa em `.pnlx`, o wrapper da página em
  src/routes/painel.tsx. Nada de :root, html ou body — o painel provou
  que dá para ter a tela inteira escopada e nenhuma regra escapando, e
  não é este arquivo que vai furar isso. O componente é renderizado
  DENTRO do `.pnlx`; fora dele não pinta nada.
  ═══════════════════════════════════════════════════════════════
*/
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";

import { affiliateProducts, type AffiliateProduct } from "../../lib/mock/affiliate-products";

/* ══════════════════════════════════════════════════════════════
   CONTRATO PÚBLICO
   ══════════════════════════════════════════════════════════════ */

export type PanelMetrics = {
  clicks: number;
  orders: number;
  estimated_commission: number;
  items_sold: number;
  order_value: number;
  new_buyers: number;
  social_clicks: number;
};

/**
 * Porcentagem manual por métrica. `null` — e chave ausente — significam
 * AUTOMÁTICO: o card calcula a variação contra a data anterior.
 *
 * `onSave` sempre devolve as sete chaves preenchidas, cada uma com
 * número ou `null` explícito. Nunca 0 no lugar de vazio: 0% é "não
 * mudou nada", automático é "calcule você" — são números diferentes na
 * tela e o pai precisa conseguir distinguir os dois sem adivinhar.
 */
export type PanelPctOverrides = Partial<Record<keyof PanelMetrics, number | null>>;

export type PanelProductRow = {
  product_n: number;
  items_sold: number;
  commission_per_sale: number;
};

export type PainelEditorProps = {
  /**
   * O pai deve MONTAR o componente ao abrir (`{open ? <PainelEditor open .../> : null}`),
   * não mantê-lo montado com `open` false. O rascunho é semeado na
   * inicialização preguiçosa do estado, que roda uma vez, na montagem:
   * montado desde o carregamento da página, ele semearia com `products`
   * ainda vazio e a lista apareceria vazia no primeiro quadro. Manter
   * montado continua funcionando — `open` false devolve null — mas custa
   * esse piscar.
   */
  open: boolean;
  /** AAAA-MM-DD. Só exibida — trocar de data é decisão do pai. */
  recordDate: string;
  metrics: PanelMetrics;
  pctOverrides: PanelPctOverrides;
  products: PanelProductRow[];
  saving: boolean;
  error: string | null;
  onSave: (next: {
    metrics: PanelMetrics;
    pctOverrides: PanelPctOverrides;
    products: PanelProductRow[];
  }) => void;
  onClose: () => void;
};

/* ══════════════════════════════════════════════════════════════
   MÉTRICAS
   ══════════════════════════════════════════════════════════════ */

type MetricKey = keyof PanelMetrics;

const METRIC_KEYS: readonly MetricKey[] = [
  "clicks",
  "orders",
  "estimated_commission",
  "items_sold",
  "order_value",
  "new_buyers",
  "social_clicks",
];

const METRIC_LABEL: Record<MetricKey, string> = {
  clicks: "Cliques",
  orders: "Pedido",
  estimated_commission: "Comissão est.(R$)",
  items_sold: "Itens vendidos",
  order_value: "Valor do pedido(R$)",
  new_buyers: "Novos compradores",
  social_clicks: "Cliques de redes sociais",
};

/** Contagem de gente e de clique não tem meio. Recusar aqui evita
 *  mandar 1,5 para uma coluna que só aceita inteiro. */
const INTEGER_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>([
  "clicks",
  "orders",
  "items_sold",
  "new_buyers",
  "social_clicks",
]);

/** Em reais: exibidas e reeditadas em formato brasileiro. */
const MONEY_METRICS: ReadonlySet<MetricKey> = new Set<MetricKey>([
  "estimated_commission",
  "order_value",
]);

/* ══════════════════════════════════════════════════════════════
   NÚMEROS
   ══════════════════════════════════════════════════════════════ */

/** `n + 0` normaliza -0: Intl imprime "-0", e "-0" num card de comissão
 *  em apresentação ao vivo é feio sem motivo. */
function safeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n + 0 : 0;
}

const intText = (v: number) => String(Math.round(safeNumber(v)));

/** Formato brasileiro, duas casas. É como o valor entra no campo e como
 *  o admin espera relê-lo. */
const moneyText = (v: number) =>
  safeNumber(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Lê um número digitado por um brasileiro: "1.234,50", "1234,5" e
 * "1234.5" chegam ao mesmo lugar. Havendo vírgula, o ponto é separador
 * de milhar e some.
 *
 * Ambiguidade conhecida: "1.234" SEM vírgula vira 1,234 — não dá para
 * saber se o ponto é milhar ou decimal. Por isso os campos de dinheiro
 * mostram embaixo o valor já interpretado, e o admin corrige antes de
 * salvar.
 *
 * `null` = não é número. Quem decide se pode ser negativo é a validação
 * — porcentagem manual negativa é o caso de uso principal do override.
 */
function parseBRNumber(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n + 0 : null;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/* ══════════════════════════════════════════════════════════════
   CATÁLOGO
   ══════════════════════════════════════════════════════════════ */

const productByN = new Map<number, AffiliateProduct>(affiliateProducts.map((p) => [p.n, p]));

/** Busca sem acento e sem caixa: "acucareiro" acha "Açucareiro". */
const foldText = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const FOLDED_CATALOG = affiliateProducts.map((p) => ({
  product: p,
  haystack: foldText(p.name),
}));

/* ══════════════════════════════════════════════════════════════
   RASCUNHO
   ══════════════════════════════════════════════════════════════ */

type TextDraft = Record<MetricKey, string>;
type ProductDraft = {
  uid: string;
  productN: number;
  itemsSold: string;
  commissionPerSale: string;
};

type DraftErrors = {
  values: Partial<Record<MetricKey, string>>;
  pcts: Partial<Record<MetricKey, string>>;
  products: Record<string, string>;
};

const NO_ERRORS: DraftErrors = { values: {}, pcts: {}, products: {} };

const buildTextDraft = (fill: (key: MetricKey) => string): TextDraft =>
  Object.fromEntries(METRIC_KEYS.map((key) => [key, fill(key)])) as TextDraft;

const seedValues = (metrics: PanelMetrics): TextDraft =>
  buildTextDraft((key) =>
    INTEGER_METRICS.has(key) ? intText(metrics[key]) : moneyText(metrics[key]),
  );

/** Chave de lista. Só precisa ser única e estável enquanto a linha
 *  existir — product_n não serve, porque duas linhas repetidas (que a
 *  validação recusa, mas o admin consegue montar) colidiriam. */
let uidCounter = 0;
const nextUid = () => `p${uidCounter++}`;

const seedRows = (products: PanelProductRow[]): ProductDraft[] =>
  products.map((row) => ({
    uid: nextUid(),
    productN: row.product_n,
    itemsSold: intText(row.items_sold),
    commissionPerSale: moneyText(row.commission_per_sale),
  }));

const seedPcts = (overrides: PanelPctOverrides): TextDraft =>
  buildTextDraft((key) => {
    const value = overrides[key];
    return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  });

/** Assinatura do formulário, comparada contra a foto tirada quando ele
 *  foi semeado. É o que responde "tem alteração não salva?" sem exigir
 *  um flag por campo. */
const signature = (values: TextDraft, pcts: TextDraft, products: ProductDraft[]) =>
  JSON.stringify([
    values,
    pcts,
    products.map((p) => [p.productN, p.itemsSold.trim(), p.commissionPerSale.trim()]),
  ]);

/* ══════════════════════════════════════════════════════════════
   COMPONENTE
   ══════════════════════════════════════════════════════════════ */

export function PainelEditor({
  open,
  recordDate,
  metrics,
  pctOverrides,
  products,
  saving,
  error,
  onSave,
  onClose,
}: PainelEditorProps): ReactElement | null {
  /* Os três semeados na inicialização preguiçosa, não num efeito: efeito
     só roda depois da primeira pintura, e a lista de produtos apareceria
     vazia por um quadro. */
  const [values, setValues] = useState<TextDraft>(() => seedValues(metrics));
  const [pcts, setPcts] = useState<TextDraft>(() => seedPcts(pctOverrides));
  const [rows, setRows] = useState<ProductDraft[]>(() => seedRows(products));
  const [query, setQuery] = useState("");
  /* Só depois da primeira tentativa de salvar os erros aparecem — e a
     partir daí revalidam a cada tecla, sumindo conforme o admin
     conserta. É o estado "validating". */
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  const baseline = useRef<string | null>(null);
  const wasSaving = useRef(saving);

  // Referência do "sem alteração" já na primeira renderização, senão o
  // formulário nasceria sujo antes de o efeito de semeadura rodar.
  if (baseline.current === null) baseline.current = signature(values, pcts, rows);

  /* Semeia ao ABRIR e ao trocar de data — não a cada render do pai.
     `metrics`/`products` são objetos novos a cada render lá em cima; se
     entrassem nas dependências, o rascunho do admin seria apagado no
     meio da digitação. Para recarregar de propósito, o pai fecha e
     reabre, ou passa `key={recordDate}`. */
  useEffect(() => {
    if (!open) return;
    const nextValues = seedValues(metrics);
    const nextPcts = seedPcts(pctOverrides);
    const nextRows = seedRows(products);
    baseline.current = signature(nextValues, nextPcts, nextRows);
    setValues(nextValues);
    setPcts(nextPcts);
    setRows(nextRows);
    setQuery("");
    setSubmitted(false);
    setSaved(false);
    setPendingClose(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recordDate]);

  const dirty = signature(values, pcts, rows) !== baseline.current;

  /* O pai é quem sabe se gravou. `saving` caindo de true para false sem
     `error` é o sinal de sucesso: o rascunho vira a nova referência,
     senão o formulário ficaria "sujo" para sempre depois de salvar. */
  useEffect(() => {
    if (wasSaving.current && !saving && !error) {
      baseline.current = signature(values, pcts, rows);
      setSubmitted(false);
      setSaved(true);
    }
    wasSaving.current = saving;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, error]);

  /* Validação. Devolve os erros por campo E o payload já convertido,
     para não parsear duas vezes e arriscar divergir. */
  const validation = useMemo(() => {
    const errors: DraftErrors = { values: {}, pcts: {}, products: {} };
    const nextMetrics = {} as PanelMetrics;

    for (const key of METRIC_KEYS) {
      const raw = values[key];
      if (!raw.trim()) {
        errors.values[key] = "Informe um valor.";
        continue;
      }
      const parsed = parseBRNumber(raw);
      if (parsed === null) errors.values[key] = "Número inválido.";
      else if (parsed < 0) errors.values[key] = "Não pode ser negativo.";
      else if (INTEGER_METRICS.has(key) && !Number.isInteger(parsed))
        errors.values[key] = "Use um número inteiro.";
      else nextMetrics[key] = parsed;
    }

    // Sempre as sete chaves. Vazio vira null explícito, nunca 0.
    const nextOverrides: PanelPctOverrides = {};
    for (const key of METRIC_KEYS) {
      const raw = pcts[key];
      if (!raw.trim()) {
        nextOverrides[key] = null;
        continue;
      }
      const parsed = parseBRNumber(raw);
      if (parsed === null) errors.pcts[key] = "Porcentagem inválida.";
      else nextOverrides[key] = parsed;
    }

    const seen = new Set<number>();
    const nextProducts: PanelProductRow[] = [];
    for (const row of rows) {
      if (seen.has(row.productN)) {
        errors.products[row.uid] = "Produto repetido.";
        continue;
      }
      seen.add(row.productN);
      const items = parseBRNumber(row.itemsSold);
      const perSale = parseBRNumber(row.commissionPerSale);
      if (items === null || perSale === null) errors.products[row.uid] = "Número inválido.";
      else if (items < 0 || perSale < 0) errors.products[row.uid] = "Não pode ser negativo.";
      else if (!Number.isInteger(items))
        errors.products[row.uid] = "Itens vendidos precisa ser inteiro.";
      else
        nextProducts.push({
          product_n: row.productN,
          items_sold: items,
          commission_per_sale: perSale,
        });
    }

    const ok =
      Object.keys(errors.values).length === 0 &&
      Object.keys(errors.pcts).length === 0 &&
      Object.keys(errors.products).length === 0;

    return { errors, ok, metrics: nextMetrics, pctOverrides: nextOverrides, products: nextProducts };
  }, [values, pcts, rows]);

  const shownErrors = submitted ? validation.errors : NO_ERRORS;

  const results = useMemo(() => {
    const q = foldText(query.trim());
    if (!q) return [];
    const taken = new Set(rows.map((row) => row.productN));
    return FOLDED_CATALOG.filter(({ product, haystack }) => !taken.has(product.n) && haystack.includes(q))
      .slice(0, 8)
      .map((entry) => entry.product);
  }, [query, rows]);

  const touch = useCallback(() => setSaved(false), []);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty) {
      setPendingClose(true);
      return;
    }
    onClose();
  }, [dirty, saving, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  /* Aviso do navegador ao recarregar ou fechar a aba com alteração
     pendente. O aviso do Cancelar/Esc é a barra do rodapé. */
  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [open, dirty]);

  if (!open) return null;

  const setValue = (key: MetricKey, next: string) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    touch();
  };
  const setPct = (key: MetricKey, next: string) => {
    setPcts((prev) => ({ ...prev, [key]: next }));
    touch();
  };
  const setRow = (uid: string, patch: Partial<ProductDraft>) => {
    setRows((prev) => prev.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
    touch();
  };
  const addProduct = (product: AffiliateProduct) => {
    setRows((prev) => [
      ...prev,
      { uid: nextUid(), productN: product.n, itemsSold: "0", commissionPerSale: "0,00" },
    ]);
    setQuery("");
    touch();
  };
  const removeRow = (uid: string) => {
    setRows((prev) => prev.filter((row) => row.uid !== uid));
    touch();
  };

  const submit = () => {
    setSubmitted(true);
    if (!validation.ok) return;
    onSave({
      metrics: validation.metrics,
      pctOverrides: validation.pctOverrides,
      products: validation.products,
    });
  };

  /* Estados, em ordem de prioridade: saving → error (do pai) →
     validating → sucesso → alterações pendentes → idle. */
  const status: { tone: "ok" | "bad" | "busy" | "muted"; text: string } | null = saving
    ? { tone: "busy", text: "Salvando..." }
    : error
      ? { tone: "bad", text: error }
      : submitted && !validation.ok
        ? { tone: "bad", text: "Corrija os campos destacados." }
        : saved
          ? { tone: "ok", text: "Alterações salvas." }
          : dirty
            ? { tone: "muted", text: "Alterações não salvas." }
            : null;

  const locked = saving;

  return (
    <>
      <style>{EDITOR_CSS}</style>
      <div className="pnl-scrim" onClick={requestClose} aria-hidden="true" />
      <aside
        className="pnl-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Editar dados do painel"
      >
        <div className="pnl-editor-head">
          <h2>Editar dados do painel</h2>
          <p>Números de demonstração. Nada aqui vira saldo, comissão real ou saque.</p>
          <button
            type="button"
            className="pnl-close"
            onClick={requestClose}
            aria-label="Fechar editor"
            disabled={locked}
          >
            ×
          </button>
          <p className="pnl-date">
            Data: <strong>{formatDateBR(recordDate)}</strong>
          </p>
        </div>

        <div className="pnl-editor-body">
          <section className="pnl-section">
            <h3>Métricas</h3>
            <p className="pnl-note">
              Porcentagem em branco é automática — o card calcula sozinho contra o dia anterior.
              Preencher força o valor; apagar devolve ao automático.
            </p>
            <div className="pnl-field pnl-field-head">
              <span>Métrica</span>
              <span>Valor</span>
              <span>% manual</span>
            </div>
            {METRIC_KEYS.map((key) => {
              const valueError = shownErrors.values[key];
              const pctError = shownErrors.pcts[key];
              const parsed = parseBRNumber(values[key]);
              return (
                <div className="pnl-field" key={key}>
                  <label htmlFor={`pnl-v-${key}`}>{METRIC_LABEL[key]}</label>
                  <div className="pnl-cell">
                    <input
                      id={`pnl-v-${key}`}
                      className={valueError ? "pnl-input invalid" : "pnl-input"}
                      value={values[key]}
                      inputMode="decimal"
                      disabled={locked}
                      onChange={(event) => setValue(key, event.currentTarget.value)}
                    />
                    {valueError ? (
                      <small className="pnl-err">{valueError}</small>
                    ) : MONEY_METRICS.has(key) && parsed !== null ? (
                      <small className="pnl-hint">R$ {moneyText(parsed)}</small>
                    ) : null}
                  </div>
                  <div className="pnl-cell">
                    <input
                      className={pctError ? "pnl-input invalid" : "pnl-input"}
                      value={pcts[key]}
                      placeholder="auto"
                      inputMode="decimal"
                      aria-label={`Porcentagem manual de ${METRIC_LABEL[key]}`}
                      disabled={locked}
                      onChange={(event) => setPct(key, event.currentTarget.value)}
                    />
                    {pctError ? <small className="pnl-err">{pctError}</small> : null}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="pnl-section">
            <h3>Top 5 produtos</h3>
            <p className="pnl-note">
              Nome, imagem e preço continuam vindo do catálogo da UpShopee — aqui ficam só o
              produto, os itens vendidos e a comissão por venda. O painel ordena por itens
              vendidos{rows.length > 5 ? " e mostra apenas os cinco primeiros." : "."}
            </p>

            {rows.length === 0 ? (
              <p className="pnl-empty">Nenhum produto nesta data. Busque abaixo para incluir.</p>
            ) : (
              <div className="pnl-product pnl-field-head">
                <span />
                <span>Produto</span>
                <span>Itens</span>
                <span>Comissão/venda</span>
                <span />
              </div>
            )}

            {rows.map((row) => {
              const product = productByN.get(row.productN);
              const rowError = shownErrors.products[row.uid];
              return (
                <div className="pnl-product" key={row.uid}>
                  {product ? (
                    <img src={product.image} alt="" width={30} height={30} loading="lazy" />
                  ) : (
                    <span className="pnl-noimg" aria-hidden="true" />
                  )}
                  <span className="pnl-product-name" title={product?.name}>
                    {/* Sem produto no catálogo para esse `n` não se inventa
                        nome: mostra o identificador e pronto. */}
                    {product?.name ?? `Produto #${row.productN}`}
                  </span>
                  <input
                    className={rowError ? "pnl-input invalid" : "pnl-input"}
                    value={row.itemsSold}
                    inputMode="numeric"
                    aria-label="Itens vendidos"
                    disabled={locked}
                    onChange={(event) => setRow(row.uid, { itemsSold: event.currentTarget.value })}
                  />
                  <input
                    className={rowError ? "pnl-input invalid" : "pnl-input"}
                    value={row.commissionPerSale}
                    inputMode="decimal"
                    aria-label="Comissão por venda"
                    disabled={locked}
                    onChange={(event) =>
                      setRow(row.uid, { commissionPerSale: event.currentTarget.value })
                    }
                  />
                  <button
                    type="button"
                    className="pnl-remove"
                    aria-label={`Remover ${product?.name ?? `produto ${row.productN}`}`}
                    disabled={locked}
                    onClick={() => removeRow(row.uid)}
                  >
                    ×
                  </button>
                  {rowError ? <small className="pnl-err pnl-product-err">{rowError}</small> : null}
                </div>
              );
            })}

            <div className="pnl-search">
              <input
                className="pnl-input"
                value={query}
                placeholder="Buscar produto no catálogo..."
                aria-label="Buscar produto no catálogo"
                disabled={locked}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
              {query.trim() && results.length === 0 ? (
                <p className="pnl-empty">Nenhum produto encontrado.</p>
              ) : null}
              {results.map((product) => (
                <button
                  type="button"
                  className="pnl-result"
                  key={product.n}
                  disabled={locked}
                  onClick={() => addProduct(product)}
                >
                  <img src={product.image} alt="" width={26} height={26} loading="lazy" />
                  <span>{product.name}</span>
                  <b>#{product.n}</b>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="pnl-editor-foot">
          {pendingClose ? (
            <>
              <span className="pnl-status bad">Descartar as alterações não salvas?</span>
              <button type="button" className="pnl-btn" onClick={() => setPendingClose(false)}>
                Continuar editando
              </button>
              <button
                type="button"
                className="pnl-btn danger"
                onClick={() => {
                  setPendingClose(false);
                  onClose();
                }}
              >
                Descartar
              </button>
            </>
          ) : (
            <>
              <span className={status ? `pnl-status ${status.tone}` : "pnl-status"}>
                {status?.text ?? ""}
              </span>
              <button type="button" className="pnl-btn" onClick={requestClose} disabled={locked}>
                Cancelar
              </button>
              <button type="button" className="pnl-btn primary" onClick={submit} disabled={locked}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   CSS — TUDO escopado em `.pnlx`
   ══════════════════════════════════════════════════════════════
   Mesma forma do bloco de src/routes/painel.tsx: uma string servida por
   uma tag <style> que vive dentro do componente, então some junto com
   ele. Nenhuma regra em :root, html ou body; nenhum seletor sem o
   prefixo. O bloco é unlayered, o que faz ele ganhar do `@layer base`
   do styles.css global (Sora nos títulos, line-height 1.6) sem
   precisar de !important.
   ══════════════════════════════════════════════════════════════ */

const EDITOR_CSS = `
.pnlx .pnl-scrim{ position: fixed; z-index: 55; inset: 0; background: rgba(17,17,17,.42); }
.pnlx .pnl-editor{ position: fixed; z-index: 56; top: 0; right: 0; bottom: 0; width: 560px; max-width: 100vw; display: flex; flex-direction: column; background: #fff; color: #333; font-family: Arial, "Helvetica Neue", sans-serif; font-size: 14px; line-height: normal; box-shadow: -8px 0 28px rgba(0,0,0,.2); }
.pnlx .pnl-editor *{ box-sizing: border-box; }

.pnlx .pnl-editor-head{ position: relative; flex: 0 0 auto; padding: 18px 22px 15px; border-bottom: 1px solid #ededed; }
.pnlx .pnl-editor-head h2{ margin: 0 0 4px; font-family: inherit; font-size: 17px; line-height: 22px; letter-spacing: normal; font-weight: 600; color: #262626; }
.pnlx .pnl-editor-head p{ margin: 0; font-size: 12px; line-height: 16px; color: #8b8b8b; }
.pnlx .pnl-editor-head p.pnl-date{ margin-top: 10px; font-size: 13px; color: #666; }
.pnlx .pnl-date strong{ color: #333; font-weight: 600; }
.pnlx .pnl-close{ position: absolute; top: 12px; right: 14px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 4px; background: none; color: #8b8b8b; font: inherit; font-size: 22px; line-height: 1; cursor: pointer; }
.pnlx .pnl-close:hover{ background: #f4f4f4; color: #444; }
.pnlx .pnl-close:disabled{ opacity: .5; cursor: default; }

.pnlx .pnl-editor-body{ flex: 1 1 auto; overflow-y: auto; padding: 6px 22px 20px; }
.pnlx .pnl-section{ margin-top: 20px; }
.pnlx .pnl-section h3{ margin: 0 0 5px; font-family: inherit; font-size: 14px; line-height: 19px; letter-spacing: normal; font-weight: 600; color: #333; }
.pnlx .pnl-note{ margin: 0 0 13px; font-size: 12px; line-height: 17px; color: #8b8b8b; }
.pnlx .pnl-empty{ margin: 0 0 10px; padding: 12px; border: 1px dashed #e2e2e2; border-radius: 4px; color: #999; font-size: 12px; text-align: center; }

.pnlx .pnl-field{ display: grid; grid-template-columns: 1fr 118px 118px; gap: 10px; align-items: start; margin-bottom: 9px; }
.pnlx .pnl-field > label{ padding-top: 8px; font-size: 13px; color: #4d4d4d; }
.pnlx .pnl-field-head{ margin-bottom: 7px; color: #8b8b8b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.pnlx .pnl-cell{ display: flex; flex-direction: column; gap: 3px; min-width: 0; }

.pnlx .pnl-input{ width: 100%; height: 32px; border: 1px solid #dedede; border-radius: 4px; padding: 0 9px; background: #fff; color: #333; font: inherit; font-size: 13px; }
.pnlx .pnl-input:focus{ outline: none; border-color: #ee4d2d; }
.pnlx .pnl-input:disabled{ background: #f7f7f7; color: #999; }
.pnlx .pnl-input.invalid{ border-color: #ff3e55; background: #fff7f8; }
.pnlx .pnl-input::placeholder{ color: #bbb; }
.pnlx .pnl-hint{ color: #a0a0a0; font-size: 11px; line-height: 14px; }
.pnlx .pnl-err{ color: #ff3e55; font-size: 11px; line-height: 14px; }

.pnlx .pnl-product{ display: grid; grid-template-columns: 30px 1fr 68px 92px 26px; gap: 8px; align-items: center; margin-bottom: 8px; }
.pnlx .pnl-product img{ width: 30px; height: 30px; border-radius: 3px; object-fit: cover; background: #f3f3f3; }
.pnlx .pnl-noimg{ width: 30px; height: 30px; border-radius: 3px; background: #f0f0f0; }
.pnlx .pnl-product-name{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #4d4d4d; }
.pnlx .pnl-product-err{ grid-column: 2 / -1; }
.pnlx .pnl-remove{ width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 1px solid #e4e4e4; border-radius: 4px; background: #fff; color: #999; font: inherit; font-size: 16px; line-height: 1; cursor: pointer; }
.pnlx .pnl-remove:hover{ border-color: #ff3e55; color: #ff3e55; }
.pnlx .pnl-remove:disabled{ opacity: .5; cursor: default; }

.pnlx .pnl-search{ margin-top: 12px; }
.pnlx .pnl-result{ width: 100%; display: grid; grid-template-columns: 26px 1fr auto; gap: 9px; align-items: center; margin-top: 6px; padding: 6px 9px; border: 1px solid #ededed; border-radius: 4px; background: #fff; font: inherit; font-size: 12px; color: #4d4d4d; text-align: left; cursor: pointer; }
.pnlx .pnl-result:hover{ border-color: #ee4d2d; background: #fff8f5; }
.pnlx .pnl-result img{ width: 26px; height: 26px; border-radius: 3px; object-fit: cover; background: #f3f3f3; }
.pnlx .pnl-result span{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pnlx .pnl-result b{ color: #a0a0a0; font-weight: 600; }

.pnlx .pnl-editor-foot{ flex: 0 0 auto; display: flex; align-items: center; gap: 9px; padding: 13px 22px; border-top: 1px solid #ededed; background: #fcfcfc; }
.pnlx .pnl-status{ margin-right: auto; font-size: 12px; line-height: 16px; color: #8b8b8b; }
.pnlx .pnl-status.ok{ color: #059669; }
.pnlx .pnl-status.bad{ color: #ff3e55; }
.pnlx .pnl-status.busy{ color: #8b8b8b; }
.pnlx .pnl-status.muted{ color: #8b8b8b; }
.pnlx .pnl-btn{ height: 36px; padding: 0 17px; border: 1px solid #dedede; border-radius: 4px; background: #fff; color: #444; font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.pnlx .pnl-btn:hover{ border-color: #c4c4c4; }
.pnlx .pnl-btn.primary{ border-color: #ee4d2d; background: #ee4d2d; color: #fff; }
.pnlx .pnl-btn.primary:hover{ border-color: #d9431f; background: #d9431f; }
.pnlx .pnl-btn.danger{ border-color: #ff3e55; background: #ff3e55; color: #fff; }
.pnlx .pnl-btn:disabled{ opacity: .55; cursor: default; }
.pnlx .pnl-btn:disabled:hover{ border-color: #dedede; }
.pnlx .pnl-btn.primary:disabled:hover{ border-color: #ee4d2d; background: #ee4d2d; }
`;
