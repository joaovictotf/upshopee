import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";

/**
 * Pop-up do grupo de alunos no WhatsApp.
 * Aparece em TODAS as visitas (sem persistência no localStorage).
 * Renderizado globalmente via __root.tsx.
 */
export function WhatsAppChannelPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Sempre mostra o popup — sem localStorage
    setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-group-title"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp green accent strip */}
        <div className="h-1.5 w-full bg-[#25D366]" />

        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8">
          {/* WhatsApp icon */}
          <div className="mb-4 flex justify-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#25D366] shadow-lg shadow-[#25D366]/30">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2
            id="wa-group-title"
            className="text-center text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
          >
            Grupo de Alunos Exclusivo
          </h2>

          {/* Body text */}
          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            Entre no nosso grupo do WhatsApp e tenha acesso a aulas, estratégias e
            novidades em primeira mão. É gratuito!
          </p>

          {/* CTA button */}
          <div className="mt-6">
            <a
              href="https://whatsapp.com/channel/0029VbCdjI05fM5cjyg43b08"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] h-12 text-white text-sm font-bold shadow-lg shadow-[#25D366]/30 transition hover:brightness-110"
            >
              Entrar no Grupo do WhatsApp
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
