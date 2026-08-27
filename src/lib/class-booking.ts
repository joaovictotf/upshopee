/* ═══════════════════════════════════════════════════════════════════
   Aula ao vivo — leitura compartilhada de public.class_bookings
   ═══════════════════════════════════════════════════════════════════
   Duas telas precisam saber se o usuário tem aula marcada:
     · /dashboard/aulas       — a tela de agendamento;
     · /dashboard/video-ia    — a etapa 7 do usuário comum, que libera a
       geração de vídeo durante a aula.

   As duas leem DAQUI, com a mesma query e o mesmo critério de "confirmada".
   Se cada tela montasse a própria consulta, uma acabaria discordando da
   outra sobre o que conta como aula marcada. */

import { supabase } from "../integrations/supabase/client";

/** Linha de public.class_bookings.
 *  `payment_status = 'paid'` cobre dois casos: pagamento real antigo (via
 *  evopay-webhook) e confirmação gratuita via confirm_free_class_booking
 *  (migration 20260827120000). Para a tela, os dois são "aula marcada". */
export interface ClassBooking {
  id: string;
  professor_id: string;
  scheduled_date: string; // YYYY-MM-DD
  /** Horário como foi gravado. NÃO assuma que existe na lista de horários
   *  oferecida hoje: reservas anteriores a 27/08/2026 usam 18:30, 20:30 ou
   *  22:00, que saíram da oferta. Sempre exibir esta string como veio. */
  scheduled_time: string;
  payment_status: "pending" | "paid" | "expired";
  created_at: string;
}

const CLASS_BOOKING_COLUMNS =
  "id, professor_id, scheduled_date, scheduled_time, payment_status, created_at";

/** Reservas do usuário, mais recente primeiro.
 *  Devolve `null` em erro — quem chama decide o que fazer. Erro de rede não
 *  deve ser confundido com "não tem reserva nenhuma". */
export async function fetchClassBookings(userId: string): Promise<ClassBooking[] | null> {
  const { data, error } = await supabase
    .from("class_bookings")
    .select(CLASS_BOOKING_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return null;
  return (data ?? []) as ClassBooking[];
}

/** A reserva confirmada, se houver. Único estado terminal é 'paid'. */
export function findConfirmedBooking(bookings: ClassBooking[] | null): ClassBooking | null {
  return bookings?.find((b) => b.payment_status === "paid") ?? null;
}

/** "Quarta-feira, 23 de Julho de 2026" */
export function formatBookingDateLong(d: Date): string {
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Converte a coluna `date` do Postgres em Date local.
 *  O meio-dia evita que o fuso jogue a data para o dia anterior. */
export function parseBookingDate(scheduledDate: string): Date {
  return new Date(`${scheduledDate}T12:00:00`);
}

/** Âncora da seção de agendamento em /dashboard/aulas.
 *  Quem manda o usuário agendar navega para esta hash em vez de recriar o
 *  formulário — dois fluxos de agendamento acabariam divergindo. */
export const BOOKING_SECTION_ID = "agendar-aula";
