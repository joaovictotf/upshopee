import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { Send } from "lucide-react";
import { useApp } from "../lib/state";
import { supabase } from "../integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════════
   Support page — AI chat with ticket creation & Supabase persistence
   ═══════════════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/dashboard/suporte")({ component: SuportePage });

/* ── Types ── */

type ChatMessage = {
  id: string;
  role: "ia" | "user";
  text: string;
  timestamp: Date;
};

/* ── CSS animations (GPU-accelerated) ── */

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes su-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes su-typing-bounce {
    0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
    40%            { transform: scale(1);   opacity: 1; }
  }
  @keyframes su-ticket-pop {
    0%   { transform: scale(0.85); opacity: 0; }
    60%  { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  .su-msg-enter { animation: su-fade-in 0.35s ease-out both; }
  .su-ticket-badge { animation: su-ticket-pop 0.4s ease-out both; }
  .su-dot-bounce { display: inline-block; animation: su-typing-bounce 1.4s infinite ease-in-out both; }
}
@media (prefers-reduced-motion: reduce) {
  .su-msg-enter, .su-ticket-badge { animation: none; }
}
`;

/* ── Keyword matching engine ── */

type KeywordRule = {
  keywords: string[];
  response: (ticketId?: string) => string;
  priority: number;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    priority: 1,
    keywords: ["reembolso", "cancelar", "cancelamento", "devolução", "devolucao", "dinheiro de volta", "estorno"],
    response: (ticketId) =>
      `Entendi! Para solicitações de reembolso, um atendente da nossa equipe vai analisar seu caso pessoalmente. Um ticket de suporte foi aberto e entraremos em contato em até 24 horas. Número do ticket: ${ticketId || "#SUP-XXX"}`,
  },
  {
    priority: 2,
    keywords: ["comissão", "comissao", "ganhos", "quanto ganho", "vendas"],
    response: () =>
      "As comissões são calculadas automaticamente com base nos produtos que você divulga. Cada produto tem uma taxa de comissão diferente. Você pode ver seus ganhos na Dashboard principal e na página de Métricas. Quer saber mais sobre algum produto específico?",
  },
  {
    priority: 3,
    keywords: ["vídeo", "video", "ia", "criar video", "roteiro"],
    response: () =>
      "Na seção Vídeo IA você pode criar roteiros profissionais para divulgar seus produtos! Basta escolher um produto, definir o estilo e a IA gera tudo automaticamente. Quer um tutorial rápido? Acesse a aba Aulas para ver o passo a passo completo!",
  },
  {
    priority: 4,
    keywords: ["divulgar", "divulgação", "divulgacao", "grupos", "robo", "robô", "ia divulgadora"],
    response: () =>
      "A IA Divulgadora publica automaticamente seus links de afiliado em grupos de WhatsApp, Facebook e outros canais. É só colar seu link de afiliado e escolher os canais. A divulgação roda 24 horas por dia!",
  },
  {
    priority: 5,
    keywords: ["aula", "aulas", "tutorial", "aprender", "como usar"],
    response: () =>
      "Temos uma seção completa de Aulas em vídeo! Acesse a aba Aulas no menu inferior e confira módulos sobre Dashboard, Produtos, Vídeo IA, Grupos e muito mais. Tudo gratuito e disponível 24h!",
  },
  {
    priority: 6,
    keywords: ["pagamento", "plano", "preço", "preco", "assinar", "comprar", "vitalicio", "vitalício"],
    response: () =>
      "Temos dois planos disponíveis: Mensal (R$145/mês) e Acesso Vitalício (R$259 — pagamento único). Ambos incluem todas as ferramentas. Acesse a página de Ofertas para ver todos os detalhes!",
  },
  {
    priority: 7,
    keywords: ["integração", "integracao", "conectar", "shopee", "mercado livre", "amazon"],
    response: () =>
      "Na aba Integrações você pode conectar sua conta da Shopee à nossa plataforma. Estamos fechando parcerias com Mercado Livre, Amazon, Shein, Magazine Luiza e outras plataformas. Fique ligado!",
  },
];

function matchKeywords(text: string): KeywordRule | null {
  const lower = text.toLowerCase();
  const matches = KEYWORD_RULES.filter((rule) =>
    rule.keywords.some((kw) => lower.includes(kw)),
  );
  if (matches.length === 0) return null;
  // Return highest priority match
  matches.sort((a, b) => a.priority - b.priority);
  return matches[0];
}

/* ── Helpers ── */

function formatTicketId(uuid: string): string {
  return `#SUP-${uuid.slice(0, 6).toUpperCase()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

let _msgCounter = 0;
function nextMsgId(): string {
  _msgCounter += 1;
  return `msg-${Date.now()}-${_msgCounter}`;
}

/* ── Initial IA message ── */

const INITIAL_IA_MESSAGE: ChatMessage = {
  id: "init-ia",
  role: "ia",
  text: "Olá! 👋 Como posso ajudar você hoje? Pergunte sobre reembolsos, comissões, ferramentas, planos ou qualquer outra dúvida. Nossa IA vai te responder na hora!",
  timestamp: new Date(),
};

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

function SuportePage() {
  const { user, currentUserId } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_IA_MESSAGE]);
  const [input, setInput] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketLabel, setTicketLabel] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Load existing open/in_progress ticket on mount ── */
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTicket() {
      // Try localStorage first
      const stored = localStorage.getItem(`upshopee_support_ticket_${currentUserId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const { data: ticket } = await (supabase.from as any)("support_tickets")
            .select("*")
            .eq("id", parsed.ticketId)
            .eq("user_id", currentUserId)
            .maybeSingle();

          if (!cancelled && ticket && (ticket.status === "open" || ticket.status === "in_progress")) {
            const { data: msgs } = await (supabase.from as any)("support_messages")
              .select("*")
              .eq("ticket_id", parsed.ticketId)
              .order("created_at", { ascending: true });

            if (!cancelled && msgs) {
              const loaded: ChatMessage[] = [
                INITIAL_IA_MESSAGE,
                ...msgs.map((m: any) => ({
                  id: m.id,
                  role: m.is_admin ? ("ia" as const) : ("user" as const),
                  text: m.message,
                  timestamp: new Date(m.created_at),
                })),
              ];
              setMessages(loaded);
              setTicketId(parsed.ticketId);
              setTicketLabel(parsed.ticketLabel);
              setLoading(false);
              return;
            }
          }
        } catch {
          // localStorage was stale — fall through to DB query
        }
      }

      // Query Supabase for open/in_progress ticket
      const { data: tickets } = await (supabase.from as any)("support_tickets")
        .select("*")
        .eq("user_id", currentUserId)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cancelled && tickets && tickets.length > 0) {
        const t = tickets[0];
        const { data: msgs } = await (supabase.from as any)("support_messages")
          .select("*")
          .eq("ticket_id", t.id)
          .order("created_at", { ascending: true });

        if (!cancelled && msgs) {
          const loaded: ChatMessage[] = [
            INITIAL_IA_MESSAGE,
            ...msgs.map((m: any) => ({
              id: m.id,
              role: m.is_admin ? ("ia" as const) : ("user" as const),
              text: m.message,
              timestamp: new Date(m.created_at),
            })),
          ];
          setMessages(loaded);
          setTicketId(t.id);
          const label = formatTicketId(t.id);
          setTicketLabel(label);
          localStorage.setItem(
            `upshopee_support_ticket_${currentUserId}`,
            JSON.stringify({ ticketId: t.id, ticketLabel: label }),
          );
        }
      }
      setLoading(false);
    }

    loadTicket();
    return () => { cancelled = true; };
  }, [currentUserId]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || typing || !currentUserId) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    try {
      // Determine current ticket (create if needed)
      let tid = ticketId;
      let label = ticketLabel;
      let isFirstMessage = false;

      if (!tid) {
        // Create ticket
        const subject = text.length > 50 ? text.slice(0, 50) + "…" : text;
        const { data: newTicket, error: ticketErr } = await (supabase.from as any)("support_tickets")
          .insert({
            user_id: currentUserId,
            subject,
            status: "open",
          })
          .select("id")
          .single();

        if (ticketErr) {
          console.error("Failed to create ticket:", ticketErr);
          setTyping(false);
          return;
        }

        tid = newTicket.id;
        label = formatTicketId(tid);
        setTicketId(tid);
        setTicketLabel(label);
        isFirstMessage = true;

        localStorage.setItem(
          `upshopee_support_ticket_${currentUserId}`,
          JSON.stringify({ ticketId: tid, ticketLabel: label }),
        );
      }

      // Insert user message
      await (supabase.from as any)("support_messages").insert({
        ticket_id: tid,
        user_id: currentUserId,
        is_admin: false,
        message: text,
      });

      // Generate IA response (with fake typing delay)
      const matchedRule = matchKeywords(text);
      let iaText: string;

      if (matchedRule) {
        iaText = matchedRule.response(isFirstMessage ? label : ticketLabel);
      } else if (isFirstMessage) {
        iaText = `Obrigado pelo contato! Um ticket de suporte foi aberto (${label}). Nossa equipe vai analisar sua dúvida e responder em breve.`;
      } else {
        iaText = "Obrigado pela mensagem! Sua dúvida foi registrada. Um atendente vai responder em breve.";
      }

      // Insert IA response as support message (admin-like)
      await (supabase.from as any)("support_messages").insert({
        ticket_id: tid,
        user_id: currentUserId,
        is_admin: true,
        message: iaText,
      });

      // Simulate typing delay (800-1200ms)
      const delay = 800 + Math.random() * 400;
      await new Promise((r) => setTimeout(r, delay));

      const iaMsg: ChatMessage = {
        id: nextMsgId(),
        role: "ia",
        text: iaText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, iaMsg]);
    } catch (err) {
      console.error("Send error:", err);
    } finally {
      setTyping(false);
    }
  }, [input, typing, currentUserId, ticketId, ticketLabel]);

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

  /* ── Loading state ── */
  if (loading) {
    return (
      <DashboardShell title="Suporte" subtitle="Tire suas dúvidas com nossa IA">
        <style>{ANIM_CSS}</style>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
            <div className="flex gap-1">
              <span className="su-dot-bounce h-2 w-2 rounded-full bg-[var(--accent)]" style={{ animationDelay: "0s" }} />
              <span className="su-dot-bounce h-2 w-2 rounded-full bg-[var(--accent)]" style={{ animationDelay: "0.2s" }} />
              <span className="su-dot-bounce h-2 w-2 rounded-full bg-[var(--accent)]" style={{ animationDelay: "0.4s" }} />
            </div>
            <span className="text-xs">Carregando conversa…</span>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Suporte" subtitle="Tire suas dúvidas com nossa IA">
      <style>{ANIM_CSS}</style>

      {/* ── Container (full-height, flex column) ── */}
      <div className="flex flex-col" style={{ height: "calc(100dvh - 8rem)" }}>
        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
            {messages.map((msg, i) => (
              <ChatBubble key={msg.id} message={msg} isLast={i === messages.length - 1} />
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="su-msg-enter flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white text-xs font-bold">
                  IA
                </div>
                <div className="rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="su-dot-bounce h-1.5 w-1.5 rounded-full bg-[var(--muted)]" style={{ animationDelay: "0s" }} />
                    <span className="su-dot-bounce h-1.5 w-1.5 rounded-full bg-[var(--muted)]" style={{ animationDelay: "0.2s" }} />
                    <span className="su-dot-bounce h-1.5 w-1.5 rounded-full bg-[var(--muted)]" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition-colors focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem…"
              disabled={typing}
              rows={1}
              className="min-h-[24px] max-h-[120px] flex-1 resize-none bg-transparent px-1 py-1 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || typing}
              aria-label="Enviar mensagem"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EE4D2D] to-[#FF6B4A] text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
          {ticketLabel && (
            <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
              Ticket ativo: <span className="font-semibold text-[var(--accent)] su-ticket-badge inline-block">{ticketLabel}</span>
            </p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ChatBubble sub-component
   ═══════════════════════════════════════════════════════════════════ */

function ChatBubble({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const isIA = message.role === "ia";

  return (
    <div className={`flex items-start gap-3 ${isIA ? "" : "flex-row-reverse"} ${isLast ? "su-msg-enter" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isIA
            ? "bg-[var(--accent)] text-white"
            : "bg-gradient-to-br from-[#EE4D2D] to-[#FF6B4A] text-white"
        }`}
      >
        {isIA ? "IA" : (message as any).userLabel || "VC"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
          isIA
            ? "rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            : "rounded-2xl rounded-br-md bg-gradient-to-br from-[#EE4D2D] to-[#FF6B4A] text-white shadow-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <span
          className={`mt-1 block text-[10px] ${
            isIA ? "text-[var(--muted)]" : "text-white/60"
          }`}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
