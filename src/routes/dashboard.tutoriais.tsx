import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { PlayCircle, BookOpen, Lock } from "lucide-react";

function Tutoriais() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Prevent accidental navigation away while on the page
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <DashboardShell
      title="Tutoriais"
      subtitle="Assista ao tutorial completo antes de começar a usar a plataforma."
    >
      {/* Hero header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <PlayCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">
            Tutorial de configuração da UpShopee
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Siga o passo a passo abaixo para configurar sua conta corretamente e começar a vender.
          </p>
        </div>
      </div>

      {/* Video card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/20">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/70" />
              <span className="h-3 w-3 rounded-full bg-amber-400/70" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              UpShopee · Tutorial de Configuração
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            Conteúdo exclusivo
          </div>
        </div>

        {/* Vimeo embed — 16:9 responsive */}
        <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
          <iframe
            ref={iframeRef}
            src="https://player.vimeo.com/video/1198261375?badge=0&autopause=0&player_id=0&app_id=58479&byline=0&portrait=0&title=0&dnt=1&share=0&like=0&speed=0&transcript=0&vimeo_logo=0&pip=0"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
            title="Tutorial de Configuração da ShopeSync"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
          {/* Topo completo — bloqueia titulo e botoes superiores */}
          <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"52px", zIndex:3, cursor:"default" }} />
          {/* Direita — bloqueia curtir/compartilhar/assistir mais tarde */}
          <div style={{ position:"absolute", top:"52px", right:0, width:"72px", height:"calc(100% - 100px)", zIndex:3, cursor:"default" }} />
          {/* Inferior esquerdo — bloqueia logo do Vimeo */}
          <div style={{ position:"absolute", bottom:0, left:0, width:"130px", height:"48px", zIndex:3, cursor:"default" }} />
          {/* Inferior direito — bloqueia icones direita da barra de controle */}
          <div style={{ position:"absolute", bottom:0, right:0, width:"80px", height:"48px", zIndex:3, cursor:"default" }} />
        </div>

        {/* Footer info bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Assista ao vídeo completo antes de começar as configurações.
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
            Obrigatório
          </span>
        </div>
      </div>

      {/* Steps below the video */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Assista ao tutorial",
            desc: "Assista o vídeo completo para entender o funcionamento da plataforma.",
          },
          {
            step: "02",
            title: "Configure sua conta",
            desc: 'Acesse "Configurações" e complete seu perfil com os dados solicitados.',
          },
          {
            step: "03",
            title: "Adicione seus produtos",
            desc: 'Vá em "Meus Produtos" e adicione os produtos que deseja vender.',
          },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            className="rounded-xl border border-border bg-card px-4 py-4"
          >
            <div className="mb-2 text-2xl font-black text-primary/20">{step}</div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>

      {/* Vimeo script */}
      {/* Note: loading the Vimeo player.js via dangerouslySetInnerHTML isn't needed
          for basic embed — autoplay/API features work fine without it for this use case */}
    </DashboardShell>
  );
}

export const Route = createFileRoute("/dashboard/tutoriais")({
  component: Tutoriais,
});
