import { useEffect, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { spWindowIndex } from "../lib/timeWindow";

/** Versioned gate: o próximo anúncio sobe para _v2 e o aviso dispara mais uma
 *  vez para todo mundo. Qualquer caminho de dispensa (X, Escape, backdrop,
 *  botão) grava a chave, então ele não volta — nem depois de recarregar. */
const SEEN_KEY = "upshopee_videoaulas_21ago_seen_v1";

const HOUR_MS = 3_600_000;

/** 21/08/2026 15:00 em São Paulo, como índice de janela de 1 hora.
 *  spWindowIndex conta janelas alinhadas à hora local de São Paulo, então
 *  comparar contra este índice é comparação de relógio de parede de SP e vale
 *  para visitante em qualquer fuso — sem new Date() cru, que resolveria no
 *  fuso do próprio dispositivo. */
const RELEASE_HOUR_INDEX = Date.UTC(2026, 7, 21, 15) / HOUR_MS;

function releaseAlreadyHappened(): boolean {
  return spWindowIndex(HOUR_MS) >= RELEASE_HOUR_INDEX;
}

/** Aviso único das videoaulas de estratégia (21/08, 15h). Montado só no
 *  /dashboard — a página de produtos já tem o anúncio dela, e dois diálogos
 *  brigando na primeira carga é péssima primeira impressão. */
export function DateAnnouncement() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Passada a hora do lançamento o aviso deixa de existir para todo mundo,
    // inclusive para quem nunca viu. Anunciar como futura uma data que já
    // passou é pior do que não anunciar.
    if (releaseAlreadyHappened()) return;
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
      // sem storage o aviso simplesmente não volta nesta sessão
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      {/* `light-scope` é obrigatório aqui: DialogContent sai por um Portal do
          Radix direto no document.body, FORA do wrapper forceLight do
          DashboardShell. Sem ele o painel pegaria os tokens `.dark` do <html>
          e renderizaria escuro sobre uma página clara. As duas declarações de
          página que a classe carrega (min-height: 100dvh e o fundo) são
          neutralizadas inline — o fundo continua vindo de token, resolvido nos
          valores claros que o light-scope declara. Mesmo caminho usado pelo
          DemoPeriodNotice em routes/dashboard.index.tsx. */}
      <DialogContent
        className="light-scope w-[calc(100%-2rem)] max-w-md rounded-[20px] border-[var(--border)] p-6 shadow-[var(--shadow-elevated)] sm:rounded-[20px]"
        style={{ minHeight: 0, background: "var(--surface)" }}
      >
        {/* Botão de fechar — mesmo padrão do NewProductsAnnouncement */}
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted-bg)] text-[var(--muted)] transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <PlayCircle className="h-6 w-6 text-[var(--accent)]" />
          </div>

          <DialogTitle
            className="mt-4 text-lg font-semibold tracking-tight text-[var(--text)]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Videoaulas de estratégia chegam dia 21
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            As videoaulas de estratégia entram no ar em{" "}
            <span className="font-semibold text-[var(--text)]">21 de agosto, às 15h</span>.
            Você encontra todas na aba Aulas.
          </DialogDescription>

          <button
            onClick={dismiss}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white transition-all hover:bg-[var(--accent-2)] active:scale-[0.98]"
          >
            Entendi
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
