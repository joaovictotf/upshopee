/* ═══════════════════════════════════════════════════════════════════
   Player travado da trilha Uptube
   ═══════════════════════════════════════════════════════════════════

   O QUE TRAVA O VÍDEO, em três camadas:

   1. NÃO EXISTE CONTROLE DE BUSCA. `controls: 0` remove a barra de
      progresso do YouTube inteira. Sem barra não há o que arrastar — é
      esta a tranca de verdade, não uma validação. `disablekb: 1` fecha o
      teclado (setas, j/l, teclas numéricas, todas são atalhos de busca).
      `fs: 0` + `playsinline: 1` fecham o caminho do iOS: em tela cheia o
      iPhone troca para o player NATIVO, com controles nativos, e aí toda
      guarda daqui morre junto.

   2. O VIGIA (o intervalo abaixo) segura o TETO. Se o tempo atual passar
      do ponto mais adiantado já alcançado, ele puxa de volta.

   3. O SERVIDOR. uptube_save_progress só deixa furthest_sec crescer o
      tanto de tempo real que passou. As camadas 1 e 2 são quebra-molas
      para quem abre o DevTools; esta é a que segura de fato.

   O VIGIA É SÓ TETO — NUNCA EMPURRA PARA FRENTE. Voltar é inofensivo
   (a pessoa está assistindo MAIS, não menos), e o teto continua valendo
   quando ela alcançar de novo o ponto de antes. Forçar as duas direções
   brigaria com o "Rever desde o início" logo abaixo e faria o vídeo
   engasgar. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import {
  loadYouTubeIframeApi,
  formatPlayerTime,
  type YTPlayer,
  type YTPlayerEvent,
} from "../../lib/youtube-iframe-api";
import type { UptubeSaveInput, UptubeSaveResult } from "../../hooks/use-uptube-trail";

/** Frequência do vigia: ~2x por segundo, como especificado. */
const POLL_MS = 500;

/** Gravação periódica. NÃO é por tick de vigia — seriam 12 requisições por
 *  minuto por vídeo. O servidor dá crédito de floor(5 * 1.5) + 5 = 12s a cada
 *  5s, folga suficiente para reprodução normal (5s de vídeo por 5s de relógio). */
const SAVE_INTERVAL_MS = 5_000;

/** Tolerância do teto, em segundos. Abaixo disso o salto é ruído de
 *  buffer/arredondamento do próprio player, não uma tentativa de pular. */
const SEEK_TOLERANCE = 1.5;

interface UptubePlayerProps {
  /** id interno ('v1'..'v5') — é o que a RPC recebe. */
  videoId: string;
  /** id de 11 caracteres do YouTube. */
  youtubeId: string;
  title: string;
  /** last_sec do servidor: onde a pessoa parou. Lido UMA vez, na montagem. */
  startSec: number;
  /** furthest_sec do servidor: o teto já conquistado. Lido UMA vez, na montagem. */
  furthestSec: number;
  /** Vivo: quando o refetch traz a conclusão, o selo aparece sem remontar. */
  completedAt: string | null;
  onSave: (input: UptubeSaveInput) => Promise<UptubeSaveResult>;
  onClose: () => void;
}

export function UptubePlayer({
  videoId,
  youtubeId,
  title,
  startSec,
  furthestSec,
  completedAt,
  onSave,
  onClose,
}: UptubePlayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  /* O TETO. Começa no furthest_sec do SERVIDOR, não em zero — quem volta
     para uma aula já assistida pela metade tem direito de chegar onde já
     tinha chegado sem ser puxado para trás a cada segundo.
     useRef(...) com o valor inicial: de propósito não acompanha a prop
     depois. Passada a montagem, quem manda na posição é o player. */
  const furthestRef = useRef<number>(Math.max(0, furthestSec));

  /* Congelado na primeira renderização, de propósito. `startSec` vem de
     row.last_sec, que o hook reescreve no cache a CADA gravação — ou seja, a
     cada 5 segundos. Se o efeito de montagem dependesse da prop, o player
     seria destruído e recriado de 5 em 5 segundos e o vídeo voltaria ao
     início sem parar. Passada a montagem, quem sabe a posição é o player. */
  const startSecRef = useRef<number>(Math.max(0, Math.floor(startSec)));

  const currentRef = useRef<number>(Math.max(0, startSec));
  const durationRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const playingRef = useRef(false);
  const lastSaveAtRef = useRef(0);
  const saveErrorNotifiedRef = useRef(false);

  /* onSave vem do hook e troca de identidade a cada render. O vigia e os
     listeners são montados uma vez só, então leem sempre por ref. */
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Já tocou pelo menos uma vez nesta montagem. Governa a camada protetora
   *  sobre o iframe — ver o comentário dela abaixo. */
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(Math.max(0, startSec));
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ─── Gravação ────────────────────────────────────────────────────────
     Nunca antes de onReady: a duração só pode ser enviada quando o player
     souber dizê-la de verdade. O servidor CONGELA a duração na primeira
     observação plausível, então um número errado na primeira chamada é
     permanente. */
  const flushSave = useCallback(() => {
    if (!readyRef.current) return;
    lastSaveAtRef.current = Date.now();

    const d = durationRef.current;
    void onSaveRef
      .current({
        videoId,
        currentSec: currentRef.current,
        // Só manda o que for plausível. getDuration() devolve 0 enquanto os
        // metadados não chegam, e 0 seria descartado pelo servidor de
        // qualquer jeito (ele só aceita 30..14400) — mas não custa não mandar.
        durationSec: d && d > 0 ? d : undefined,
      })
      .catch(() => {
        // Falha de rede não pode encher a tela de toast a cada 5 segundos.
        // Avisa uma vez e segue — o progresso volta a gravar sozinho na
        // próxima janela.
        if (!saveErrorNotifiedRef.current) {
          saveErrorNotifiedRef.current = true;
          console.warn("[uptube] não foi possível gravar o progresso agora");
        }
      });
  }, [videoId]);

  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  /* ─── Monta o player ──────────────────────────────────────────────────
     Depende SÓ de youtubeId. Se dependesse de qualquer prop viva
     (completedAt, onSave), o refetch da trilha remontaria o player e o
     vídeo voltaria ao começo no meio da aula. */
  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    setIsReady(false);
    setLoadError(null);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;

        /* A API SUBSTITUI o elemento que recebe por um <iframe>. Por isso
           entrego um div criado na mão dentro do host, e não o host em si:
           assim o React nunca vê seu próprio nó sumir debaixo dele. */
        const mount = document.createElement("div");
        mount.style.width = "100%";
        mount.style.height = "100%";
        hostRef.current.appendChild(mount);

        playerRef.current = new YT.Player(mount, {
          videoId: youtubeId,
          playerVars: {
            controls: 0,        // sem barra de progresso: a tranca de verdade
            disablekb: 1,       // setas, j/l e teclas numéricas são atalhos de busca
            fs: 0,              // tela cheia no iOS = player NATIVO = fim das guardas
            playsinline: 1,     // e sem isto o iOS abre em tela cheia mesmo assim
            rel: 0,
            iv_load_policy: 3,
            // modestbranding foi deixado de fora de propósito: o YouTube
            // parou de honrar o parâmetro.

            // RETOMADA: começa cueado no ponto onde parou, e PARADO.
            // Não uso seekTo() aqui porque seekTo() em vídeo ainda não
            // iniciado FAZ TOCAR — e ninguém quer cair no meio de uma frase
            // ao abrir a página.
            start: startSecRef.current,
            autoplay: 0,
          },
          events: {
            onReady: (e: YTPlayerEvent) => {
              if (cancelled) return;
              readyRef.current = true;
              setIsReady(true);
              const d = e.target.getDuration();
              if (d > 0) {
                durationRef.current = d;
                setDuration(d);
              }
            },
            onStateChange: (e: YTPlayerEvent) => {
              if (cancelled) return;
              const state = e.data;
              const playing = state === YT.PlayerState.PLAYING;
              playingRef.current = playing;
              setIsPlaying(playing);
              if (playing) setHasStarted(true);

              // Pausou: grava agora, sem esperar a janela de 5s.
              if (state === YT.PlayerState.PAUSED) flushSaveRef.current();

              // Acabou: grava imediatamente, senão a conclusão só entraria
              // no próximo tick — que pode não existir, se a pessoa fechar.
              if (state === YT.PlayerState.ENDED) {
                const d = e.target.getDuration();
                if (d > 0) currentRef.current = d;
                furthestRef.current = Math.max(furthestRef.current, currentRef.current);
                flushSaveRef.current();
              }
            },
            onError: () => {
              if (cancelled) return;
              setLoadError("Não foi possível carregar este vídeo. Tente de novo em instantes.");
            },
          },
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Não foi possível carregar o player.");
      });

    return () => {
      cancelled = true;
      // Última gravação antes de sumir: fechar o player não pode perder os
      // segundos desde a última janela de 5s.
      flushSaveRef.current();
      try {
        playerRef.current?.destroy();
      } catch {
        /* iframe já removido — nada a fazer */
      }
      playerRef.current = null;
      readyRef.current = false;
      playingRef.current = false;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
    // startSec e furthestSec entram por ref (congelados na montagem) — ver o
    // comentário em startSecRef. Só a troca de vídeo pode remontar o player.
  }, [youtubeId]);

  /* ─── O VIGIA ─────────────────────────────────────────────────────────
     Roda sempre, mesmo pausado: assim um seekTo() dado pelo console com o
     vídeo parado também é puxado de volta. */
  useEffect(() => {
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !readyRef.current) return;

      let t: number;
      try {
        t = player.getCurrentTime();
      } catch {
        return;
      }
      if (!Number.isFinite(t)) return;

      if (t > furthestRef.current + SEEK_TOLERANCE) {
        // Pulou para frente. Volta para o ponto legítimo.
        try {
          player.seekTo(furthestRef.current, true);
        } catch {
          /* ignora: o próximo tick tenta de novo */
        }
        t = furthestRef.current;
      } else {
        // TETO APENAS: só sobe, nunca empurra a pessoa para frente.
        furthestRef.current = Math.max(furthestRef.current, t);
      }

      currentRef.current = t;
      setCurrentTime(t);

      // A duração às vezes só fica disponível depois do onReady.
      if (!durationRef.current) {
        try {
          const d = player.getDuration();
          if (d > 0) {
            durationRef.current = d;
            setDuration(d);
          }
        } catch {
          /* ignora */
        }
      }

      if (playingRef.current && Date.now() - lastSaveAtRef.current >= SAVE_INTERVAL_MS) {
        flushSaveRef.current();
      }
    }, POLL_MS);

    return () => window.clearInterval(id);
  }, []);

  /* ─── Aba escondida: grava antes de perder a chance ───────────────────
     Trocar de aba, minimizar ou bloquear o celular passam por aqui. Em
     mobile, este costuma ser o último evento antes de a página ser
     descartada — o unmount pode nunca rodar. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSaveRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ─── Controles próprios (os do YouTube não existem mais) ─────────── */
  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      if (playingRef.current) player.pauseVideo();
      else player.playVideo();
    } catch {
      /* ignora */
    }
  }, []);

  /** Rever desde o início. NÃO mexe em furthestRef e NÃO limpa a conclusão:
   *  reassistir é livre, reconquistar não existe. O selo continua onde está,
   *  e o servidor nunca desmarca completed_at (COALESCE no ON CONFLICT). */
  const restart = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      player.seekTo(0, true);
      currentRef.current = 0;
      setCurrentTime(0);
    } catch {
      /* ignora */
    }
  }, []);

  const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const isCompleted = Boolean(completedAt);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* ─── Cabeçalho ─── */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] break-words">
            {title}
          </h2>
          {isCompleted && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Aula concluída
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Trilha
        </button>
      </div>

      {/* ─── Vídeo 16:9 fluido ─── */}
      <div
        className="relative w-full aspect-video"
        style={{ background: "var(--surface-2)" }}
      >
        <div ref={hostRef} className="absolute inset-0 [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0" />

        {/* Camada sobre o iframe. Duas funções:
            • impede clicar no logo/título do YouTube, que abriria o vídeo no
              site do YouTube — onde existe barra de progresso e não existe vigia;
            • devolve o clique no vídeo como play/pause, que é o gesto que a
              pessoa espera.

            SÓ APARECE DEPOIS DO PRIMEIRO PLAY, e isso é deliberado. No iOS o
            primeiro play precisa de um toque de verdade no player; um
            playVideo() disparado de um botão da nossa página nem sempre conta
            como gesto de usuário. Então o primeiro toque vai para o botão
            nativo do YouTube, que sempre funciona, e a camada só entra depois
            — quando o vídeo já engatou e pausar/continuar daqui é aceito.
            Escapar para o youtube.com nesse instante inicial não fura nada: o
            progresso só avança pelo vigia daqui. */}
        {isReady && hasStarted && !loadError && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
            className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
          />
        )}

        {!isReady && !loadError && (
          <div className="absolute inset-0 grid place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--muted)]" />
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-[var(--muted)]" />
              <p className="text-sm text-[var(--text)]">{loadError}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Nossos controles ─── */}
      <div className="p-4 sm:p-5">
        {/* Barra de progresso: EXIBIÇÃO, não controle. Sem onClick, sem
            onPointerDown, sem <input type="range">. Se um dia alguém pendurar
            um seek aqui, a tranca some junto — a barra existir sem ser
            clicável é o ponto. role=progressbar diz isso para o leitor de
            tela também: mostra valor, não aceita comando. */}
        <div
          role="progressbar"
          aria-label="Progresso da aula"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration) || 0}
          aria-valuenow={Math.round(currentTime)}
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)]"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-[var(--muted)]">
          <span>{formatPlayerTime(currentTime)}</span>
          <span>{duration > 0 ? formatPlayerTime(duration) : "--:--"}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!isReady || Boolean(loadError)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" fill="currentColor" /> Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4" fill="currentColor" /> Assistir
              </>
            )}
          </button>

          <button
            type="button"
            onClick={restart}
            disabled={!isReady || Boolean(loadError)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Rever desde o início
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
          A aula libera a próxima quando chega ao fim. Pode rever quando quiser — o
          progresso já conquistado não se perde.
        </p>
      </div>
    </section>
  );
}
