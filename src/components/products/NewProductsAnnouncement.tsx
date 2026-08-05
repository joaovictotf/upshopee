import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

/** Versioned gate: the next product batch bumps to _v2 and the popup fires
 *  once more for everyone. Any dismissal path (X, Escape, backdrop, CTA)
 *  writes the key, so the dialog never reappears — reloads included. */
const SEEN_KEY = "upshopee_novos_produtos_seen_v1";

/** One-time announcement for the 50 new products (n 251-300). Mounted only
 *  on /dashboard/produtos. The CTA scrolls to the first new card in the
 *  current grid order — cards flag themselves via data-new-product. */
export function NewProductsAnnouncement() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // localStorage indisponível (ex.: modo privado) — sem gate confiável,
      // melhor não mostrar do que mostrar a cada visita.
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // sem storage o popup simplesmente não volta nesta sessão
    }
    setOpen(false);
  };

  const goToNewProducts = () => {
    dismiss();
    // Small delay so the closing dialog releases the scroll lock before we
    // move the page; block:"center" keeps the card clear of the sticky bar.
    window.setTimeout(() => {
      document
        .querySelector('[data-new-product="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-[20px] border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-elevated)] sm:rounded-[20px]">
        {/* Close button — same pattern as RolePickerDialog */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted-bg)] text-[var(--muted)] transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <Sparkles className="h-6 w-6 text-[var(--accent)]" />
          </div>

          <DialogTitle
            className="mt-4 text-lg font-semibold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Chegaram 50 produtos novos
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Adicionamos 50 produtos com as maiores comissões do catálogo — chegam
            a 83% por venda. Todos estão marcados com o selo{" "}
            <span className="font-semibold text-[var(--accent)]">Produto novo</span>.
          </DialogDescription>

          <button
            onClick={goToNewProducts}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white transition-all hover:bg-[var(--accent-2)] active:scale-[0.98]"
          >
            Ver produtos novos
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
