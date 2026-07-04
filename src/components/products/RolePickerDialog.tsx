import { ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";

type RolePickerDialogProps = {
  open: boolean;
  productName: string;
  onSelectVendedor: () => void;
  onSelectAfiliado: () => void;
  onClose: () => void;
};

export function RolePickerDialog({
  open,
  productName,
  onSelectVendedor,
  onSelectAfiliado,
  onClose,
}: RolePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-[20px] border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-elevated)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted-bg)] text-[var(--muted)] transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center mt-2 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
            Como você quer atuar?
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {productName
              ? `Escolha como quer ganhar dinheiro com "${productName}"`
              : "Escolha como quer ganhar dinheiro com este produto"}
          </p>
        </div>

        {/* Choice cards */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Card 1 — Vendedor */}
          <button
            onClick={onSelectVendedor}
            className="flex-1 rounded-[16px] border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-left cursor-pointer transition-all duration-200 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] group-hover:bg-[var(--surface)] transition-colors">
              <ShoppingBag className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Quero ser Vendedor
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
              Compre do fornecedor, revenda na Shopee e lucre com a diferença
            </p>
          </button>

          {/* Card 2 — Afiliado */}
          <button
            onClick={onSelectAfiliado}
            className="flex-1 rounded-[16px] border-2 border-[var(--border)] bg-[var(--surface)] p-5 text-left cursor-pointer transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 group"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 group-hover:bg-[var(--surface)] transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-600 dark:text-emerald-400"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Quero ser Afiliado
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
              Divulgue produtos e ganhe comissão sem precisar de estoque
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
