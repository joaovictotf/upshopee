import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { supabase } from "../integrations/supabase/client";
import {
  Send, ArrowLeft, CheckCircle2, Circle, XCircle, Zap,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Admin Support Panel — ticket list + live chat + realtime
   Route: /dashboard/suporte/admin (admin only)
   ═══════════════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/dashboard/suporte-admin")({ component: SuporteAdminPage });

/* ── Constants ── */

const ADMIN_DISPLAY_NAME = "Mateus Suporte";
const ADMIN_INITIALS = "MS";

/* ── Quick replies ── */

const QUICK_REPLIES = [
  {
    label: "Reembolso",
    text: "Seu reembolso está em análise pela nossa equipe financeira. O prazo é de até 7 dias úteis. Qualquer dúvida, é só chamar!",
  },
  {
    label: "Ajuda com vídeos",
    text: "Sobre a geração de vídeos, você precisa: 1) Ir até a aba Vídeo IA, 2) Escolher um produto, 3) Preencher as informações, 4) Selecionar o estilo, 5) Clicar em Gerar. Depois é só copiar o prompt, abrir o Gemini e colar lá. O vídeo é gerado na sua conta Google! Qualquer dúvida pode me chamar. 😊",
  },
  {
    label: "Problemas técnicos",
    text: "Vamos resolver! Pode me dar mais detalhes do que está acontecendo? Qual página você está? Aparece alguma mensagem de erro?",
  },
  {
    label: "Como funciona",
    text: "A UpShopee é uma plataforma para afiliados Shopee. Você encontra produtos, gera vídeos com IA, divulga nos grupos e ganha comissões. Tudo automático! Temos aulas gratuitas na aba Aulas também. 🚀",
  },
  {
    label: "Liberação de acesso",
    text: "Seu acesso já está liberado! Faça login com seu email e senha. Se não lembrar a senha, clique em 'Esqueci minha senha' na tela de login.",
  },
];

/* ── CSS Animations (GPU-accelerated) ── */

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes ad-msg-enter {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ad-msg-enter { animation: ad-msg-enter 0.3s ease-out both; }
}
@media (prefers-reduced-motion: reduce) {
  .ad-msg-enter { animation: none; }
}
`;

/* ── Types ── */

type TicketRecord = {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
};

type AdminMessage = {
  id: string;
  role: "user" | "admin";
  text: string;
  timestamp: Date;
  senderInitials: string;
  displayName: string;
};

/* ── Helpers ── */

function formatTicketId(uuid: string): string {
  return `#SUP-${uuid.slice(0, 6).toUpperCase()}`;
}

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

function userInitials(name?: string | null): string {
  if (!name || name === "Usuário" || name === "Cliente") return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

let _msgCounter = 0;
function nextMsgId(): string {
  _msgCounter += 1;
  return `adm-msg-${Date.now()}-${_msgCounter}`;
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

function SuporteAdminPage() {
  const { isAdmin, adminPresentationMode, currentUserId } = useApp();
  const navigate = useNavigate();

  /* ── Admin gate ── */
  useEffect(() => {
    if (!isAdmin || adminPresentationMode) navigate({ to: "/dashboard" });
  }, [isAdmin, adminPresentationMode, navigate]);

  /* ── State ── */
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Derived: selected ticket's user display name ── */
  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId),
    [tickets, selectedTicketId],
  );
  const selectedTicketUserName = selectedTicket?.user_name || "Cliente";

  /* ── Fetch tickets ── */
  const loadTickets = useCallback(async () => {
    try {
      const { data: ticketsData, error: ticketsErr } = await (supabase.from as any)("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsErr || !ticketsData) return;

      // Collect unique user_ids
      const userIds = [...new Set(ticketsData.map((t: any) => t.user_id))] as string[];

      // Fetch profiles
      let profileMap: Record<string, { email: string; name: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.user_id] = { email: p.email, name: p.full_name };
          }
        }
      }

      setTickets(
        (ticketsData as any[]).map((t: any) => ({
          ...t,
          user_email: profileMap[t.user_id]?.email || "—",
          user_name: profileMap[t.user_id]?.name || "Usuário",
        })),
      );
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  /* ── Load messages for selected ticket ── */
  const loadMessages = useCallback(async (ticketId: string, userName?: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await (supabase.from as any)("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) return;

      const uName = userName || "Cliente";
      const uInitials = userInitials(uName);

      setMessages(
        (data as any[]).map((m: any) => ({
          id: m.id,
          role: m.is_admin ? ("admin" as const) : ("user" as const),
          text: m.message,
          timestamp: new Date(m.created_at),
          senderInitials: m.is_admin ? ADMIN_INITIALS : uInitials,
          displayName: m.is_admin ? ADMIN_DISPLAY_NAME : uName,
        })),
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  /* ── Handle ticket selection ── */
  const selectTicket = useCallback(
    (ticketId: string) => {
      setSelectedTicketId(ticketId);
      setMessages([]);
      // Pass the user name from the ticket data
      const ticket = tickets.find((t) => t.id === ticketId);
      loadMessages(ticketId, ticket?.user_name);
      setMobileShowChat(true);
    },
    [loadMessages, tickets],
  );

  /* ── Back to list (mobile) ── */
  const backToList = useCallback(() => {
    setMobileShowChat(false);
    setSelectedTicketId(null);
    setMessages([]);
  }, []);

  /* ── Realtime: messages for selected ticket ── */
  useEffect(() => {
    if (!selectedTicketId) return;

    const userName = selectedTicket?.user_name || "Cliente";
    const uInitials = userInitials(userName);

    const channel = supabase
      .channel(`support-messages-${selectedTicketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${selectedTicketId}`,
        },
        (payload: any) => {
          if (!payload?.new) return;
          const m = payload.new;
          // Skip admin messages (optimistic insert already visible)
          if (m.is_admin) return;
          setMessages((prev) => {
            // Dedup
            if (prev.some((p) => p.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                role: "user" as const,
                text: m.message,
                timestamp: new Date(m.created_at),
                senderInitials: uInitials,
                displayName: userName,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicketId, selectedTicket]);

  /* ── Realtime: ticket status changes ── */
  useEffect(() => {
    const channel = supabase
      .channel("support-tickets-admin")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets" },
        (payload: any) => {
          if (!payload?.new) return;
          setTickets((prev) =>
            prev.map((t) =>
              t.id === payload.new.id ? { ...t, status: payload.new.status, updated_at: payload.new.updated_at } : t,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        () => {
          loadTickets();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTickets]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const handleSend = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending || !selectedTicketId || !currentUserId) return;
    if (!textOverride) setInput("");
    setSending(true);

    const optId = nextMsgId();
    const optimistic: AdminMessage = {
      id: optId,
      role: "admin",
      text,
      timestamp: new Date(),
      senderInitials: ADMIN_INITIALS,
      displayName: ADMIN_DISPLAY_NAME,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { error } = await (supabase.from as any)("support_messages").insert({
        ticket_id: selectedTicketId,
        user_id: currentUserId,
        is_admin: true,
        message: text,
      });

      if (error) {
        // Undo optimistic
        setMessages((prev) => prev.filter((m) => m.id !== optId));
        console.error("Send error:", error);
      } else {
        // Optional: update ticket status to in_progress if it was open
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicketId && t.status === "open"
              ? { ...t, status: "in_progress" as const }
              : t,
          ),
        );
        await (supabase.from as any)("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", selectedTicketId)
          .eq("status", "open");
      }
    } finally {
      setSending(false);
    }
  }, [input, sending, selectedTicketId, currentUserId]);

  /* ── Quick reply: place text in input ── */
  const handleQuickReply = useCallback((text: string) => {
    setInput(text);
    // Focus the textarea so admin can review then press send
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  /* ── Close / resolve ticket ── */
  const handleCloseTicket = useCallback(async () => {
    if (!selectedTicketId || !currentUserId) return;

    const closeMsg = "Ticket fechado pelo administrador.";

    // Optimistic
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicketId ? { ...t, status: "resolved" as const } : t,
      ),
    );

    setMessages((prev) => [
      ...prev,
      {
        id: nextMsgId(),
        role: "admin",
        text: closeMsg,
        timestamp: new Date(),
        senderInitials: "SYS",
        displayName: "Sistema",
      },
    ]);

    try {
      await (supabase.from as any)("support_tickets")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", selectedTicketId);

      await (supabase.from as any)("support_messages").insert({
        ticket_id: selectedTicketId,
        user_id: currentUserId,
        is_admin: true,
        message: closeMsg,
      });
    } catch (err) {
      console.error("Failed to close ticket:", err);
      loadTickets();
      loadMessages(selectedTicketId, selectedTicketUserName);
    }
  }, [selectedTicketId, currentUserId, loadTickets, loadMessages, selectedTicketUserName]);

  /* ── Key handler ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /* ── Computed ── */
  const openTickets = useMemo(
    () => tickets.filter((t) => t.status === "open" || t.status === "in_progress"),
    [tickets],
  );
  const closedTickets = useMemo(
    () => tickets.filter((t) => t.status === "resolved" || t.status === "closed"),
    [tickets],
  );

  /* ── Unread indicator — last message was from user ── */
  const lastMessageRole = useCallback(
    (ticketId: string): "user" | "admin" | "none" => {
      const msgsForTicket = selectedTicketId === ticketId ? messages : null;
      if (!msgsForTicket) return "none";
      if (msgsForTicket.length === 0) return "none";
      const last = msgsForTicket[msgsForTicket.length - 1];
      return last.role === "user" ? "user" : "admin";
    },
    [selectedTicketId, messages],
  );

  /* ── Admin gate render ── */
  if (!isAdmin || adminPresentationMode) {
    return null;
  }

  /* ═════════════════════════════════════════════════════════════════
     Render
     ═════════════════════════════════════════════════════════════════ */
  return (
    <DashboardShell title="Suporte Admin" subtitle="Gerencie tickets de suporte">
      <style>{ANIM_CSS}</style>

      <div className="flex" style={{ height: "calc(100dvh - 8rem)" }}>
        {/* ── LEFT: Ticket list (hidden on mobile when chat is open) ── */}
        <div
          className={`shrink-0 border-r border-[var(--border)] overflow-y-auto bg-[var(--surface)] ${
            mobileShowChat ? "hidden md:block" : "block"
          } w-full md:w-80`}
        >
          {loadingTickets ? (
            <div className="flex h-32 items-center justify-center text-[var(--muted)] text-xs">
              Carregando…
            </div>
          ) : (
            <TicketList
              tickets={openTickets}
              closedTickets={closedTickets}
              selectedId={selectedTicketId}
              onSelect={selectTicket}
              lastMessageRole={lastMessageRole}
            />
          )}
        </div>

        {/* ── RIGHT: Chat panel ── */}
        <div
          className={`flex flex-1 flex-col ${
            !mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          <ChatPanel
            ticket={selectedTicket}
            messages={messages}
            loading={loadingMessages}
            input={input}
            sending={sending}
            onInputChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onCloseTicket={handleCloseTicket}
            onBack={backToList}
            onQuickReply={handleQuickReply}
            textareaRef={textareaRef}
            messagesEndRef={messagesEndRef}
          />
        </div>
      </div>
    </DashboardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TicketList sub-component
   ═══════════════════════════════════════════════════════════════════ */

type TicketListProps = {
  tickets: TicketRecord[];
  closedTickets: TicketRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  lastMessageRole: (ticketId: string) => "user" | "admin" | "none";
};

function TicketList({ tickets, closedTickets, selectedId, onSelect, lastMessageRole }: TicketListProps) {
  return (
    <div>
      {/* Active tickets */}
      <div className="px-3 py-3">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Abertos ({tickets.length})
        </h3>
        {tickets.length === 0 ? (
          <p className="text-xs text-[var(--muted)] italic">Nenhum ticket aberto</p>
        ) : (
          <div className="space-y-1">
            {tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                selected={t.id === selectedId}
                onSelect={() => onSelect(t.id)}
                hasUnread={lastMessageRole(t.id) === "user"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resolved / closed tickets */}
      {closedTickets.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Resolvidos ({closedTickets.length})
          </h3>
          <div className="space-y-1 opacity-70">
            {closedTickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                selected={t.id === selectedId}
                onSelect={() => onSelect(t.id)}
                hasUnread={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TicketRow ── */

function TicketRow({
  ticket,
  selected,
  onSelect,
  hasUnread,
}: {
  ticket: TicketRecord;
  selected: boolean;
  onSelect: () => void;
  hasUnread: boolean;
}) {
  const statusDot = ticket.status === "open"
    ? "bg-emerald-500"
    : ticket.status === "in_progress"
      ? "bg-amber-400"
      : "bg-gray-400";

  return (
    <button
      onClick={onSelect}
      className={`relative flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
        selected
          ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
          : "hover:bg-[var(--bg)]"
      }`}
    >
      {hasUnread && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--accent)]" />
      )}
      <div className="shrink-0 pt-0.5">
        <span className={`inline-block h-2 w-2 rounded-full ${statusDot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-semibold ${
              selected ? "text-[var(--accent)]" : "text-[var(--text)]"
            }`}
          >
            {formatTicketId(ticket.id)}
          </span>
        </div>
        <p className="truncate text-xs text-[var(--text)]/80">{ticket.subject}</p>
        <p className="text-[10px] text-[var(--muted)]">
          {ticket.user_email} &middot; {timeAgo(ticket.created_at)}
        </p>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ChatPanel sub-component
   ═══════════════════════════════════════════════════════════════════ */

type ChatPanelProps = {
  ticket: TicketRecord | null | undefined;
  messages: AdminMessage[];
  loading: boolean;
  input: string;
  sending: boolean;
  onInputChange: (v: string) => void;
  onSend: (textOverride?: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCloseTicket: () => void;
  onBack: () => void;
  onQuickReply: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
};

function ChatPanel({
  ticket,
  messages,
  loading,
  input,
  sending,
  onInputChange,
  onSend,
  onKeyDown,
  onCloseTicket,
  onBack,
  onQuickReply,
  textareaRef,
  messagesEndRef,
}: ChatPanelProps) {
  if (!ticket) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-[var(--muted)]">
          <p className="text-sm font-medium">Selecione um ticket</p>
          <p className="mt-1 text-xs">Escolha um ticket na lista à esquerda para ver a conversa.</p>
        </div>
      </div>
    );
  }

  const canClose = ticket.status === "open" || ticket.status === "in_progress";
  const statusLabel =
    ticket.status === "open"
      ? "Aberto"
      : ticket.status === "in_progress"
        ? "Em andamento"
        : ticket.status === "resolved"
          ? "Resolvido"
          : "Fechado";

  const statusColor =
    ticket.status === "open"
      ? "text-emerald-500"
      : ticket.status === "in_progress"
        ? "text-amber-400"
        : "text-gray-500";

  return (
    <>
      {/* ── Chat header ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[var(--surface)] md:hidden text-[var(--text)]"
          aria-label="Voltar para lista de tickets"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text)]">
              {formatTicketId(ticket.id)}
            </span>
            <span className={`text-[10px] font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <p className="truncate text-xs text-[var(--muted)]">
            {ticket.user_email} — {ticket.subject}
          </p>
        </div>

        {canClose && (
          <button
            onClick={onCloseTicket}
            className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 dark:hover:border-emerald-800"
            title="Fechar ticket"
          >
            <span className="hidden sm:inline">Fechar ticket</span>
            <CheckCircle2 size={16} className="sm:hidden" />
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[var(--muted)] text-xs">
            Carregando mensagens…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--muted)] text-xs italic">
            Nenhuma mensagem ainda.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <AdminChatBubble
                key={msg.id}
                message={msg}
                isLast={i === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3">
        {canClose ? (
          <>
            {/* Quick reply pills */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr.label}
                  onClick={() => onQuickReply(qr.text)}
                  disabled={sending}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15 hover:border-[var(--accent)]/50 disabled:opacity-40"
                  title={`Inserir resposta: ${qr.label}`}
                >
                  <Zap size={11} />
                  {qr.label}
                </button>
              ))}
            </div>

            {/* Input + send button */}
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition-colors focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Digite sua resposta…"
                disabled={sending}
                rows={1}
                className="min-h-[24px] max-h-[120px] flex-1 resize-none bg-transparent px-1 py-1 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none disabled:opacity-50"
              />
              <button
                onClick={() => onSend()}
                disabled={!input.trim() || sending}
                aria-label="Enviar resposta"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EE4D2D] to-[#FF6B4A] text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-xs text-[var(--muted)] italic">
            Este ticket está {statusLabel.toLowerCase()}. Não é possível enviar novas mensagens.
          </p>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AdminChatBubble
   ═══════════════════════════════════════════════════════════════════ */

function AdminChatBubble({
  message,
  isLast,
}: {
  message: AdminMessage;
  isLast: boolean;
}) {
  const isAdmin = message.role === "admin";

  return (
    <div
      className={`flex items-start gap-3 ${
        isAdmin ? "flex-row-reverse" : ""
      } ${isLast ? "ad-msg-enter" : ""}`}
    >
      {/* Avatar + name */}
      <div className={`flex flex-col items-center gap-1 ${isAdmin ? "items-center" : "items-center"}`}>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            isAdmin
              ? "bg-gradient-to-br from-[#EE4D2D] to-[#FF6B4A] text-white"
              : "bg-[var(--surface-2)] text-[var(--text)] ring-1 ring-[var(--border)]"
          }`}
        >
          {message.senderInitials}
        </div>
        <span className="text-[9px] text-[var(--muted)] leading-none whitespace-nowrap max-w-[56px] truncate">
          {message.displayName}
        </span>
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed ${
          isAdmin
            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-[#EE4D2D] to-[#FF6B4A] text-white shadow-sm"
            : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <span
          className={`mt-1 block text-[10px] ${
            isAdmin ? "text-white/60" : "text-[var(--muted)]"
          }`}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
