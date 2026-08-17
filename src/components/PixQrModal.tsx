// Modal de pagamento PIX — compartilhado.
//
// Extraído de src/routes/dashboard.impulsionar-vendas.tsx, onde nasceu ligado
// ao tipo Pack. Agora recebe só o que precisa desenhar, então serve tanto o
// Impulsionar quanto a aula ao vivo. O comportamento visual é o mesmo de antes:
// nenhum estilo, texto ou classe do fluxo do Impulsionar mudou — só a origem
// dos dados, que passou de `pack` para `item`.
//
// Este componente NÃO chama a EvoPay e NÃO conhece preço. Quem cria a cobrança
// é a página; aqui só entra o resultado já pronto.
import { useState } from "react";
import { brl } from "../lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Copy, Check } from "lucide-react";

/** Estado da cobrança PIX, do clique até o QR na tela. */
export type PixQrState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      qrCodeText: string;
      qrCodeUrl: string;
      qrCodeBase64: string;
      transactionId: string;
      clientReference: string;
    }
  | { status: "error"; message: string };

/** O que está sendo pago. `null` mantém o QR escondido, igual ao antigo `pack`. */
export type PixQrItem = { name: string; amount: number } | null;

export function PixQrModal({
  qrState,
  item,
  itemLabel,
  footerNote,
  onClose,
  onRetry,
}: {
  qrState: PixQrState;
  item: PixQrItem;
  /** Rótulo da linha de identificação: "Pacote" no Impulsionar, "Aula" na aula. */
  itemLabel: string;
  /** Texto do rodapé — o que acontece depois do pagamento. Varia por fluxo. */
  footerNote: React.ReactNode;
  onClose: () => void;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (qrState.status !== "success") return;
    try {
      await navigator.clipboard.writeText(qrState.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback for insecure contexts
      const ta = document.createElement("textarea");
      ta.value = qrState.qrCodeText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-md">
        {/* ── Loading ─────────────────────────────────────────────────── */}
        {qrState.status === "loading" && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent)]/20 border-t-[var(--accent)]" />
            <p className="text-sm font-medium text-[var(--text)]">Gerando PIX...</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Conectando ao EvoPay</p>
            {item && (
              <div className="mt-4 rounded-lg bg-[var(--muted-bg)] px-4 py-2 text-center">
                <span className="text-xs text-[var(--muted)]">
                  {item.name} • {brl(item.amount)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {qrState.status === "error" && (
          <div className="flex flex-col items-center py-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-400">
              <span className="text-xl font-bold">!</span>
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">Erro ao gerar PIX</p>
            <p className="mt-1 text-center text-xs text-[var(--muted)]">{qrState.message}</p>
            <div className="mt-6 flex w-full gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--muted-bg)]"
              >
                Fechar
              </button>
              <button
                onClick={onRetry}
                className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* ── Success ─────────────────────────────────────────────────── */}
        {qrState.status === "success" && item && (
          <div className="flex flex-col items-center">
            <DialogHeader className="w-full">
              <DialogTitle className="text-center text-lg font-semibold">
                Pagamento PIX — {item.name}
              </DialogTitle>
              <DialogDescription className="text-center">
                Escaneie o QR Code ou copie o código PIX para pagar
              </DialogDescription>
            </DialogHeader>

            {/* QR Code image */}
            <div className="my-4 flex justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <img
                src={`data:image/png;base64,${qrState.qrCodeBase64}`}
                alt="QR Code PIX"
                className="h-48 w-48 object-contain sm:h-56 sm:w-56"
              />
            </div>

            {/* Item info */}
            <div className="mb-4 w-full rounded-xl bg-[var(--muted-bg)] border border-[var(--border)] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Valor</span>
                <span className="font-bold text-[var(--text)]">{brl(item.amount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                <span className="shrink-0 text-[var(--muted)]">{itemLabel}</span>
                <span className="truncate text-right font-semibold text-[var(--accent)]">
                  {item.name}
                </span>
              </div>
            </div>

            {/* PIX code text */}
            <div className="mb-3 w-full">
              <p className="mb-1 text-[10px] font-semibold text-[var(--muted)] uppercase">
                Código PIX (copia e cola)
              </p>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-2.5">
                <p className="break-all text-[11px] leading-relaxed text-[var(--text)] font-mono select-all">
                  {qrState.qrCodeText}
                </p>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-[var(--accent)] text-white hover:opacity-90"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Código copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar código PIX
                </>
              )}
            </button>

            {/* What happens after payment — varies per flow */}
            <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-3 text-center">
              <p className="text-xs text-[var(--muted)]">{footerNote}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-lg border border-[var(--border)] py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--muted-bg)]"
            >
              Fechar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
