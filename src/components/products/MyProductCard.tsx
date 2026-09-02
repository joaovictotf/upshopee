import { useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AffiliateProduct } from "../../lib/mock/affiliate-products";
import { brl } from "../../lib/format";
import { productSales, generateContent } from "../../lib/product-insights";
import { supabase } from "../../integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";

const SORA = { fontFamily: "'Sora', sans-serif" } as const;

/** Quantas legendas anteriores ficam na memória do card para alimentar o
 *  `avoid` de generateContent. Oito cobre a sessão de quem clica várias vezes
 *  seguidas procurando uma versão que gostou, sem segurar texto à toa. */
const HISTORY_SIZE = 8;

type GeneratedContent = ReturnType<typeof generateContent>;

/** Shopee Video só aceita 150 caracteres — mesmo limite de product-insights.ts,
 *  repetido aqui só para o contador visual, sem importar constante interna. */
const CAPTION_MAX_LENGTH = 150;

export function MyProductCard({
  product,
  onRemoved,
}: {
  product: AffiliateProduct;
  /** Só é chamado depois que a RPC confirma a remoção. */
  onRemoved: (productN: number) => void;
}) {
  const [content, setContent] = useState<GeneratedContent | null>(null);
  // Pacotes já mostrados, em forma canônica. Vai inteiro para o `avoid` de
  // generateContent, que refaz o sorteio quando cai em algo repetido.
  const [history, setHistory] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  // Dado de mercado do PRODUTO. Determinístico e estável dentro do dia de São
  // Paulo, então pode ser calculado a cada render sem piscar número na tela.
  // `sales` só existe nos produtos 251-300; quando existe, ancora os números no
  // total real da Shopee.
  const sales = productSales(product.n, product.sales);

  const generate = () => {
    const next = generateContent(
      { name: product.name, category: product.category, price: product.price },
      history,
    );
    setContent(next);
    setHistory((prev) => [next.caption, ...prev].slice(0, HISTORY_SIZE));
  };

  const copyCaption = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content.caption);
      setCaptionCopied(true);
      toast.success("Legenda copiada");
      window.setTimeout(() => setCaptionCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie na mão.");
    }
  };

  const copyAffiliateLink = async () => {
    try {
      await navigator.clipboard.writeText(product.shopeeUrl);
      setLinkCopied(true);
      toast.success("Link copiado");
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar agora. Tente de novo.");
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const { error } = await supabase.rpc(
        "remove_affiliate_product" as never,
        { _product_n: product.n } as never,
      );
      if (error) throw new Error(error.message);
      setConfirmOpen(false);
      onRemoved(product.n);
      toast.success("Produto removido da sua lista");
    } catch {
      toast.error("Não foi possível remover agora. Tente de novo.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] sm:p-4">
      {/* ── Identidade do produto — mesma leitura do card do catálogo ── */}
      <div className="flex items-start gap-3">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.dataset.fallback === "1") return;
            img.dataset.fallback = "1";
            img.src = "https://placehold.co/600x600/EDEDEB/6E6E76?text=Produto";
          }}
          className="h-16 w-16 shrink-0 rounded-xl bg-[var(--muted-bg)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text)]">
            {product.name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{product.category}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span
              className="text-sm font-bold leading-none text-emerald-600 dark:text-emerald-400"
              style={SORA}
            >
              {brl(product.commissionBRL)}
            </span>
            <span className="text-[11px] font-semibold text-[var(--muted)]">
              {product.commissionPct}% de comissão
            </span>
          </div>
        </div>
      </div>

      {/* ── Vendas do PRODUTO na Shopee ──
          O rótulo e a linha de baixo existem para não deixar dúvida: este bloco
          é sobre o produto, não sobre o dinheiro do usuário. */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Vendas do produto na Shopee
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            { label: "Hoje", value: sales.hoje },
            { label: "7 dias", value: sales.sete },
            { label: "30 dias", value: sales.trinta },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-2 text-center"
            >
              <p className="text-base font-bold leading-none tabular-nums text-[var(--text)]" style={SORA}>
                {value}
              </p>
              <p className="mt-1 text-[10px] leading-none text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[var(--muted)]">
          Quanto este produto vendeu na Shopee. Não são as suas vendas nem a sua comissão.
        </p>
      </div>

      {/* ── Legenda gerada — uma só, pronta pra colar no Shopee Video ── */}
      {content && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 break-words text-xs leading-relaxed text-[var(--text)]">
              {content.caption}
            </p>
            <button
              type="button"
              onClick={copyCaption}
              className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
            >
              {captionCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {captionCopied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-1.5 text-right text-[10px] tabular-nums text-[var(--muted)]">
            {content.caption.length}/{CAPTION_MAX_LENGTH}
          </p>
        </div>
      )}

      {/* ── Ações ──
          Uma linha só: o botão principal ocupa o espaço que sobra e os
          ícones ficam com 40px fixos, que é o que faz caber em 320px. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={generate}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--accent)] px-3 text-xs font-semibold text-white transition-all hover:bg-[var(--accent-2)] active:scale-[0.98] sm:text-sm"
        >
          {content ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {content ? "Gerar outra" : "Gerar legenda"}
        </button>

        <button
          type="button"
          onClick={copyAffiliateLink}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          aria-label="Copiar link de afiliado"
          title="Copiar link de afiliado"
        >
          {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>

        <a
          href={product.shopeeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
          aria-label="Abrir na Shopee"
          title="Abrir na Shopee"
        >
          <ExternalLink className="h-4 w-4" />
        </a>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-destructive/50 hover:text-destructive"
          aria-label="Remover da lista"
          title="Remover da lista"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* ── Confirmação de remoção ──
          A lista é o único registro de que o usuário afiliou este produto; um
          toque errado no ícone apagaria isso sem volta. */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!removing) setConfirmOpen(open); }}>
        <DialogContent className="max-w-sm rounded-[20px] border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-elevated)]">
          {/* pr-8 abre espaço para o X que o DialogContent já desenha sozinho */}
          <DialogTitle className="pr-8 text-base font-semibold text-[var(--text)]" style={SORA}>
            Remover da sua lista?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[var(--muted)]">
            "{product.name}" sai de "Meus produtos". O produto continua no catálogo — é só
            afiliar de novo para ele voltar.
          </DialogDescription>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className="flex h-10 flex-1 items-center justify-center rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {removing ? "Removendo..." : "Remover"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={removing}
              className="flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--muted-bg)] disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
