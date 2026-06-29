import { useCallback, useEffect, useRef, useState, memo } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import {
  Check, Sparkles, Copy, Image, Wand2, Subtitles, Play,
  Send, Star, Lightbulb, ChevronLeft,
} from "lucide-react";

// ── Types (mirrored from dashboard.video-ia.tsx) ────────────

export type ProductInfo = {
  name: string; url: string; description: string;
  category: string; benefits: string; targetAudience: string;
  differentiators: string; problemSolved: string;
};

export type StyleConfig = {
  style: string; duration: string;
  voiceType: string; tone: string; hasText: boolean; hasMusic: boolean;
};

export type GeneratedContent = {
  idea_title: string; hook: string; script: string;
  voiceover: string; screen_texts: string;
  cta: string; caption: string; hashtags: string; final_prompt: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

interface Step7GeminiChatProps {
  productInfo: ProductInfo;
  styleConfig: StyleConfig;
  generatedContent: GeneratedContent;
  projectId: string | null;
  handleBack: () => void;
  handleCopyFinalPrompt: () => void;
}

// ── Props equality comparator (prevents re-renders on parent re-renders) ──

function arePropsEqual(prev: Step7GeminiChatProps, next: Step7GeminiChatProps): boolean {
  return (
    prev.projectId === next.projectId &&
    prev.handleBack === next.handleBack &&
    prev.handleCopyFinalPrompt === next.handleCopyFinalPrompt &&
    JSON.stringify(prev.productInfo) === JSON.stringify(next.productInfo) &&
    JSON.stringify(prev.styleConfig) === JSON.stringify(next.styleConfig) &&
    JSON.stringify(prev.generatedContent) === JSON.stringify(next.generatedContent)
  );
}

// ── Component ────────────────────────────────────────────────

function Step7GeminiChat({
  productInfo,
  styleConfig,
  generatedContent,
  projectId,
  handleBack,
  handleCopyFinalPrompt,
}: Step7GeminiChatProps) {
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Seu roteiro está pronto! 🎬\n\n**${generatedContent.idea_title}**\n\nPosso ajustar qualquer coisa:\n• "Deixa o tom mais urgente"\n• "Faz uma versão mais curta"\n• "Muda a cena 2"\n• "Adiciona mais emoção"\n• "Quero estilo UGC"\n\nOu qualquer outra modificação! O que você gostaria de mudar?`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(30);

  // ── Cleanup interval on unmount ──
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Auto-scroll + auto-focus ──
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
  useEffect(() => { if (!redirecting) inputRef.current?.focus(); }, [redirecting]);

  // ── Send message ──
  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMsg = { role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch("https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1/generate-video-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          product: { name: productInfo.name, description: productInfo.description, benefits: productInfo.benefits, targetAudience: productInfo.targetAudience, differentiators: productInfo.differentiators, problemSolved: productInfo.problemSolved },
          style: styleConfig,
          currentContent: generatedContent,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Erro ao comunicar com o assistente");
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: err?.name === "AbortError" ? "⏰ O assistente demorou muito para responder. Tente novamente." : "❌ Erro ao comunicar com o assistente. Verifique sua conexão." }]);
    } finally { setChatLoading(false); }
  }, [chatInput, chatLoading, chatMessages, productInfo, styleConfig, generatedContent]);

  // ── Keyboard handler ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  // ── Open Gemini with countdown (uses refs for interval safety) ──
  const handleOpenGemini = useCallback(() => {
    navigator.clipboard.writeText(generatedContent.final_prompt);
    toast.success("Prompt copiado! Você será redirecionado em 30 segundos...");

    if (projectId) {
      (supabase.from as any)("video_projects")
        .update({ status: "opened_in_gemini", updated_at: new Date().toISOString() })
        .eq("id", projectId);
    }

    setRedirecting(true);
    setCountdown(30);
    countdownRef.current = 30;

    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      countdownRef.current--;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
      }
    }, 1000);
  }, [generatedContent.final_prompt, projectId]);

  // ── Open Gemini immediately ──
  const handleOpenGeminiNow = useCallback(() => {
    navigator.clipboard.writeText(generatedContent.final_prompt);

    if (projectId) {
      (supabase.from as any)("video_projects")
        .update({ status: "opened_in_gemini", updated_at: new Date().toISOString() })
        .eq("id", projectId);
    }

    // Clear interval if running
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    setRedirecting(true);
    setCountdown(null);
  }, [generatedContent.final_prompt, projectId]);

  // ── Redirecting state ──
  if (redirecting) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-md shadow-emerald-500/20"><Check className="h-7 w-7 text-white" /></div>
          <h3 className="mt-3 text-lg font-bold text-emerald-800">Prompt copiado e pronto!</h3>
          {countdown !== null && (
            <p className="mt-1 text-sm text-emerald-600">Redirecionando para o Gemini em <span className="font-bold text-emerald-800 text-lg">{countdown}s</span>...</p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06]">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground"><Sparkles className="h-4 w-4 text-[#EE4D2D]" /> Como gerar seu vídeo no Gemini</h4>
          <div className="mt-4 space-y-3">
            {[
              { step: 1, icon: Copy, text: "O prompt em inglês já foi copiado automaticamente", done: true },
              { step: 2, icon: Image, text: "No Gemini, envie a imagem do seu produto", done: false },
              { step: 3, icon: Wand2, text: "Cole o prompt copiado no chat do Gemini", done: false },
              { step: 4, icon: Subtitles, text: "Selecione 9:16 (formato vertical) no Gemini", done: false },
              { step: 5, icon: Play, text: "Gere o vídeo e baixe o resultado!", done: false },
            ].map(({ step, icon: Icon, text, done }) => (
              <div key={step} className="flex items-start gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : step}
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm text-gray-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleOpenGeminiNow}
            className="h-12 flex-1 rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 hover:bg-[#EE4D2D]/90 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
            <Star className="mr-2 h-4 w-4" /> Abrir Gemini agora
          </Button>
          <Button onClick={handleBack} variant="ghost"
            className="h-12 rounded-xl text-sm font-medium text-gray-500 hover:text-[#EE4D2D]">
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar e editar
          </Button>
        </div>
      </div>
    );
  }

  // ── Normal chat state ──
  return (
    <div className="flex flex-col h-[620px] max-h-[calc(100vh-280px)] min-h-[480px]">
      {/* Success header */}
      <div className="flex-shrink-0 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"><Check className="h-5 w-5 text-white" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-emerald-800">Roteiro gerado com sucesso!</h3>
          <p className="text-xs text-emerald-600 truncate">{generatedContent.idea_title}</p>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-[#FAFAFA] p-4 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06] mb-3">
        <div className="space-y-4">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-[#EE4D2D] text-white rounded-br-md shadow-sm shadow-[#EE4D2D]/15" : "bg-white text-gray-700 rounded-bl-md border border-gray-100 shadow-sm"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm shadow-black/[0.02] ring-1 ring-black/[0.06] mb-3">
        <div className="flex items-end gap-2">
          <textarea ref={inputRef} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Peça ajustes no roteiro..." rows={2} disabled={chatLoading}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#EE4D2D]/40 focus:outline-none focus:ring-2 focus:ring-[#EE4D2D]/10 disabled:opacity-50" />
          <Button type="button" onClick={handleSendMessage} disabled={!chatInput.trim() || chatLoading}
            className="h-10 w-10 shrink-0 rounded-xl bg-[#EE4D2D] p-0 text-white shadow-sm shadow-[#EE4D2D]/25 hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.97] disabled:opacity-40">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex flex-col gap-2 sm:flex-row mb-3">
        <Button onClick={handleCopyFinalPrompt} variant="outline"
          className="h-11 flex-1 rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm hover:border-[#EE4D2D]/30 hover:text-[#EE4D2D]">
          <Copy className="mr-2 h-4 w-4" /> 📋 Copiar prompt
        </Button>
        <Button onClick={handleOpenGemini}
          className="h-11 flex-1 rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 hover:bg-[#EE4D2D]/90 hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
          <Star className="mr-2 h-4 w-4" /> 🎬 Gerar vídeo no Gemini
        </Button>
      </div>

      {/* Instructions card */}
      <div className="flex-shrink-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <h4 className="flex items-center gap-2 text-xs font-bold text-blue-800"><Lightbulb className="h-3.5 w-3.5" /> Como gerar seu vídeo</h4>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {["① Clique em Gerar vídeo no Gemini", "② Envie a imagem do produto", "③ Cole o prompt copiado", "④ Selecione 9:16 (vertical)", "⑤ Gere e baixe o vídeo!"].map((tip, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[11px] leading-tight text-blue-700">{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Step7GeminiChat, arePropsEqual);
