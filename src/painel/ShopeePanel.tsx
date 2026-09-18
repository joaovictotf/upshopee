"use client";

import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  CreditCard,
  FileBarChart,
  Gift,
  Globe2,
  Lightbulb,
  Menu,
  MoreHorizontal,
  PanelTop,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { normalizeCatalog } from "./catalog";
import {
  addDays,
  applyDemoSale,
  dateFromKey,
  datesInRange,
  formatDate,
  loadDemoStore,
  localDateKey,
  metricValue,
  percentageChange,
  recordFor,
  saveDemoStore,
  sortedTopProducts,
  type CatalogProduct,
  type DailyRecord,
  type DemoStore,
  type MetricKey,
} from "./demo-store";
import "./painel.css";

type ShopeePanelProps = {
  catalogSource: unknown;
  accountName?: string;
};

type MetricDefinition = {
  key: MetricKey;
  label: string;
  chartTitle: string;
  chartLegend: string;
  detailTitle: string;
  currency?: boolean;
};

type TrendPoint = {
  date: string;
  value: number;
};

const METRICS: MetricDefinition[] = [
  {
    key: "clicks",
    label: "Cliques",
    chartTitle: "Tendência de clicks",
    chartLegend: "Cliques",
    detailTitle: "Detalhes de cliques",
  },
  {
    key: "orders",
    label: "Pedido",
    chartTitle: "Tendência de pedidos",
    chartLegend: "Pedido",
    detailTitle: "Detalhes de pedidos",
  },
  {
    key: "commissionCents",
    label: "Comissão est.(R$)",
    chartTitle: "Tendência da comissão est.",
    chartLegend: "Comissão est.(R$)",
    detailTitle: "Detalhes da comissão est.",
    currency: true,
  },
  {
    key: "itemsSold",
    label: "Itens vendidos",
    chartTitle: "Tendência de itens vendidos",
    chartLegend: "Itens vendidos",
    detailTitle: "Detalhes de itens vendidos",
  },
  {
    key: "orderValueCents",
    label: "Valor do pedido(R$)",
    chartTitle: "Tendência do valor do pedido",
    chartLegend: "Valor do pedido(R$)",
    detailTitle: "Detalhes do valor do pedido",
    currency: true,
  },
  {
    key: "newBuyers",
    label: "Novos compradores",
    chartTitle: "Tendência de novos compradores",
    chartLegend: "Novos compradores",
    detailTitle: "Detalhes de novos compradores",
  },
];

const SIDE_GROUPS = [
  { icon: PanelTop, title: "Painel de controle", items: ["Painel de controle"], active: true },
  {
    icon: Gift,
    title: "Oferta",
    items: [
      "Oferta Shopee",
      "Oferta da loja",
      "Oferta de produto",
      "Ofertas Exclusivas",
      "Link personalizado",
    ],
  },
  { icon: Trophy, title: "Campanhas", items: ["Campanhas de Afiliados"] },
  { icon: Lightbulb, title: "Criativo", items: ["Feed de produto"] },
  { icon: FileBarChart, title: "Relatório", items: ["Relatório de vendas", "Relatório de cliques"] },
  {
    icon: CreditCard,
    title: "Pagamento",
    items: ["Comissões Validadas", "Histórico de Pagamento"],
  },
  { icon: Code2, title: "Abrir API", items: ["Abrir API"] },
];

const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCompact(value: number, currency: boolean) {
  const normalized = currency ? value / 100 : value;
  if (normalized >= 1000) {
    const compact = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(normalized / 1000);
    return `${compact}mil`;
  }
  return currency ? decimalFormatter.format(normalized) : integerFormatter.format(normalized);
}

function formatMoney(cents: number) {
  return `R$${moneyFormatter.format(cents / 100)}`;
}

function chartNumber(value: number, currency: boolean) {
  const normalized = currency ? value / 100 : value;
  if (normalized >= 1000) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
      normalized / 1000,
    ) + "mil";
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(normalized);
}

function niceMaximum(maximum: number, currency: boolean) {
  const normalized = currency ? maximum / 100 : maximum;
  if (normalized <= 0) return currency ? 400 : 4;
  const rawStep = normalized / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const nice = Math.ceil(normalized / (niceFraction * magnitude)) * niceFraction * magnitude;
  return currency ? Math.round(nice * 100) : nice;
}

function CalendarIcon() {
  return <CalendarDays aria-hidden="true" size={15} strokeWidth={1.5} />;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["do", "2ª", "3ª", "4ª", "5ª", "6ª", "sá"];

function monthKey(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

function addMonths(dateKey: string, amount: number) {
  const date = dateFromKey(monthKey(dateKey));
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}

function calendarDays(month: string) {
  const first = dateFromKey(monthKey(month));
  const firstVisible = new Date(first);
  firstVisible.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisible);
    date.setUTCDate(firstVisible.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function MonthCalendar({
  month,
  startDate,
  endDate,
  today,
  onPick,
  onPreviousMonth,
  onPreviousYear,
  onNextMonth,
  onNextYear,
  side,
}: {
  month: string;
  startDate: string;
  endDate: string;
  today: string;
  onPick: (value: string) => void;
  onPreviousMonth?: () => void;
  onPreviousYear?: () => void;
  onNextMonth?: () => void;
  onNextYear?: () => void;
  side: "left" | "right";
}) {
  const date = dateFromKey(month);
  const currentMonth = month.slice(0, 7);
  return (
    <div className="sp-calendar-month">
      <div className="sp-calendar-month-head">
        <span className="sp-calendar-nav">
          {side === "left" && (
            <>
              <button type="button" onClick={onPreviousYear} aria-label="Ano anterior">«</button>
              <button type="button" onClick={onPreviousMonth} aria-label="Mês anterior">
                <ChevronLeft size={16} />
              </button>
            </>
          )}
        </span>
        <strong>{date.getUTCFullYear()} {MONTHS[date.getUTCMonth()]}</strong>
        <span className="sp-calendar-nav">
          {side === "right" && (
            <>
              <button type="button" onClick={onNextMonth} aria-label="Próximo mês">
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={onNextYear} aria-label="Próximo ano">»</button>
            </>
          )}
        </span>
      </div>
      <div className="sp-calendar-weekdays">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="sp-calendar-days">
        {calendarDays(month).map((day) => {
          const outside = day.slice(0, 7) !== currentMonth;
          const endpoint = day === startDate || day === endDate;
          const inRange = day >= startDate && day <= endDate;
          return (
            <button
              type="button"
              key={day}
              className={`${outside ? "is-outside " : ""}${inRange ? "is-in-range " : ""}${endpoint ? "is-endpoint " : ""}${day === today ? "is-today" : ""}`.trim()}
              onClick={() => onPick(day)}
              aria-label={formatDate(day)}
              aria-pressed={endpoint}
            >
              {Number(day.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({
  startDate,
  endDate,
  today,
  onChange,
}: {
  startDate: string;
  endDate: string;
  today: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthKey(startDate));
  const [selectingEnd, setSelectingEnd] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setVisibleMonth(monthKey(startDate));
      setSelectingEnd(false);
    }
    setOpen((value) => !value);
  };

  const pickDate = (date: string) => {
    if (!selectingEnd) {
      onChange(date, date);
      setSelectingEnd(true);
      return;
    }
    onChange(date < startDate ? date : startDate, date < startDate ? startDate : date);
    setSelectingEnd(false);
    setOpen(false);
  };

  const choosePreset = (days: number) => {
    onChange(addDays(today, -(days - 1)), today);
    setSelectingEnd(false);
    setOpen(false);
  };

  return (
    <div className="sp-date-range" ref={rootRef}>
      <button
        className={`sp-range-picker${open ? " is-open" : ""}`}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span>{formatDate(startDate)}</span>
        {startDate !== endDate && <><span className="sp-range-separator">~</span><span>{formatDate(endDate)}</span></>}
        <CalendarIcon />
      </button>

      {open && (
        <div className="sp-date-popover" role="dialog" aria-label="Escolher período dos dados">
          <aside className="sp-date-presets">
            <button type="button" onClick={() => choosePreset(1)}>Dia da última<br />atualização</button>
            <button type="button" onClick={() => choosePreset(7)}>Últimos 7 dias</button>
            <button type="button" onClick={() => choosePreset(15)}>Últimos 15 dias</button>
            <button type="button" onClick={() => choosePreset(30)}>Últimos 30 dias</button>
          </aside>
          <div className="sp-calendar-area">
            <div className="sp-calendar-selection">
              <span>{formatDate(startDate)}</span>
              <span>~</span>
              <span>{formatDate(endDate)}</span>
            </div>
            <div className="sp-calendar-pair">
              <MonthCalendar
                month={visibleMonth}
                startDate={startDate}
                endDate={endDate}
                today={today}
                onPick={pickDate}
                onPreviousMonth={() => setVisibleMonth((value) => addMonths(value, -1))}
                onPreviousYear={() => setVisibleMonth((value) => addMonths(value, -12))}
                side="left"
              />
              <MonthCalendar
                month={addMonths(visibleMonth, 1)}
                startDate={startDate}
                endDate={endDate}
                today={today}
                onPick={pickDate}
                onNextMonth={() => setVisibleMonth((value) => addMonths(value, 1))}
                onNextYear={() => setVisibleMonth((value) => addMonths(value, 12))}
                side="right"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon() {
  return (
    <span className="sp-info" aria-hidden="true">
      i
    </span>
  );
}

function TrendChart({
  points,
  metric,
}: {
  points: TrendPoint[];
  metric: MetricDefinition;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 1480;
  const height = 152;
  const padding = { left: 34, right: 14, top: 10, bottom: 28 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const maximum = niceMaximum(Math.max(...points.map((point) => point.value), 0), !!metric.currency);
  const x = (index: number) =>
    padding.left + (points.length <= 1 ? 0 : (index / (points.length - 1)) * graphWidth);
  const y = (value: number) => padding.top + graphHeight - (value / maximum) * graphHeight;
  const coordinates = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ");
  const areaPath = points.length
    ? `M ${x(0)} ${padding.top + graphHeight} ${linePath} L ${x(points.length - 1)} ${padding.top + graphHeight} Z`
    : "";
  const labelEvery = Math.max(1, Math.ceil(points.length / 13));
  const selected = activeIndex === null ? null : points[activeIndex];
  const tooltipWidth = 150;
  const tooltipX =
    activeIndex === null
      ? 0
      : Math.min(Math.max(x(activeIndex) - tooltipWidth / 2, padding.left), width - tooltipWidth - 4);

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.min(1, Math.max(0, (position - padding.left) / graphWidth));
    setActiveIndex(Math.round(ratio * (points.length - 1)));
  };

  return (
    <div className="sp-trend-wrap">
      <svg
        className="sp-trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${metric.chartTitle}, ${points.length} dias`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={`sp-chart-fill-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ee4d2d" stopOpacity="0.24" />
            <stop offset="1" stopColor="#ee4d2d" stopOpacity="0.035" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((step) => {
          const value = (maximum / 4) * (4 - step);
          const lineY = padding.top + (graphHeight / 4) * step;
          return (
            <g key={step}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={lineY}
                y2={lineY}
                stroke="#dedede"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 8} y={lineY + 4} textAnchor="end" className="sp-chart-axis">
                {chartNumber(value, !!metric.currency)}
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill={`url(#sp-chart-fill-${metric.key})`} />}
        <polyline
          points={coordinates}
          fill="none"
          stroke="#ee4d2d"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.date}
            cx={x(index)}
            cy={y(point.value)}
            r={activeIndex === index ? 3.8 : 2}
            fill="#fff"
            stroke="#ee4d2d"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {points.map((point, index) => {
          if (index % labelEvery !== 0 && index !== points.length - 1) return null;
          return (
            <text
              key={`label-${point.date}`}
              x={x(index)}
              y={height - 6}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              className="sp-chart-axis"
            >
              {formatDate(point.date)}
            </text>
          );
        })}
        {selected && activeIndex !== null && (
          <g className="sp-chart-tooltip">
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={padding.top}
              y2={padding.top + graphHeight}
              stroke="#999"
              strokeWidth="1"
            />
            <rect x={tooltipX} y={14} width={tooltipWidth} height={48} rx={2} fill="#fff" />
            <text x={tooltipX + 10} y={33} className="sp-tooltip-date">
              {formatDate(selected.date)}
            </text>
            <circle cx={tooltipX + 12} cy={49} r={2.5} fill="#ee4d2d" />
            <text x={tooltipX + 20} y={53} className="sp-tooltip-value">
              {chartNumber(selected.value, !!metric.currency)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function MetricCard({
  metric,
  record,
  previousRecord,
  selected,
  onSelect,
}: {
  metric: MetricDefinition;
  record: DailyRecord;
  previousRecord: DailyRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const value = metricValue(record, metric.key);
  const change = percentageChange(value, metricValue(previousRecord, metric.key));
  return (
    <button
      type="button"
      className={`sp-metric-card${selected ? " is-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="sp-metric-label">
        <span>{metric.label}</span>
        <InfoIcon />
      </span>
      <span className="sp-metric-data">
        <strong>{formatCompact(value, !!metric.currency)}</strong>
        <span className={`sp-change is-${change.tone}`}>{change.text}</span>
      </span>
    </button>
  );
}

function Breakdown({ metric, record }: { metric: MetricDefinition; record: DailyRecord }) {
  const details: Record<MetricKey, { value: string; note?: string }> = {
    clicks: { value: integerFormatter.format(record.socialClicks) },
    orders: { value: integerFormatter.format(record.orders) },
    commissionCents: { value: formatMoney(record.commissionCents), note: "Pedido em loja diferente" },
    itemsSold: { value: integerFormatter.format(record.itemsSold) },
    orderValueCents: { value: formatMoney(record.orderValueCents) },
    newBuyers: { value: integerFormatter.format(record.newBuyers) },
  };
  const detail = details[metric.key];
  return (
    <div className="sp-breakdown">
      <div className="sp-breakdown-title">{metric.detailTitle}</div>
      <div className="sp-channel-block">
        <div className="sp-social-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="sp-channel-copy">
          <span>Redes sociais</span>
          {detail.note && <small>{detail.note}</small>}
        </div>
        <strong>{detail.value}</strong>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sp-sidebar" aria-label="Menu ilustrativo">
      <div className="sp-sidebar-scroll">
        {SIDE_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <section className="sp-side-group" key={group.title}>
              <div className="sp-side-title">
                <Icon size={16} strokeWidth={1.45} aria-hidden="true" />
                <span>{group.title}</span>
                <ChevronDown size={13} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="sp-side-items">
                {group.items.map((item) => (
                  <div
                    key={item}
                    className={group.active && item === "Painel de controle" ? "is-active" : ""}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="sp-sidebar-bottom">
        <Menu size={16} strokeWidth={1.5} />
      </div>
    </aside>
  );
}

function TopProducts({ record, catalog }: { record: DailyRecord; catalog: CatalogProduct[] }) {
  const productsById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog],
  );
  const rows = sortedTopProducts(record).flatMap((stat) => {
    const product = productsById.get(stat.productId);
    return product ? [{ stat, product }] : [];
  });
  const padded = [...rows, ...Array.from({ length: Math.max(0, 5 - rows.length) }, () => null)].slice(
    0,
    5,
  );

  return (
    <section className="sp-panel sp-top-products">
      <h2>Meus Top 5 produtos</h2>
      <div className="sp-table-scroll">
        <table>
          <colgroup>
            <col className="sp-col-product" />
            <col className="sp-col-items" />
            <col className="sp-col-commission" />
            <col className="sp-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="align-right">Itens vendidos</th>
              <th className="align-right">Comissão est. (R$)</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {padded.map((row, index) => (
              <tr key={row?.product.id ?? `empty-${index}`}>
                <td>
                  {row ? (
                    <div className="sp-product-cell">
                      {row.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.product.image} alt="" />
                      ) : (
                        <span className="sp-product-image-empty" aria-hidden="true" />
                      )}
                      <span className="sp-product-copy">
                        <strong>{row.product.name}</strong>
                        <small>
                          {formatMoney(row.product.priceCents)} · {decimalFormatter.format(row.product.commissionPct)}%
                        </small>
                      </span>
                    </div>
                  ) : (
                    "--"
                  )}
                </td>
                <td className="align-right">{row ? integerFormatter.format(row.stat.itemsSold) : "--"}</td>
                <td className="align-right">{row ? formatMoney(row.stat.commissionCents) : "--"}</td>
                <td>--</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PerformanceTable({ dates, store }: { dates: string[]; store: DemoStore }) {
  const descendingDates = [...dates].reverse();
  return (
    <section className="sp-panel sp-performance">
      <div className="sp-section-heading">
        <h2>Performance diária</h2>
        <span className="sp-export" aria-hidden="true">
          Exportar
        </span>
      </div>
      <div className="sp-performance-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th className="align-right">Cliques</th>
              <th className="align-right">Pedido</th>
              <th className="align-right">Comissão est. (R$)</th>
              <th className="align-right">Itens vendidos</th>
              <th className="align-right">Valor do pedido(R$)</th>
              <th className="align-right">Novos compradores</th>
            </tr>
          </thead>
          <tbody>
            {descendingDates.map((date) => {
              const record = recordFor(store, date);
              return (
                <tr key={date}>
                  <td>{formatDate(date)}</td>
                  <td className="align-right">{integerFormatter.format(record.clicks)}</td>
                  <td className="align-right">{integerFormatter.format(record.orders)}</td>
                  <td className="align-right">{moneyFormatter.format(record.commissionCents / 100)}</td>
                  <td className="align-right">{integerFormatter.format(record.itemsSold)}</td>
                  <td className="align-right">{moneyFormatter.format(record.orderValueCents / 100)}</td>
                  <td className="align-right">{integerFormatter.format(record.newBuyers)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Nome do cabeçalho. Dois cliques no texto trocam para <input>; Enter e
 * blur confirmam, Escape cancela e volta ao valor anterior. Mesmo
 * comportamento de `EditableUserName` em src/routes/painel.tsx — as duas
 * páginas são independentes, então o componente é reproduzido aqui, não
 * importado de lá.
 *
 * O rascunho (`draft`) é local: o pai só fica sabendo do nome quando ele
 * é CONFIRMADO. `canceledRef` existe porque o Escape desmonta o input
 * (tira o foco) e isso pode disparar `onBlur` por cima do próprio
 * cancelamento — a flag garante que esse blur tardio não commite o
 * rascunho por engano, não importa a ordem em que os eventos cheguem.
 */
function EditableAccountName({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
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
        className="sp-account-name"
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
    <span className="sp-account-name" onDoubleClick={startEdit}>
      {value}
    </span>
  );
}

export default function ShopeePanel({
  catalogSource,
  accountName = "Gisely Lojas",
}: ShopeePanelProps) {
  const today = useMemo(() => localDateKey(), []);
  const [store, setStore] = useState<DemoStore>({ version: 1, days: {} });
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("clicks");
  const [toast, setToast] = useState("");
  const storeRef = useRef<DemoStore>(store);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalog = useMemo(() => normalizeCatalog(catalogSource), [catalogSource]);
  const dates = useMemo(() => datesInRange(startDate, endDate), [startDate, endDate]);
  const activeMetric = METRICS.find((metric) => metric.key === selectedMetric) ?? METRICS[0];
  const record = recordFor(store, endDate);
  const previousRecord = recordFor(store, addDays(endDate, -1));
  // Precedência: nome salvo no store → prop accountName → "Gisely Lojas"
  // (o padrão da prop). Antes do load em useEffect, `store` é o valor
  // inicial sem `accountName`, então cai direto na prop — sem flash.
  const displayName = store.accountName ?? accountName;
  const trendPoints = dates.map((date) => ({
    date,
    value: metricValue(recordFor(store, date), selectedMetric),
  }));
  const showChart = dates.length > 1;

  useEffect(() => {
    const savedStore = loadDemoStore();
    storeRef.current = savedStore;
    // Storage is a browser-only external source; load it after hydration so
    // server and client keep identical initial markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(savedStore);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const chooseRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const commitAccountName = (next: string) => {
    // Spread preserva `days` (e `version`) tal como estavam — o nome nunca
    // encosta nos números do painel.
    const nextStore: DemoStore = { ...storeRef.current, accountName: next };
    storeRef.current = nextStore;
    saveDemoStore(nextStore);
    setStore(nextStore);
  };

  const registerSale = () => {
    const result = applyDemoSale(storeRef.current, endDate, catalog);
    if (!result) {
      setToast("Catálogo de produtos indisponível");
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 2200);
      return;
    }
    storeRef.current = result.store;
    saveDemoStore(result.store);
    setStore(result.store);
    setToast("Nova venda registrada");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  return (
    <div className="sp-shell">
      <header className="sp-topbar">
        <div className="sp-breadcrumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/shopee-affiliate-mark.svg" alt="" />
          <span>Página Inicial /</span>
          <strong>Painel de controle</strong>
        </div>
        <div className="sp-header-actions">
          <span className="sp-header-item">
            <Globe2 size={18} strokeWidth={1.45} />
            Português
            <ChevronDown size={14} />
          </span>
          <span className="sp-header-item">
            <EditableAccountName value={displayName} onCommit={commitAccountName} />
            <ChevronDown size={14} />
          </span>
          <span className="sp-header-divider" />
          <span className="sp-zone" aria-hidden="true">
            <Globe2 size={18} strokeWidth={1.45} />
            <span>◷</span>
          </span>
          <button className="sp-bell" type="button" onClick={registerSale} aria-label="Registrar uma venda">
            <Bell size={18} strokeWidth={1.45} />
          </button>
          <span className="sp-more" aria-hidden="true">
            <MoreHorizontal size={22} strokeWidth={1.8} />
          </span>
          <span className="sp-help" aria-hidden="true">
            Central de Ajuda
          </span>
        </div>
      </header>

      <div className="sp-workspace">
        <Sidebar />
        <main className="sp-main">
          <section className="sp-period sp-panel">
            <div className="sp-period-left">
              <span>Período dos dados</span>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                today={today}
                onChange={chooseRange}
              />
            </div>
            <span className="sp-updated">Dados atualizados diariamente às 5:30 PM</span>
          </section>

          <section className="sp-panel sp-overview">
            <div className="sp-panel-heading">
              <h1>Métricas principais</h1>
              <span>vs dia anterior</span>
            </div>
            <div className="sp-metrics-grid">
              {METRICS.map((metric) => (
                <MetricCard
                  key={metric.key}
                  metric={metric}
                  record={record}
                  previousRecord={previousRecord}
                  selected={selectedMetric === metric.key}
                  onSelect={() => setSelectedMetric(metric.key)}
                />
              ))}
            </div>

            {showChart && (
              <div className="sp-chart-section">
                <div className="sp-chart-title">
                  <span>{activeMetric.chartTitle}</span>
                  <span className="sp-chart-legend">
                    <i />
                    {activeMetric.chartLegend}
                  </span>
                </div>
                <TrendChart points={trendPoints} metric={activeMetric} />
              </div>
            )}

            <Breakdown metric={activeMetric} record={record} />
          </section>

          {showChart && <PerformanceTable dates={dates} store={store} />}
          <TopProducts record={record} catalog={catalog} />
        </main>
      </div>

      <div className={`sp-toast${toast ? " is-visible" : ""}`} role="status" aria-live="polite">
        <ShoppingBag size={17} strokeWidth={1.7} aria-hidden="true" />
        {toast}
      </div>
    </div>
  );
}
