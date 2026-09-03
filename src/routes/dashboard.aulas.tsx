import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/state";
import { supabase } from "../integrations/supabase/client";
import { DashboardShell, ADMIN_DISPLAY_NAME } from "../components/layout/DashboardShell";
import {
  Play, Lock, GraduationCap, Loader2,
  CheckCircle2, Calendar, Clock, Trash2, MessageCircle, Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  BOOKING_SECTION_ID,
  fetchClassBookings,
  findConfirmedBooking,
  formatBookingDateLong,
  parseBookingDate,
  type ClassBooking,
} from "../lib/class-booking";
import { useUptubeTrail } from "../hooks/use-uptube-trail";
import { UptubePlayer } from "../components/uptube/UptubePlayer";
import { UptubeCertificate } from "../components/uptube/UptubeCertificate";

export const Route = createFileRoute("/dashboard/aulas")({ component: AulasPage });

/* ═══════════════════════════════════════════════════════════════════
   Recompensa da trilha — WhatsApp do DONO
   ═══════════════════════════════════════════════════════════════════
   ⚠️ 5534992043815 NÃO é o número do suporte (5534992017453, usado no
   WhatsAppSupportButton e no §13 do CLAUDE.md). Este cai direto no Juam,
   que é quem libera o acesso ao Gemini para quem terminou as 5 aulas.
   Não unificar com o suporte "para ficar consistente" — são canais
   diferentes de propósito. */
const REWARD_WHATSAPP_URL =
  "https://wa.me/5534992043815?text=Conclu%C3%AD%20as%205%20aulas%20da%20UpShopee%20e%20quero%20entrar%20no%20grupo%20para%20liberar%20o%20acesso%20ao%20Gemini";

/** Âncora do player: abrir uma aula lá de baixo tem que trazer a tela até ela. */
const UPTUBE_PLAYER_ID = "uptube-player";

/* ═══════════════════════════════════════════════════════════════════
   LIVE CLASS BOOKING — types, helpers, localStorage
   ═══════════════════════════════════════════════════════════════════ */

interface Professor {
  id: string;
  name: string;
  bio: string;
  initial: string;
  color: string;
}

const PROFESSORS: Professor[] = [
  { id: "renan", name: "Professor Renan", bio: "Especialista em Shopify e marketplaces", initial: "R", color: "#F4541E" },
  { id: "marcelo", name: "Professor Marcelo", bio: "Especialista em anúncios e conversão", initial: "M", color: "#6366F1" },
  { id: "junior", name: "Professor Júnior", bio: "Especialista em IA e automação de vendas", initial: "J", color: "#10B981" },
];

interface TimeSlot {
  time: string;
  totalSpots: number;
}

/* Horários OFERECIDOS hoje. Esta lista governa só o que a tela deixa marcar
   daqui pra frente — ela NÃO é usada para interpretar agendamento já gravado.
   Reservas antigas em 18:30/20:30/22:00 continuam no banco e aparecem com o
   horário real delas, porque a tela imprime `scheduled_time` direto, sem
   procurar o valor aqui. Não existe lookup de TIME_SLOTS por horário salvo —
   se algum dia passar a existir, ele precisa tratar horário fora desta lista. */
const TIME_SLOTS: TimeSlot[] = [
  { time: "09:00", totalSpots: 4 },
  { time: "15:00", totalSpots: 4 },
];

/** Disponibilidade vinda de public.class_professors. A aula é gratuita, mas o
 *  professor ainda pode estar desativado — o preço da tabela fica sem uso. */
interface ProfessorAvailability {
  active: boolean;
}

/* ─── Agendamento antigo em localStorage — SOMENTE LEITURA ───────────────────
   Até 17/08/2026 o agendamento vivia só no navegador, sem pagamento e sem
   registro no banco. Agora quem manda é class_bookings.
   Estas duas funções sobrevivem apenas para não sumir com o que já estava
   salvo na máquina de quem agendou antes: a tela mostra o registro antigo,
   deixa dispensá-lo, e nunca mais escreve nessa chave. `saveBooking` foi
   removida de propósito — não existe mais caminho de escrita local. */
interface Booking {
  professorId: string;
  professorName: string;
  professorColor: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string;
}

const BOOKING_KEY = (userId: string) => `upshopee-live-class.${userId}`;

function loadBooking(userId: string): Booking | null {
  try {
    const raw = localStorage.getItem(BOOKING_KEY(userId));
    return raw ? (JSON.parse(raw) as Booking) : null;
  } catch {
    return null;
  }
}

function clearBooking(userId: string) {
  localStorage.removeItem(BOOKING_KEY(userId));
}

/** Primeira data agendável: 4 dias ÚTEIS (seg–sex) depois de `from`, sem contar
 *  o próprio dia. Sábado e domingo nunca entram na contagem e nunca são
 *  oferecidos. Devolve a data à meia-noite no fuso local. */
function getEarliestBookingDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  // Advance one day at a time, counting only Mon-Fri
  let counted = 0;
  while (counted < 4) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) {
      counted++;
    }
  }
  return d;
}

/** Generate the next N available dates (including earliest) for the date picker — skips weekends. */
function generateAvailableDates(earliest: Date, count: number = 10): Date[] {
  const dates: Date[] = [];
  const d = new Date(earliest);
  while (dates.length < count) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
    // skip weekends
    const day = d.getDay();
    if (day === 0 || day === 6) {
      d.setDate(d.getDate() + (day === 6 ? 2 : 1));
    }
  }
  return dates;
}

/** Format a Date as "DD/MM" for pills */
function formatDateShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format a short weekday label for date pills: "Qua 23/07" */
function formatDatePill(d: Date): { day: string; date: string } {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return {
    day: days[d.getDay()],
    date: formatDateShort(d),
  };
}

/** Check if date is within 30 days from today */
function isWithin30Days(d: Date): boolean {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const thirtyDaysOut = new Date(now);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  return d <= thirtyDaysOut;
}


/* ═══════════════════════════════════════════════════════════════════
   Aviso de atualização das videoaulas — localStorage (1× por aparelho)
   ═══════════════════════════════════════════════════════════════════ */

/* Chave VERSIONADA de propósito: quem já dispensou o popup anterior
   (`upshopee-store-setup.*`) nunca viu este aviso e precisa vê-lo uma vez.
   Aviso novo = sufixo `.vN` novo. Nunca reaproveitar a chave de um aviso
   antigo — reaproveitar significa metade dos usuários nunca ver o recado. */
const UPDATE_NOTICE_KEY = "upshopee-aulas-update-notice.v1";

function isUpdateNoticeDismissed(): boolean {
  try {
    return localStorage.getItem(UPDATE_NOTICE_KEY) === "1";
  } catch {
    // Storage bloqueado (aba anônima, cookies desativados): não dá para
    // registrar a dispensa, então não insiste — melhor não mostrar do que
    // reaparecer a cada carregamento.
    return true;
  }
}

function dismissUpdateNotice() {
  try {
    localStorage.setItem(UPDATE_NOTICE_KEY, "1");
  } catch {
    /* storage bloqueado — o aviso volta no próximo acesso, sem quebrar nada */
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

function AulasPage() {
  const { currentUserId, user, isAdmin } = useApp();

  /* ═══ Trilha Uptube ═══
     rows, unlocked e trail_complete vêm PRONTOS do servidor
     (uptube_my_trail). Nada aqui recalcula cadeado nem conclusão. */
  const { rows, isLoading: trailLoading, isError: trailError, save, trailComplete, completedCount, total } =
    useUptubeTrail();

  /** Qual aula está aberta no player. null = mostrando a trilha. */
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  /* ═══ Aviso de atualização das videoaulas ═══ */
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);

  /* ═══ Live Class Booking state ═══ */
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [legacyBooking, setLegacyBooking] = useState<Booking | null>(null);
  // null = ainda carregando. Map vazio = não deu para saber quem está
  // indisponível, e nesse caso nenhum professor aparece desativado por engano.
  const [availability, setAvailability] = useState<Map<string, ProfessorAvailability> | null>(null);
  const [bookings, setBookings] = useState<ClassBooking[] | null>(null);
  // Trava os botões durante o create_class_booking + confirm_free_class_booking
  // da mesma reserva, pra não deixar clicar em outro horário no meio do caminho.
  const [isBooking, setIsBooking] = useState(false);

  const earliestDate = useMemo(() => getEarliestBookingDate(), []);
  const availableDates = useMemo(() => {
    const dates = generateAvailableDates(earliestDate, 10);
    return dates.filter(isWithin30Days);
  }, [earliestDate]);

  // 'paid' é o único estado terminal — cobre tanto uma reserva paga de verdade
  // (de antes de a aula virar gratuita) quanto uma confirmada sem pagamento
  // via confirm_free_class_booking. As duas são "aula marcada" pra tela.
  // Mesmo critério que a etapa 7 do Vídeo IA usa, via lib/class-booking.
  const paidBooking = useMemo(() => findConfirmedBooking(bookings), [bookings]);

  // 'pending' só deveria existir pelo instante entre create_class_booking e
  // confirm_free_class_booking — o efeito de autocura abaixo fecha isso
  // sozinho se sobrar uma reserva pendente (ex.: aba fechada no meio das duas
  // chamadas).
  const pendingBooking = useMemo(
    () => bookings?.find((b) => b.payment_status === "pending") ?? null,
    [bookings],
  );

  /* Disponibilidade real, de class_professors. O preço da tabela fica sem uso
     — só o campo active decide se o professor aparece reservável. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("class_professors")
        .select("id, active");
      if (cancelled) return;
      if (error || !data) {
        setAvailability(new Map());
        return;
      }
      setAvailability(
        new Map(
          data.map((r: { id: string; active: boolean }) => [r.id, { active: Boolean(r.active) }]),
        ),
      );
    })();
    return () => { cancelled = true; };
  }, []);

  /* Agendamentos do banco — mesma query que a etapa 7 do Vídeo IA usa. */
  const refreshBookings = useCallback(async () => {
    if (!currentUserId) { setBookings([]); return; }
    const rows = await fetchClassBookings(currentUserId);
    if (rows === null) return; // mantém o que já estava; erro de rede não apaga a tela
    setBookings(rows);
  }, [currentUserId]);

  useEffect(() => { void refreshBookings(); }, [refreshBookings]);

  /* Chegou de /dashboard/video-ia com #agendar-aula: rola até o formulário.
     Feito à mão em vez de depender do scroll automático do router — a seção
     está dentro do DashboardShell, que monta depois, e sem isso a âncora
     chega antes do elemento existir. */
  useEffect(() => {
    if (window.location.hash !== `#${BOOKING_SECTION_ID}`) return;
    const id = window.requestAnimationFrame(() => {
      document
        .getElementById(BOOKING_SECTION_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  /* Agendamento antigo do localStorage — só se não houver nada no banco. */
  useEffect(() => {
    if (!currentUserId) return;
    setLegacyBooking(loadBooking(currentUserId));
  }, [currentUserId]);

  /* Autocura: se uma reserva ficou 'pending' (confirm_free_class_booking falhou
     logo depois de criar, por exemplo por queda de rede), tenta confirmar de
     novo sozinho, uma vez por reserva. Se falhar de novo, o usuário só vê o
     formulário de novo e pode marcar outro horário — não fica reperguntando. */
  useEffect(() => {
    if (!pendingBooking) return;
    const bookingId = pendingBooking.id;
    void supabase
      .rpc("confirm_free_class_booking", { _booking_id: bookingId })
      .then(({ data, error }) => {
        if (!error && data) void refreshBookings();
      });
  }, [pendingBooking?.id, refreshBookings]);

  /* Aviso de atualização — uma vez por aparelho. A leitura fica dentro do
     efeito porque localStorage só existe no browser: no primeiro render o
     aviso está sempre fechado, e só aparece depois da montagem. */
  useEffect(() => {
    if (!isUpdateNoticeDismissed()) setShowUpdateNotice(true);
  }, []);

  const userId = currentUserId ?? user?.email ?? "guest";

  const closeUpdateNotice = useCallback(() => {
    dismissUpdateNotice();
    setShowUpdateNotice(false);
  }, []);

  /* ═══ Live Class Booking handlers ═══ */
  const handleSelectProfessor = useCallback((prof: Professor) => {
    setSelectedProfessor(prof);
    setSelectedDate(null); // reset date when professor changes
  }, []);

  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
  }, []);

  /** Reserva no banco e confirma na hora, sem pagamento. create_class_booking
   *  não mudou (continua gravando 'pending' e validando contra
   *  class_professors); confirm_free_class_booking, chamada em seguida, é
   *  quem marca a reserva como aula confirmada. */
  const handleBookSlot = useCallback(async (time: string) => {
    if (!selectedProfessor || !selectedDate) return;
    if (!currentUserId) {
      toast.error("Faça login para agendar sua aula.");
      return;
    }

    setIsBooking(true);
    try {
      const { data, error } = await supabase.rpc("create_class_booking", {
        _professor_id: selectedProfessor.id,
        _date: selectedDate,
        _time: time,
      });
      if (error) throw new Error(error.message);

      // RETURNS TABLE → o supabase-js entrega um array de uma linha.
      const created = (Array.isArray(data) ? data[0] : data) as { id?: string } | null;
      if (!created?.id) throw new Error("Não foi possível criar o agendamento.");

      const { error: confirmError } = await supabase.rpc("confirm_free_class_booking", {
        _booking_id: created.id,
      });
      if (confirmError) throw new Error(confirmError.message);

      toast.success("Aula marcada!", {
        description: "Sua aula ao vivo está confirmada. Nos vemos lá!",
      });
      setSelectedProfessor(null);
      setSelectedDate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar a aula.");
    } finally {
      // Roda mesmo em erro: se a reserva chegou a ser criada mas a confirmação
      // falhou, ela existe no banco como 'pending' e o efeito de autocura
      // acima tenta confirmá-la sozinho assim que este refresh trouxer a linha.
      setIsBooking(false);
      void refreshBookings();
    }
  }, [selectedProfessor, selectedDate, currentUserId, refreshBookings]);

  /** Só dispensa o registro antigo do navegador. Não existe cancelamento de
   *  reserva paga: isso precisaria de backend, que não existe. */
  const handleDismissLegacy = useCallback(() => {
    clearBooking(userId);
    setLegacyBooking(null);
    toast.info("Agendamento antigo removido deste navegador.");
  }, [userId]);

  /* ═══ Trilha: derivações de EXIBIÇÃO ═══
     Nada aqui decide o que está liberado — só o que desenhar. */

  const activeRow = useMemo(
    () => rows.find((r) => r.video_id === activeVideoId) ?? null,
    [rows, activeVideoId],
  );

  /* Se a aula aberta deixar de estar liberada (troca de conta, refetch com
     outro estado), fecha o player em vez de deixar tocando o que não devia. */
  useEffect(() => {
    if (activeVideoId && activeRow && !activeRow.unlocked) setActiveVideoId(null);
  }, [activeVideoId, activeRow]);

  /* Abriu uma aula: traz o player para a tela. O player fica ACIMA da lista,
     então clicar na aula 5 no celular deixaria a pessoa olhando para o mesmo
     lugar sem entender que algo abriu. rAF porque o elemento só existe depois
     da pintura que este mesmo estado dispara. */
  useEffect(() => {
    if (!activeVideoId) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById(UPTUBE_PLAYER_ID)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeVideoId]);

  /** Nome do aluno para o certificado.

      Mesmo critério do DashboardShell (`isAdmin ? (adminName ||
      ADMIN_DISPLAY_NAME) : (user?.name || "")`), com uma diferença
      inevitável: `adminName` é state PRIVADO do DashboardShell — a edição por
      duplo clique no header vale só naquela sessão e o próprio componente
      documenta que ao recarregar o admin volta para a identidade fixa. De
      fora dele, o valor equivalente é sempre ADMIN_DISPLAY_NAME.

      O fallback existe para nunca gerar um certificado em branco nem com a
      string "undefined" escrita nele. */
  const studentName = useMemo(() => {
    const resolved = isAdmin ? ADMIN_DISPLAY_NAME : (user?.name || "");
    return resolved.trim() || "Aluno UpShopee";
  }, [isAdmin, user?.name]);

  /** Data da conclusão da trilha: a mais recente entre as 5 aulas. */
  const trailCompletedAt = useMemo(() => {
    const times = rows
      .map((r) => (r.completed_at ? new Date(r.completed_at).getTime() : null))
      .filter((t): t is number => t !== null && Number.isFinite(t));
    return times.length > 0 ? new Date(Math.max(...times)) : new Date();
  }, [rows]);

  const progressPct = total > 0 ? (completedCount / total) * 100 : 0;

  return (
    <DashboardShell
      title="Uptube"
      subtitle="Domine a plataforma com cursos gratuitos"
    >
      <div className="page-enter">

        {/* ══════════════════════════════════════════════════════════════
            LIVE CLASS BOOKING — Agende sua aula ao vivo
            O id é a âncora usada pela etapa 7 do Vídeo IA para mandar o
            usuário agendar aqui, em vez de duplicar o formulário lá.
            ══════════════════════════════════════════════════════════════ */}
        <section
          id={BOOKING_SECTION_ID}
          className="mb-8 scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">📅</span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text)]">
                Agende sua aula ao vivo
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted)]">
                Tenha uma sessão individual com um especialista
              </p>
            </div>
          </div>

          {paidBooking ? (
            /* ═══ AULA MARCADA — confirmada na hora, sem pagamento ═══ */
            (() => {
              const prof = PROFESSORS.find((p) => p.id === paidBooking.professor_id);
              return (
                <div className="mt-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 sm:p-5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                        Aula marcada!
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">
                        Sua sessão está confirmada
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-[var(--surface)]/70 dark:bg-white/[0.03] p-3 sm:p-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                        style={{ background: prof?.color ?? "var(--accent)" }}
                      >
                        {prof?.initial ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text)]">
                          {prof?.name ?? paidBooking.professor_id}
                        </p>
                        {prof?.bio && (
                          <p className="text-[11px] text-[var(--muted)] line-clamp-2">{prof.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-500/10">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                        <span className="text-xs text-[var(--text)]">
                          {formatBookingDateLong(parseBookingDate(paidBooking.scheduled_date))}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                        <span className="text-xs font-semibold text-[var(--text)]">
                          {paidBooking.scheduled_time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-[var(--surface)]/70 dark:bg-white/[0.03] px-3 py-2.5 text-xs font-medium leading-relaxed text-[var(--text)]">
                    Sua aula está marcada! Não é necessário nenhum pagamento — nos vemos no dia e horário combinados.
                  </p>
                </div>
              );
            })()
          ) : (
            /* ═══ BOOKING FORM ═══ */
            <div className="mt-5 space-y-5">
              {/* Registro antigo salvo só neste navegador, de antes do pagamento
                  existir. Não é agendamento confirmado e não some sozinho. */}
              {legacyBooking && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:p-4">
                  <p className="text-xs font-semibold text-[var(--text)]">
                    Agendamento antigo encontrado neste navegador
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                    {legacyBooking.professorName} — {legacyBooking.time}, {formatBookingDateLong(parseBookingDate(legacyBooking.date))}.
                    Este registro é anterior ao pagamento e não vale como aula marcada. Agende de novo abaixo.
                  </p>
                  <button
                    onClick={handleDismissLegacy}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--muted-bg)]"
                  >
                    <Trash2 className="h-3 w-3" />
                    Dispensar
                  </button>
                </div>
              )}

              {/* Step 1 — Select Professor */}
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                  {selectedProfessor ? "✅ Professor selecionado" : "1. Escolha seu professor"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PROFESSORS.map((prof) => {
                    const isSelected = selectedProfessor?.id === prof.id;
                    // `undefined` (fetch ainda não voltou, ou falhou) não bloqueia —
                    // só desativa quando o banco confirma active: false.
                    const info = availability?.get(prof.id);
                    const unavailable = info ? !info.active : false;
                    return (
                      <button
                        key={prof.id}
                        disabled={unavailable}
                        onClick={() => handleSelectProfessor(prof)}
                        className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                          unavailable
                            ? "border-[var(--border)] bg-[var(--surface-2)] opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:-translate-y-0.5 hover:shadow-md"
                        }`}
                      >
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white transition-transform duration-200 ${unavailable ? "" : "group-hover:scale-110"}`}
                          style={{ background: prof.color }}
                        >
                          {prof.initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text)]">{prof.name}</p>
                          <p className="text-[11px] text-[var(--muted)] line-clamp-2">{prof.bio}</p>
                          {unavailable && (
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                              Indisponível
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 — Date Picker */}
              {selectedProfessor && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                    2. Escolha o dia
                  </p>
                  {availableDates.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] italic">
                      Nenhuma data disponível no momento.
                    </p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
                      {availableDates.map((d) => {
                        const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
                        const isSelected = selectedDate === dateStr;
                        const isToday = new Date().toDateString() === d.toDateString();
                        const { day, date } = formatDatePill(d);
                        return (
                          <button
                            key={dateStr}
                            onClick={() => handleSelectDate(dateStr)}
                            className={`shrink-0 flex flex-col items-center rounded-xl border px-4 py-2.5 text-center transition-all duration-200 active:scale-[0.95] ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 text-[var(--text)]"
                            }`}
                          >
                            <span className={`text-[10px] font-medium uppercase tracking-wider ${isSelected ? "text-white/80" : "text-[var(--muted)]"}`}>
                              {day}
                            </span>
                            <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-[var(--text)]"}`}>
                              {date}
                            </span>
                            {isToday && (
                              <span className={`text-[9px] font-medium mt-0.5 ${isSelected ? "text-white/70" : "text-[var(--accent)]"}`}>
                                Hoje
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Time Slots */}
              {selectedProfessor && selectedDate && (() => {
                const selDate = new Date(selectedDate + "T12:00:00");
                const isBeforeEarliest = selDate < earliestDate;
                // For dates exactly at earliest or later, all slots available
                const isBusy = isBooking;
                return (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                      3. Escolha o horário
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {TIME_SLOTS.map((slot) => {
                        const isAvailable = !isBeforeEarliest && slot.totalSpots > 0 && !isBusy;
                        return (
                          <button
                            key={slot.time}
                            disabled={!isAvailable}
                            onClick={() => isAvailable && void handleBookSlot(slot.time)}
                            className={`group flex flex-col items-center rounded-2xl border p-4 text-center transition-all duration-200 ${
                              isAvailable
                                ? "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50 hover:-translate-y-0.5 hover:shadow-md cursor-pointer active:scale-[0.97]"
                                : "border-[var(--border)] bg-[var(--surface-2)] cursor-not-allowed opacity-60"
                            }`}
                          >
                            <Clock className={`h-5 w-5 mb-1.5 ${isAvailable ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                            <span className={`text-lg font-bold ${isAvailable ? "text-[var(--text)]" : "text-[var(--muted)] line-through"}`}>
                              {slot.time}
                            </span>
                            {isAvailable ? (
                              <span className="text-[11px] text-[var(--muted)] mt-0.5">
                                {slot.totalSpots} {slot.totalSpots === 1 ? "vaga" : "vagas"} disponíveis
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-0.5">
                                {isBusy ? "Aguarde" : "Esgotado"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                      Ao escolher o horário, sua aula é marcada na hora — sem pagamento.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            TRILHA UPTUBE — as 5 aulas reais
            Títulos, ordem, cadeado e conclusão vêm TODOS de
            uptube_my_trail(). Não existe array de aulas neste arquivo.
            ══════════════════════════════════════════════════════════════ */}

        {trailLoading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-16 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando sua trilha...
          </div>
        )}

        {trailError && !trailLoading && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <GraduationCap className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-[var(--text)]">
              Não foi possível carregar as aulas
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Verifique sua conexão e recarregue a página.
            </p>
          </div>
        )}

        {!trailLoading && !trailError && rows.length > 0 && (
          <>
            {/* ═══ Progresso ═══ */}
            <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--text)]">
                    Sua trilha
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)]">
                    Assista na ordem — cada aula libera a próxima.
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent)]">
                  {completedCount} de {total} concluídas
                </p>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </section>

            {/* ═══ Player da aula aberta ═══
                key={video_id} força um player NOVO ao trocar de aula: refs de
                teto e de posição nascem zeradas para o vídeo certo, em vez de
                herdarem as do anterior. */}
            {activeRow && activeRow.unlocked && (
              <div id={UPTUBE_PLAYER_ID} className="mb-6 scroll-mt-24">
                <UptubePlayer
                  key={activeRow.video_id}
                  videoId={activeRow.video_id}
                  youtubeId={activeRow.youtube_id}
                  title={activeRow.title}
                  startSec={activeRow.last_sec}
                  furthestSec={activeRow.furthest_sec}
                  completedAt={activeRow.completed_at}
                  onSave={save}
                  onClose={() => setActiveVideoId(null)}
                />
              </div>
            )}

            {/* ═══ A trilha ═══ */}
            <ol className="space-y-2">
              {rows.map((row, idx) => {
                const done = Boolean(row.completed_at);
                const locked = !row.unlocked;
                const isActive = row.video_id === activeVideoId;
                const isLast = idx === rows.length - 1;

                const marker = (
                  <div className="flex shrink-0 flex-col items-center self-stretch">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                        done
                          ? "bg-emerald-500 text-white"
                          : locked
                            ? "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]"
                            : "bg-[var(--accent)] text-white"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : locked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        row.position
                      )}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-[var(--border)]" />}
                  </div>
                );

                const body = (
                  <div className="min-w-0 flex-1 pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                        Aula {row.position}
                      </span>
                      {done && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Award className="h-3 w-3" /> Concluída
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-1.5 text-sm font-semibold break-words ${
                        locked ? "text-[var(--muted)]" : "text-[var(--text)]"
                      }`}
                    >
                      {row.title}
                    </p>

                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {locked
                        ? "Conclua a aula anterior para liberar"
                        : done
                          ? "Rever aula"
                          : isActive
                            ? "Assistindo agora"
                            : "Assistir agora"}
                    </p>
                  </div>
                );

                return (
                  <li key={row.video_id}>
                    {locked ? (
                      /* Bloqueada: <div>, não <button>. Sem onClick, sem foco,
                         sem cursor de clique — nada para tentar. */
                      <div
                        aria-disabled="true"
                        className="flex w-full items-stretch gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 opacity-70"
                      >
                        {marker}
                        {body}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveVideoId(row.video_id)}
                        className={`flex w-full items-stretch gap-3 rounded-2xl border bg-[var(--surface)] p-3 sm:p-4 text-left transition-colors hover:border-[var(--accent)]/40 ${
                          isActive ? "border-[var(--accent)]/60" : "border-[var(--border)]"
                        }`}
                      >
                        {marker}
                        {body}
                        <Play
                          className="mt-1 h-4 w-4 shrink-0 self-start text-[var(--accent)]"
                          fill="currentColor"
                        />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* ══════════════════════════════════════════════════════════
                RECOMPENSA — só com as 5 concluídas
                A condição é `trailComplete`, que é a coluna trail_complete
                de uptube_my_trail(): o SERVIDOR decide. Não é
                completedCount === 5 nem nenhuma outra conta feita aqui.
                ══════════════════════════════════════════════════════════ */}
            {trailComplete && (
              <section className="mt-8 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent)]">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[var(--text)]">
                      Trilha concluída!
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--muted)]">
                      Baixe seu certificado e libere o acesso ao Gemini.
                    </p>
                  </div>
                </div>

                <UptubeCertificate name={studentName} completedAt={trailCompletedAt} />

                <a
                  href={REWARD_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20 sm:w-auto"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chamar no WhatsApp e liberar o Gemini
                </a>
              </section>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
         AVISO DE ATUALIZAÇÃO DAS VIDEOAULAS — 1× por aparelho
         ═══════════════════════════════════════════════════════ */}
      {showUpdateNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeUpdateNotice} />

          <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
              <h3 className="mb-3 text-lg font-bold text-[var(--text)]">
                🎬 Estamos atualizando as aulas
              </h3>
              <p className="mb-2 text-sm text-[var(--muted)]">
                As estratégias mudaram, então as aulas estão sendo atualizadas. Os
                vídeos novos já estão sendo gravados e editados neste momento.
              </p>
              <p className="mb-6 text-sm text-[var(--muted)]">
                A nova versão fica disponível no dia 5 de setembro.
              </p>
              <button
                onClick={closeUpdateNotice}
                className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
