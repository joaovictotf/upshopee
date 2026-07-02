import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Check, Play, RotateCw, Sparkles, Video } from "lucide-react";
import type { ProductInfo, StyleConfig, GeneratedContent } from "./Step7GeminiChat";

// ── Video auto-detection from product name ──

type VideoEntry = { name: string; description: string; videoPath: string };

const ALL_VIDEOS: Record<string, VideoEntry[]> = {
  figurinha: [
    { name: "Pacote de Figurinhas da Copa 2026", description: "Estilo Cinematográfico", videoPath: "/videos/admin-video-1.mp4" },
  ],
  toalha: [
    { name: "Toalha do Brasil", description: "Estilo Unboxing · Tom Casual", videoPath: "/videos/admin-video-2.mp4" },
    { name: "Toalha do Brasil — Versão Alternativa", description: "Estilo Unboxing · Tom Entusiasmado", videoPath: "/videos/admin-video-3.mp4" },
  ],
  album: [
    { name: "Álbum da Copa do Mundo 2026", description: "Estilo Demonstração", videoPath: "/videos/admin-video-4.mp4" },
  ],
};

function detectVideo(productName: string, variant: number): VideoEntry {
  const n = productName.toLowerCase();
  if (n.includes("toalha")) {
    const list = ALL_VIDEOS.toalha;
    return list[Math.min(variant, list.length - 1)];
  }
  if (n.includes("album") || n.includes("álbum")) return ALL_VIDEOS.album[0];
  if (n.includes("figurinha")) return ALL_VIDEOS.figurinha[0];
  return ALL_VIDEOS.figurinha[0];
}

// ── 10 generation phases, shown at 4-second intervals (40s total) ──

const GEN_PHASES = [
  "Analisando produto e configurações...",
  "Criando storyboard e cenas...",
  "Renderizando Cena 1 — Abertura...",
  "Aplicando efeitos visuais...",
  "Renderizando Cena 2 — Desenvolvimento...",
  "Adicionando textos e overlays...",
  "Renderizando Cena 3 — Fechamento...",
  "Aplicando transições e trilha sonora...",
  "Mixando áudio e locução...",
  "Finalizando exportação...",
];

// ── Props ──

interface AdminStep7VideoProps {
  productInfo: ProductInfo;
  styleConfig: StyleConfig;
  generatedContent: GeneratedContent;
  projectId: string | null;
  handleBack: () => void;
}

function AdminStep7Video({
  productInfo, styleConfig, generatedContent, projectId, handleBack,
}: AdminStep7VideoProps) {

  const [variant, setVariant] = useState(0);
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [genPhase, setGenPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // ── Track video play state for custom play button overlay ──
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [phase]); // Re-attach when phase changes (new video element)

  // ── Reset variant when product changes (admin goes back and picks different product) ──
  useEffect(() => {
    setVariant(0);
  }, [productInfo.name]);

  // ── Compute current video from product name + variant ──
  const currentVideo = useMemo(() => detectVideo(productInfo.name, variant), [productInfo.name, variant]);

  // ── Cleanup ALL timers on unmount ──
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ── Start generation ──
  const handleGenerate = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

    setPhase("generating");
    setGenPhase(0);
    setProgress(0);

    // Phase rotation: 10 phases × 4s = 40 seconds
    let phaseIdx = 0;
    intervalRef.current = setInterval(() => {
      if (!mounted.current) return;
      phaseIdx++;
      if (phaseIdx < GEN_PHASES.length) setGenPhase(phaseIdx);
    }, 4000);

    // Progress bar: 0→100 in 40s (400ms × 100 steps)
    let prog = 0;
    progressRef.current = setInterval(() => {
      if (!mounted.current) return;
      prog += 1;
      if (prog <= 100) setProgress(prog);
    }, 400);

    // Done after 40 seconds
    timeoutRef.current = setTimeout(() => {
      if (!mounted.current) return;
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
      setGenPhase(GEN_PHASES.length - 1);
      setProgress(100);
      setPhase("done");
    }, 40000);
  }, []);

  // ── Regenerate ──
  const handleRegenerate = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    setIsPlaying(false);

    // Move to next variant (toalha: 0→1 switches to video-3, wraps around for other products)
    setVariant((prev) => prev + 1);

    if (feedbackText.trim()) toast.success("Mensagem enviada! Regenerando vídeo...");

    setPhase("idle");
    setGenPhase(0);
    setProgress(0);
    // Small delay to let React flush the idle state before restarting
    setTimeout(() => { if (mounted.current) handleGenerate(); }, 300);
  }, [feedbackText, handleGenerate]);

  // ═══════════════════════════════════════════
  // PHASE 1 — IDLE: Auto-detected product, ready to generate
  // ═══════════════════════════════════════════
  if (phase === "idle") {
    return (
      <div className="space-y-6 vi-step-enter">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF8F5]">
              <Video className="h-6 w-6 text-[#EE4D2D]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Gerar Vídeo</h3>
              <p className="text-xs text-gray-500">Seu vídeo está pronto para ser gerado</p>
            </div>
          </div>
        </div>

        {/* Detected product */}
        <div className="rounded-2xl border border-[#EE4D2D]/20 bg-[#FFF8F5] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EE4D2D]/10">
              <Sparkles className="h-5 w-5 text-[#EE4D2D]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{currentVideo.name}</p>
              <p className="text-xs text-gray-500">{currentVideo.description}</p>
            </div>
          </div>
        </div>

        <Button onClick={handleGenerate}
          className="h-14 w-full rounded-2xl bg-[#EE4D2D] text-base font-semibold text-white shadow-md shadow-[#EE4D2D]/25 transition-all hover:bg-[#d93e22] hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
          <Play className="mr-2 h-5 w-5" /> Gerar Vídeo com IA
        </Button>

        <button onClick={handleBack}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
          ← Voltar e editar configurações
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // PHASE 2 — GENERATING: 40s animation
  // ═══════════════════════════════════════════
  if (phase === "generating") {
    return (
      <div className="space-y-6 vi-step-enter">
        <div className="rounded-2xl border border-[#EE4D2D]/20 bg-white p-10 shadow-sm shadow-[#EE4D2D]/5">
          <div className="flex flex-col items-center">
            {/* Animated icon with double pulse */}
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#EE4D2D]/10" style={{ animationDuration: "3s" }} />
              <div className="absolute inset-2 animate-pulse rounded-full bg-[#EE4D2D]/5" style={{ animationDuration: "2s" }} />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF8F5]">
                <Sparkles className="h-10 w-10 text-[#EE4D2D] animate-pulse" />
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-900 mb-2">{GEN_PHASES[genPhase]}</p>
            <p className="text-xs text-gray-400 mb-6">Isso pode levar até 40 segundos. Não feche esta página.</p>

            {/* Progress bar */}
            <div className="w-full max-w-md">
              <div className="mb-2 flex justify-between text-[10px] text-gray-400">
                <span>Gerando vídeo...</span>
                <span className="font-mono text-[#EE4D2D]">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#EE4D2D] to-[#FF6B3D] transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Phase checklist */}
            <div className="mt-8 w-full max-w-md space-y-1.5">
              {GEN_PHASES.map((phaseText, i) => {
                const done = i < genPhase;
                const active = i === genPhase;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all duration-500 ${
                    done ? "bg-emerald-50/50 text-emerald-700" : active ? "bg-[#FFF8F5] text-[#EE4D2D] font-medium" : "text-gray-300"
                  }`}>
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      done ? "bg-emerald-500" : active ? "bg-[#EE4D2D]" : "bg-gray-200"
                    }`}>
                      {done && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    {phaseText}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // PHASE 3 — DONE: Video player
  // ═══════════════════════════════════════════
  if (phase === "done") {
    return (
      <div className="space-y-6 vi-step-enter">
        {/* Success header */}
        <div className="flex flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 vi-bounce-in">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-emerald-800">Vídeo gerado com sucesso!</h3>
          <p className="mt-1 text-sm text-emerald-600">{currentVideo.name} — {currentVideo.description}</p>
        </div>

        {/* CSS animations for LED border + play pulse */}
        <style>{`
          @keyframes led-flow {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
          }
          @keyframes play-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(238,77,45,0.6); }
            50% { box-shadow: 0 0 0 16px rgba(238,77,45,0); }
          }
        `}</style>

        {/* Video player with LED border */}
        <div style={{ padding: "3px", background: "linear-gradient(90deg, #EE4D2D, #FF8C5A, #F59E0B, #FF8C5A, #EE4D2D)", backgroundSize: "200% 100%", animation: "led-flow 3s linear infinite", borderRadius: "18px" }}>
          <div className="relative overflow-hidden rounded-2xl">
            <video ref={videoRef} src={currentVideo.videoPath} playsInline
              className="w-full max-h-[70vh] rounded-2xl"
              onError={() => toast.error("Erro ao carregar o vídeo.")}
            />

            {/* Custom play button overlay */}
            {!isPlaying && (
              <button
                type="button"
                onClick={() => { videoRef.current?.play().catch(() => {}); }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-sm" style={{ background: "rgba(238,77,45,0.15)", animation: "play-pulse 2.5s ease-in-out infinite" }}>
                  <Play className="h-9 w-9 text-white fill-white ml-1" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Product info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8F5]">
              <Video className="h-5 w-5 text-[#EE4D2D]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{currentVideo.name}</p>
              <p className="text-xs text-gray-400">{currentVideo.description}</p>
            </div>
          </div>
        </div>

        {/* Feedback + Regenerate */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Quer mudar algo?</p>
          <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Descreva o que você gostaria de mudar no vídeo..." rows={3}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm resize-none focus:border-[#EE4D2D]/40 focus:outline-none focus:ring-2 focus:ring-[#EE4D2D]/10 mb-3"
          />
          <Button onClick={handleRegenerate}
            className="h-12 w-full rounded-xl bg-[#EE4D2D] text-sm font-semibold text-white shadow-md shadow-[#EE4D2D]/25 transition-all hover:bg-[#d93e22] hover:shadow-lg hover:shadow-[#EE4D2D]/30 active:scale-[0.98]">
            <RotateCw className="mr-2 h-4 w-4" /> Gerar novamente
          </Button>
        </div>

        <button onClick={handleBack}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
          ← Voltar e editar configurações
        </button>
      </div>
    );
  }

  return null;
}

export default memo(AdminStep7Video);
