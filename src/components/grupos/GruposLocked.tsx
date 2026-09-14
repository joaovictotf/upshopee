/* ═══════════════════════════════════════════════════════════════════
   Grupos de Divulgação — a página de quem AINDA NÃO tem o add-on
   ═══════════════════════════════════════════════════════════════════

   Montada por `GruposRoute` (src/routes/dashboard.grupos.tsx) quando
   grupos_has_access() devolve false. A página paga (`GruposPaid`) nem é
   criada nesse caso, então nada dela chega ao DOM.

   ⚠️ A REGRA QUE DEFINE ESTE ARQUIVO: daqui só pode sair UM grupo — o de
   demonstração. Os outros 11 não podem aparecer nem escondidos.

   Não basta esconder com CSS. `display:none`, blur, `overflow:hidden`,
   altura zero — em todos esses casos o nome e a URL continuam no HTML, e
   qualquer pessoa lê no inspetor com dois cliques. O que é vendido aqui é
   justamente a LISTA; entregá-la no DOM é entregar o produto.

   Por isso o filtro é de DADO, não de estilo: `DEMO_GROUP` é um `find` por
   id sobre `groups`, e nenhum outro item do array é referenciado em lugar
   nenhum deste arquivo. Se um dia alguém precisar mostrar mais alguma coisa
   aqui, o caminho é escolher o dado antes do render — nunca renderizar tudo
   e apagar depois.

   POR QUE O fb2 E NÃO OUTRO: é o único do catálogo criado explicitamente
   para afiliados postarem link ("divulge seu link", na própria descrição).
   Uma demonstração que termina com o post apagado por um moderador é um
   argumento CONTRA o produto — o grupo da demo precisa ser aquele onde
   postar é o comportamento esperado.

   O PASSO A PASSO: seis etapas, uma visível por vez. A pessoa faz de
   verdade o que o produto faz — escolhe grupo, escolhe produto, gera a
   divulgação, copia, publica — e só no fim vê o preço. Demonstrar primeiro
   e cobrar depois é a ordem inteira do argumento. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Clock,
  ShieldCheck,
  Users,
  MessageCircle,
  Check,
  Copy,
  Loader2,
  RefreshCcw,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "../layout/DashboardShell";
import { groups, type Group } from "../../lib/mock/groups";
import { useApp } from "../../lib/state";
import { fetchMyAffiliateRows, rowsToAffiliateProducts } from "../../lib/my-affiliate-products";
import { affiliateProducts, type AffiliateProduct } from "../../lib/mock/affiliate-products";
import { generateCopy } from "../../lib/copy-engine";
import { brl } from "../../lib/format";

/* O id, e SÓ o id, é literal aqui. Nome e URL são lidos de groups.ts —
   duplicá-los criaria uma segunda fonte de verdade que envelhece sozinha:
   trocar a URL do grupo lá não corrigiria a demonstração, e a pessoa cairia
   num link morto no meio do passo a passo. */
const DEMO_GROUP_ID = "fb2";

/** O único grupo que a versão trancada pode mostrar.
 *  `undefined` se o id sumir de groups.ts — a UI trata, não quebra. */
export const DEMO_GROUP: Group | undefined = groups.find((g) => g.id === DEMO_GROUP_ID);

/* Mesmo filtro da aba Catálogo (dashboard.produtos.tsx:50): produto
   aposentado continua servindo quem já afiliou, mas sai da descoberta. */
const activeAffiliateProducts = affiliateProducts.filter((p) => !p.retired);

/* Quantos produtos do catálogo oferecer para quem ainda não afiliou nada.
   O objetivo aqui não é navegar o catálogo — é destravar a demonstração com
   um clique. Uma vitrine de 250 itens faria o passo 3 virar outra tarefa. */
const CATALOG_SAMPLE_SIZE = 6;

/* O checkout do Divulgador de Grupos.

   ⚠️ NÃO É o checkout das landings. O id é cmtmy3kx30a0e01ohehzhvcu4, e não
   cmrc5aowy0s7y01ol3jfeb4he — são PRODUTOS DIFERENTES. E este não leva
   parâmetro `code`, porque não é venda de afiliado: quem compra aqui já está
   dentro do produto. As duas diferenças são intencionais. Não "corrigir" o id
   para bater com o §8 do CLAUDE.md e não acrescentar code. */
const CHECKOUT_URL =
  "https://checkout.applyfy.com.br/checkout/cmtmy3kx30a0e01ohehzhvcu4?offer=HVEM0U0";

/* ⚠️ NÃO EXISTE WEBHOOK (migration 20260914120000). Quem paga e volta
   continua vendo esta página trancada, porque a liberação é manual, feita por
   um admin. Sem este link a pessoa conclui que pagou por nada e abre
   reembolso — a linha abaixo do botão é parte do fluxo de venda, não enfeite.

   O número é o de LIBERAÇÃO DE ACESSO, diferente do suporte geral do §13 do
   CLAUDE.md (5534992017453). Não unificar sem falar com o Juam. */
const WHATSAPP_UNLOCK_URL =
  "https://wa.me/5534992043815?text=Paguei%20o%20Divulgador%20de%20Grupos%20e%20quero%20liberar%20meu%20acesso";

/* Passo atual + produto escolhido. Guardar só o passo deixaria a pessoa
   voltar direto para o 4 sem produto nenhum selecionado, e o passo 4 sem
   produto não tem o que gerar — restaurar para um beco é pior que recomeçar.
   Nada de valor depende disto: sem localStorage (aba anônima, storage
   bloqueado) a demonstração roda igual, só não sobrevive ao reload. */
const STORAGE_KEY = "upshopee_grupos_demo";

const TOTAL_STEPS = 6;

type DemoState = { step: number; productN: number | null };

function readStored(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: 1, productN: null };
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const step = Math.min(Math.max(Number(parsed?.step) || 1, 1), TOTAL_STEPS);
    const productN = typeof parsed?.productN === "number" ? parsed.productN : null;
    return { step, productN };
  } catch {
    return { step: 1, productN: null };
  }
}

function writeStored(state: DemoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Storage bloqueado: a demonstração continua, só não é lembrada. */
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Cartão do grupo de demonstração
   ═══════════════════════════════════════════════════════════════════ */

export function DemoGroupCard({
  group,
  onOpen,
  cta = "Abrir grupo",
}: {
  group: Group;
  /** Chamado junto com a abertura da aba — quem usa decide o que fazer. */
  onOpen?: () => void;
  cta?: string;
}) {
  const PlatformIcon = group.platform === "WhatsApp" ? MessageCircle : Users;

  return (
    <div
      className="flex flex-col rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
              <PlatformIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <h4 className="text-sm font-bold leading-tight text-[var(--text)]">{group.name}</h4>
          </div>
          <div className="ml-9 mt-1 text-[10px] text-[var(--muted)]">{group.platform}</div>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
          {group.category}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[var(--muted)]">
          <ShieldCheck className="h-3 w-3" />
          <span>{group.status}</span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5">
          <Clock className="h-3 w-3 text-[var(--muted)]" />
          <span className="text-[var(--muted)]">
            Melhor: <span className="font-medium text-[var(--text)]">{group.bestTime}</span>
          </span>
        </div>
      </div>

      {group.description && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{group.description}</p>
      )}

      {/* target="_blank" + rel="noopener noreferrer": sem o rel, a aba aberta
          recebe window.opener e pode navegar esta aqui para outro lugar. */}
      <a
        href={group.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {cta}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Moldura de uma etapa — ativa, concluída ou futura
   ═══════════════════════════════════════════════════════════════════ */

function StepShell({
  index,
  title,
  state,
  onReopen,
  children,
}: {
  index: number;
  title: string;
  state: "done" | "active" | "future";
  onReopen: () => void;
  children?: React.ReactNode;
}) {
  // Concluída: some o conteúdo e fica só o risco. É isso que mantém UMA
  // etapa por vez na tela — e como o conteúdo não é renderizado, nem o
  // texto gerado nem o produto escolhido ficam no DOM de etapas passadas.
  if (state === "done") {
    return (
      <button
        type="button"
        onClick={onReopen}
        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
          {title}
        </span>
        <span className="shrink-0 text-[11px] text-[var(--muted)]">rever</span>
      </button>
    );
  }

  if (state === "future") {
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] px-4 py-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted-bg)] text-[11px] font-bold text-[var(--muted)]">
          {index}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--muted)]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
          {index}
        </span>
        <h3 className="min-w-0 flex-1 text-base font-bold text-[var(--text)]">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   A página
   ═══════════════════════════════════════════════════════════════════ */

export function GruposLocked() {
  const { currentUserId } = useApp();

  const initial = useRef<DemoState>(readStored());
  const [step, setStep] = useState<number>(initial.current.step);
  const [product, setProduct] = useState<AffiliateProduct | null>(null);
  const [myProducts, setMyProducts] = useState<AffiliateProduct[] | null>(null);
  const [text, setText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recentTexts, setRecentTexts] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  /* Os produtos do usuário. fetchMyAffiliateRows nunca lança — devolve [] em
     qualquer falha —, então `myProducts === null` significa só "ainda
     carregando", e [] significa de verdade "não tem nenhum". */
  useEffect(() => {
    if (!currentUserId) {
      setMyProducts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await fetchMyAffiliateRows(currentUserId);
      if (cancelled) return;
      setMyProducts(rowsToAffiliateProducts(rows));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  /* Restaura o produto guardado. Roda uma vez, quando a lista do usuário
     chega: o `n` pode apontar tanto para um produto afiliado quanto para um
     do catálogo, e os dois saem do mesmo array `affiliateProducts`. */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || myProducts === null) return;
    restored.current = true;
    const n = initial.current.productN;
    if (n == null) return;
    const found = affiliateProducts.find((p) => p.n === n);
    if (found) setProduct(found);
  }, [myProducts]);

  /* Sem produto não há o que gerar nem o que publicar. Se o passo guardado
     for 4 ou mais e o produto não tiver sido restaurado, volta para o 3 em
     vez de abrir uma etapa vazia sem saída. */
  useEffect(() => {
    if (myProducts === null) return;
    if (step >= 4 && !product) setStep(3);
  }, [myProducts, step, product]);

  useEffect(() => {
    writeStored({ step, productN: product?.n ?? null });
  }, [step, product]);

  const catalogSample = useMemo(
    () => activeAffiliateProducts.slice(0, CATALOG_SAMPLE_SIZE),
    [],
  );

  const handlePickProduct = (p: AffiliateProduct) => {
    setProduct(p);
    // Produto novo invalida o texto anterior — ele falava de outra coisa.
    setText("");
    setRecentTexts([]);
    setStep(4);
  };

  const handleGenerate = useCallback(() => {
    if (!product) return;
    setGenerating(true);
    // Pequena espera deliberada: é o mesmo gesto da página paga, onde o
    // gerador também "pensa" antes de responder.
    setTimeout(() => {
      const result = generateCopy(
        {
          name: product.name,
          /* O catálogo de afiliados não tem descrição — e o motor lida com
             isso: sem descrição ele usa as linhas de nome e infere categoria,
             benefício e público a partir do próprio nome do produto. */
          description: "",
          /* O link de afiliado que o app já usa em todo lugar. */
          link: product.shopeeUrl,
          price: product.price > 0 ? product.price : undefined,
          /* O grupo da demonstração é do Facebook, então o texto sai no tom
             de Facebook — parágrafo corrido, que é como se escreve por lá. */
          tone: "Grupo do Facebook",
        },
        recentTexts,
      );
      setText(result);
      setRecentTexts((prev) => [result, ...prev].slice(0, 5));
      setGenerating(false);
    }, 1100);
  }, [product, recentTexts]);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Texto copiado com sucesso.");
    } catch {
      // Clipboard bloqueado (contexto inseguro, permissão negada): o texto
      // está na tela, então dá para selecionar na mão — mas não pode fingir
      // que copiou.
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }, [text]);

  const handleRestart = () => {
    setStep(1);
    setProduct(null);
    setText("");
    setRecentTexts([]);
  };

  const stateOf = (n: number): "done" | "active" | "future" =>
    step > n ? "done" : step === n ? "active" : "future";

  // Só permite voltar para etapa já concluída — clicar numa futura pularia a
  // demonstração, que é justamente o que se quer que a pessoa faça.
  const reopen = (n: number) => () => {
    if (step > n) setStep(n);
  };

  return (
    <DashboardShell title="Grupos de Divulgação">
      <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-2">
        <div className="flex flex-col gap-3">
          {/* ── 1. Intro ─────────────────────────────────────────────── */}
          <StepShell
            index={1}
            title="Vamos te demonstrar como funciona os grupos de divulgação"
            state={stateOf(1)}
            onReopen={reopen(1)}
          >
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Você escolhe um grupo, escolhe um produto, a gente gera a divulgação pronta e você
              publica. São quatro passos — faça agora com um produto de verdade.
            </p>
            <div className="mt-4">
              <PrimaryButton onClick={() => setStep(2)}>
                Começar
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </StepShell>

          {/* ── 2. Grupo ─────────────────────────────────────────────── */}
          <StepShell index={2} title="Selecione o grupo" state={stateOf(2)} onReopen={reopen(2)}>
            {DEMO_GROUP ? (
              <>
                <DemoGroupCard
                  group={DEMO_GROUP}
                  cta="Selecionar e abrir"
                  /* Avança JUNTO com a abertura da aba, não na volta. A aba
                     pode nunca voltar — a pessoa entra no grupo, se distrai,
                     fecha. Esperar o retorno deixaria a demonstração parada
                     no passo 2 para sempre, que é pior que avançar cedo. */
                  onOpen={() => setStep(3)}
                />
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                  O grupo abre em outra aba. Pode voltar aqui quando quiser — a demonstração
                  continua do passo seguinte.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Nenhum grupo disponível para demonstração no momento.
              </p>
            )}
          </StepShell>

          {/* ── 3. Produto ───────────────────────────────────────────── */}
          <StepShell
            index={3}
            title="Selecione o produto que você quer divulgar"
            state={stateOf(3)}
            onReopen={reopen(3)}
          >
            {myProducts === null ? (
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando seus produtos...
              </div>
            ) : myProducts.length > 0 ? (
              <ProductGrid products={myProducts} selectedN={product?.n} onPick={handlePickProduct} />
            ) : (
              /* CAMINHO MAIS PROVÁVEL numa conta nova, não exceção: quem
                 acabou de entrar não afiliou nada ainda. Sem esta saída o
                 passo 3 seria um beco e a demonstração morreria antes da
                 oferta — um passo a passo que não termina não vende nada. */
              <>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  Você ainda não tem produtos. Escolha um do catálogo para testar
                </p>
                <div className="mt-4">
                  <ProductGrid
                    products={catalogSample}
                    selectedN={product?.n}
                    onPick={handlePickProduct}
                  />
                </div>
              </>
            )}
          </StepShell>

          {/* ── 4. Divulgação ────────────────────────────────────────── */}
          <StepShell index={4} title="Gere a divulgação" state={stateOf(4)} onReopen={reopen(4)}>
            {product && (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] p-3">
                  <img
                    src={product.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-semibold leading-tight text-[var(--text)]">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">{brl(product.price)}</p>
                  </div>
                </div>

                {!text && !generating && (
                  <div className="mt-4">
                    <PrimaryButton onClick={handleGenerate}>
                      <Sparkles className="h-4 w-4" />
                      Gerar divulgação
                    </PrimaryButton>
                  </div>
                )}

                {generating && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                    Gerando sua divulgação...
                  </div>
                )}

                {text && !generating && (
                  <>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      É isto que você vai publicar
                    </p>
                    <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 font-sans text-[13px] leading-relaxed text-[var(--text)]">
                      {text}
                    </pre>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
                      >
                        {copied ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copiado" : "Copiar texto"}
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Gerar outro
                      </button>
                    </div>
                    <div className="mt-3">
                      <PrimaryButton onClick={() => setStep(5)}>
                        Continuar
                        <ArrowRight className="h-4 w-4" />
                      </PrimaryButton>
                    </div>
                  </>
                )}
              </>
            )}
          </StepShell>

          {/* ── 5. Publicar ──────────────────────────────────────────── */}
          <StepShell index={5} title="Publique no grupo" state={stateOf(5)} onReopen={reopen(5)}>
            <ol className="flex flex-col gap-2 text-sm leading-relaxed text-[var(--muted)]">
              <li className="flex gap-2">
                <span className="font-bold text-[var(--accent)]">1.</span>
                Copie o texto da divulgação.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[var(--accent)]">2.</span>
                Abra o grupo no Facebook.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[var(--accent)]">3.</span>
                Cole no campo de publicação e publique.
              </li>
            </ol>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!text}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4 text-[var(--accent)]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar o texto"}
              </button>

              {DEMO_GROUP && (
                <a
                  href={DEMO_GROUP.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
                >
                  Abrir o grupo
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <PrimaryButton onClick={() => setStep(6)}>
                Publiquei, concluir
                <Check className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </StepShell>

          {/* ── 6. Oferta ────────────────────────────────────────────── */}
          <StepShell
            index={6}
            title="Pronto — foi isso que você acabou de fazer"
            state={stateOf(6)}
            onReopen={reopen(6)}
          >
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Você acabou de divulgar em <strong className="text-[var(--text)]">um</strong> grupo.
              Com o Divulgador de Grupos você faz isso na lista completa, com os grupos atualizados
              todos os dias e o melhor horário de cada um.
            </p>

            <div className="mt-4 rounded-2xl border border-[var(--border-warm)] bg-[var(--accent-soft)] p-4 text-center">
              <div className="text-3xl font-extrabold tracking-tight text-[var(--text)]">
                R$ 49,90
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">por mês</div>
            </div>

            <div className="mt-4">
              <a
                href={CHECKOUT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Quero o Divulgador de Grupos
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Segunda linha, logo abaixo do botão. A liberação é manual —
                  sem este aviso, quem paga volta, vê a página trancada e
                  conclui que foi cobrado à toa. */}
              <a
                href={WHATSAPP_UNLOCK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-center text-[13px] font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
              >
                Já pagou? Chame no WhatsApp para liberar seu acesso
              </a>
            </div>

            <button
              type="button"
              onClick={handleRestart}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 text-[13px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Fazer a demonstração de novo
            </button>
          </StepShell>
        </div>
      </div>
    </DashboardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Grade de produtos — serve tanto para os do usuário quanto para a
   amostra do catálogo. Mesmo visual nos dois casos, de propósito: o que
   muda é a origem da lista, não o gesto de escolher.
   ═══════════════════════════════════════════════════════════════════ */

function ProductGrid({
  products,
  selectedN,
  onPick,
}: {
  products: AffiliateProduct[];
  selectedN?: number;
  onPick: (p: AffiliateProduct) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {products.map((p) => {
        const selected = p.n === selectedN;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <img
              src={p.image}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[12px] font-semibold leading-tight text-[var(--text)]">
                {p.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{brl(p.price)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
