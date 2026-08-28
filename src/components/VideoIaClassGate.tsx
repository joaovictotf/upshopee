/* ═══════════════════════════════════════════════════════════════════
   Vídeo IA — etapa 7 do usuário comum
   ═══════════════════════════════════════════════════════════════════
   Bloco que explica que a geração de vídeo por IA é liberada DURANTE a aula
   ao vivo, e leva o usuário até o agendamento.

   Renderizado por Step7GeminiChat, e SÓ depois de o usuário copiar o prompt —
   antes disso ele atropelaria a tarefa que a pessoa veio fazer na etapa 7.

   Só aparece para usuário comum. O admin cai em AdminStep7Video, que não
   passa por aqui e não foi tocado.

   NÃO reproduz o formulário de agendamento: manda para a seção de
   /dashboard/aulas via âncora. Dois formulários de agendamento acabariam
   divergindo um do outro.

   A reserva vem de lib/class-booking, a mesma query e o mesmo critério de
   "confirmada" que /dashboard/aulas usa. */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarCheck, CalendarPlus, Clock, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import {
  BOOKING_SECTION_ID,
  fetchClassBookings,
  findConfirmedBooking,
  formatBookingDateLong,
  parseBookingDate,
  type ClassBooking,
} from "../lib/class-booking";

export function VideoIaClassGate({ currentUserId }: { currentUserId: string | null }) {
  const navigate = useNavigate();
  // undefined = ainda carregando; null = sem aula marcada.
  const [booking, setBooking] = useState<ClassBooking | null | undefined>(undefined);

  useEffect(() => {
    if (!currentUserId) {
      setBooking(null);
      return;
    }
    let cancelled = false;
    void fetchClassBookings(currentUserId).then((rows) => {
      if (cancelled) return;
      // Erro de rede (rows === null) cai no mesmo estado de "sem reserva":
      // o bloco continua explicando a liberação e oferecendo o agendamento,
      // que é o caminho certo para quem realmente não tem aula marcada.
      setBooking(findConfirmedBooking(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const goToBooking = () => void navigate({ to: "/dashboard/aulas", hash: BOOKING_SECTION_ID });

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--accent-soft)] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-snug text-[var(--text)] sm:text-base">
              Seu prompt está pronto. Falta liberar o Vídeo IA
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
              Guarde o prompt que você acabou de copiar. A liberação do seu Vídeo IA é feita
              pelo professor durante a aula ao vivo, aqui no Uptube — é só pedir na hora.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {booking === undefined ? (
          /* Carregando: nenhuma das duas mensagens ainda, para não piscar
             "agende sua aula" na cara de quem já tem aula marcada. */
          <div className="h-10 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ) : booking ? (
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 sm:text-sm">
                Sua aula já está marcada
              </p>
            </div>
            <div className="mt-2.5 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-2 text-xs text-[var(--text)]">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                {formatBookingDateLong(parseBookingDate(booking.scheduled_date))}
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                {booking.scheduled_time}
              </span>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)]">
              Seu Vídeo IA será liberado nessa aula. Leve o prompt que você acabou de copiar e
              peça a ativação ao professor.
            </p>
            {/* Leva para a mesma tela, mas sem pedir um novo agendamento a
                quem já tem aula marcada. */}
            <Button
              type="button"
              variant="outline"
              onClick={goToBooking}
              className="mt-3 h-11 w-full rounded-xl border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] transition-all hover:border-[var(--accent)]/40 hover:text-[var(--accent)] active:scale-[0.98] sm:w-auto"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Ver minha aula
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-xs leading-relaxed text-[var(--text)] sm:text-sm">
              Marque sua aula aqui no Uptube e, durante ela, peça ao professor a ativação do seu
              Vídeo IA. Escolha um professor, um dia e um horário — a aula é gratuita.
            </p>
            <Button
              type="button"
              onClick={goToBooking}
              className="mt-3 h-11 w-full rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] sm:w-auto"
              style={{
                background: "var(--accent-gradient, var(--accent))",
                boxShadow: "var(--accent-glow)",
              }}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Agendar minha aula ao vivo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
