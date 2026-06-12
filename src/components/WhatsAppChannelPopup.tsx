import { useState } from "react";
import { X, MessageCircle } from "lucide-react";

/**
 * Pop-up obrigatório do canal oficial no WhatsApp.
 * Aparece sempre que o site é carregado. Sem persistência.
 */
export function WhatsAppChannelPopup() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-channel-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-[#25D366]" />
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#25D366] shadow-lg shadow-[#25D366]/30">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
          </div>

          <h2
            id="wa-channel-title"
            className="text-center text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
          >
            Entre no canal oficial dos alunos
          </h2>

          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            Criamos um canal exclusivo no WhatsApp para avisos importantes,
            suporte, atualizações da plataforma e orientações para os alunos da
            ShopSync.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Fechar
            </button>
            <a
              href="https://whatsapp.com/channel/0029VbDG7Jz8kyyR7N8HFE41"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition hover:brightness-110"
            >
              <MessageCircle className="h-4 w-4" />
              Entrar no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}